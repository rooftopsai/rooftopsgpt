// lib/creatorTools.ts
export interface CreatorTool {
    id: string
    title: string
    description: string
    formFields: Array<{
      key: string
      label: string
      type: 'text' | 'textarea' | 'select'
      placeholder?: string
      options?: string[]
    }>
    template: string
  }
  
  export const creatorTools: CreatorTool[] = [
    {
      id: 'weekly-schedule',
      title: 'Weekly Crew Schedule Builder',
      description: 'Produce a clear, date-by-date crew schedule from addresses & windows.',
      formFields: [
        { key: 'appointments', label: 'Client appointments (JSON array)', type: 'textarea', placeholder: '[{"address":"…","window":"…"}]' },
        { key: 'crewCount',    label: 'Number of crews',                type: 'text',     placeholder: 'e.g. 3'          },
      ],
      template: `
  You are an operations manager.  Given this JSON list of appointments:
  {{appointments}}
  and {{crewCount}} crews, generate a week-long schedule assigning crews to addresses per day.
  `,
    },
    {
      id: 'roofing-estimate',
      title: 'Roofing Estimate Template',
      description: 'Create a material & labor cost estimate for a shingle roof.',
      formFields: [
        { key: 'area',          label: 'Roof area (sq ft)',              type: 'text',     placeholder: 'e.g. 3500'         },
        { key: 'materialCost',  label: 'Material cost per sq ft ($)',     type: 'text',     placeholder: 'e.g. 2.50'         },
        { key: 'laborRate',     label: 'Labor cost per sq ft ($)',        type: 'text',     placeholder: 'e.g. 1.75'         },
      ],
      template: `
  You are a sales rep.  For a {{area}} sq ft asphalt shingle roof, with material at ${{materialCost}}/sq ft and labor at ${{laborRate}}/sq ft, produce a table of:
  • material cost
  • labor cost
  • total cost
  `,
    }
    // …4 more: Marketing Email, Sales Proposal, HR Recruiting, Contract Template…
  ]
  