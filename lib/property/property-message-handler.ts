// lib/property/property-message-handler.ts

import { detectAddress, DetectedAddress } from './address-detection';

// Updated result interface to include analysis data for the robust report
export interface PropertyMessageResult {
  type: 'text' | 'property_report';
  content: string;
  reportData?: any;
  analysisData?: any;
  metadata?: {
    address?: DetectedAddress;
    timestamp: string;
  };
}

/**
 * Handles user messages, detecting property addresses and generating reports
 */
export class PropertyMessageHandler {
  /**
   * Process a user message, handling property address detection and research
   */
  async handleMessage(message: string): Promise<PropertyMessageResult | null> {
    try {
      // First check if this contains a property address
      const address = await detectAddress(message);
      
      // If no address found, return null to let the normal chat flow handle it
      if (!address) {
        return null;
      }
      
      // Show some initial response while we process
      console.log(`Detected address: ${address.fullAddress}`);
      
      // Use the API route instead of direct service call
      const response = await fetch('/api/property-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API returned ${response.status}`);
      }
      
      const { propertyData, reportData, analysisData } = await response.json();
      
      // Return the property report message with additional data for the CombinedReport
      return {
        type: 'property_report',
        content: `Here's your property report for ${address.fullAddress}:`,
        reportData,
        analysisData,
        metadata: {
          address,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error in property message handler:', error);
      
      // Return an error message
      return {
        type: 'text',
        content: `I encountered an issue while processing your property request. ${error.message}`,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}