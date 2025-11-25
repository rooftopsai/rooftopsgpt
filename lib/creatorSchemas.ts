// lib/creatorSchemas.ts

export type FieldType = 
  | { name: string; label: string; type: "text" | "textarea" | "select"; options?: string[] }
  | { name: string; label: string; type: "number" }
  | { name: string; label: string; type: "date" };

export interface ToolSchema {
  title: string;
  description: string;
  fields: FieldType[];
  buildPrompt: (values: Record<string, any>) => string;
}

export const toolSchemas: Record<string,ToolSchema> = {
  marketing: {
    title: "Marketing Email",
    description: "Generate a sales or marketing email",
    fields: [
      { name: "recipientName", label: "Recipient Name", type: "text" },
      { name: "companyName",   label: "Company / Service", type: "text" },
      { name: "productDesc",   label: "Product/Service Description", type: "textarea" },
      { name: "tone",          label: "Tone", type: "select", options: ["Friendly","Formal","Urgent","Casual"] },
      { name: "callToAction",  label: "Call to Action", type: "text" },
    ],
    buildPrompt: ({ recipientName, companyName, productDesc, tone, callToAction }) =>
      `You are a ${tone.toLowerCase()} marketing specialist. Write an email to ${recipientName} at ${companyName} introducing the following service:\n\n${productDesc}\n\nEnd with this call to action: ${callToAction}.`
  },

  contract: {
    title: "Contract Draft",
    description: "Create a service agreement template",
    fields: [
      { name: "clientName",     label: "Client Name", type: "text" },
      { name: "contractorName", label: "Contractor Name", type: "text" },
      { name: "scope",          label: "Scope of Work", type: "textarea" },
      { name: "paymentTerms",   label: "Payment Terms", type: "textarea" },
      { name: "termination",    label: "Termination Clause", type: "textarea" },
      { name: "governingLaw",   label: "Governing Law (state/country)", type: "text" },
    ],
    buildPrompt: ({ clientName, contractorName, scope, paymentTerms, termination, governingLaw }) =>
      `Draft a professional service agreement between ${clientName} (“Client”) and ${contractorName} (“Contractor”). The scope of work is:\n\n${scope}\n\nPayment terms:\n${paymentTerms}\n\nTermination clause:\n${termination}\n\nThis contract shall be governed by the laws of ${governingLaw}.`
  },

  invoice: {
    title: "Invoice Template",
    description: "Build a simple invoice",
    fields: [
      { name: "billTo",     label: "Bill To (Client)", type: "text" },
      { name: "invoiceNum", label: "Invoice Number", type: "text" },
      { name: "issueDate",  label: "Issue Date", type: "date" },
      { name: "dueDate",    label: "Due Date", type: "date" },
      { name: "items",      label: "Line Items (comma-sep: desc|qty|rate)", type: "textarea" },
    ],
    buildPrompt: ({ billTo, invoiceNum, issueDate, dueDate, items }) => {
      const lines = items
        .split("\n")
        .map(l => {
          const [desc, qty, rate] = l.split("|").map(s => s.trim());
          return `- ${desc}: ${qty} × $${rate} = $${(parseFloat(qty) * parseFloat(rate)).toFixed(2)}`;
        })
        .join("\n");
      return `Generate a clean invoice template:\nInvoice #: ${invoiceNum}\nBill To: ${billTo}\nIssue Date: ${issueDate}\nDue Date: ${dueDate}\n\nLine Items:\n${lines}\n\nInclude subtotals, taxes, and total due.`;
    }
  },

  hr: {
    title: "HR Policy",
    description: "Generate an employee handbook snippet",
    fields: [
      { name: "policyTopic", label: "Policy Topic", type: "select", options: ["Workplace Safety","Code of Conduct","Leave Policy","Remote Work"] },
      { name: "audience",    label: "Audience (e.g. All Staff)", type: "text" },
      { name: "length",      label: "Length (short/medium/long)", type: "select", options: ["Short","Medium","Long"] },
    ],
    buildPrompt: ({ policyTopic, audience, length }) =>
      `You are an HR manager. Write a ${length.toLowerCase()} policy section on ${policyTopic} aimed at ${audience}.`
  },

  recruit: {
    title: "Job Posting",
    description: "Write a job ad to recruit staff",
    fields: [
      { name: "role",         label: "Role Title", type: "text" },
      { name: "location",     label: "Location", type: "text" },
      { name: "responsibilities", label: "Key Responsibilities", type: "textarea" },
      { name: "requirements",    label: "Requirements", type: "textarea" },
      { name: "employmentType",  label: "Employment Type", type: "select", options: ["Full-time","Part-time","Contract"] },
    ],
    buildPrompt: ({ role, location, responsibilities, requirements, employmentType }) =>
      `Create a ${employmentType.toLowerCase()} job posting for a “${role}” in ${location}. Responsibilities:\n${responsibilities}\n\nRequirements:\n${requirements}.`
  },

  admin: {
    title: "Office Memo",
    description: "Produce an internal memo or SOP",
    fields: [
      { name: "subject",   label: "Subject", type: "text" },
      { name: "audience",  label: "Audience", type: "text" },
      { name: "body",      label: "Body / Key Points", type: "textarea" },
      { name: "tone",      label: "Tone", type: "select", options: ["Formal","Informal","Urgent","Friendly"] },
    ],
    buildPrompt: ({ subject, audience, body, tone }) =>
      `Draft an internal memo with subject “${subject}” for ${audience}. Tone: ${tone.toLowerCase()}. Content:\n${body}`
  },
};
