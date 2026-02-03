import { NextResponse } from "next/server"
import { execSync } from "child_process"

const GMAIL_USER = "steeleagentic@gmail.com"
const GMAIL_APP_PASS = "hykthkubqorybvnb" // App password

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      )
    }

    // Send coupon email via Gmail SMTP
    const emailSent = await sendCouponEmail(email)

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: "Coupon email sent successfully"
      })
    } else {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error sending coupon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function sendCouponEmail(toEmail: string): Promise<boolean> {
  const couponCode = "FREEMONTHFORME"
  const discount = "$29"
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Free Month of Rooftops AI</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1A1A1A;
            margin-bottom: 10px;
        }
        .tagline {
            color: #24BDEB;
            font-size: 14px;
        }
        h1 {
            color: #1A1A1A;
            font-size: 24px;
            margin: 30px 0 20px 0;
            text-align: center;
        }
        .coupon-box {
            background: linear-gradient(135deg, #24BDEB 0%, #4FEBBC 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
        }
        .coupon-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
            opacity: 0.9;
        }
        .coupon-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 3px;
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 8px;
            border: 2px dashed rgba(255,255,255,0.5);
        }
        .value {
            font-size: 48px;
            font-weight: bold;
            margin: 15px 0;
        }
        .features {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
        }
        .features h3 {
            margin-top: 0;
            color: #1A1A1A;
        }
        .features ul {
            margin: 15px 0;
            padding-left: 20px;
        }
        .features li {
            margin: 10px 0;
            color: #555;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #24BDEB 0%, #4FEBBC 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .expires {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏠 Rooftops AI</div>
            <div class="tagline">AI-Powered Tools for Roofing Contractors</div>
        </div>
        
        <h1>Here's Your Free Month!</h1>
        
        <p>Thanks for your interest in Rooftops AI! As promised, here's your exclusive coupon code for <strong>1 FREE MONTH</strong> of our Premium subscription.</p>
        
        <div class="coupon-box">
            <div class="coupon-label">Your Coupon Code</div>
            <div class="value">${discount} OFF</div>
            <div class="coupon-code">${couponCode}</div>
            <p style="margin-top: 15px; opacity: 0.9;">1 Month Free of Rooftops Premium</p>
        </div>
        
        <div class="features">
            <h3>What You'll Get with Premium:</h3>
            <ul>
                <li><strong>20 AI Roof Reports/month</strong> — Instant satellite measurements</li>
                <li><strong>AI Cost Estimates</strong> — Build accurate bids in minutes</li>
                <li><strong>1,000 AI Chat Messages</strong> — Your personal roofing assistant</li>
                <li><strong>Professional Proposals</strong> — Close more deals with branded docs</li>
                <li><strong>GPT-5 Powered Analysis</strong> — Best-in-class AI technology</li>
            </ul>
        </div>
        
        <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #24BDEB;">
            <h3 style="margin-top: 0; color: #1A1A1A;">📚 New to AI?</h3>
            <p style="margin-bottom: 15px; color: #555;">
                Download our <strong>7-Day Roofing AI Quick-Start Guide</strong> — a free step-by-step 
                playbook to transform your business with AI in just one week.
            </p>
            <a href="https://rooftops.ai/quickstart-guide" style="color: #24BDEB; font-weight: 600; text-decoration: none;">
                Get the Free Guide →
            </a>
        </div>
        
        <div style="text-align: center;">
            <a href="https://rooftops.ai/login" class="cta-button">Claim Your Free Month →</a>
        </div>
        
        <div class="expires">
            <strong>⏰ Limited Time Offer:</strong> This coupon expires in 7 days. Don't miss out on transforming how you run your roofing business.
        </div>
        
        <p style="text-align: center; color: #666; font-size: 14px;">
            Questions? Reply to this email or contact us at team@rooftops.ai
        </p>
        
        <div class="footer">
            <p><strong>Rooftops AI</strong></p>
            <p>AI-powered tools for roofing contractors who want to win more jobs.</p>
            <p style="margin-top: 15px;">© 2024 Rooftops AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

  const plainContent = `Rooftops AI - Your Free Month Coupon

Thanks for your interest in Rooftops AI!

YOUR COUPON CODE: ${couponCode}
VALUE: ${discount} off (1 Month Free of Premium)

What You'll Get:
• 20 AI Roof Reports/month
• AI Cost Estimates  
• 1,000 AI Chat Messages
• Professional Proposals
• GPT-5 Powered Analysis

Claim your free month: https://rooftops.ai/login

This coupon expires in 7 days.

Questions? Contact us at team@rooftops.ai

© 2024 Rooftops AI`

  try {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    const emailContent = [
      `From: Rooftops AI <${GMAIL_USER}>`,
      `To: ${toEmail}`,
      `Subject: 🎁 Your Free Month of Rooftops AI - Coupon Inside`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      plainContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`
    ].join('\n')

    const curlCommand = `echo '${emailContent.replace(/'/g, "'\"'\"'")}' | curl -s --url "smtps://smtp.gmail.com:465" \
      --ssl-reqd \
      --mail-from "${GMAIL_USER}" \
      --mail-rcpt "${toEmail}" \
      --user "${GMAIL_USER}:${GMAIL_APP_PASS}" \
      --upload-file -`
    
    execSync(curlCommand, { stdio: 'pipe' })
    
    console.log(`✅ Coupon email sent to ${toEmail}`)
    return true
  } catch (error) {
    console.error("Failed to send coupon email:", error)
    return false
  }
}