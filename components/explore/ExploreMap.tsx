// components > explore > ExploreMap.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { 
  IconLoader2,
  IconInfoCircle,
  IconMapPin
} from '@tabler/icons-react';
import html2canvas from 'html2canvas';
import axios from 'axios';
import { 
  enhanceImageForRoofAnalysis, 
  segmentRoofColors,
  enhanceRoofPitch 
} from '@/lib/image-processing';

// Import our components
import MapView from './MapView';
import CombinedReport from '@/components/property/combined-report';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Combined model list with both Anthropic and OpenAI models
const availableModels = [
  // Anthropic models
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Best Quality)', provider: 'anthropic' },
  { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3 Sonnet (2025)', provider: 'anthropic' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fastest)', provider: 'anthropic' },
  // OpenAI models
  { value: 'gpt-4o', label: 'GPT-4o (Balanced)', provider: 'openai' },
  { value: 'o4-mini-2025-04-16', label: 'GPT-o4-mini', provider: 'openai' },
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', provider: 'openai' },
];

interface ExploreMapProps {
  onPropertySelect: (propertyData: any) => void;
  workspaceId: string;
}

const ExploreMap: React.FC<ExploreMapProps> = ({ onPropertySelect, workspaceId }) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [measuredArea, setMeasuredArea] = useState<string | null>(null);
  const [measuredDistance, setMeasuredDistance] = useState<string | null>(null);
  const [roofAnalysis, setRoofAnalysis] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [selectedModel, setSelectedModel] = useState('claude-3-opus-20240229');
  const [isDebugMode, setIsDebugMode] = useState(true);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [captureAngle, setCaptureAngle] = useState(0);
  const [is3DMode, setIs3DMode] = useState(true);
  const [captureProgress, setCaptureProgress] = useState(0);
  
  // This is a direct reference to the map container div from the MapView component
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Add a mapRef here that will be set by MapView
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Set better default image processing options for improved clarity
  const [imageProcessingOptions, setImageProcessingOptions] = useState({
    enhanceEdges: true,         // Keep edge detection
    enhanceContrast: true,     // Disable contrast enhancement by default
    addMeasurementGrid: true,   // Keep measurement grid
    colorSegmentation: false,
    pitchEnhancement: false
  });
  
  const { toast } = useToast();

  // Mark when we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug logging function
  const logDebug = useCallback((message: string) => {
    if (isDebugMode) {
      console.log(`[Debug] ${message}`);
      setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  }, [isDebugMode]);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(!isDebugMode);
    setDebugLogs([]);
    
    toast({
      title: !isDebugMode ? 'Debug Mode Enabled' : 'Debug Mode Disabled',
      description: !isDebugMode 
        ? 'Detailed logging and API request/response information will be shown.'
        : 'Debug information will be hidden.',
      duration: 3000,
    });
  }, [isDebugMode, toast]);

  // Toggle 3D mode
  const toggleIs3DMode = useCallback(() => {
    setIs3DMode(!is3DMode);
    logDebug(`3D mode ${!is3DMode ? 'enabled' : 'disabled'}`);
    
    toast({
      title: !is3DMode ? '3D Mode Enabled' : '3D Mode Disabled',
      description: !is3DMode 
        ? 'Will capture perspective views with 45° tilt for better roof analysis.'
        : 'Will use standard overhead views for roof analysis.',
      duration: 3000,
    });
  }, [is3DMode, logDebug, toast]);

  // Enhanced capture satellite views function with 3D mode option
  const captureSatelliteViews = async () => {
    if (!selectedLocation || !mapContainerRef.current) {
      console.error("Missing required data");
      return null;
    }
    
    setIsAnalyzing(true);
    setCaptureProgress(0);
    
    try {
      logDebug(`Starting satellite view capture for ${selectedAddress || 'selected location'}`);
      
      // Create the views array to store our captures
      const views = [];
  
      // CRITICAL FIX: First re-center the map on the selected property
      if (mapRef.current && selectedLocation) {
        try {
          // Center the map on the selected location before starting captures
          mapRef.current.setCenter({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          });
          
          // Set appropriate zoom level for capturing property details
          mapRef.current.setZoom(20);
          
          logDebug("Map centered on selected property at " + 
            selectedLocation.lat.toFixed(6) + ", " + 
            selectedLocation.lng.toFixed(6));
          
          // Add a brief delay to ensure the map is properly centered before starting captures
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          console.error("Error centering map on property:", e);
          logDebug(`Error centering map: ${e.message}`);
        }
      }
  
      // === TOP VIEW (directly overhead) ===
      logDebug("Capturing top view");
      
      // Check if we have the map reference before trying to use it
      if (mapRef.current) {
        try {
          // Set map to default tilt (0) for overhead view
          mapRef.current.setTilt(0);
          // Set zoom level appropriate for roof details
          mapRef.current.setZoom(20);
          // Reset heading to north (0 degrees)
          mapRef.current.setHeading(0);
          logDebug("Map settings adjusted for top view");
        } catch (e) {
          console.error("Error setting map properties:", e);
          logDebug(`Error setting map properties: ${e.message}`);
        }
      } else {
        logDebug("Map reference is not available for manipulation");
      }
      
      // Allow time for map to render with new settings
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Capture top view
      const topView = await captureMapView(mapContainerRef, 'top');
      if (topView) {
        topView.enhancementOptions = {
          enhanceEdges: imageProcessingOptions.enhanceEdges,
          enhanceContrast: imageProcessingOptions.enhanceContrast,
          addMeasurementGrid: imageProcessingOptions.addMeasurementGrid
        };
        views.push(topView);
        setCaptureProgress(10);
      }
      
      // Capture views from multiple angles with tilt if 3D mode is enabled
      // FIXED: Removed 0 from the angles array to avoid duplication with top view
      const angles = [45, 90, 180];
      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        setCaptureAngle(angle);
        
        logDebug(`Capturing view at ${angle}° heading`);
        
        // Check if we have the map reference before trying to use it
        if (mapRef.current) {
          try {
            // Re-center the map before each rotation angle to ensure property stays in view
            mapRef.current.setCenter({
              lat: selectedLocation.lat,
              lng: selectedLocation.lng
            });
            
            // Set map to the current angle
            mapRef.current.setHeading(angle);
            
            // Add tilt in 3D mode for perspective views
            if (is3DMode) {
              mapRef.current.setTilt(45); // 45-degree tilt for 3D view
            }
            logDebug(`Map settings adjusted for angle ${angle}°, tilt: ${is3DMode ? '45°' : '0°'}`);
          } catch (e) {
            console.error(`Error setting map heading/tilt for angle ${angle}:`, e);
            logDebug(`Error setting map heading/tilt: ${e.message}`);
          }
        } else {
          logDebug("Map reference is not available for manipulation");
        }
        
        // Allow time for map to render with new orientation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the direction name based on the angle
        const directionName = getDirectionName(angle);
        
        // Capture view with current angle
        const view = await captureMapView(mapContainerRef, directionName);
        if (view) {
          view.enhancementOptions = {
            enhanceEdges: imageProcessingOptions.enhanceEdges,
            enhanceContrast: imageProcessingOptions.enhanceContrast,
            addMeasurementGrid: imageProcessingOptions.addMeasurementGrid
          };
          view.angle = angle;
          view.tilt = is3DMode ? 45 : 0;
          views.push(view);
          setCaptureProgress(10 + ((i + 1) / angles.length) * 80);
        }
      }
      
      // Reset map to original state
      if (mapRef.current) {
        try {
          mapRef.current.setHeading(0);
          mapRef.current.setTilt(0);
          logDebug("Map reset to original state");
        } catch (e) {
          console.error("Error resetting map properties:", e);
          logDebug(`Error resetting map: ${e.message}`);
        }
      }
      
      logDebug(`Successfully captured ${views.length} views`);
      setCaptureProgress(90);
      
      // Send views to LLM for analysis
      const analysisResult = await sendToLLMForAnalysis(views);
      
      // Store the captured views in the analysis result
      if (analysisResult) {
        analysisResult.capturedImages = views;
        analysisResult.satelliteViews = views;
      }
      
      setRoofAnalysis(analysisResult);
      setCaptureProgress(100);
      
      return analysisResult;
    } catch (error) {
      console.error('Error capturing satellite views:', error);
      logDebug(`Error during capture: ${error.message}`);
      toast({
        title: 'Error',
        description: 'Failed to capture satellite imagery for analysis',
        variant: 'destructive',
      });
      return null;
    } finally {
      // Always restore default map view when done
      if (mapRef.current) {
        try {
          mapRef.current.setHeading(0);
          mapRef.current.setTilt(0);
        } catch (e) {
          console.error("Error in finally block:", e);
        }
      }
      setIsAnalyzing(false);
      setCaptureAngle(0);
    }
  };

  // Get direction name based on angle
  const getDirectionName = (angle: number): string => {
    const directions = [
      'north', 'northeast', 'east', 'southeast', 
      'south', 'southwest', 'west', 'northwest'
    ];
    return directions[Math.round(angle / 45) % 8];
  };

  // Fixed captureMapView function with duplicate pitch enhancement removed
  const captureMapView = async (containerRef: React.RefObject<HTMLDivElement>, viewName: string) => {
  if (!containerRef.current) {
    console.error(`Cannot capture ${viewName} view - container ref is null`);
    return null;
  }
  
  try {
    logDebug(`Capturing ${viewName} view...`);
    
    // IMPORTANT FIX: First hide any Google Maps info windows/tooltips before capture
    if (mapRef.current) {
      try {
        // Close any open info windows
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      } catch (e) {
        console.error("Error closing info windows:", e);
      }
    }
    
    // Hide Google Maps UI elements temporarily
    const mapControls = containerRef.current.querySelectorAll('.gm-style-iw, .gm-ui-hover-effect, .gm-style-iw-t');
    mapControls.forEach((control: HTMLElement) => {
      control.style.display = 'none';
    });
    
    // Improved html2canvas settings for higher quality captures
    const canvas = await html2canvas(containerRef.current, {
      useCORS: true,
      allowTaint: true,
      logging: isDebugMode,
      scale: 2.5, // Increased scale for higher quality (was 2)
      backgroundColor: null, // Preserve transparency
      imageTimeout: 0, // No timeout for better handling of complex maps
      removeContainer: false, // Keep the original container
      ignoreElements: (element) => {
        // Ignore Google Maps tooltips and UI controls
        return element.classList.contains('gm-style-iw') || 
              element.classList.contains('gm-ui-hover-effect') ||
              element.classList.contains('gm-style-iw-t');
      }
    });
    
    // Restore Google Maps UI elements
    mapControls.forEach((control: HTMLElement) => {
      control.style.display = '';
    });
    
    // Convert canvas to base64 image with higher quality
    let imageData = canvas.toDataURL('image/jpeg', 0.97); // Increased quality (was 0.95)
    
    // Apply image enhancements with improved settings
    logDebug(`Enhancing ${viewName} view with image processing...`);
    
    // Apply main enhancements (edges, contrast, grid) with adjusted settings for better clarity
    imageData = await enhanceImageForRoofAnalysis(imageData, {
      enhanceEdges: imageProcessingOptions.enhanceEdges,
      enhanceContrast: imageProcessingOptions.enhanceContrast, // This will often be false now
      addMeasurementGrid: imageProcessingOptions.addMeasurementGrid,
      dimensions: { 
        width: canvas.width, 
        height: canvas.height 
      }
    });
    
    // Apply color segmentation if enabled
    if (imageProcessingOptions.colorSegmentation) {
      try {
        const segmentedImage = await segmentRoofColors(imageData);
        logDebug(`Generated color segmentation variant for ${viewName}`);
        // Set the processed image as the current imageData
        imageData = segmentedImage;
      } catch (error) {
        console.error(`Error during color segmentation for ${viewName}:`, error);
        logDebug(`Color segmentation failed, continuing without it: ${error.message}`);
      }
    }

    // Apply pitch enhancement if enabled
    if (imageProcessingOptions.pitchEnhancement) {
      try {
        const pitchImage = await enhanceRoofPitch(imageData);
        logDebug(`Generated pitch enhancement variant for ${viewName}`);
        // Set the processed image as the current imageData
        imageData = pitchImage;
      } catch (error) {
        console.error(`Error during pitch enhancement for ${viewName}:`, error);
        logDebug(`Pitch enhancement failed, continuing without it: ${error.message}`);
      }
    }
    
    logDebug(`${viewName} view captured and enhanced (${Math.round(imageData.length / 1024)} KB)`);
    
    return {
      imageData,
      viewName,
      timestamp: new Date().toISOString(),
      enhanced: true
    };
  } catch (error) {
    console.error(`Error capturing ${viewName} view:`, error);
    logDebug(`Failed to capture ${viewName} view: ${error.message}`);
    return null;
  }
};

  // Function to send images to LLM for analysis
  const sendToLLMForAnalysis = async (satelliteViews) => {
    try {
      // Filter out any null views from failed captures
      const validViews = satelliteViews.filter(view => view !== null);
      
      if (validViews.length === 0) {
        throw new Error('No valid satellite images captured');
      }
      
      // Get the selected model's provider
      const selectedModelInfo = availableModels.find(model => model.value === selectedModel);
      const provider = selectedModelInfo?.provider || 'anthropic';
      
      logDebug(`Sending ${validViews.length} enhanced views to ${provider} model ${selectedModel} for analysis`);
      
      // Create a more detailed prompt that explains the enhancements and measurement grid
      const enhancedPrompt = `As an expert roofing analyst, I need your detailed assessment of a property at ${selectedAddress || `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`}. Focus on the property most centered in these images and compare all images to determine the most accurate details about the subject property. We are pursuing highly accurate number of facets and square footage of the roof so that we can determine the number of squares needed to replace the subject roof.
  
  IMPORTANT MEASUREMENT INFORMATION:
  - The images have been enhanced with edge detection to highlight roof facets and boundaries
  - A measurement grid has been added for reference (approximately 10x10 grid)
  - A scale bar shows approximately 10 meters / 30 feet
  - North direction is indicated in the top right corner
  
  Please analyze the following aspects with the highest possible accuracy:
  
  1. PRECISE ROOF MEASUREMENTS:
     - Total roof area in square feet (be as precise as possible)
     - Count all distinct roof facets/planes (be exact)
     - Measure the pitch of each major facet (e.g. 4/12, 6/12, etc.)
     - Identify and measure ridge lines, valleys, hips, and dormers
     - Where possible, provide dimensions of each major section
  
  2. MATERIAL ASSESSMENT:
     - Identify probable roofing material and condition
     - Note signs of aging, damage, or maintenance issues 
     - Evaluate solar potential based on orientation and shading
  
  3. INSTALLATION CONSIDERATIONS:
     - Identify access challenges or safety concerns
     - Note complex features requiring special attention
     - Estimate total ridge and valley lengths (in linear feet)
  
  4. QUANTITATIVE METRICS (provide specific numbers with high precision):
     - Total facet count
     - Estimated roof area (sq. ft, be precise)
     - Ridge length (linear ft)  
     - Valley length (linear ft)
     - Complexity rating (simple, moderate, complex)
     - Confidence level in your assessment (low, medium, high)
  
  Use the measurement grid and scale bar to make the most accurate assessments possible. The grid cells are approximately equal in size, and the scale bar represents approximately 10 meters or 30 feet.`;
      
      const payload = {
        satelliteViews: validViews,
        address: selectedAddress || `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`,
        model: selectedModel,
        provider: provider,
        enhancedPrompt: enhancedPrompt,
        debug: isDebugMode,
        imageEnhancementApplied: {
          edges: imageProcessingOptions.enhanceEdges,
          contrast: imageProcessingOptions.enhanceContrast,
          measurementGrid: imageProcessingOptions.addMeasurementGrid
        }
      };
      
      if (isDebugMode) {
        // Log payload size
        const payloadSize = JSON.stringify(payload).length;
        logDebug(`API payload size: ${Math.round(payloadSize / 1024 / 1024 * 100) / 100} MB`);
      }
      
      // Update the API endpoint to use the enhanced prompt
      const response = await axios.post('/api/analyze-roof', payload);
      
      logDebug('Analysis completed successfully');
      
      return response.data;
    } catch (error) {
      console.error('Error in LLM analysis:', error);
      logDebug(`Analysis error: ${error.message}`);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Could not complete roof analysis',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Image processing options toggle handler
  const toggleImageProcessingOption = (option: string) => {
    setImageProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
    
    // Log the change if in debug mode
    if (isDebugMode) {
      logDebug(`Toggled ${option} to ${!imageProcessingOptions[option]}`);
    }
  };

  // Complete reworked function to prevent tab switching and keep everything in one view
  const analyzeAndGenerateReport = async () => {
    if (!selectedLocation) return;
    
    setIsLoading(true);
    
    try {
      logDebug('Starting combined analysis and report generation');
      
      // First, capture satellite views and get LLM analysis
      const analysis = await captureSatelliteViews();
      
      if (!analysis) {
        throw new Error('Roof analysis failed');
      }
      
      // Store the analysis result
      setRoofAnalysis(analysis);
      
      toast({
        title: 'Analysis Complete',
        description: 'AI roof analysis has been completed successfully. Generating report...',
      });
      
      // Extract address from analysis text if necessary
      let addressToUse = selectedAddress;
      if (!addressToUse && analysis.rawAnalysis) {
        // Direct extraction from the analysis text
        const addressMatch = analysis.rawAnalysis.match(/(\d+\s+[A-Za-z]+\s+(?:Dr|St|Ave|Road|Boulevard|Blvd|Lane|Ln|Court|Ct|Circle|Cir|Way|Place|Pl|Drive)[.,\s]*(?:[A-Za-z]+(?:,\s*[A-Za-z]+)?\s*\d{5})?)/i);
        if (addressMatch && addressMatch[1]) {
          addressToUse = addressMatch[1].trim();
          logDebug(`Extracted address from analysis: ${addressToUse}`);
        }
      }
      
      // Prepare a complete report object that we'll use regardless of API success/failure
      const reportData = {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: addressToUse || 'Property Address',
        workspaceId,
        enhancedAnalysis: {
          ...analysis
        },
        // Include captured images
        capturedImages: analysis.capturedImages || analysis.satelliteViews || [],
        // Extract key data from analysis
        propertyData: {
          address: { fullAddress: addressToUse || 'Property Address' },
          details: {
            propertyType: 'Unknown',
            yearBuilt: 'Unknown',
            squareFeet: 'Unknown',
            lotSize: 'Unknown'
          },
          roof: {
            summary: {
              area: analysis.structuredData?.area || 0,
              facets: analysis.structuredData?.facetCount || 0,
              pitch: analysis.structuredData?.pitch || 'Unknown',
              complexity: analysis.structuredData?.complexity || 'Unknown'
            }
          }
        },
        // Additional structured data from analysis
        structuredData: analysis.structuredData || {}
      };
      
      try {
        const solarResponse = await fetch('/api/solar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })
        });
        
        if (solarResponse.ok) {
          const solarData = await solarResponse.json();
          console.log("SOLAR API SUCCESS:", solarData);
          
          // Extract values directly from the correct paths
          const solarPotential = solarData.solarPotential || {};
          
          // Get panel count directly from the API response
          const panelCount = solarPotential.maxArrayPanelsCount || 0;
          
          // Get yearly energy production
          // Formula: panels × capacity × sunshine hours / 1000 = kWh per year
          const panelCapacityWatts = solarPotential.panelCapacityWatts || 400;
          const sunshineHours = solarPotential.maxSunshineHoursPerYear || 0;
          const yearlyEnergy = Math.round((panelCount * panelCapacityWatts * sunshineHours) / 1000);
          
          // Calculate financials
          const costPerKwh = 0.12;
          const installationCost = Math.round(panelCount * 800); // $800 per panel
          const lifetimeYears = solarPotential.panelLifetimeYears || 20;
          const costWithoutSolar = Math.round(yearlyEnergy * costPerKwh * lifetimeYears);
          const totalCostWithSolar = installationCost;
          const netSavings = costWithoutSolar - totalCostWithSolar;
          
          // Determine suitability score
          let suitabilityScore = 'Unknown';
          if (yearlyEnergy > 0 && panelCount > 0) {
            const kwhPerYearPerKw = yearlyEnergy / (panelCount * panelCapacityWatts / 1000);
            if (kwhPerYearPerKw > 1300) suitabilityScore = 'Great Fit';
            else if (kwhPerYearPerKw > 1000) suitabilityScore = 'Good Fit';
            else suitabilityScore = 'Moderate Fit';
          }
          
          // Log all extracted values for debugging
          console.log("SOLAR EXTRACTION:", {
            panelCount,
            yearlyEnergy,
            sunshineHours,
            installationCost,
            netSavings,
            suitabilityScore
          });
          
          // Create the solar data structure explicitly
          reportData.solar = {
            potential: {
              maxPanels: panelCount,
              yearlyEnergy: yearlyEnergy,
              sunshineHours: sunshineHours,
              suitabilityScore: suitabilityScore
            },
            financials: {
              installationCost: installationCost,
              netSavings: netSavings,
              totalCostWithSolar: totalCostWithSolar,
              costWithoutSolar: costWithoutSolar,
              paybackPeriodYears: yearlyEnergy > 0 ? Math.round(installationCost / (yearlyEnergy * costPerKwh * 10)) / 10 : null
            }
          };
          
          console.log("PROCESSED SOLAR DATA:", reportData.solar);
        } else {
          console.log("SOLAR API ERROR:", await solarResponse.text());
        }
      } catch (solarError) {
        console.error('Error fetching solar data:', solarError);
      }
  
      // Try the API call, but don't depend on it
      try {
        const response = await fetch('/api/explore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            address: addressToUse,
            workspaceId,
            enhancedAnalysis: analysis
          })
        });
        
        if (response.ok) {
          const apiData = await response.json();
          // Merge API data with our local report data
          Object.assign(reportData, apiData);
          logDebug('API data successfully merged with report');
        } else {
          const errorData = await response.text();
          logDebug(`API error: ${errorData}`);
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        logDebug(`API error: ${apiError.message}`);
      }
      
      // Always set report data, even if API failed
      setReportData({ 
        jsonData: {
          ...reportData,
          // Make sure solar is explicitly set at the top level of jsonData
          solar: reportData.solar
        } 
      });
      
      console.log("FINAL REPORT DATA STRUCTURE:", { 
        jsonData: {
          ...reportData,
          solar: reportData.solar
        } 
      });

      logDebug('Property report generated and displayed in map view');
      
      toast({
        title: 'Report Generated',
        description: `Property report for ${addressToUse || 'selected location'} is ready.`,
      });
      
    } catch (error) {
      console.error('Error in combined analysis and report:', error);
      logDebug(`Combined process error: ${error.message}`);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete analysis and report generation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle analyze property click with validation
  const handleAnalyzePropertyClick = () => {
    if (!selectedLocation) {
      toast({
        title: 'No Location Selected',
        description: 'Please select a property location first by clicking on the map or searching for an address.',
        variant: 'destructive',
      });
      return;
    }

    // Start the analysis process
    analyzeAndGenerateReport();
  };

  // Render the main component
  return (
    <div className="explore-map-container">
      <Card className="overflow-hidden rounded-xl border border-gray-200 shadow-md dark:border-gray-800">
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
              <IconMapPin size={18} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 md:text-2xl dark:text-white">AI Property Explorer</h2>
            
            {/* Model selector */}
            <div className="ml-auto">
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger className="h-9 w-[160px] border-gray-200 bg-white sm:w-[200px] dark:border-gray-700 dark:bg-gray-800">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="p-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Anthropic Models</div>
                  {availableModels
                    .filter(model => model.provider === 'anthropic')
                    .map(model => (
                      <SelectItem 
                        key={model.value} 
                        value={model.value} 
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {model.label}
                      </SelectItem>
                    ))
                  }
                  <div className="mt-1 border-t border-gray-200 p-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">OpenAI Models</div>
                  {availableModels
                    .filter(model => model.provider === 'openai')
                    .map(model => (
                      <SelectItem 
                        key={model.value} 
                        value={model.value} 
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {model.label}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            {/* Debug mode toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDebugMode}
              className={`${isDebugMode ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : ''}`}
            >
              <IconInfoCircle size={16} className="mr-1" />
              Debug
            </Button>
          </div>
          
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Search for an address or click on any rooftop to analyze solar potential and generate a property report.
          </p>

          {/* Map Component */}
          <div style={{ height: '500px', width: '100%' }} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <MapView
              workspaceId={workspaceId}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              selectedAddress={selectedAddress}
              setSelectedAddress={setSelectedAddress}
              isAnalyzing={isAnalyzing}
              captureProgress={captureProgress}
              captureAngle={captureAngle}
              is3DMode={is3DMode}
              toggleIs3DMode={toggleIs3DMode}
              isDebugMode={isDebugMode}
              logDebug={logDebug}
              measuredArea={measuredArea}
              setMeasuredArea={setMeasuredArea}
              measuredDistance={measuredDistance}
              setMeasuredDistance={setMeasuredDistance}
              captureMapView={captureMapView}
              onAnalyzePropertyClick={handleAnalyzePropertyClick}
              setMapContainerRef={(el) => {
                mapContainerRef.current = el;
                console.log("Map container ref set:", el ? "success" : "null");
              }}
              setMapRef={(map) => {
                mapRef.current = map;
                console.log("Map reference set:", map ? "success" : "null");
              }}
              setInfoWindowRef={(infoWindow) => {
                infoWindowRef.current = infoWindow;
              }}
              imageProcessingOptions={imageProcessingOptions}
              onToggleImageProcessingOption={toggleImageProcessingOption}
            />
          </div>
          
          {/* Image Enhancement Controls */}
          {/* <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image Enhancement Options
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Edge Detection</label>
                <Button 
                  variant={imageProcessingOptions.enhanceEdges ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.enhanceEdges ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('enhanceEdges')}
                >
                  {imageProcessingOptions.enhanceEdges ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Contrast</label>
                <Button 
                  variant={imageProcessingOptions.enhanceContrast ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.enhanceContrast ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('enhanceContrast')}
                >
                  {imageProcessingOptions.enhanceContrast ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Grid</label>
                <Button 
                  variant={imageProcessingOptions.addMeasurementGrid ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.addMeasurementGrid ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('addMeasurementGrid')}
                >
                  {imageProcessingOptions.addMeasurementGrid ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Color Segmentation</label>
                <Button 
                  variant={imageProcessingOptions.colorSegmentation ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.colorSegmentation ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('colorSegmentation')}
                >
                  {imageProcessingOptions.colorSegmentation ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Pitch Enhancement</label>
                <Button 
                  variant={imageProcessingOptions.pitchEnhancement ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.pitchEnhancement ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('pitchEnhancement')}
                >
                  {imageProcessingOptions.pitchEnhancement ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </div> */}
            
          {/* Results Section */}
          <div className="mt-6">
            {/* If there's a report, render a "back to map" button */}
            {(roofAnalysis || reportData) && (
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRoofAnalysis(null);
                    setReportData(null);
                  }}
                  className="text-blue-600 dark:text-blue-400"
                >
                  Close Report
                </Button>
              </div>
            )}
            
            {/* Loading state */}
            {isLoading && !roofAnalysis && !reportData && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <IconLoader2 size={36} className="animate-spin text-blue-500" />
                  <p className="text-gray-600 dark:text-gray-300">Analyzing property and generating report...</p>
                </div>
              </div>
            )}
                
            {/* New combined report component with unified design */}
            {(roofAnalysis || reportData) && (
              <CombinedReport 
                analysisData={roofAnalysis} 
                reportData={reportData}
              />
            )}
          </div>
          
          {/* Debug Logs */}
          {isDebugMode && debugLogs.length > 0 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Debug Logs</h3>
              <div className="h-40 overflow-y-auto rounded bg-white p-3 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExploreMap;