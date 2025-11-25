// app/api/property-chat/route.ts
import { NextResponse } from 'next/server';
import { PropertyResearchService } from '@/lib/property/property-service';
import { PropertyReportGenerator } from '@/lib/property/report-generator';
import { DetectedAddress } from '@/lib/property/address-detection';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' }, 
        { status: 400 }
      );
    }
    
    console.log(`Processing address in API route: ${address.fullAddress}`);
    
    // Research the property
    const propertyService = new PropertyResearchService();
    const propertyData = await propertyService.researchProperty(address);
    
    // Generate the report
    const reportGenerator = new PropertyReportGenerator();
    const reportData = await reportGenerator.generateReport(propertyData);
    
    // Create a basic analysis object
    const analysisData = {
      rawAnalysis: `This is an automated analysis of the property at ${address.fullAddress}. The property has a roof area of approximately ${propertyData.roofDetails.roofArea.toFixed(0)} square feet with ${propertyData.roofDetails.roofFacets} facets.`,
      structuredData: {
        facetCount: propertyData.roofDetails.roofFacets,
        ridgeLength: 0, // These could be calculated or estimated
        valleyLength: 0,
        complexity: propertyData.roofDetails.roofFacets > 6 ? 'complex' : (propertyData.roofDetails.roofFacets > 3 ? 'moderate' : 'simple'),
        confidence: 'medium',
        userSummary: `This property has a ${propertyData.roofDetails.roofFacets > 6 ? 'complex' : (propertyData.roofDetails.roofFacets > 3 ? 'moderately complex' : 'simple')} roof with ${propertyData.roofDetails.roofFacets} facets and approximately ${propertyData.roofDetails.roofArea.toFixed(0)} square feet of roof area.`,
        roofAreaRange: [propertyData.roofDetails.roofArea * 0.9, propertyData.roofDetails.roofArea * 1.1],
        facetCountRange: [propertyData.roofDetails.roofFacets, propertyData.roofDetails.roofFacets],
        squaresRange: [Math.floor(propertyData.roofDetails.roofArea / 100), Math.ceil(propertyData.roofDetails.roofArea / 100)]
      }
    };
    
    return NextResponse.json({
      address,
      propertyData,
      reportData,
      analysisData
    });
  } catch (error: any) {
    console.error('Error in property research API:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to research property' }, 
      { status: 500 }
    );
  }
}