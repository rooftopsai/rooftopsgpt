import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  IconMap,
  IconSun,
  IconHome,
  IconArrowsMaximize,
  IconCalendar,
  IconCash
} from '@tabler/icons-react';

interface PropertyReportProps {
  data: any;
}

const PropertyReport: React.FC<PropertyReportProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!data) return null;
  
  const { address, property, solar, financial } = data;
  
  return (
    <Card className="overflow-hidden border-0 bg-gray-900 text-white shadow-lg">
      <CardHeader className="border-b border-gray-700 bg-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl font-bold">
            <IconHome size={20} className="mr-2 text-purple-400" />
            Property Report
          </CardTitle>
          <Badge className="bg-purple-600">
            Generated Report
          </Badge>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-800 px-4 pt-2">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
            <TabsTrigger value="solar" className="data-[state=active]:bg-gray-700">Solar Potential</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-gray-700">Financial</TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-gray-700">Raw Data</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="max-h-96 overflow-y-auto p-4">
          <TabsContent value="overview" className="mt-2">
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-800 p-4">
                <h3 className="mb-2 flex items-center text-sm font-medium text-purple-400">
                  <IconMap size={16} className="mr-1" />
                  Property Details
                </h3>
                <p className="mb-2 text-sm text-gray-300">
                  <span className="font-medium">Address:</span> {address?.fullAddress || 'N/A'}
                </p>
                {property?.size && (
                  <p className="mb-2 text-sm text-gray-300">
                    <span className="font-medium">Property Size:</span> {property.size} sq ft
                  </p>
                )}
                {property?.yearBuilt && (
                  <p className="mb-2 text-sm text-gray-300">
                    <span className="font-medium">Year Built:</span> {property.yearBuilt}
                  </p>
                )}
                {property?.type && (
                  <p className="mb-2 text-sm text-gray-300">
                    <span className="font-medium">Property Type:</span> {property.type}
                  </p>
                )}
                {property?.bedrooms && (
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Bedrooms/Bathrooms:</span> {property.bedrooms}bd / {property.bathrooms || 'N/A'}ba
                  </p>
                )}
              </div>
              
              {/* Roof Information */}
              {data.enhancedAnalysis?.structuredData && (
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-2 flex items-center text-sm font-medium text-purple-400">
                    <IconArrowsMaximize size={16} className="mr-1" />
                    Roof Analysis Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-medium">Roof Facets:</span> {data.enhancedAnalysis.structuredData.facetCount || 'N/A'}
                      </p>
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-medium">Roof Area:</span> {data.enhancedAnalysis.structuredData.roofArea ? `${data.enhancedAnalysis.structuredData.roofArea} sq ft` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-medium">Complexity:</span> {data.enhancedAnalysis.structuredData.complexity || 'N/A'}
                      </p>
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-medium">Confidence:</span> {data.enhancedAnalysis.structuredData.confidence || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="solar" className="mt-2">
            <div className="rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 flex items-center text-sm font-medium text-purple-400">
                <IconSun size={16} className="mr-1" />
                Solar Potential
              </h3>
              
              {solar?.potential ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Solar Rating:</span> {solar.rating || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Estimated Capacity:</span> {solar.capacity ? `${solar.capacity} kW` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Annual Production:</span> {solar.annualProduction ? `${solar.annualProduction} kWh` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Roof Coverage:</span> {solar.coverage ? `${solar.coverage}%` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Optimal Panel Count:</span> {solar.optimalPanels || 'N/A'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-300">Solar potential data not available.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="financial" className="mt-2">
            <div className="rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 flex items-center text-sm font-medium text-purple-400">
                <IconCash size={16} className="mr-1" />
                Financial Analysis
              </h3>
              
              {financial ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Estimated Installation Cost:</span> {financial.installationCost ? `$${financial.installationCost.toLocaleString()}` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Monthly Savings:</span> {financial.monthlySavings ? `$${financial.monthlySavings.toLocaleString()}` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Payback Period:</span> {financial.paybackPeriod ? `${financial.paybackPeriod} years` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">20-Year ROI:</span> {financial.roi ? `${financial.roi}%` : 'N/A'}
                  </p>
                  {financial.incentives && (
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Available Incentives:</span> {financial.incentives}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-300">Financial data not available.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="data" className="mt-2">
            <div className="rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-purple-400">Raw Report Data</h3>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-gray-300">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default PropertyReport;