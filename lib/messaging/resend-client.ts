// lib/messaging/resend-client.ts
// Resend email client for transactional emails

import { SendEmailOptions, SendEmailResult, CommunicationRecord } from "./types"
import { createClient } from "@supabase/supabase-js"

// Resend credentials
const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || "noreply@rooftopsgpt.com"

// Check if Resend is configured
export function isResendConfigured(): boolean {
  return !!RESEND_API_KEY
}

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Log communication to database
async function logEmailCommunication(
  record: Omit<CommunicationRecord, "id" | "createdAt">
): Promise<string | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("communications")
    .insert({
      workspace_id: record.workspaceId,
      customer_id: record.customerId,
      job_id: record.jobId,
      channel: "email",
      direction: record.direction,
      from_email: record.fromEmail,
      to_email: record.toEmail,
      subject: record.subject,
      body: record.body,
      status: record.status,
      error_message: record.errorMessage,
      sendgrid_id: record.sendgridId,
      external_id: record.externalId,
      sequence_enrollment_id: record.sequenceEnrollmentId,
      sequence_step: record.sequenceStep,
      metadata: record.metadata
    })
    .select("id")
    .single()

  if (error) {
    console.error("Failed to log email:", error)
    return null
  }

  return data.id
}

// Get workspace email settings
async function getWorkspaceEmailSettings(
  workspaceId: string
): Promise<{ fromEmail: string; fromName: string }> {
  const supabase = getServiceClient()

  // Try to get workspace-specific email settings
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, metadata")
    .eq("id", workspaceId)
    .single()

  const fromName = workspace?.name || "Rooftops AI"
  const fromEmail = (workspace?.metadata as any)?.fromEmail || DEFAULT_FROM_EMAIL

  return { fromEmail, fromName }
}

// Send email via Resend
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const {
    to,
    subject,
    body,
    html,
    workspaceId,
    customerId,
    jobId,
    from,
    replyTo,
    attachments
  } = options

  // Check if Resend is configured
  if (!isResendConfigured()) {
    console.warn("Resend not configured - email not sent")

    await logEmailCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "email",
      direction: "outbound",
      toEmail: to,
      subject,
      body,
      status: "pending",
      metadata: { reason: "resend_not_configured" }
    })

    return {
      success: false,
      error: "Resend not configured"
    }
  }

  try {
    const { fromEmail, fromName } = await getWorkspaceEmailSettings(workspaceId)
    const finalFrom = from || `${fromName} <${fromEmail}>`

    // Build request body
    const requestBody: Record<string, any> = {
      from: finalFrom,
      to: [to],
      subject,
      text: body
    }

    if (html) {
      requestBody.html = html
    } else {
      // Convert plain text to simple HTML
      requestBody.html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${body.split("\n").map(line => `<p style="margin: 0 0 10px 0;">${line}</p>`).join("")}
        </div>
      `
    }

    if (replyTo) {
      requestBody.reply_to = replyTo
    }

    if (attachments && attachments.length > 0) {
      requestBody.attachments = attachments.map(att => ({
        filename: att.filename,
        content:
          typeof att.content === "string"
            ? att.content
            : att.content.toString("base64"),
        type: att.contentType
      }))
    }

    // Send via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (!response.ok) {
      await logEmailCommunication({
        workspaceId,
        customerId,
        jobId,
        channel: "email",
        direction: "outbound",
        fromEmail: fromEmail,
        toEmail: to,
        subject,
        body,
        status: "failed",
        errorMessage: data.message || "Failed to send email"
      })

      return {
        success: false,
        error: data.message || "Failed to send email"
      }
    }

    // Log successful send
    const messageId = await logEmailCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "email",
      direction: "outbound",
      fromEmail: fromEmail,
      toEmail: to,
      subject,
      body,
      status: "sent",
      externalId: data.id
    })

    return {
      success: true,
      messageId: messageId || data.id
    }
  } catch (error) {
    console.error("Email send error:", error)

    await logEmailCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "email",
      direction: "outbound",
      toEmail: to,
      subject,
      body,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Send invoice email with PDF attachment
export async function sendInvoiceEmail(
  workspaceId: string,
  customerId: string,
  invoiceId: string,
  to: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  paymentLink?: string,
  pdfContent?: Buffer
): Promise<SendEmailResult> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount)

  const subject = `Invoice #${invoiceNumber} - ${formattedAmount}`

  const body = `
Thank you for your business!

Invoice #${invoiceNumber}
Amount Due: ${formattedAmount}
Due Date: ${dueDate}

${paymentLink ? `Pay online: ${paymentLink}` : ""}

If you have any questions about this invoice, please reply to this email.

Thank you!
  `.trim()

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Invoice #${invoiceNumber}</h2>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">
          ${formattedAmount}
        </p>
        <p style="margin: 5px 0 0; color: #666;">
          Due: ${dueDate}
        </p>
      </div>

      ${
        paymentLink
          ? `
        <a href="${paymentLink}"
           style="display: inline-block; background: #007bff; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Pay Now
        </a>
      `
          : ""
      }

      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Thank you for your business! If you have any questions about this invoice,
        please reply to this email.
      </p>
    </div>
  `

  const attachments = pdfContent
    ? [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfContent,
          contentType: "application/pdf"
        }
      ]
    : undefined

  return sendEmail({
    to,
    subject,
    body,
    html,
    workspaceId,
    customerId,
    attachments
  })
}

// Send review request email
export async function sendReviewRequestEmail(
  workspaceId: string,
  customerId: string,
  jobId: string,
  to: string,
  customerName: string,
  reviewUrl: string
): Promise<SendEmailResult> {
  const subject = "How did we do? Leave us a review!"

  const body = `
Hi ${customerName},

Thank you for choosing us for your roofing project! We hope you're happy with the results.

If you have a moment, we'd really appreciate it if you could leave us a review. Your feedback helps us improve and helps other homeowners find quality roofing services.

Leave a review: ${reviewUrl}

Thank you again for your business!
  `.trim()

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">How did we do?</h2>

      <p>Hi ${customerName},</p>

      <p>Thank you for choosing us for your roofing project! We hope you're happy with the results.</p>

      <p>If you have a moment, we'd really appreciate it if you could leave us a review.
         Your feedback helps us improve and helps other homeowners find quality roofing services.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}"
           style="display: inline-block; background: #28a745; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Leave a Review
        </a>
      </div>

      <p>Thank you again for your business!</p>
    </div>
  `

  return sendEmail({
    to,
    subject,
    body,
    html,
    workspaceId,
    customerId,
    jobId
  })
}
