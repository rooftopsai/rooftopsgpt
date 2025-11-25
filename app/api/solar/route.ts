import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Extract coordinates from request body
    const { lat, lng } = await request.json();
    
    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' }, 
        { status: 400 }
      );
    }
    
    // Use server-side environment variable (no NEXT_PUBLIC_ prefix)
    const apiKey = process.env.GOOGLEMAPS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' }, 
        { status: 500 }
      );
    }
    
    // Make request to Google's Solar API
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: `Solar API error: ${response.status} ${response.statusText}`,
          details: errorText 
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Return solar data to client
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in solar API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}