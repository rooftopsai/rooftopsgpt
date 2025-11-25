// RooferWeatherWidget.tsx - With AerisWeather Hail Integration

import React, { useState, useEffect, useRef } from 'react';
import { Droplets, Wind, SunDim, Cloud, Calendar, AlertTriangle, Umbrella, ChevronLeft, ChevronRight } from 'lucide-react';

// API keys from environment variables
const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY || 'YOUR_OPENWEATHERMAP_API_KEY';
const AERIS_CLIENT_ID = process.env.NEXT_PUBLIC_AERISWEATHER_CLIENT_ID || 'YOUR_AERISWEATHER_CLIENT_ID';
const AERIS_CLIENT_SECRET = process.env.NEXT_PUBLIC_AERISWEATHER_CLIENT_SECRET || 'YOUR_AERISWEATHER_CLIENT_SECRET';

// Component for displaying roofing-specific weather information
export default function RooferWeatherWidget({ 
  location, 
  onClose 
}: { 
  location: string, 
  onClose: () => void 
}) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [hailData, setHailData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hailLoadingProgress, setHailLoadingProgress] = useState(0); // For loading progress
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Check API key configuration
  const detectApiConfigurationIssues = () => {
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
      throw new Error('OpenWeatherMap API key is not configured. Please set it in your environment variables.');
    }
    
    if (!AERIS_CLIENT_ID || AERIS_CLIENT_ID === 'YOUR_AERISWEATHER_CLIENT_ID' || 
        !AERIS_CLIENT_SECRET || AERIS_CLIENT_SECRET === 'YOUR_AERISWEATHER_CLIENT_SECRET') {
      console.warn('AerisWeather API credentials not configured. Falling back to OpenWeatherMap for hail data.');
    }
  };
  
  // Extract ZIP code from location string
  const extractZipFromLocation = (loc: string): string | null => {
    // Check if the string has a ZIP code format directly
    const directZipMatch = /^\d{5}(-\d{4})?$/.exec(loc.trim());
    if (directZipMatch) {
      return loc.trim();
    }
    
    // Check for formatted strings like "38139 (Germantown, US)"
    const formattedZipMatch = /^(\d{5}(-\d{4})?)\s*\([^)]+\)$/.exec(loc.trim());
    if (formattedZipMatch) {
      return formattedZipMatch[1];
    }
    
    // Extract any ZIP code in the string
    const anyZipMatch = /\b(\d{5}(-\d{4})?)\b/.exec(loc);
    if (anyZipMatch) {
      return anyZipMatch[1];
    }
    
    return null;
  };
  
  // Fetch historical hail data from AerisWeather
  const fetchAerisHailData = async (lat: number, lon: number) => {
    try {
      // Create start and end dates (30 days back until today)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      const fromDate = formatDate(startDate);
      const toDate = formatDate(endDate);
      
      console.log(`Fetching AerisWeather hail data from ${fromDate} to ${toDate}`);
      
      // Check if we have API credentials
      if (!AERIS_CLIENT_ID || AERIS_CLIENT_ID === 'YOUR_AERISWEATHER_CLIENT_ID' || 
          !AERIS_CLIENT_SECRET || AERIS_CLIENT_SECRET === 'YOUR_AERISWEATHER_CLIENT_SECRET') {
        throw new Error('AerisWeather API credentials not configured');
      }
      
      // Build the API URL for historical hail reports
      // Using the "stormreports" endpoint with filter for hail type
      const apiUrl = `https://api.aerisapi.com/stormreports?p=${lat},${lon}&radius=15mi&from=${fromDate}&to=${toDate}&limit=50&filter=hail&client_id=${AERIS_CLIENT_ID}&client_secret=${AERIS_CLIENT_SECRET}`;
      
      console.log("Fetching AerisWeather data from URL:", apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`AerisWeather API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`AerisWeather API returned error: ${data.error?.description || 'Unknown error'}`);
      }
      
      console.log("AerisWeather raw response:", data);
      
      // Transform AerisWeather data format to our app's format
      // Handle potential differences in API response structure
      const hailEvents = data.response
        .filter((report: any) => {
          // Ensure we're only processing hail reports
          return report.type && report.type.toLowerCase() === 'hail';
        })
        .map((report: any) => {
          // Handle different possible response structures
          const timestamp = report.dateTimeISO ? new Date(report.dateTimeISO).getTime() / 1000 : 
                            report.timestamp ? report.timestamp : 
                            Math.floor(Date.now() / 1000);
          
          // Extract hail size - look in different possible locations based on API response
          let sizeInches = 0;
          let sizeName = "Unknown";
          
          if (report.report && report.report.size) {
            // Primary expected structure
            sizeInches = report.report.size.inches || report.report.size.value || 0;
            sizeName = report.report.size.name || "hail";
          } else if (report.detail && report.detail.hailSize) {
            // Alternative structure
            sizeInches = report.detail.hailSize.inches || report.detail.hailSize || 0;
            sizeName = report.detail.hailSize >= 1 ? "Large" : 
                      report.detail.hailSize >= 0.5 ? "Medium" : "Small";
          } else if (report.hailSize) {
            // Another possible structure
            sizeInches = report.hailSize;
            sizeName = report.hailSize >= 1 ? "Large" : 
                      report.hailSize >= 0.5 ? "Medium" : "Small";
          }
          
          // Format description based on available data
          const description = `${sizeName} hail${sizeInches ? ` (${sizeInches}" diameter)` : ''}`;
          
          // Determine severity based on size
          const severity = getHailSeverityFromSize(sizeInches);
          
          // Get location information if available
          const location = report.place ? report.place.name : 
                          report.loc ? report.loc.name : "Nearby";
          
          return {
            time: timestamp,
            description: description,
            severity: severity,
            historical: true,
            source: 'AerisWeather',
            sizeInches: sizeInches,
            location: location
          };
        });
      
      console.log(`Found ${hailEvents.length} hail events from AerisWeather:`, hailEvents);
      
      return hailEvents;
    } catch (error) {
      console.error("Error fetching AerisWeather hail data:", error);
      // Return empty array but don't throw, so we can fall back to OpenWeatherMap
      return [];
    }
  };
  
  // Determine hail severity based on hail size
  const getHailSeverityFromSize = (sizeInches: number): 'low' | 'medium' | 'high' => {
    if (sizeInches >= 1.5) return 'high';     // Significant damage to most roofs
    if (sizeInches >= 0.75) return 'medium';  // Can damage asphalt shingles
    return 'low';                             // May not cause significant damage
  };
  
  // Fallback to OpenWeatherMap historical data if needed
  const fetchHistoricalHailData = async (lat: number, lon: number) => {
    const hailEvents = [];
    const DAYS_TO_CHECK = 30; // Look back 30 days instead of 5
    
    try {
      // First, try to get hail data from AerisWeather
      try {
        const aerisHailEvents = await fetchAerisHailData(lat, lon);
        if (aerisHailEvents.length > 0) {
          return aerisHailEvents; // Use AerisWeather data if available
        }
        console.log("No AerisWeather hail data found, falling back to OpenWeatherMap");
      } catch (aerisError) {
        console.warn("AerisWeather fetch failed, falling back to OpenWeatherMap:", aerisError);
      }
      
      // Fallback to OpenWeatherMap historical data
      // Create timestamps for each day we want to check (up to 30 days back)
      const timestamps = [];
      const now = Math.floor(Date.now() / 1000);
      
      for (let i = 1; i <= DAYS_TO_CHECK; i++) {
        // Each timestamp is for a different day, going back from most recent to oldest
        const dayTimestamp = now - (i * 24 * 60 * 60);
        timestamps.push(dayTimestamp);
      }
      
      // Define how many days to check in each batch (to avoid rate limiting)
      const BATCH_SIZE = 5;
      const batches = Math.ceil(timestamps.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        // Get the current batch of timestamps
        const batchTimestamps = timestamps.slice(
          batchIndex * BATCH_SIZE, 
          (batchIndex + 1) * BATCH_SIZE
        );
        
        // Create and execute API requests in parallel for this batch
        const batchRequests = batchTimestamps.map(timestamp => 
          fetch(`https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&units=imperial&appid=${OPENWEATHER_API_KEY}`)
            .then(response => {
              if (!response.ok) {
                // Don't throw, just return null for unsuccessful requests
                console.warn(`Historical data fetch failed for day ${timestamp}: ${response.status}`);
                return null;
              }
              return response.json();
            })
            .catch(err => {
              console.warn(`Error fetching historical data for day ${timestamp}:`, err);
              return null; // Return null for failed requests
            })
        );
        
        // Wait for all requests in this batch to complete
        const batchResults = await Promise.all(batchRequests);
        
        // Process each result from this batch
        batchResults.forEach(data => {
          if (data) {
            // Check for hail events in this day's data
            const events = detectHailEventsInData(data);
            if (events.length > 0) {
              hailEvents.push(...events);
            }
          }
        });
        
        // Update progress after each batch
        setHailLoadingProgress(Math.min(100, Math.round(((batchIndex + 1) / batches) * 100)));
      }
      
      return hailEvents;
    } catch (error) {
      console.error("Error fetching 30-day historical hail data:", error);
      throw error;
    }
  };
  
  // Detect hail events in a single day's data (OpenWeatherMap format)
  const detectHailEventsInData = (data: any) => {
    const hailEvents = [];
    
    if (!data || !data.data) return [];
    
    // Check hourly historical data for hail events
    data.data.forEach((hourData: any) => {
      if (
        // Check weather codes for hail (WMO code 906 or 'Hail' in description)
        hourData.weather && 
        hourData.weather.some((w: any) => 
          w.id === 906 || 
          w.description.toLowerCase().includes('hail') ||
          (w.id >= 200 && w.id < 300 && w.description.toLowerCase().includes('heavy'))
        )
      ) {
        hailEvents.push({
          time: hourData.dt,
          description: hourData.weather[0].description,
          severity: getSeverityFromWeatherCode(hourData.weather[0].id),
          historical: true,
          source: 'OpenWeatherMap'
        });
      }
    });
    
    return hailEvents;
  };
  
  // Main data fetching function
  useEffect(() => {
    const fetchWeatherData = async () => {
      setIsLoading(true);
      setHailLoadingProgress(0);
      
      try {
        // First check for API key issues
        detectApiConfigurationIssues();
        
        // Extract location info
        let lat, lon;
        let locationDisplay = location; // For displaying in UI
        
        // Check if we have a ZIP code
        const zipCode = extractZipFromLocation(location);
        
        if (zipCode) {
          // Handle ZIP code lookup - use ONLY the ZIP code, not the formatted string
          console.log("Processing as ZIP code:", zipCode);
          
          const zipResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/zip?zip=${zipCode}&appid=${OPENWEATHER_API_KEY}`
          );
          
          if (!zipResponse.ok) {
            if (zipResponse.status === 401) {
              throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
            } else if (zipResponse.status === 404) {
              throw new Error(`ZIP code "${zipCode}" not found. Please verify the ZIP code.`);
            } else {
              throw new Error(`Error looking up ZIP code: ${zipResponse.status} ${zipResponse.statusText}`);
            }
          }
          
          const zipData = await zipResponse.json();
          if (!zipData || !zipData.lat || !zipData.lon) {
            throw new Error(`Location data not available for ZIP code "${zipCode}"`);
          }
          
          lat = zipData.lat;
          lon = zipData.lon;
          
          // If location was already formatted, keep it, otherwise format it
          if (!location.includes('(')) {
            locationDisplay = `${zipCode} (${zipData.name}, ${zipData.country})`;
          }
        } else {
          // Handle place name lookup
          console.log("Processing as location name:", location);
          
          // Try to detect if this is a "(City, State)" format without ZIP
          const cityParenMatch = /^\(([^)]+)\)$/.exec(location.trim());
          const queryLocation = cityParenMatch ? cityParenMatch[1] : location;
          
          const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(queryLocation)}&limit=1&appid=${OPENWEATHER_API_KEY}`
          );
          
          if (!geoResponse.ok) {
            if (geoResponse.status === 401) {
              throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
            } else {
              throw new Error(`Error looking up location: ${geoResponse.status} ${geoResponse.statusText}`);
            }
          }
          
          const geoData = await geoResponse.json();
          
          if (!geoData || geoData.length === 0) {
            throw new Error(`Location "${queryLocation}" not found. Please try a different location format.`);
          }
          
          ({ lat, lon } = geoData[0]);
          
          // Format the location display with all available info if not already formatted
          if (!location.includes('(')) {
            const locationData = geoData[0];
            locationDisplay = locationData.name;
            if (locationData.state) locationDisplay += `, ${locationData.state}`;
            if (locationData.country && locationData.country !== "US") locationDisplay += `, ${locationData.country}`;
          }
        }
        
        // Then fetch the weather data with One Call API
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=imperial&appid=${OPENWEATHER_API_KEY}`
        );
        
        if (!weatherResponse.ok) {
          if (weatherResponse.status === 401) {
            throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
          } else {
            throw new Error(`Failed to fetch weather data: ${weatherResponse.status} ${weatherResponse.statusText}`);
          }
        }
        
        const data = await weatherResponse.json();
        // Add the formatted location display to the weather data
        data.locationDisplay = locationDisplay;
        setWeatherData(data);
        
        // Start fetching 30-day historical hail data (this is async and may take time)
        try {
          console.log("Fetching 30-day historical hail data...");
          
          // Get historical hail events
          const historicalHailEvents = await fetchHistoricalHailData(lat, lon);
          
          // Also detect hail events in the current forecast data
          const forecastHailEvents = [];
          
          // Check hourly forecast
          if (data.hourly) {
            data.hourly.forEach((hourData: any) => {
              if (
                hourData.weather && 
                hourData.weather.some((w: any) => 
                  w.id === 906 || 
                  w.description.toLowerCase().includes('hail') ||
                  (w.id >= 200 && w.id < 300 && w.description.toLowerCase().includes('heavy'))
                )
              ) {
                forecastHailEvents.push({
                  time: hourData.dt,
                  description: hourData.weather[0].description,
                  severity: getSeverityFromWeatherCode(hourData.weather[0].id),
                  historical: hourData.dt < (Date.now() / 1000),
                  source: 'OpenWeatherMap'
                });
              }
            });
          }
          
          // Check daily forecast
          if (data.daily) {
            data.daily.forEach((dayData: any) => {
              if (
                dayData.weather && 
                dayData.weather.some((w: any) => 
                  w.id === 906 || 
                  w.description.toLowerCase().includes('hail') ||
                  (w.id >= 200 && w.id < 300 && w.description.toLowerCase().includes('heavy'))
                )
              ) {
                forecastHailEvents.push({
                  time: dayData.dt,
                  description: dayData.weather[0].description,
                  severity: getSeverityFromWeatherCode(dayData.weather[0].id),
                  historical: dayData.dt < (Date.now() / 1000),
                  probability: dayData.pop,
                  source: 'OpenWeatherMap'
                });
              }
            });
          }
          
          // Combine historical and forecast hail events
          const allHailEvents = [...historicalHailEvents, ...forecastHailEvents];
          
          // Sort by time (most recent first)
          allHailEvents.sort((a, b) => b.time - a.time);
          
          setHailData(allHailEvents);
          console.log(`Found ${allHailEvents.length} hail events in the last 30 days and upcoming forecast`);
        } catch (histErr) {
          console.error("Error fetching historical data:", histErr);
          // Continue without historical data
        }
      } catch (err: any) {
        console.error("Weather data fetch error:", err);
        setError(err.message || 'An unknown error occurred while fetching weather data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (location) {
      fetchWeatherData();
    }
  }, [location]);

  // Scroll handlers for horizontal scrolling
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Get severity level from weather code
  const getSeverityFromWeatherCode = (code: number) => {
    // Thunderstorm with hail
    if (code === 906) return 'high';
    // Heavy thunderstorm
    if (code === 212 || code === 221) return 'medium';
    // Thunderstorm
    if (code >= 200 && code < 300) return 'low';
    return 'unknown';
  };
  
  // Calculate if conditions are safe for roofing work
  const isRoofingSafe = (data: any) => {
    if (!data) return { safe: false, reasons: ['No weather data available'] };
    
    const reasons = [];
    
    // Check wind speed - generally not safe above 25 mph
    if (data.wind_speed > 25) {
      reasons.push('High winds');
    }
    
    // Check precipitation - not safe if actively raining
    if (data.rain || data.snow || data.weather[0].main === 'Rain' || data.weather[0].main === 'Snow') {
      reasons.push('Precipitation');
    }
    
    // Check temperature - not ideal below 40°F (shingles may crack)
    if (data.temp < 40) {
      reasons.push('Too cold for optimal shingle installation');
    }
    
    // Check for lightning/storm risk
    if (data.weather[0].main === 'Thunderstorm') {
      reasons.push('Lightning risk');
    }
    
    // Check for hail risk
    if (data.weather[0].id === 906 || data.weather[0].description.toLowerCase().includes('hail')) {
      reasons.push('Hail risk');
    }
    
    return {
      safe: reasons.length === 0,
      reasons
    };
  };
  
  // Format the date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format the time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  if (isLoading) {
    return (
      <div className="mx-auto rounded-[5px] bg-white p-4 shadow-lg">
        <div className="flex animate-pulse flex-col space-y-4">
          <div className="h-6 w-3/4 rounded bg-gray-200"></div>
          <div className="h-32 rounded bg-gray-200"></div>
          <div className="h-20 rounded bg-gray-200"></div>
          <div className="h-20 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mx-auto rounded-[5px] bg-white p-4 shadow-lg">
        <h2 className="text-lg font-bold text-red-500">Error</h2>
        <p className="mt-2">{error}</p>
        <button onClick={onClose} className="mt-4 rounded bg-red-500 px-3 py-1 text-white">
          Close
        </button>
      </div>
    );
  }
  
  if (!weatherData) {
    return null;
  }
  
  const current = weatherData.current;
  const hourly = weatherData.hourly?.slice(0, 24) || [];
  const daily = weatherData.daily || [];
  
  // Use the formatted location display from the weather data
  const locationDisplay = weatherData.locationDisplay || location;
  
  // Determine if roofing work is safe right now
  const safetyStatus = isRoofingSafe(current);
  
  // Find the next precipitation time
  const nextPrecipitation = hourly.find((hour: any) => 
    hour.pop > 0.3 || 
    hour.weather[0].main === 'Rain' || 
    hour.weather[0].main === 'Snow'
  );
  
  // Calculate recent precipitation total (last 24 hours)
  const recentPrecipitation = hourly
    .slice(0, 24)
    .reduce((total: number, hour: any) => {
      return total + (hour.rain?.['1h'] || 0) + (hour.snow?.['1h'] || 0);
    }, 0);
  
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-[5px] bg-white shadow-lg">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{locationDisplay} Roof Weather</h2>
          <button onClick={onClose} className="text-white">✕</button>
        </div>
      </div>
      
      {/* Safety Status Banner */}
      <div className={`p-2 text-center font-bold text-white ${safetyStatus.safe ? 'bg-green-600' : 'bg-red-600'}`}>
        {safetyStatus.safe 
          ? 'Conditions are favorable for roofing work'
          : `Not recommended for roofing work: ${safetyStatus.reasons.join(', ')}`}
      </div>
      
      {/* Hail Alert Banner - Show if hail events detected */}
      {hailData && hailData.length > 0 && (
        <div className="bg-amber-600 p-2 text-center font-bold text-white">
          Hail events detected in the last 30 days - Potential roof damage
        </div>
      )}
      
      {/* Horizontal Scroll Controls */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 z-10 -translate-y-1/2">
          <button 
            onClick={handleScrollLeft}
            className="rounded-r-full bg-white/80 p-1 text-gray-700 shadow-md hover:bg-white"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        
        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">
          <button 
            onClick={handleScrollRight}
            className="rounded-l-full bg-white/80 p-1 text-gray-700 shadow-md hover:bg-white"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        {/* Horizontal Scrolling Cards Container */}
        <div 
          ref={scrollContainerRef}
          className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto px-2 py-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Current Weather Card */}
          <div className="mx-2 w-[280px] shrink-0 snap-center rounded-[5px] bg-white p-4 shadow-md">
            <h3 className="mb-3 flex items-center text-lg font-semibold">
              <SunDim className="mr-2" size={20} />
              Current Conditions
            </h3>
            
            <div className="mt-3 space-y-4">
              <div className="flex items-center">
                <img 
                  src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`} 
                  alt={current.weather[0].description} 
                  className="size-16"
                />
                <div>
                  <div className="text-3xl font-bold">{Math.round(current.temp)}°F</div>
                  <div className="capitalize">{current.weather[0].description}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500">Feels Like</div>
                  <div>{Math.round(current.feels_like)}°F</div>
                </div>
                
                <div>
                  <div className="text-gray-500">Humidity</div>
                  <div>{current.humidity}%</div>
                </div>
                
                <div className="flex items-center">
                  <Wind className="mr-1" size={16} />
                  <div>
                    <div className="text-gray-500">Wind</div>
                    <div>{Math.round(current.wind_speed)} mph</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Droplets className="mr-1" size={16} />
                  <div>
                    <div className="text-gray-500">Recent Rain</div>
                    <div>{recentPrecipitation.toFixed(2)}&quot;</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Precipitation Forecast Card */}
          <div className="mx-2 w-[280px] shrink-0 snap-center rounded-[5px] bg-white p-4 shadow-md">
            <h3 className="mb-3 flex items-center text-lg font-semibold">
              <Droplets className="mr-2" size={20} />
              Precipitation Forecast
            </h3>
            
            <div className="mt-3">
              {/* Next Precipitation */}
              {nextPrecipitation ? (
                <div className="mb-4">
                  <div className="font-semibold">Next precipitation expected:</div>
                  <div className="flex items-center text-blue-600">
                    <Calendar className="mr-2" size={16} />
                    {formatDate(nextPrecipitation.dt)} at {formatTime(nextPrecipitation.dt)}
                    <span className="ml-2">({Math.round(nextPrecipitation.pop * 100)}% chance)</span>
                  </div>
                </div>
              ) : (
                <div className="mb-4 text-green-600">
                  No precipitation expected in the next 24 hours
                </div>
              )}
              
              {/* Hourly Precipitation Chart */}
              <div className="mb-4">
                <div className="mb-2 font-semibold">24-Hour Precipitation Probability</div>
                <div className="flex h-32 items-end space-x-1">
                  {hourly.slice(0, 8).map((hour: any, index: number) => (
                    <div key={index} className="flex flex-1 flex-col items-center">
                      <div 
                        className="w-full rounded-t bg-blue-500" 
                        style={{ height: `${hour.pop * 100}%` }}
                      ></div>
                      <div className="mt-1 w-full truncate text-center text-xs">
                        {formatTime(hour.dt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Wind Conditions Card */}
          <div className="mx-2 w-[280px] shrink-0 snap-center rounded-[5px] bg-white p-4 shadow-md">
            <h3 className="mb-3 flex items-center text-lg font-semibold">
              <Wind className="mr-2" size={20} />
              Wind Conditions
            </h3>
            
            <div className="mt-3">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500">Current Speed</div>
                  <div className="text-lg">{Math.round(current.wind_speed)} mph</div>
                </div>
                
                <div>
                  <div className="text-gray-500">Wind Gusts</div>
                  <div className="text-lg">{Math.round(current.wind_gust || current.wind_speed)} mph</div>
                </div>
                
                <div>
                  <div className="text-gray-500">Direction</div>
                  <div className="text-lg">{getWindDirection(current.wind_deg)}</div>
                </div>
                
                <div>
                  <div className="text-gray-500">Working Conditions</div>
                  <div className={current.wind_speed > 25 ? 'font-bold text-red-600' : 'text-green-600'}>
                    {current.wind_speed > 25 ? 'UNSAFE' : 'Safe'} for roofing
                  </div>
                </div>
              </div>
              
              {/* Wind Forecast */}
              <div>
                <div className="mb-2 font-semibold">Wind Forecast</div>
                <div className="space-y-2">
                  {hourly.slice(0, 4).map((hour: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="w-16">{formatTime(hour.dt)}</span>
                      <div className="mx-1 flex flex-1 items-center">
                        <div 
                          className={`h-4 rounded ${hour.wind_speed > 25 ? 'bg-red-500' : 'bg-blue-400'}`} 
                          style={{ width: `${Math.min(hour.wind_speed * 2, 100)}%` }}
                        ></div>
                      </div>
                      <span className="w-14 text-right">{Math.round(hour.wind_speed)} mph</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Hail Events Card - UPDATED WITH AERISWEATHER */}
          <div className="mx-2 w-[280px] shrink-0 snap-center rounded-[5px] bg-white p-4 shadow-md">
            <h3 className="mb-3 flex items-center text-lg font-semibold">
              <AlertTriangle className="mr-2" size={20} />
              Hail Events (30-Day Report)
            </h3>
            
            <div className="mt-3 overflow-y-auto" style={{ maxHeight: '300px' }}>
              {/* Show loading indicator if still loading hail data */}
              {hailLoadingProgress > 0 && hailLoadingProgress < 100 && (
                <div className="mb-4">
                  <div className="mb-1 text-sm text-gray-600">Loading 30-day hail report...</div>
                  <div className="h-2.5 w-full rounded-full bg-gray-200">
                    <div 
                      className="h-2.5 rounded-full bg-blue-600" 
                      style={{ width: `${hailLoadingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {hailData && hailData.length > 0 ? (
                <div>
                  <div className="mb-4 rounded-[5px] bg-amber-100 p-3 text-amber-800">
                    <div className="font-bold">Potential Roof Damage Alert</div>
                    <p className="text-sm">
                      {hailData.length} hail event{hailData.length !== 1 ? 's' : ''} detected in this area within the last 30 days. 
                      Consider scheduling a roof inspection.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {hailData.map((event: any, index: number) => (
                      <div key={index} className="flex items-center border-b pb-2">
                        <div className={`mr-2 size-3 rounded-full${
                          event.severity === 'high' ? 'bg-red-500' : 
                          event.severity === 'medium' ? 'bg-amber-500' : 'bg-yellow-500'
                        }`}></div>
                        <div className="mr-auto">
                          <div className="text-sm font-medium capitalize">{event.description}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(event.time)} {formatTime(event.time)}
                            {event.historical ? ' (Past)' : ' (Forecast)'}
                            {event.source && <span className="ml-1">- {event.source}</span>}
                            {event.location && <span className="ml-1">- {event.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 rounded bg-gray-50 p-2 text-sm">
                    <div className="font-medium">Hail Roof Damage Info:</div>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                      <li>Small hail (under 0.75&quot;): typically won&apos;t damage most roofs</li>
                      <li>Medium hail (0.75&quot;-1.5&quot;): may damage asphalt shingles</li>
                      <li>Large hail (over 1.5&quot;): almost always causes roof damage</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <div className="font-medium text-green-600">No recent hail events detected</div>
                  <p className="mt-1 text-sm text-gray-500">
                    No significant hail activity has been reported in this area in the last 30 days.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* 5-Day Forecast Card */}
          <div className="mx-2 w-[280px] shrink-0 snap-center rounded-[5px] bg-white p-4 shadow-md">
            <h3 className="mb-3 flex items-center text-lg font-semibold">
              <Cloud className="mr-2" size={20} />
              5-Day Forecast
            </h3>
            
            <div className="mt-1 overflow-y-auto" style={{ maxHeight: '300px' }}>
              {daily.slice(0, 5).map((day: any, index: number) => {
                const daySafety = isRoofingSafe(day);
                
                return (
                  <div key={index} className="flex items-center border-b py-2 last:border-0">
                    <div className="w-16 text-sm font-medium">
                      {index === 0 ? 'Today' : formatDate(day.dt).split(', ')[0]}
                    </div>
                    <img 
                      src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`} 
                      alt={day.weather[0].description} 
                      className="size-8"
                    />
                    <div className="ml-1 flex-1">
                      <div className="text-xs capitalize">{day.weather[0].description}</div>
                      <div className="flex space-x-2 text-xs">
                        <span>
                          <Droplets size={12} className="inline" /> {Math.round(day.pop * 100)}%
                        </span>
                        <span>
                          <Wind size={12} className="inline" /> {Math.round(day.wind_speed)}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 text-right">
                      <div className="text-sm font-medium">{Math.round(day.temp.max)}°</div>
                      <div className="text-xs text-gray-500">{Math.round(day.temp.min)}°</div>
                    </div>
                    <div className="ml-1 w-3">
                      <div 
                        className={`size-3 rounded-full${daySafety.safe ? 'bg-green-500' : 'bg-red-500'}`} 
                        title={daySafety.safe ? 'Good for roofing' : daySafety.reasons.join(', ')}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Weather Alerts Card */}
          {weatherData.alerts && weatherData.alerts.length > 0 && (
            <div className="mx-2 w-[280px] shrink-0 snap-center rounded-[5px] bg-white p-4 shadow-md">
              <h3 className="mb-3 flex items-center text-lg font-semibold">
                <AlertTriangle className="mr-2" size={20} />
                Weather Alerts
              </h3>
              
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '300px' }}>
                {weatherData.alerts.map((alert: any, index: number) => (
                  <div key={index} className="rounded border border-red-200 bg-red-50 p-2">
                    <div className="text-sm font-semibold">{alert.event}</div>
                    <div className="text-xs">
                      {new Date(alert.start * 1000).toLocaleString()} to {new Date(alert.end * 1000).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-2 text-center text-xs text-gray-500">
        <div>Weather data: OpenWeatherMap • Hail data: AerisWeather</div>
        <div>Updated {formatTime(current.dt)}</div>
      </div>
    </div>
  );
}

// Helper function to convert wind degrees to cardinal direction
function getWindDirection(degrees: number) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}