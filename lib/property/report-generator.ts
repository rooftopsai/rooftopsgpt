// lib/property/report-generator.ts

import { PropertyData } from './property-service';

export interface GeneratedReport {
  markdown: string;
  htmlContent: string;
  jsonData: any;
}

/**
 * Generates comprehensive property reports based on gathered data
 */
export class PropertyReportGenerator {
  /**
   * Generate a complete property report
   */
  async generateReport(propertyData: PropertyData): Promise<GeneratedReport> {
    try {
      // Generate the markdown report content
      const markdown = this.generateMarkdownReport(propertyData);
      
      // Convert to HTML for display
      const htmlContent = this.markdownToHtml(markdown);
      
      // Also create a structured JSON version for programmatic use
      const jsonData = this.createJsonReport(propertyData);
      
      return {
        markdown,
        htmlContent,
        jsonData
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }
  
  /**
   * Creates a formatted Markdown report
   */
  private generateMarkdownReport(data: PropertyData): string {
    const { address, propertyDetails, roofDetails, solarPotential } = data;
    
    return `# Property Report: ${address.fullAddress}

## Property Overview
- **Address**: ${address.fullAddress}
- **Property Type**: ${propertyDetails.propertyType || 'Unknown'}
- **Year Built**: ${propertyDetails.yearBuilt || 'Unknown'}
- **Square Footage**: ${propertyDetails.squareFeet || 'Unknown'} sq ft
- **Lot Size**: ${propertyDetails.lotSize ? propertyDetails.lotSize + ' acres' : 'Unknown'}

## Roof Analysis
- **Total Roof Area**: ${roofDetails.roofArea.toFixed(0)} sq ft
- **Number of Roof Facets**: ${roofDetails.roofFacets}
- **Roof Pitch**: ${roofDetails.roofPitch}
- **Estimated Roof Age**: ${roofDetails.estimatedAge || 'Unknown'} years

### Roof Facet Details
${roofDetails.facets.map((facet, index) => `
#### Facet ${index + 1}
- Area: ${facet.area.toFixed(2)} sq ft
- Pitch: ${facet.pitch}
${facet.orientation ? `- Orientation: ${facet.orientation}` : ''}
${facet.sunlightHours ? `- Average Daily Sunlight: ${facet.sunlightHours.toFixed(1)} hours` : ''}
`).join('')}

## Solar Potential
- **Maximum Solar Panel Capacity**: ${solarPotential.maxArrayPanels} panels
- **Maximum Array Area**: ${solarPotential.maxArrayArea.toFixed(2)} sq ft
- **Yearly Energy Production**: ${solarPotential.yearlyEnergyDcKwh.toFixed(2)} kWh
- **Average Daily Sunshine**: ${(solarPotential.sunshineHours / 365).toFixed(1)} hours

### Financial Analysis
- **Upfront Cost of Solar Installation**: $${solarPotential.costsAndSavings.installationCost.toFixed(2)}
- **Lifetime Utility Bill with Solar**: $${solarPotential.costsAndSavings.lifetimeUtilityBill.toFixed(2)}
- **Total Cost with Solar (20 Years)**: $${solarPotential.costsAndSavings.totalCostWithSolar.toFixed(2)}
- **Cost of Electricity Without Solar (20 Years)**: $${solarPotential.costsAndSavings.costWithoutSolar.toFixed(2)}
- **Estimated Net Savings Over 20 Years**: $${solarPotential.costsAndSavings.netSavings.toFixed(2)}

## Roofing Recommendations
${this.generateRoofingRecommendations(data)}

## Next Steps
1. **Schedule a Professional Inspection**: Get a detailed roof assessment
2. **Request a Quote**: Our team can provide a customized quote for your roofing needs
3. **Explore Financing Options**: Ask about our flexible payment plans

*Report generated on ${new Date().toLocaleDateString()} by Roofing Chatbot*
`;
  }
  
  /**
   * Generate customized roofing recommendations based on property data
   */
  private generateRoofingRecommendations(data: PropertyData): string {
    const { roofDetails, propertyDetails } = data;
    let recommendations = '';
    
    // Age-based recommendations
    if (propertyDetails.yearBuilt) {
      const roofAge = new Date().getFullYear() - propertyDetails.yearBuilt;
      
      if (roofAge > 20) {
        recommendations += '- **Consider Full Replacement**: Based on the property age, your roof may be approaching the end of its serviceable life.\n';
      } else if (roofAge > 15) {
        recommendations += '- **Inspection Recommended**: Your roof is reaching the age where problems typically develop. A thorough inspection is advised.\n';
      } else if (roofAge > 10) {
        recommendations += '- **Preventative Maintenance**: At this age, preventative maintenance can extend roof life and prevent costly repairs.\n';
      } else {
        recommendations += '- **Regular Maintenance**: Your roof is relatively new. Regular maintenance will help protect your investment.\n';
      }
    }
    
    // Pitch-based recommendations
    const pitch = typeof roofDetails.roofPitch === 'string' 
      ? parseInt(roofDetails.roofPitch.split('/')[0]) 
      : roofDetails.roofPitch;
      
    if (pitch >= 8) {
      recommendations += '- **Steep Roof Considerations**: Your roof has a steep pitch which affects material choice and installation complexity.\n';
    } else if (pitch <= 3) {
      recommendations += '- **Low-Slope Solutions**: Your roof has a relatively low pitch which requires special materials to prevent water pooling.\n';
    }
    
    // Material recommendations
    recommendations += '- **Material Options**:\n';
    recommendations += '  - **Asphalt Shingles**: Economical and widely used, lifespan of 15-30 years depending on quality\n';
    recommendations += '  - **Metal Roofing**: Longer lifespan (40-70 years), energy efficient, higher upfront cost\n';
    recommendations += '  - **Clay Tile**: Aesthetically pleasing, excellent durability, higher cost and weight\n';
    
    return recommendations;
  }
  
  /**
   * Simple markdown to HTML conversion
   * In a real implementation, use a proper library like marked
   */
  private markdownToHtml(markdown: string): string {
    // This is a very simplified conversion
    // For production, use a proper Markdown parser
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    
    // Convert lists
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
    
    // Convert bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert paragraphs
    html = html.replace(/^([^<].*$)/gm, '<p>$1</p>');
    
    // Remove empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    
    // Wrap in a div
    html = `<div class="property-report">${html}</div>`;
    
    return html;
  }
  
  /**
   * Create a structured JSON version of the report
   */
  private createJsonReport(data: PropertyData): any {
    // Transform the data into a structure optimized for UI rendering
    return {
      property: {
        address: data.address.fullAddress,
        details: data.propertyDetails
      },
      roof: {
        summary: {
          area: data.roofDetails.roofArea,
          facets: data.roofDetails.roofFacets,
          pitch: data.roofDetails.roofPitch
        },
        facetDetails: data.roofDetails.facets
      },
      solar: {
        potential: {
          maxPanels: data.solarPotential.maxArrayPanels,
          yearlyEnergy: data.solarPotential.yearlyEnergyDcKwh,
          sunshineHours: data.solarPotential.sunshineHours
        },
        financials: data.solarPotential.costsAndSavings
      },
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0'
      }
    };
  }
}