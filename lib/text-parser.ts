
// lib > text-parser.ts

/**
 * Extract potential location information from a text message
 * Uses regex patterns to identify common location formats
 */
export function extractLocation(text: string): string | null {
    if (!text) return null;
    
    const textLower = text.toLowerCase();
    
    // Common patterns for location mentions
    const patterns = [
      // "weather in [location]" pattern
      /weather\s+in\s+([a-z\s,]+)(?:\?|\.|\s|$)/i,
      
      // "weather for [location]" pattern
      /weather\s+for\s+([a-z\s,]+)(?:\?|\.|\s|$)/i,
      
      // "roof in [location]" pattern
      /roof(?:ing)?\s+(?:weather\s+)?(?:in|at|for)\s+([a-z\s,]+)(?:\?|\.|\s|$)/i,
      
      // "[location] weather" pattern (less reliable, use as fallback)
      /(?:^|\s|,)([a-z]+(?:\s+[a-z]+){0,2})\s+weather/i,
      
      // "in [location]" general pattern (least reliable)
      /\sin\s+([a-z]+(?:,?\s+[a-z]+){0,3})(?:\?|\.|\s|$)/i,
    ];
    
    // Try each pattern in order of reliability
    for (const pattern of patterns) {
      const match = textLower.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted location
        let location = match[1].trim();
        
        // Remove trailing punctuation
        location = location.replace(/[,\.\?!\s]+$/, '');
        
        // Skip very short or common words that might be false positives
        if (location.length < 3 || ['the', 'for', 'and', 'this', 'there'].includes(location)) {
          continue;
        }
        
        return location;
      }
    }
    
    // Check for US ZIP codes
    const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (zipMatch && zipMatch[1]) {
      return zipMatch[1];
    }
    
    return null;
  }