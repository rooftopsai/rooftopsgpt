import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  IconMap,
  IconSun,
  IconHome,
  IconArrowsMaximize,
  IconCalendar,
  IconCash
} from "@tabler/icons-react"

interface PropertyReportProps {
  data: any
}

const PropertyReport: React.FC<PropertyReportProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState("overview")

  if (!data) return null

  const { address, property, solar, financial } = data

  return (
    <Card className="overflow-hidden border-0 bg-gray-900 text-white shadow-lg">
      <CardHeader className="border-b border-gray-700 bg-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl font-bold">
            <IconHome size={20} className="mr-2 text-purple-400" />
            Property Report
          </CardTitle>
          <Badge className="bg-purple-600">Generated Report</Badge>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-800 px-4 pt-2">
          <TabsList className="bg-gray-800">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gray-700"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="solar"
              className="data-[state=active]:bg-gray-700"
            >
              Solar Potential
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="data-[state=active]:bg-gray-700"
            >
              Financial
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-gray-700"
            >
              Raw Data
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="max-h-96 overflow-y-auto p-4">
          <TabsContent value="overview" className="mt-2">
            <div className="space-y-4">
              {/* Address Section */}
              {address?.fullAddress && (
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-2 flex items-center text-sm font-medium text-purple-400">
                    <IconMap size={16} className="mr-1" />
                    Property Address
                  </h3>
                  <p className="text-sm text-gray-300">{address.fullAddress}</p>
                </div>
              )}

              {/* Property Details - Card Grid */}
              <div className="rounded-lg bg-gray-800 p-4">
                <h3 className="mb-3 flex items-center text-sm font-medium text-purple-400">
                  <IconHome size={16} className="mr-1" />
                  Property Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Property Type Card */}
                  <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                    <div className="mb-1 text-xs text-gray-400">
                      Property Type:
                    </div>
                    <div className="text-sm font-medium text-gray-200">
                      {property?.type ||
                        data.enhancedAnalysis?.structuredData?.propertyType ||
                        "Unknown"}
                    </div>
                  </div>

                  {/* Year Built Card */}
                  <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                    <div className="mb-1 text-xs text-gray-400">
                      Year Built:
                    </div>
                    <div className="text-sm font-medium text-gray-200">
                      {property?.yearBuilt ||
                        data.enhancedAnalysis?.structuredData?.yearBuilt ||
                        "Unknown"}
                    </div>
                  </div>

                  {/* Ground Area Card */}
                  {(property?.size ||
                    data.enhancedAnalysis?.structuredData?.groundArea) && (
                    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                      <div className="mb-1 text-xs text-gray-400">
                        Ground Area:
                      </div>
                      <div className="text-sm font-medium text-gray-200">
                        {property?.size ||
                          data.enhancedAnalysis?.structuredData
                            ?.groundArea}{" "}
                        sq ft
                      </div>
                    </div>
                  )}

                  {/* Complexity Card */}
                  {data.enhancedAnalysis?.structuredData?.complexity && (
                    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                      <div className="mb-1 text-xs text-gray-400">
                        Complexity:
                      </div>
                      <div className="text-sm font-medium capitalize text-amber-400">
                        {data.enhancedAnalysis.structuredData.complexity}
                      </div>
                    </div>
                  )}

                  {/* Bedrooms/Bathrooms Cards - if available */}
                  {property?.bedrooms && (
                    <>
                      <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Bedrooms:
                        </div>
                        <div className="text-sm font-medium text-gray-200">
                          {property.bedrooms}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Bathrooms:
                        </div>
                        <div className="text-sm font-medium text-gray-200">
                          {property.bathrooms || "N/A"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Roof Information */}
              {data.enhancedAnalysis?.structuredData && (
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-3 flex items-center text-sm font-medium text-purple-400">
                    <IconArrowsMaximize size={16} className="mr-1" />
                    Roof Measurements
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {/* Roof Area Card */}
                    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                      <div className="mb-1 text-xs text-gray-400">
                        Roof Area:
                      </div>
                      <div className="text-lg font-bold text-gray-200">
                        {data.enhancedAnalysis.structuredData.roofArea
                          ? data.enhancedAnalysis.structuredData.roofArea.toLocaleString()
                          : "N/A"}
                      </div>
                      <div className="text-xs text-gray-400">sq ft</div>
                    </div>

                    {/* Roof Facets Card */}
                    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                      <div className="mb-1 text-xs text-gray-400">Facets:</div>
                      <div className="text-lg font-bold text-gray-200">
                        {data.enhancedAnalysis.structuredData.facetCount ||
                          "N/A"}
                      </div>
                      <div className="text-xs text-gray-400">sections</div>
                    </div>

                    {/* Pitch Card */}
                    {data.enhancedAnalysis.structuredData.pitch && (
                      <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">Pitch:</div>
                        <div className="text-lg font-bold text-gray-200">
                          {data.enhancedAnalysis.structuredData.pitch}
                        </div>
                        <div className="text-xs text-gray-400">ratio</div>
                      </div>
                    )}

                    {/* Roofing Squares Card */}
                    {data.enhancedAnalysis.structuredData.squares && (
                      <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Squares:
                        </div>
                        <div className="text-lg font-bold text-gray-200">
                          {data.enhancedAnalysis.structuredData.squares}
                        </div>
                        <div className="text-xs text-gray-400">
                          100 sq ft ea
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="solar" className="mt-2">
            {solar?.potential ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-3 flex items-center text-sm font-medium text-purple-400">
                    <IconSun size={16} className="mr-1" />
                    Solar Production Potential
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {/* Max Panels Card */}
                    {solar.potential.maxPanels != null && (
                      <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Max Panels:
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {solar.potential.maxPanels}
                        </div>
                        <div className="text-xs text-gray-400">
                          solar panels
                        </div>
                      </div>
                    )}

                    {/* Yearly Energy Card */}
                    {solar.potential.yearlyEnergy != null && (
                      <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Annual Production:
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {solar.potential.yearlyEnergy.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">kWh/year</div>
                      </div>
                    )}

                    {/* Sunshine Hours Card */}
                    {solar.potential.sunshineHours != null && (
                      <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Sunshine Hours:
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {solar.potential.sunshineHours.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">hours/year</div>
                      </div>
                    )}

                    {/* Panel Capacity Card */}
                    {solar.potential.panelCapacityWatts != null && (
                      <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Panel Capacity:
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {solar.potential.panelCapacityWatts}
                        </div>
                        <div className="text-xs text-gray-400">watts each</div>
                      </div>
                    )}

                    {/* Array Area Card */}
                    {solar.potential.maxArrayAreaMeters2 != null && (
                      <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Array Area:
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {Math.round(solar.potential.maxArrayAreaMeters2)}
                        </div>
                        <div className="text-xs text-gray-400">sq meters</div>
                      </div>
                    )}

                    {/* Suitability Score Card */}
                    {solar.potential.suitabilityScore && (
                      <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                        <div className="mb-1 text-xs text-gray-400">
                          Suitability:
                        </div>
                        <div className="text-lg font-bold capitalize text-purple-400">
                          {solar.potential.suitabilityScore}
                        </div>
                        <div className="text-xs text-gray-400">rating</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legacy fields if available */}
                {(solar.rating ||
                  solar.capacity ||
                  solar.annualProduction ||
                  solar.coverage ||
                  solar.optimalPanels) && (
                  <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-3 text-sm font-medium text-purple-400">
                      Additional Solar Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {solar.rating && (
                        <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                          <div className="mb-1 text-xs text-gray-400">
                            Solar Rating:
                          </div>
                          <div className="text-sm font-medium text-gray-200">
                            {solar.rating}
                          </div>
                        </div>
                      )}
                      {solar.capacity && (
                        <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                          <div className="mb-1 text-xs text-gray-400">
                            Capacity:
                          </div>
                          <div className="text-sm font-medium text-gray-200">
                            {solar.capacity} kW
                          </div>
                        </div>
                      )}
                      {solar.annualProduction && (
                        <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                          <div className="mb-1 text-xs text-gray-400">
                            Annual Production:
                          </div>
                          <div className="text-sm font-medium text-gray-200">
                            {solar.annualProduction} kWh
                          </div>
                        </div>
                      )}
                      {solar.coverage && (
                        <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                          <div className="mb-1 text-xs text-gray-400">
                            Roof Coverage:
                          </div>
                          <div className="text-sm font-medium text-gray-200">
                            {solar.coverage}%
                          </div>
                        </div>
                      )}
                      {solar.optimalPanels && (
                        <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-3">
                          <div className="mb-1 text-xs text-gray-400">
                            Optimal Panels:
                          </div>
                          <div className="text-sm font-medium text-gray-200">
                            {solar.optimalPanels}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-800 p-8 text-center">
                <IconSun size={48} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400">
                  Solar potential data not available for this property.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financial" className="mt-2">
            {financial ? (
              <div className="rounded-lg bg-gray-800 p-4">
                <h3 className="mb-3 flex items-center text-sm font-medium text-purple-400">
                  <IconCash size={16} className="mr-1" />
                  Financial Analysis
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* Installation Cost Card */}
                  {financial.installationCost && (
                    <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-4">
                      <div className="mb-2 text-xs text-gray-400">
                        Installation Cost:
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        ${financial.installationCost.toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        estimated total
                      </div>
                    </div>
                  )}

                  {/* Monthly Savings Card */}
                  {financial.monthlySavings && (
                    <div className="rounded-lg border border-green-700/30 bg-gray-900 p-4">
                      <div className="mb-2 text-xs text-gray-400">
                        Monthly Savings:
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        ${financial.monthlySavings.toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        per month
                      </div>
                    </div>
                  )}

                  {/* Payback Period Card */}
                  {financial.paybackPeriod && (
                    <div className="rounded-lg border border-purple-700/30 bg-gray-900 p-4">
                      <div className="mb-2 text-xs text-gray-400">
                        Payback Period:
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        {financial.paybackPeriod}{" "}
                        <span className="text-lg">years</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        to break even
                      </div>
                    </div>
                  )}

                  {/* ROI Card */}
                  {financial.roi && (
                    <div className="rounded-lg border border-green-700/30 bg-gray-900 p-4">
                      <div className="mb-2 text-xs text-gray-400">
                        20-Year ROI:
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {financial.roi}%
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        return on investment
                      </div>
                    </div>
                  )}
                </div>

                {/* Incentives Section */}
                {financial.incentives && (
                  <div className="mt-4 rounded-lg border border-purple-700/30 bg-gray-900 p-4">
                    <div className="mb-2 text-xs font-medium text-purple-400">
                      Available Incentives:
                    </div>
                    <p className="text-sm text-gray-300">
                      {financial.incentives}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-800 p-8 text-center">
                <IconCash size={48} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400">
                  Financial analysis data not available for this property.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="mt-2">
            <div className="rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-purple-400">
                Raw Report Data
              </h3>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-gray-300">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

export default PropertyReport
