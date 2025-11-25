// components > weather > ChatWeatherLookup.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import WeatherLookupWidget from './WeatherLookupWidget';
import { Loader2, MapPin } from 'lucide-react';

// This must be a named export to match the import in message.tsx
export const ChatWeatherLookup = ({ 
  messageId, 
  messageContent = '',
  initialLocation = '', 
  autoSubmit = false
}: { 
  messageId: string, 
  messageContent?: string,
  initialLocation?: string,
  autoSubmit?: boolean
}) => {
  const [showWidget, setShowWidget] = useState(false);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [extractedLocation, setExtractedLocation] = useState<string | null>(null);
  const [isProcessingLocation, setIsProcessingLocation] = useState(false);
  const [locationConfidence, setLocationConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  
  // Clean and format location properly - preserves state/region information
  const cleanAndFormatLocation = (rawLocation: string): string => {
    if (!rawLocation) return '';
    
    // First check if it's a ZIP code
    const zipCodeMatch = rawLocation.match(/\b\d{5}(-\d{4})?\b/);
    if (zipCodeMatch) {
      // If it's a ZIP code, return just the ZIP code
      return zipCodeMatch[0];
    }
    
    // Clean but preserve state/province/country info
    let cleaned = rawLocation.trim()
      // Remove any leading or trailing punctuation
      .replace(/^[\s,.;:]+|[\s,.;:]+$/g, '')
      // Remove any "weather in" or similar prefix
      .replace(/^(?:weather|forecast|conditions)\s+(?:in|at|for|of)\s+/i, '')
      .replace(/^(?:what'?s?|how'?s?|is|are)\s+the\s+weather\s+(?:in|at|for|of)\s+/i, '')
      .trim();
    
    // Make sure we keep essential components like state/country codes
    // For US locations, preserve patterns like "City, ST" or "City, State"
    const cityStateMatch = cleaned.match(/^(.+),\s*([A-Za-z]{2})$/i);
    if (cityStateMatch) {
      // Properly format city, state
      return `${cityStateMatch[1].trim()}, ${cityStateMatch[2].toUpperCase()}`;
    }
    
    return cleaned;
  };
  
  // Find the user message from the previous elements
  const getUserMessage = (): string => {
    // Try to get the most recent user input from various sources
    
    // 1. Check URL parameters (often contains the search query)
    try {
      const pathSegments = window.location.pathname.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment.length > 3) {
        return decodeURIComponent(lastSegment.replace(/-/g, ' '));
      }
    } catch (e) {
      console.error("Error parsing URL path:", e);
    }
    
    // 2. Check URL search params
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q') || urlParams.get('query');
      if (query) return query;
    } catch (e) {
      console.error("Error parsing URL params:", e);
    }
    
    // 3. Try to find message in DOM
    try {
      // Find the last user message before this assistant message
      const userMessages = document.querySelectorAll('[data-role="user"]');
      if (userMessages && userMessages.length > 0) {
        return userMessages[userMessages.length - 1].textContent || '';
      }
    } catch (e) {
      console.error("Error finding user message in DOM:", e);
    }
    
    return '';
  };
  
  // Extract location using the dedicated API endpoint
  const extractLocationAPI = async (input: string): Promise<string | null> => {
    try {
      console.log("Calling location extraction API");
      const response = await fetch('/api/chat/extract-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.location) {
          setLocationConfidence('high');
          console.log("API successfully extracted location:", data.location);
          return cleanAndFormatLocation(data.location);
        }
      } else {
        console.warn("Location API returned status:", response.status);
      }
      
      return null;
    } catch (error) {
      console.error("Error in location extraction API:", error);
      return null;
    }
  };
  
  // Extract location using fallback LLM methods
  const extractLocationWithLLM = async (input: string): Promise<string | null> => {
    setIsProcessingLocation(true);
    
    try {
      // First try our dedicated API endpoint
      const apiLocation = await extractLocationAPI(input);
      if (apiLocation) return apiLocation;
      
      // Next try any available AI assistant API as fallback
      const chatEndpoint = '/api/chat';
      
      const systemPrompt = `
You are a location extraction assistant. Extract ONLY the location (city, state, ZIP code) from the weather-related query.
If it contains a full address, extract JUST the city, state or ZIP code.
Return ONLY the location name - nothing else, no explanation, no JSON, just the location as a string.
IMPORTANT: Always include state abbreviations like "TN" if present.
`;
      
      const prompt = `
Extract ONLY the location from this weather-related query. Return JUST the location name or ZIP.
Make sure to include state information if present (like "TN" in "Cordova, TN").
Query: "${input}"
`;
      
      try {
        const response = await fetch(chatEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            model: 'gpt-3.5-turbo' // or whatever model your API uses
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract the assistant's response - format depends on your API
          const location = data.content || data.message?.content || data.choices?.[0]?.message?.content;
          
          if (location && typeof location === 'string' && location.length > 1) {
            // Clean up any quotes or extra text
            const cleanLocation = location
              .trim()
              .replace(/^["']|["']$/g, '')
              .replace(/^Location:\s*/i, '')
              .replace(/\.$/, '')
              .trim();
              
            // Skip responses that are too generic
            if (['unknown', 'not specified', 'no location'].includes(cleanLocation.toLowerCase())) {
              throw new Error('Location not specific enough');
            }
            
            setLocationConfidence('medium');
            return cleanAndFormatLocation(cleanLocation);
          }
        }
      } catch (e) {
        console.warn('AI API location extraction failed, falling back to pattern matching:', e);
      }
      
      // FALLBACK: If API calls fail, use pattern matching
      const patternLocation = extractLocationWithPatterns(input);
      if (patternLocation) {
        setLocationConfidence('low');
      }
      return patternLocation;
    } catch (error) {
      console.error('Location extraction error:', error);
      return extractLocationWithPatterns(input);
    } finally {
      setIsProcessingLocation(false);
    }
  };
  
  // Enhanced pattern matching for location extraction
  const extractLocationWithPatterns = (text: string): string | null => {
    if (!text) return null;
    
    // Check all formats of explicit markers
    // 1. Check for explicit tag markers (highest priority)
    const triggerMatch = text.match(/\[TRIGGER_WEATHER_LOOKUP:([^\]]+)\]/i);
    if (triggerMatch && triggerMatch[1]) {
      setLocationConfidence('high');
      return cleanAndFormatLocation(triggerMatch[1].trim());
    }
    
    // 2. Check for other standardized markers
    const weatherLocMatch = text.match(/\[WEATHER_LOCATION:([^\]]+)\]/i);
    if (weatherLocMatch && weatherLocMatch[1]) {
      setLocationConfidence('high');
      return cleanAndFormatLocation(weatherLocMatch[1].trim());
    }
    
    // 3. Check for HTML comment markers (also high priority)
    const htmlCommentMatch = text.match(/<!--\s*WEATHER_WIDGET_LOCATION:([^>]+)\s*-->/i);
    if (htmlCommentMatch && htmlCommentMatch[1]) {
      setLocationConfidence('high');
      return cleanAndFormatLocation(htmlCommentMatch[1].trim());
    }
    
    // 4. ZIP code detection has high priority
    const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (zipMatch && zipMatch[1]) {
      // Verify it's likely a US ZIP code (basic validation)
      const zipNum = parseInt(zipMatch[1].substring(0, 5), 10);
      if (zipNum >= 501 && zipNum <= 99950) {
        setLocationConfidence('high');
        return zipMatch[1];
      }
    }
    
    // Common patterns for weather-related location extraction
    const patterns = [
      // Direct "weather in X" patterns - CAPTURE FULL LOCATION INCLUDING STATE
      /weather\s+in\s+([A-Za-z][A-Za-z\s,.'-]+?(?:,\s*[A-Za-z]{2})?)(?:$|\s|\?|\.)/i,
      
      // "weather for X" pattern - PRESERVE STATE
      /weather\s+for\s+([A-Za-z][A-Za-z\s,.'-]+?(?:,\s*[A-Za-z]{2})?)(?:$|\s|\?|\.)/i,
      
      // "X weather" pattern (less reliable)
      /([A-Za-z][A-Za-z\s,.'-]+?(?:,\s*[A-Za-z]{2})?)\s+weather/i,
      
      // "roof/roofing in X" pattern - PRESERVE STATE
      /roof(?:ing)?\s+(?:in|at|for)\s+([A-Za-z][A-Za-z\s,.'-]+?(?:,\s*[A-Za-z]{2})?)(?:$|\s|\?|\.)/i,
      
      // "project/property in X" pattern
      /(?:project|property|job site)\s+(?:in|at|for)\s+([A-Za-z][A-Za-z\s,.'-]+?(?:,\s*[A-Za-z]{2})?)(?:$|\s|\?|\.)/i,
      
      // Simple city/state format (more reliable with the comma)
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\b/,
      
      // Simple city name as last resort
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Clean and validate the match without losing state information
        const location = match[1].trim();
        
        // Skip very short or common words that might be false positives
        if (location.length < 3) continue;
        if (['the', 'for', 'and', 'this', 'there', 'current', 'today', 'tomorrow', 'weather'].includes(location.toLowerCase())) {
          continue;
        }
        
        setLocationConfidence('low');
        return cleanAndFormatLocation(location);
      }
    }
    
    return null;
  };
  
  // Process and determine the best location on component mount
  useEffect(() => {
    const processLocation = async () => {
      // If initialLocation is provided directly, use it (highest priority)
      if (initialLocation && initialLocation.trim() !== '') {
        console.log("Using provided initialLocation:", initialLocation);
        const formattedLocation = cleanAndFormatLocation(initialLocation.trim());
        setExtractedLocation(formattedLocation);
        setLocationConfidence('high');
        
        // Auto-expand if auto-submit is requested
        if (autoSubmit) {
          setShowWidget(true);
          setAutoExpanded(true);
        }
        return;
      }
      
      // Check if the message content itself contains explicit weather markers
      const explicitLocationInMessage = extractLocationWithPatterns(messageContent);
      if (explicitLocationInMessage) {
        console.log("Found explicit weather location in message:", explicitLocationInMessage);
        setExtractedLocation(explicitLocationInMessage);
        
        // Auto-expand for explicit markers
        setShowWidget(true);
        setAutoExpanded(true);
        return;
      }
      
      // Get user message for context if we haven't found a location yet
      const userMessage = getUserMessage();
      
      // Combine sources for location extraction
      const sourceText = [userMessage, messageContent]
        .filter(Boolean)
        .join(" | ");
      
      try {
        // First try pattern matching for immediate display
        const patternLocation = extractLocationWithPatterns(sourceText);
        if (patternLocation) {
          console.log("Found location via pattern matching:", patternLocation);
          setExtractedLocation(patternLocation);
        }
        
        // Then try LLM extraction for better accuracy
        const llmLocation = await extractLocationWithLLM(sourceText);
        if (llmLocation) {
          console.log("Found location via LLM:", llmLocation);
          setExtractedLocation(llmLocation);
        } else if (!patternLocation) {
          // If LLM and pattern matching both failed, use default
          console.log("Failed to extract location, using default");
          setExtractedLocation(null);
        }
      } catch (error) {
        console.error('Error processing location:', error);
      }
      
      // Auto-expand based on content triggers
      const shouldAutoExpand = 
        messageContent.includes('[WEATHER_LOOKUP]') || 
        messageContent.includes('[TRIGGER_WEATHER_LOOKUP') ||
        messageContent.includes('<!-- WEATHER_WIDGET_LOCATION:') ||
        autoSubmit;
        
      if (shouldAutoExpand) {
        console.log("Auto-expanding weather widget due to trigger");
        setShowWidget(true);
        setAutoExpanded(true);
      }
    };
    
    processLocation();
  }, [messageContent, initialLocation, autoSubmit]);

  // Toggle the widget visibility
  const toggleWidget = () => {
    setShowWidget(!showWidget);
  };

  // Determine the button text based on extracted location
  const getButtonText = () => {
    if (isProcessingLocation) {
      return "Processing location...";
    }
    
    if (extractedLocation) {
      return `Check weather for ${extractedLocation}`;
    }
    
    return "Look up roof weather for property";
  };

  return (
    <div className="">
      {!showWidget ? (
        <div className="flex flex-col space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleWidget}
            className="border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
            disabled={isProcessingLocation}
          >
            {isProcessingLocation ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 size-4 animate-spin" />
                {getButtonText()}
              </div>
            ) : (
              <div className="flex items-center">
                <MapPin className="mr-2 size-4" />
                {getButtonText()}
              </div>
            )}
          </Button>
          <div className="text-xs italic text-gray-500">
            Weather data specifically optimized for roofing conditions
          </div>
        </div>
      ) : (
        <div className="">
          {/* <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Property Weather Lookup</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleWidget}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div> */}
          <WeatherLookupWidget 
            initialLocation={extractedLocation || ''} 
            autoFocus={!autoExpanded} 
            autoSubmit={autoExpanded} 
          />
        </div>
      )}
    </div>
  );
};