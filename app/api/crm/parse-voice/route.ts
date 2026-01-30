import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: Request) {
  try {
    const { transcript, parsePrompt } = await req.json()

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const defaultPrompt = `Extract customer information from the following voice transcript.
Return a JSON object with these fields (only include fields that are mentioned):
- name: Full name of the customer
- phone: Phone number (format as +1 XXX-XXX-XXXX if US)
- email: Email address
- address: Street address
- city: City name
- state: State abbreviation (2 letters)
- zip: ZIP code
- notes: Any additional notes or context
- propertyType: One of "residential", "commercial", "multi_family", "industrial"
- source: Lead source if mentioned (web_form, referral, storm_lead, door_knock, cold_call, google, facebook, other)
- status: Customer status if mentioned (lead, prospect, customer)

Only return valid JSON, no explanation.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: parsePrompt || defaultPrompt
        },
        {
          role: "user",
          content: `Voice transcript: "${transcript}"`
        }
      ],
      response_format: { type: "json_object" }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ parsed: {} })
    }

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({ parsed })
    } catch {
      return NextResponse.json({ parsed: {}, raw: content })
    }
  } catch (error) {
    console.error("Error parsing voice input:", error)
    return NextResponse.json(
      { error: "Failed to parse voice input" },
      { status: 500 }
    )
  }
}
