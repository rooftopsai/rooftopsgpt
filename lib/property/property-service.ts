// lib/property/property-service.ts

import { DetectedAddress } from './address-detection';

// Define interfaces for the property data
export interface PropertyData {
  address: DetectedAddress;
  propertyDetails: PropertyDetails;
  roofDetails: RoofDetails;
  solarPotential: SolarPotential;
  timestamp: string;
  imageryQuality?: string;
}

export interface PropertyDetails {
  yearBuilt?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  lotSize?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  groundArea?: number;
  imageryQuality?: string;
}

export interface RoofFacet {
  index: number;
  area: number;
  pitch: string | number;
  pitchDegrees?: number;
  orientation?: string;
  sunlightHours?: number;
  azimuthDegrees?: number;
  percentageOfRoof?: number;
}

export interface RoofDetails {
  roofArea: number;
  roofFacets: number;
  roofPitch: string | number;
  roofMaterial?: string;
  estimatedAge?: number;
  facets: RoofFacet[];
  totalRoofSquares?: number;
}

export interface SolarPotential {
  maxArrayPanels: number;
  maxArrayArea: number;
  yearlyEnergyDcKwh: number;
  sunshineHours: number;
  suitabilityScore?: 'Bad Fit' | 'Good Fit' | 'Great Fit';
  costsAndSavings: SolarCostSavings;
  imageryQuality?: string;
}

export interface SolarCostSavings {
  installationCost: number;
  lifetimeUtilityBill: number;
  totalCostWithSolar: number;
  costWithoutSolar: number;
  netSavings: number;
  estimatedYearlyEnergy: number;
  sunlightHoursPerYear: number;
  monthlyUtilityBill?: number;
  paybackPeriodYears?: number;
}

/**
 * Service to gather all relevant property data from various sources
 */
export class PropertyResearchService {
  /**
   * Main method to gather all property data
   */
  async researchProperty(address: DetectedAddress): Promise<PropertyData> {
    try {
      console.log(`[INFO] Starting research for property at: ${address.fullAddress}`);
      
      // First try to process with coordinates directly if provided
      let coordinates;
      try {
        // First we need to geocode the address to get coordinates
        coordinates = await this.geocodeAddress(address.fullAddress);
        console.log("[INFO] Successfully geocoded address:", coordinates);
      } catch (error) {
        console.error("[ERROR] Failed to geocode address:", error);
        throw new Error(`Address geocoding failed: ${error.message}`);
      }
      
      // With coordinates, call the Solar API
      let solarData;
      try {
        solarData = await this.fetchSolarData(coordinates.lat, coordinates.lng);
        console.log("[INFO] Successfully retrieved solar data");
        
        // Log structure of solar data to help with debugging
        console.log("[DEBUG] Solar data structure:", JSON.stringify({
          hasImageryQuality: !!solarData.imageryQuality,
          hasSolarPotential: !!solarData.solarPotential,
          wholeRoofStats: !!solarData.solarPotential?.wholeRoofStats,
          roofSegmentCount: solarData.solarPotential?.roofSegmentStats?.length || 0,
          financialAnalysesCount: solarData.solarPotential?.financialAnalyses?.length || 0,
          maxArrayPanelsCount: solarData.solarPotential?.maxArrayPanelsCount,
          maxSunshineHours: solarData.solarPotential?.maxSunshineHoursPerYear
        }, null, 2));
      } catch (error) {
        console.error("[ERROR] Failed to fetch solar data:", error);
        throw new Error(`Solar API request failed: ${error.message}`);
      }
      
      // Extract all relevant data from the API response
      console.log("[INFO] Extracting property details...");
      const propertyDetails = this.extractPropertyDetails(solarData);
      console.log("[DEBUG] Extracted property details:", propertyDetails);
      
      console.log("[INFO] Extracting roof details...");
      const roofDetails = this.extractRoofDetails(solarData);
      console.log("[DEBUG] Extracted roof details:", roofDetails);
      
      console.log("[INFO] Extracting solar potential...");
      const solarPotential = this.extractSolarPotential(solarData);
      console.log("[DEBUG] Extracted solar potential:", solarPotential);
      
      // Create the comprehensive property data
      const propertyData = {
        address,
        propertyDetails,
        roofDetails,
        solarPotential,
        timestamp: new Date().toISOString(),
        imageryQuality: solarData.imageryQuality || 'Unknown'
      };
      
      console.log("[CHECK] PropertyData returned:", propertyData);
      console.log("[INFO] Property data compilation complete");
      console.log("[DEBUG] Complete property data:", JSON.stringify(propertyData, null, 2));
      
      return propertyData;
    } catch (error) {
      console.error('[ERROR] Error researching property:', error);
      throw error;
    }
  }
  
