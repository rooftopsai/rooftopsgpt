// lib/property/address-detection.ts

// Interface for detected address
export interface DetectedAddress {
    fullAddress: string;
    streetNumber: string;
    streetName: string;
    city?: string;
    state?: string;
    zipCode?: string;
    confidence: number;
  }
  
  /**
   * Uses OpenAI to detect addresses in user messages
   */
  export async function detectAddress(message: string): Promise<DetectedAddress | null> {
    try {
      const systemPrompt = `You are an address extraction assistant. 
      Identify US property addresses in the text. If an address is found, extract its components.
      Return NULL if no valid property address is found.
      Only respond with a JSON object, no other text.`;
  
      const userPrompt = `Extract any property address from this text: "${message}"`;
  
      // Format messages for OpenAI
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
  
      // Use function calling to extract structured data
      const functions = [
        {
          name: 'extract_address',
          description: 'Extract a property address from text',
          parameters: {
            type: 'object',
            properties: {
              fullAddress: {
                type: 'string',
                description: 'The complete address as a single string'
              },
              streetNumber: {
                type: 'string',
                description: 'The street number of the address'
              },
              streetName: {
                type: 'string',
                description: 'The street name of the address'
              },
              city: {
                type: 'string',
                description: 'The city of the address'
              },
              state: {
                type: 'string',
                description: 'The state of the address'
              },
              zipCode: {
                type: 'string',
                description: 'The ZIP code of the address'
              },
              confidence: {
                type: 'number',
                description: 'Confidence score from 0 to 1 that this is a valid property address'
              }
            },
            required: ['fullAddress', 'confidence']
          }
        }
      ];
  
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages,
          functions,
          function_call: { name: 'extract_address' },
          temperature: 0.1
        })
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
  
      const data = await response.json();
      
      // Parse the function call arguments if available
      if (
        data.choices && 
        data.choices[0]?.message?.function_call?.name === 'extract_address'
      ) {
        const args = JSON.parse(data.choices[0].message.function_call.arguments);
        
        // Only return if we have high confidence
        if (args.confidence > 0.7) {
          return args as DetectedAddress;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting address:', error);
      return null;
    }
  }