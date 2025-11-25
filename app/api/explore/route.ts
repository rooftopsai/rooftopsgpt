import { NextResponse } from 'next/server';
import { PropertyResearchService } from '@/lib/property/property-service';
import { DetectedAddress } from '@/lib/property/address-detection';

interface EnhancedAnalysis {
  rawAnalysis: string;
  structuredData: {
    facetCount: number | null;
    ridgeLength: number | null;
    valleyLength: number | null;
    complexity: string | null;
    confidence: string | null;
  };
}

interface ExploreRequestBody {
  lat: number;
  lng: number;
  address?: string;
  workspaceId?: string;
  enhancedAnalysis?: EnhancedAnalysis;
  measuredArea?: number;
}

// Handle reverse geocoding (get address from lat/lng)
export async function POST(request: Request) {
  try {
    console.log('API route called - starting to process request');
    
    // Clone the request before using it so we can log the body
    const requestClone = request.clone();
    const requestBody = await requestClone.text();
    console.log('Request body:', requestBody);
    
    // Extract parameters from request
    const { 
      lat, 
      lng, 
      address: providedAddress, 
      workspaceId, 
      enhancedAnalysis, 
      measuredArea 
    }: ExploreRequestBody = await request.json();
    
    console.log(`Processing coordinates: ${lat}, ${lng}, workspace: ${workspaceId || 'not provided'}`);
    
    if (!lat || !lng) {
      console.log('Missing required parameters: lat and lng are required');
      return NextResponse.json(
        { error: 'Latitude and longitude are required' }, 
        { status: 400 }
      );
    }
    
    // Use Google Maps Reverse Geocoding API
    const apiKey = process.env.GOOGLEMAPS_API_KEY;
    
    if (!apiKey) {
      console.error('API key not configured');
      return NextResponse.json(
        { error: 'API key not configured' }, 
        { status: 500 }
      );
    }
    
    // Make request to Google's Reverse Geocoding API
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    console.log('Making request to Google Maps API (API key masked)');
    
    const response = await fetch(url);
    console.log(`Google API response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return NextResponse.json(
        { error: `Reverse geocoding API error: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Received geocode data with status:', data.status);
    
    // Check if the geocoding was successful
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error(`Reverse geocoding failed: ${data.status}`);
      return NextResponse.json(
        { error: `Reverse geocoding failed: ${data.status}` }, 
        { status: 400 }
      );
    }
    
    // Extract address components
    const addressResult = data.results[0];
    const fullAddress = providedAddress || addressResult.formatted_address;
    console.log(`Using address: ${fullAddress}`);
    
    // Format as DetectedAddress
    const detectedAddress: DetectedAddress = {
      fullAddress,
      street: extractAddressComponent(addressResult, 'route'),
      city: extractAddressComponent(addressResult, 'locality'),
      state: extractAddressComponent(addressResult, 'administrative_area_level_1'),
      zip: extractAddressComponent(addressResult, 'postal_code'),
      country: extractAddressComponent(addressResult, 'country')
    };
    
    console.log('Created address object:', detectedAddress);
    
    // Get property data
    console.log('Creating PropertyResearchService');
    const propertyService = new PropertyResearchService();
    
    console.log('Calling researchProperty');
    try {
      const propertyData = await propertyService.researchProperty(detectedAddress);
      console.log('Property research complete');
      
      // Enhanced analysis processing
      let enhancedPropertyData = { ...propertyData };
      
      if (enhancedAnalysis) {
        console.log('Enhanced analysis data available, incorporating into report');
        
        // Extract data from LLM analysis
        const { structuredData } = enhancedAnalysis;
        
        // Update property data with enhanced measurements
        if (structuredData.facetCount) {
          console.log(`Updating roof facets from ${enhancedPropertyData.roofFacets || 'unknown'} to ${structuredData.facetCount}`);
          enhancedPropertyData.roofFacets = structuredData.facetCount;
        }
        
        if (structuredData.ridgeLength) {
          console.log(`Updating ridge length from ${enhancedPropertyData.ridgeLength || 'unknown'} to ${structuredData.ridgeLength}`);
          enhancedPropertyData.ridgeLength = structuredData.ridgeLength;
        }
        
        if (structuredData.valleyLength) {
          console.log(`Updating valley length from ${enhancedPropertyData.valleyLength || 'unknown'} to ${structuredData.valleyLength}`);
          enhancedPropertyData.valleyLength = structuredData.valleyLength;
        }
        
        // Add additional analysis data
        enhancedPropertyData.roofComplexity = structuredData.complexity || enhancedPropertyData.roofComplexity;
        enhancedPropertyData.analysisConfidence = structuredData.confidence;
        
        // Include the raw analysis text
        enhancedPropertyData.llmAnalysis = enhancedAnalysis.rawAnalysis;
      }
      
      // Include measured area if provided
      if (measuredArea) {
        console.log(`Incorporating manually measured area: ${measuredArea} sq ft`);
        enhancedPropertyData.measuredArea = measuredArea;
      }
      
      return NextResponse.json({
        address: detectedAddress,
        propertyData: enhancedPropertyData
      });
    } catch (researchError) {
      console.error('Error during property research:', researchError);
      throw researchError; // Rethrow to be caught by the outer try/catch
    }
    
  } catch (error: any) {
    console.error('Error in explore API:', error);
    
    // Log the stack trace for more detail
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: error?.message || 'Failed to process location data' }, 
      { status: 500 }
    );
  }
}

// Helper to extract address components
function extractAddressComponent(addressResult: any, type: string): string {
  try {
    const component = addressResult.address_components.find(
      (comp: any) => comp.types.includes(type)
    );
    return component ? component.short_name : '';
  } catch (error) {
    console.error(`Error extracting address component ${type}:`, error);
    return '';
  }
}