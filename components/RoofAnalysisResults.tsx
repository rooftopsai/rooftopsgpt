import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconBuildingSkyscraper, IconRuler, IconStar, IconSquare, IconTriangle } from '@tabler/icons-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

interface RoofAnalysisResultsProps {
  analysis: any;
}

const RoofAnalysisResults: React.FC<RoofAnalysisResultsProps> = ({ analysis }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedView, setExpandedView] = useState(false);
  
  if (!analysis) return null;
  
  const { rawAnalysis, structuredData, debug } = analysis;
  
  // Helper function to get color based on confidence
  const getConfidenceColor = (confidence: string | null) => {
    switch(confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Helper function to get complexity color
  const getComplexityColor = (complexity: string | null) => {
    switch(complexity) {
      case 'simple': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'complex': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <Card className="mb-6 overflow-hidden border-0 bg-gray-900 text-white shadow-lg">
      <CardHeader className="border-b border-gray-700 bg-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl font-bold">
            <IconBuildingSkyscraper size={20} className="mr-2 text-blue-400" />
            Enhanced Roof Analysis
          </CardTitle>
          <Badge className={getConfidenceColor(structuredData?.confidence)}>
            {structuredData?.confidence ? `${structuredData.confidence} confidence` : 'Analysis Complete'}
          </Badge>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-800 px-4 pt-2">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="summary" className="data-[state=active]:bg-gray-700">Summary</TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-gray-700">Details</TabsTrigger>
            {debug && <TabsTrigger value="debug" className="data-[state=active]:bg-gray-700">Debug</TabsTrigger>}
          </TabsList>
        </div>
        
        <CardContent className={`p-4 ${expandedView ? 'max-h-none' : 'max-h-96 overflow-y-auto'}`}>
          <TabsContent value="summary" className="mt-2">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconSquare size={14} className="mr-1" />
                  Facet Count
                </span>
                <span className="text-2xl font-bold">{structuredData?.facetCount || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconTriangle size={14} className="mr-1" />
                  Complexity
                </span>
                <span className={`text-2xl font-bold capitalize ${getComplexityColor(structuredData?.complexity)}`}>
                  {structuredData?.complexity || 'N/A'}
                </span>
              </div>
              
              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconRuler size={14} className="mr-1 rotate-45" />
                  Ridge Length
                </span>
                <span className="text-2xl font-bold">
                  {structuredData?.ridgeLength ? `${structuredData.ridgeLength} ft` : 'N/A'}
                </span>
              </div>
              
              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconRuler size={14} className="mr-1 -rotate-45" />
                  Valley Length
                </span>
                <span className="text-2xl font-bold">
                  {structuredData?.valleyLength ? `${structuredData.valleyLength} ft` : 'N/A'}
                </span>
              </div>
            </div>
            
            {/* Summary of key findings */}
            <div className="mt-4 rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-blue-400">Key Findings</h3>
              <p className="text-sm text-gray-300">
                {extractSummary(rawAnalysis) || 
                  `This property has ${structuredData?.facetCount || 'multiple'} roof facets with 
                  ${structuredData?.complexity || 'varying'} complexity. 
                  ${structuredData?.confidence === 'high' ? 
                    'The analysis has high confidence based on clear imagery.' : 
                    'Additional inspection may be needed for complete accuracy.'}`
                }
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="mt-2">
            <div className="rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-blue-400">Detailed Analysis</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-300">
                {rawAnalysis || 'No detailed analysis available.'}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="debug" className="mt-2">
            {debug && (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-2 text-sm font-medium text-blue-400">Request Information</h3>
                  <div className="space-y-2 text-xs text-gray-300">
                    <div>
                      <span className="font-medium text-blue-300">Model Used:</span> {debug.model || 'Unknown'}
                    </div>
                    {debug.requestTime && (
                      <div>
                        <span className="font-medium text-blue-300">Request Time:</span> {debug.requestTime}ms
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-blue-300">Images Sent:</span> {debug.imageCount || 'Unknown'}
                    </div>
                    {debug.promptLength && (
                      <div>
                        <span className="font-medium text-blue-300">Prompt Length:</span> {debug.promptLength} chars
                      </div>
                    )}
                  </div>
                </div>
                
                {debug.prompt && (
                  <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-2 text-sm font-medium text-blue-400">Prompt Used</h3>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-300">
                      {debug.prompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setExpandedView(!expandedView)}
          className="border-gray-700 bg-gray-800 text-xs hover:bg-gray-700"
        >
          {expandedView ? 'Show Less' : 'Show More'}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Helper function to extract a summary from the raw analysis text
const extractSummary = (analysisText: string): string | null => {
  if (!analysisText) return null;
  
  // Try to find summary section
  const summaryMatch = analysisText.match(/(?:summary|conclusion|overall assessment):(.*?)(?:\n\n|\n\w|$)/is);
  if (summaryMatch && summaryMatch[1]) {
    // Clean up the summary text
    return summaryMatch[1].trim().replace(/\n/g, ' ');
  }
  
  // If no explicit summary, take the first paragraph
  const firstParagraph = analysisText.split('\n\n')[0];
  if (firstParagraph && firstParagraph.length > 50) {
    return firstParagraph;
  }
  
  return null;
};

export default RoofAnalysisResults;