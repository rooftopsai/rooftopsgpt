// app > api > geocode > route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Extract address from request body
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' }, 
        { status: 400 }
      );
    }

    // URL encode the address
    const encodedAddress = encodeURIComponent(address);
    
    // Use server-side environment variable (no NEXT_PUBLIC_ prefix)
    const apiKey = process.env.GOOGLEMAPS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' }, 
        { status: 500 }
      );
    }
    
    // Make request to Google Maps Geocoding API
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    return NextResponse.json(
      { error: `Geocoding API error: ${response.status} ${response.statusText}` }, 
      { status: response.status }
    );
  }

  const data = await response.json();

  // Check if Google API returned an error status
  if (data.status !== 'OK') {
    return NextResponse.json(
      { error: `Geocoding failed with status: ${data.status}, error: ${data.error_message || 'No results found'}` }, 
      { status: 400 }
    );
  }

  // Return geocoding data to client
  return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in geocode API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}