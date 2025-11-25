// app/api/property-research/route.ts
import { NextResponse } from 'next/server';
import { PropertyResearchService } from '@/lib/property/property-service';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' }, 
        { status: 400 }
      );
    }
    
    const propertyService = new PropertyResearchService();
    const propertyData = await propertyService.researchProperty(address);
    
    return NextResponse.json({
      propertyData
    });
  } catch (error: any) {
    console.error('Error in property research API:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to research property' }, 
      { status: 500 }
    );
  }
}