'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExploreMap from '@/components/explore/ExploreMap';
import { PropertyReportMessage } from '@/components/property/property-report';
import { PropertyData } from '@/lib/property/property-service';

export default function ExplorePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [activeTab, setActiveTab] = useState('map');
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);

  const handlePropertySelect = (data: any) => {
    setPropertyData(data.propertyData);
    setActiveTab('report');
  };

  return (
    <div className="h-full flex-1 overflow-auto p-2">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        
        
        <TabsContent value="map" className="mt-0">
          <ExploreMap onPropertySelect={handlePropertySelect} workspaceId={workspaceId} />
        </TabsContent>
        
        <TabsContent value="report" className="mt-0">
          {propertyData ? (
            <PropertyReportMessage 
              message={{ content: `Property Report for ${propertyData.address.fullAddress}` }}
              reportData={{ 
                jsonData: {
                  property: {
                    address: propertyData.address.fullAddress,
                    details: propertyData.propertyDetails
                  },
                  roof: {
                    summary: {
                      area: propertyData.roofDetails.roofArea,
                      facets: propertyData.roofDetails.roofFacets,
                      pitch: propertyData.roofDetails.roofPitch,
                      totalRoofSquares: propertyData.roofDetails.totalRoofSquares || 0
                    },
                    facetDetails: propertyData.roofDetails.facets
                  },
                  solar: {
                    potential: {
                      maxPanels: propertyData.solarPotential.maxArrayPanels,
                      yearlyEnergy: propertyData.solarPotential.yearlyEnergyDcKwh,
                      sunshineHours: propertyData.solarPotential.sunshineHours
                    },
                    financials: propertyData.solarPotential.costsAndSavings
                  },
                  metadata: {
                    generated: propertyData.timestamp,
                    version: '1.0'
                  }
                }
              }}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-600">No property selected. Use the Map View to select a property.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}