  /**
   * Convert an address to latitude and longitude coordinates
   */
  private async geocodeAddress(address: string): Promise<{ lat: number, lng: number }> {
    try {
      console.log(`Geocoding address: ${address}`);
  
      // When running on the server inside the API route, we need to use direct Google API calls
      // This is likely running server-side in the /api/explore endpoint
      const encodedAddress = encodeURIComponent(address);
      const apiKey = process.env.GOOGLEMAPS_API_KEY;
      
      if (!apiKey) {
        throw new Error("API key not configured");
      }
      
      // Make direct request to Google Maps API
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
      
      console.log(`Making direct geocoding request to Google API for: ${address}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geocoding API HTTP error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if the geocoding was successful
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`Geocoding failed with status: ${data.status}, error: ${data.error_message || 'No results found'}`);
      }
      
      // Get the location
      const location = data.results[0].geometry.location;
      console.log(`Geocoding result: ${location.lat}, ${location.lng}`);
      
      return { lat: location.lat, lng: location.lng };
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }
  
  /**
   * Fetch data from Google's Solar API
   */
  private async fetchSolarData(lat: number, lng: number): Promise<any> {
    console.log(`Fetching solar data for coordinates: ${lat}, ${lng}`);
    
    try {
      // Use server-side API call
      const apiKey = process.env.GOOGLEMAPS_API_KEY;
      
      if (!apiKey) {
        throw new Error("API key not configured");
      }
      
      // Make direct request to Google's Solar API
      const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;
      
      console.log(`Making Solar API request`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Solar API HTTP error: ${response.status} ${response.statusText}, Details: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Validate that we received the expected data structure
      if (!data.solarPotential) {
        throw new Error('Invalid Solar API response: missing solarPotential data');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching solar data:', error);
      throw error;
    }
  }
  
  /**
   * Extract property details from the Solar API response
   */
  private extractPropertyDetails(solarData: any): PropertyDetails {
    try {
      console.log(`[DEBUG] Extracting property details from Solar API response`);
      const solarPotential = solarData.solarPotential || {};
      const wholeRoofStats = solarPotential.wholeRoofStats || {};
      
      // Log available data
      console.log(`[DEBUG] Available wholeRoofStats keys: ${Object.keys(wholeRoofStats).join(', ')}`);
      
      // Convert m² to ft²
      const conversionFactor = 10.7639;
      const groundAreaSqFt = wholeRoofStats.groundAreaMeters2 
        ? Math.round(wholeRoofStats.groundAreaMeters2 * conversionFactor) 
        : undefined;
      
      console.log(`[DEBUG] Extracted ground area: ${groundAreaSqFt} sq ft`);
      
      const propertyDetails = {
        // We don't get these from Google Solar API, would need property data API
        yearBuilt: undefined,
        squareFeet: undefined,
        bedrooms: undefined,
        bathrooms: undefined,
        propertyType: 'Residential', // Default assumption
        lotSize: undefined,
        lastSalePrice: undefined,
        lastSaleDate: undefined,
        groundArea: groundAreaSqFt,
        imageryQuality: solarData.imageryQuality || 'Unknown'
      };
      
      return propertyDetails;
    } catch (error) {
      console.error('[ERROR] Error extracting property details:', error);
      return {
        propertyType: 'Residential',
        imageryQuality: solarData?.imageryQuality || 'Unknown'
      };
    }
  }
  
  /**
   * Extract roof details from the Solar API response
   */
  private extractRoofDetails(solarData: any): RoofDetails {
    try {
      console.log(`[DEBUG] Extracting roof details from Solar API response`);
      const solarPotential = solarData.solarPotential || {};
      const wholeRoofStats = solarPotential.wholeRoofStats || {};
      const roofSegmentStats = solarPotential.roofSegmentStats || [];
      
      // Log available data
      console.log(`[DEBUG] Available wholeRoofStats keys: ${Object.keys(wholeRoofStats).join(', ')}`);
      console.log(`[DEBUG] Number of roof segments: ${roofSegmentStats.length}`);
      
      // Convert m² to ft²
      const conversionFactor = 10.7639;
      const roofAreaSqFt = wholeRoofStats.areaMeters2 
        ? Math.round(wholeRoofStats.areaMeters2 * conversionFactor) 
        : 0;
      
      console.log(`[DEBUG] Extracted total roof area: ${roofAreaSqFt} sq ft`);
      
      // Calculate total roof squares (1 square = 100 sq ft)
      const totalRoofSquares = Math.ceil(roofAreaSqFt / 100);
      
      // Extract data for each roof facet
      const facets = roofSegmentStats.map((segment: any, index: number) => {
        const stats = segment.stats || {};
        const pitchDegrees = segment.pitchDegrees || 0;
        const azimuthDegrees = segment.azimuthDegrees;
        const areaSqFt = stats.areaMeters2 ? Math.round(stats.areaMeters2 * conversionFactor * 100) / 100 : 0;
        
        // Calculate percentage of total roof area
        const percentageOfRoof = roofAreaSqFt > 0 
          ? (areaSqFt / roofAreaSqFt) * 100 
          : 0;
        
        // Get sunlight hours if available
        const sunlightHours = segment.sunshineQuantiles 
          ? segment.sunshineQuantiles[4] // Use median value (index 4)
          : segment.sunshineHours;
          
        return {
          index: index + 1, // 1-based index for display
          area: Math.round(areaSqFt * 100) / 100, // Round to 2 decimal places
          pitch: this.convertPitchToFraction(pitchDegrees),
          pitchDegrees: pitchDegrees,
          orientation: azimuthDegrees ? this.degreesToOrientation(azimuthDegrees) : 'Unknown',
          sunlightHours: sunlightHours,
          azimuthDegrees,
          percentageOfRoof: Math.round(percentageOfRoof * 10) / 10 // Round to 1 decimal place
        };
      });
      
      console.log(`[DEBUG] Extracted ${facets.length} roof facets`);
      
      // Sort facets by area (largest first)
      facets.sort((a, b) => b.area - a.area);
      
      // Get the max pitch from all segments
      const maxPitchDegrees = roofSegmentStats.length > 0 
        ? Math.max(...roofSegmentStats.map((segment: any) => segment.pitchDegrees || 0))
        : 0;
      
      // Get ground area if available
      const groundAreaSqFt = wholeRoofStats.groundAreaMeters2 
        ? Math.round(wholeRoofStats.groundAreaMeters2 * conversionFactor) 
        : undefined;
      
      // Get the most common pitch for the roof summary
      const commonPitch = this.getMostCommonPitch(facets);
      console.log(`[DEBUG] Most common roof pitch: ${commonPitch}`);
      
      const roofDetails = {
        roofArea: roofAreaSqFt,
        roofFacets: roofSegmentStats.length,
        roofPitch: commonPitch,
        roofMaterial: 'Unknown', // Solar API doesn't provide this
        facets,
        totalRoofSquares,
        groundArea: groundAreaSqFt
      };
      
      return roofDetails;
    } catch (error) {
      console.error('[ERROR] Error extracting roof details:', error);
      return {
        roofArea: 0,
        roofFacets: 0,
        roofPitch: 'Unknown',
        facets: []
      };
    }
  }

  /**
   * Find the most common pitch among roof facets
   */
  private getMostCommonPitch(facets: RoofFacet[]): string {
    if (!facets || facets.length === 0) return 'Unknown';
    
    // If there's only one facet, use its pitch
    if (facets.length === 1) return facets[0].pitch;
    
    // Count occurrences of each pitch
    const pitchCounts = facets.reduce((counts, facet) => {
      counts[facet.pitch] = (counts[facet.pitch] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Find the most common pitch
    let mostCommonPitch = 'Unknown';
    let highestCount = 0;
    
    for (const [pitch, count] of Object.entries(pitchCounts)) {
      if (count > highestCount) {
        highestCount = count;
        mostCommonPitch = pitch;
      }
    }
    
    return mostCommonPitch;
  }

  /**
   * Extract solar potential data from the API response
   */
  private extractSolarPotential(solarData: any): SolarPotential {
    try {
      console.log(`[DEBUG] Extracting solar potential from Solar API response`);
      const solarPotential = solarData.solarPotential || {};
      const financialAnalyses = solarPotential.financialAnalyses || [];
      const solarPanelConfigs = solarPotential.solarPanelConfigs || [];
      const maxSunshineHours = solarPotential.maxSunshineHoursPerYear || 0;
      
      // Log available data
      console.log(`[DEBUG] Available solarPotential keys: ${Object.keys(solarPotential).join(', ')}`);
      console.log(`[DEBUG] Number of financial analyses: ${financialAnalyses.length}`);
      console.log(`[DEBUG] Number of solar panel configs: ${solarPanelConfigs.length}`);
      console.log(`[DEBUG] Max sunshine hours per year: ${maxSunshineHours}`);
      
      // Find the best configuration based on savings
      let bestConfig: any = null;
      let maxSavings = 0;
      let installationCost = 0;
      let costOfElectricityWithoutSolar = 0;
      let remainingLifetimeUtilityBill = 0;
      let monthlyBill = 0;
      
      financialAnalyses.forEach((config: any) => {
        console.log(`[DEBUG] Checking financial analysis config, has cashPurchaseSavings: ${!!config.cashPurchaseSavings}`);
        if (config.cashPurchaseSavings?.savings?.savingsYear20?.units) {
          const currentSavings = Number(config.cashPurchaseSavings.savings.savingsYear20.units);
          console.log(`[DEBUG] Found savings: ${currentSavings}`);
          if (currentSavings > maxSavings) {
            maxSavings = currentSavings;
            bestConfig = config;
          }
        }
      });
      
      if (bestConfig) {
        console.log(`[DEBUG] Best config found with savings: ${maxSavings}`);
        // Extract financial data from best configuration
        const cashPurchase = bestConfig.cashPurchaseSavings || {};
        const financialDetails = bestConfig.financialDetails || {};
        
        installationCost = Number(cashPurchase.upfrontCost?.units || 0);
        costOfElectricityWithoutSolar = Number(financialDetails.costOfElectricityWithoutSolar?.units || 0);
        remainingLifetimeUtilityBill = Number(financialDetails.remainingLifetimeUtilityBill?.units || 0);
        monthlyBill = Number(bestConfig.monthlyBill?.units || 0);
        
        console.log(`[DEBUG] Installation cost: $${installationCost}`);
        console.log(`[DEBUG] Cost without solar: $${costOfElectricityWithoutSolar}`);
        console.log(`[DEBUG] Remaining utility bill: $${remainingLifetimeUtilityBill}`);
      } else {
        console.log(`[WARN] No best financial configuration found`);
      }
      
      // Get the best solar panel configuration
      const bestPanelConfig = solarPanelConfigs.length > 0 ? solarPanelConfigs[0] : null;
      
      // Calculate total cost with solar
      const totalCostWithSolar = installationCost + remainingLifetimeUtilityBill;
      
      // Calculate net savings
      const netSavings = costOfElectricityWithoutSolar - totalCostWithSolar;
      console.log(`[DEBUG] Calculated net savings: $${netSavings}`);
      
      // Calculate payback period
      let paybackPeriodYears = 0;
      if (bestConfig && bestConfig.paybackYears) {
        paybackPeriodYears = bestConfig.paybackYears;
      } else {
        // Simple calculation if not provided
        const annualSavings = netSavings / 20; // 20-year period
        paybackPeriodYears = annualSavings > 0 ? installationCost / annualSavings : 0;
      }
      console.log(`[DEBUG] Payback period: ${paybackPeriodYears} years`);
      
      // Determine suitability score based on net savings
      let suitabilityScore: 'Bad Fit' | 'Good Fit' | 'Great Fit' = 'Bad Fit';
      if (netSavings > 15000) {
        suitabilityScore = 'Great Fit';
      } else if (netSavings > 0) {
        suitabilityScore = 'Good Fit';
      }
      console.log(`[DEBUG] Suitability score: ${suitabilityScore}`);
      
      // Get yearly energy from the panel config, or calculate it if not available
      const yearlyEnergyDcKwh = bestPanelConfig?.yearlyEnergyDcKwh || 
        (solarPotential.panelCapacityWatts && solarPotential.panelCapacityWatts > 0 ? 
          solarPotential.maxArrayPanelsCount * solarPotential.panelCapacityWatts * maxSunshineHours / 1000 : 0);
      console.log(`[DEBUG] Yearly energy production: ${yearlyEnergyDcKwh} kWh`);
      
      const extractedSolarPotential = {
        maxArrayPanels: solarPotential.maxArrayPanelsCount || 0,
        maxArrayArea: (solarPotential.maxArrayAreaMeters2 || 0) * 10.7639, // Convert to sq ft
        yearlyEnergyDcKwh,
        sunshineHours: maxSunshineHours,
        suitabilityScore,
        imageryQuality: solarData.imageryQuality || 'Unknown',
        costsAndSavings: {
          installationCost,
          lifetimeUtilityBill: remainingLifetimeUtilityBill,
          totalCostWithSolar,
          costWithoutSolar: costOfElectricityWithoutSolar,
          netSavings,
          estimatedYearlyEnergy: yearlyEnergyDcKwh,
          sunlightHoursPerYear: maxSunshineHours,
          monthlyUtilityBill: monthlyBill,
          paybackPeriodYears: Math.round(paybackPeriodYears * 10) / 10 // Round to 1 decimal place
        }
      };
      
      return extractedSolarPotential;
    } catch (error) {
      console.error('[ERROR] Error extracting solar potential:', error);
      return {
        maxArrayPanels: 0,
        maxArrayArea: 0,
        yearlyEnergyDcKwh: 0,
        sunshineHours: 0,
        costsAndSavings: {
          installationCost: 0,
          lifetimeUtilityBill: 0,
          totalCostWithSolar: 0,
          costWithoutSolar: 0,
          netSavings: 0,
          estimatedYearlyEnergy: 0,
          sunlightHoursPerYear: 0
        }
      };
    }
  }

  /**
   * Convert pitch degrees to a fraction (e.g., 22.6° to 5/12 pitch)
   */
  private convertPitchToFraction(pitchDegrees: number): string {
    if (!pitchDegrees && pitchDegrees !== 0) return 'Unknown';
    
    const radians = pitchDegrees * Math.PI / 180;
    const slope = Math.tan(radians);
    const rise = Math.round(slope * 12);
    
    return `${rise}/12`;
  }

  /**
   * Convert azimuth degrees to compass orientation
   */
  private degreesToOrientation(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }
}