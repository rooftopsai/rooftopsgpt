// components > weather > WeatherLookupWidget.tsx

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RooferWeatherWidget from './RooferWeatherWidget';
import { MapPin, X, Loader2, Search, Clock, AlertCircle } from 'lucide-react';

// Set your API key in your environment variables or config
const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY || 'YOUR_OPENWEATHERMAP_API_KEY';

export default function WeatherLookupWidget({ 
  initialLocation = '', 
  autoFocus = false, 
  autoSubmit = false 
}: { 
  initialLocation?: string, 
  autoFocus?: boolean, 
  autoSubmit?: boolean 
}) {
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState(initialLocation || '');
  const [showWeather, setShowWeather] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check API key configuration
  const checkApiKeyConfigured = (): boolean => {
    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
      console.error('OpenWeatherMap API key is not configured');
      return false;
    }
    return true;
  };

  // Load recent locations from localStorage on mount
  useEffect(() => {
    try {
      const savedLocations = localStorage.getItem('recentWeatherLocations');
      if (savedLocations) {
        setRecentLocations(JSON.parse(savedLocations));
      }
    } catch (e) {
      console.error('Failed to load recent locations', e);
    }
  }, []);

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-submit if requested with initial location
  useEffect(() => {
    if (autoSubmit && initialLocation) {
      handleSubmit(new Event('submit') as React.FormEvent);
    }
  }, [autoSubmit, initialLocation]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          event.target !== inputRef.current) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add debounced search for autocomplete
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (address.trim().length > 2) {
        fetchLocationSuggestions(address);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [address]);

  // Extract ZIP code from a string if present
  const extractZipCode = (text: string): string | null => {
    if (!text) return null;
    
    // Match standard 5-digit or 9-digit ZIP codes
    const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
    
    // Make sure we're actually finding a ZIP code, not just any 5-digit number
    if (zipMatch) {
      const potentialZip = zipMatch[1];
      
      // Verify it's likely a US ZIP code (basic check for common ZIP ranges)
      const zipNum = parseInt(potentialZip.substring(0, 5), 10);
      if (zipNum >= 501 && zipNum <= 99950) {
        return potentialZip;
      }
    }
    
    return null;
  };

  // Check if input is only a ZIP code
  const isZipCodeOnly = (text: string): boolean => {
    const trimmed = text.trim();
    const zipPattern = /^\d{5}(-\d{4})?$/;
    return zipPattern.test(trimmed);
  };

  // Check if input contains a house number (likely an address)
  const hasHouseNumber = (text: string): boolean => {
    return /^\d+\s+\w+/.test(text.trim());
  };

  // Fetch location suggestions using multiple methods
  const fetchLocationSuggestions = async (query: string) => {
    if (query.length < 3) return;
    
    if (!checkApiKeyConfigured()) {
      setError('Weather API key not configured. Please contact support.');
      return;
    }
    
    setIsLoadingSuggestions(true);
    
    try {
      const zipCode = extractZipCode(query);
      
      // If we have a ZIP code, create a suggestion for it
      if (zipCode) {
        // First check if this ZIP code is valid
        try {
          const zipResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/zip?zip=${zipCode}&appid=${API_KEY}`
          );
          
          if (zipResponse.ok) {
            const zipData = await zipResponse.json();
            if (zipData && zipData.lat) {
              setSuggestions([{
                display: `${zipCode} (${zipData.name}, ${zipData.country})`,
                name: zipData.name,
                zip: zipCode,
                country: zipData.country,
                lat: zipData.lat,
                lon: zipData.lon,
                type: 'zip'
              }]);
              setShowDropdown(true);
              setIsLoadingSuggestions(false);
              return;
            }
          } else {
            // If we're searching for just a ZIP code and it's invalid, show a suggestion to search as text
            if (isZipCodeOnly(query)) {
              setSuggestions([{
                display: `ZIP code not found. Search as text instead?`,
                originalQuery: query,
                type: 'zip_fallback'
              }]);
              setShowDropdown(true);
              setIsLoadingSuggestions(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error validating ZIP code:', err);
          // Continue with city search if ZIP validation fails and it's not just a ZIP code
          if (isZipCodeOnly(query)) {
            setSuggestions([{
              display: `ZIP code validation failed. Search as text instead?`,
              originalQuery: query,
              type: 'zip_fallback'
            }]);
            setShowDropdown(true);
            setIsLoadingSuggestions(false);
            return;
          }
        }
      }
      
      // Try with OpenWeatherMap Geocoding API for cities
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
        } else {
          throw new Error('Failed to fetch location suggestions');
        }
      }
      
      const data = await response.json();
      
      // Format suggestions from OpenWeatherMap
      let formattedSuggestions = data.map((item: any) => {
        // Format the display text based on available data
        const statePart = item.state ? `, ${item.state}` : '';
        const countryPart = item.country ? `, ${item.country}` : '';
        const displayText = `${item.name}${statePart}${countryPart}`;
        
        return {
          display: displayText,
          name: item.name,
          state: item.state,
          country: item.country,
          lat: item.lat,
          lon: item.lon,
          type: 'city'
        };
      });
      
      // If it looks like an address but we found no suggestions, add a fallback option
      if (formattedSuggestions.length === 0 && hasHouseNumber(query)) {
        // For addresses with no exact match, suggest using city part
        const cityMatch = query.match(/\b([A-Za-z\s]+),?\s*([A-Za-z]{2})?\b/);
        if (cityMatch && cityMatch[1]) {
          formattedSuggestions.push({
            display: `Search for nearest city: "${cityMatch[1]}${cityMatch[2] ? ', ' + cityMatch[2] : ''}"`,
            originalQuery: query,
            extractedCity: cityMatch[1],
            extractedState: cityMatch[2] || '',
            type: 'address_fallback'
          });
        } else {
          // Generic fallback if we can't extract city
          formattedSuggestions.push({
            display: `Search by nearest city instead of exact address`,
            originalQuery: query,
            type: 'address_fallback_generic'
          });
        }
      }

      setSuggestions(formattedSuggestions);
      if (formattedSuggestions.length > 0) {
        setShowDropdown(true);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      // Check if the error is API key related
      if (err instanceof Error && err.message.includes('API key')) {
        setError('Weather API configuration error. Please contact support.');
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Save location to recents
  const addRecentLocation = (loc: string) => {
    const newRecents = [
      loc, 
      ...recentLocations.filter(item => item !== loc)
    ].slice(0, 5);
    
    setRecentLocations(newRecents);
    
    try {
      localStorage.setItem('recentWeatherLocations', JSON.stringify(newRecents));
    } catch (e) {
      console.error('Failed to save recent locations', e);
    }
  };

  // Handle selecting a location suggestion
  const handleSelectSuggestion = (suggestion: any) => {
    setShowDropdown(false);
    
    // Handle different suggestion types
    if (suggestion.type === 'address_fallback' || suggestion.type === 'address_fallback_generic') {
      // For fallback suggestions, search for the city part
      const searchTerm = suggestion.extractedCity || '';
      if (searchTerm) {
        setAddress(searchTerm + (suggestion.extractedState ? `, ${suggestion.extractedState}` : ''));
        setTimeout(() => {
          handleSubmit(new Event('submit') as React.FormEvent);
        }, 100);
      } else {
        setError('Unable to extract city from address. Please enter a city name directly.');
      }
      return;
    }

    // Handle ZIP fallback suggestion
    if (suggestion.type === 'zip_fallback') {
      // Try to search as text rather than ZIP
      setShowDropdown(false);
      setTimeout(() => {
        handleSubmit(new Event('submit') as React.FormEvent, true);
      }, 100);
      return;
    }
    
    // For direct suggestions
    const displayText = suggestion.display;
    setAddress(displayText);
    setSuggestions([]);
    
    // Directly use coordinates from suggestion
    handleLocationSelect({
      name: suggestion.name,
      state: suggestion.state,
      country: suggestion.country,
      lat: suggestion.lat,
      lon: suggestion.lon,
      zip: suggestion.zip,
      type: suggestion.type
    });
  };

  // Handle selecting a recent location
  const selectRecentLocation = (loc: string) => {
    setAddress(loc);
    setShowDropdown(false);
    
    // Auto-submit with the selected location
    setTimeout(() => {
      handleSubmit(new Event('submit') as React.FormEvent);
    }, 100);
  };

  // Process location data once selected
  const handleLocationSelect = async (locationData: any) => {
    setIsValidating(true);
    setError('');
    
    try {
      // Format location for display
      let formattedLocation = '';
      
      if (locationData.zip) {
        formattedLocation = `${locationData.zip} (${locationData.name}${locationData.country ? ', ' + locationData.country : ''})`;
      } else {
        const statePart = locationData.state ? `, ${locationData.state}` : '';
        const countryPart = locationData.country ? `, ${locationData.country}` : '';
        formattedLocation = locationData.formatted_address || 
          `${locationData.name}${statePart}${countryPart}`;
      }
      
      setLocation(formattedLocation);
      addRecentLocation(formattedLocation);
      setShowWeather(true);
    } catch (err: any) {
      console.error('Error processing location:', err);
      setError(err.message || 'Failed to process location');
    } finally {
      setIsValidating(false);
    }
  };

  // Get nearest city for given coordinates
  const getNearestCity = async (lat: number, lon: number): Promise<any> => {
    try {
      // Use reverse geocoding to get nearest city
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
        } else {
          throw new Error('Failed to get city from coordinates');
        }
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      
      throw new Error('No city found near these coordinates');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  };

  // Try to geocode using ZIP code
  const geocodeZipCode = async (zipCode: string): Promise<any> => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${zipCode}&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        // Check specifically for API key issues
        if (response.status === 401) {
          throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
        } else if (response.status === 404) {
          throw new Error(`ZIP code "${zipCode}" not found. Please verify the ZIP code.`);
        } else {
          throw new Error(`Unable to validate ZIP code: ${response.statusText || 'API Error'} (${response.status})`);
        }
      }
      
      const data = await response.json();
      
      if (!data || !data.lat) {
        throw new Error('ZIP code not found. Please check and try again.');
      }
      
      return {
        name: data.name,
        country: data.country,
        lat: data.lat,
        lon: data.lon,
        zip: zipCode,
        formatted_address: `${zipCode} (${data.name}, ${data.country})`
      };
    } catch (error) {
      console.error('ZIP code geocoding error:', error);
      throw error;
    }
  };

  // Try to geocode using city name
  const geocodeCity = async (query: string): Promise<any> => {
    // Don't try to geocode a standalone ZIP code as a city name
    if (isZipCodeOnly(query)) {
      throw new Error('Invalid city name. Please try a different search term.');
    }
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
        } else {
          throw new Error(`Unable to validate location: ${response.statusText || 'API Error'} (${response.status})`);
        }
      }
      
      const data = await response.json();
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error(`Location "${query}" not found. Please check your input and try again.`);
      }
      
      if (Array.isArray(data) && data.length > 0) {
        const { name, state, country, lat, lon } = data[0];
        return {
          name, 
          state, 
          country,
          lat,
          lon,
          formatted_address: `${name}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`
        };
      }
      
      throw new Error('Unable to format location data');
    } catch (error) {
      console.error('City geocoding error:', error);
      throw error;
    }
  };

  // Geocode a query string to coordinates with multiple fallback strategies
  const geocodeQuery = async (query: string, forceTextSearch = false): Promise<any> => {
    const trimmedQuery = query.trim();
    const zipCode = extractZipCode(trimmedQuery);
    
    // If it's only a ZIP code and we're not forcing text search, try ZIP code geocoding
    if (zipCode && isZipCodeOnly(trimmedQuery) && !forceTextSearch) {
      try {
        return await geocodeZipCode(zipCode);
      } catch (error: any) {
        console.warn('ZIP code geocoding failed:', error);
        // This is an important change - if ZIP code geocoding fails for a pure ZIP code input,
        // don't fall back to city search (which would always fail), just throw the error
        throw new Error(error.message || 'ZIP code not found. Please check and try again.');
      }
    }
    
    // If there's a ZIP code in the query but it's not ONLY a ZIP code, try ZIP first
    if (zipCode && !isZipCodeOnly(trimmedQuery) && !forceTextSearch) {
      try {
        return await geocodeZipCode(zipCode);
      } catch (error) {
        console.warn('ZIP code geocoding failed, will try alternative methods:', error);
        // Continue to address or city search
      }
    }
    
    // Check if it looks like a street address
    if (hasHouseNumber(trimmedQuery)) {
      // For street addresses, try to extract city/state
      const cityMatch = trimmedQuery.match(/\b([A-Za-z\s]+),?\s*([A-Za-z]{2})?\b/);
      
      if (cityMatch && cityMatch[1]) {
        try {
          // Try with extracted city
          const cityQuery = cityMatch[2] 
            ? `${cityMatch[1]}, ${cityMatch[2]}` 
            : cityMatch[1];
          
          const result = await geocodeCity(cityQuery);
          
          // Add the original address to the result for display
          result.formatted_address = `${trimmedQuery} (Weather for ${result.formatted_address})`;
          return result;
        } catch (error) {
          console.warn('City extraction from address failed:', error);
          // Continue to try the whole address
        }
      }
      
      // If city extraction didn't work, try the whole address
      try {
        return await geocodeCity(trimmedQuery);
      } catch (error) {
        throw new Error('Address not found. Try entering a city name or ZIP code instead.');
      }
    }
    
    // Otherwise geocode as city (even for ZIP code if we're forcing text search)
    return await geocodeCity(trimmedQuery);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, forceTextSearch = false) => {
    e.preventDefault();
    
    if (!address.trim()) {
      setError('Please enter a location');
      return;
    }
    
    // Check API key first
    if (!checkApiKeyConfigured()) {
      setError('Weather API key not configured. Please contact support.');
      return;
    }
    
    setIsValidating(true);
    setError('');
    setSuggestions([]);
    setShowDropdown(false);
    
    try {
      const geocodeResult = await geocodeQuery(address.trim(), forceTextSearch);
      handleLocationSelect(geocodeResult);
    } catch (err: any) {
      console.error('Geocoding error:', err);
      setError(err.message || 'Failed to find location. Try a different format or name.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setShowWeather(false);
    setAddress('');
    setError('');
  };
  
  // Detect current location
  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    // Check API key first
    if (!checkApiKeyConfigured()) {
      setError('Weather API key not configured. Please contact support.');
      return;
    }
    
    setIsDetectingLocation(true);
    setError('');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get location name
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key invalid. Please check your OpenWeatherMap API key.');
        } else {
          throw new Error('Failed to reverse geocode location');
        }
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const { name, state, country } = data[0];
        const formattedLocation = name + 
          (state ? `, ${state}` : '') + 
          (country ? `, ${country}` : '');
        
        setAddress(formattedLocation);
        
        // Auto-submit form with detected location
        setTimeout(() => {
          handleSubmit(new Event('submit') as React.FormEvent);
        }, 100);
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      // Check if this is a permission error
      if (error.code === 1) { // PERMISSION_DENIED
        setError('Location access denied. Please allow location access or enter location manually.');
      } else {
        setError('Could not detect your location: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };
  
  // Determine what to show in the dropdown
  const shouldShowDropdown = showDropdown && (suggestions.length > 0 || recentLocations.length > 0);
  const hasRecentLocations = recentLocations.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="pt-4">
      {!showWeather ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Property Address, City, or ZIP
            </label>
            
            <div className="mt-1 flex space-x-2">
              <div className="relative flex-1">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={16} />
                </div>
                <Input
                  id="address"
                  ref={inputRef}
                  placeholder="Type address, city, or ZIP code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-8 pr-10"
                  onFocus={() => {
                    setShowDropdown(true);
                  }}
                  autoComplete="off"
                />
                {isLoadingSuggestions ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : address ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setAddress('');
                      setSuggestions([]);
                      setError('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                ) : null}
                
                {/* Unified dropdown for both recents and suggestions */}
                {shouldShowDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 mt-1 w-full rounded-[5px] border bg-white shadow-lg"
                  >
                    {/* Show suggestions section if we have suggestions */}
                    {hasSuggestions && (
                      <div>
                        {/* Only show header if we'll also show recents */}
                        {hasRecentLocations && (
                          <div className="flex items-center border-b p-2 text-xs font-medium text-gray-500">
                            <Search size={12} className="mr-1" /> Suggestions
                          </div>
                        )}
                        <div className="max-h-48 overflow-y-auto">
                          {suggestions.map((suggestion, i) => (
                            <div 
                              key={`suggestion-${i}`}
                              className={`flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-blue-50 ${
                                suggestion.type === 'address_fallback' || 
                                suggestion.type === 'address_fallback_generic' ||
                                suggestion.type === 'zip_fallback'
                                  ? 'text-amber-600' 
                                  : ''
                              }`}
                              onClick={() => handleSelectSuggestion(suggestion)}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur event
                            >
                              {suggestion.type === 'address_fallback' || 
                               suggestion.type === 'address_fallback_generic' ||
                               suggestion.type === 'zip_fallback' ? (
                                <AlertCircle size={14} className="mr-2 shrink-0" />
                              ) : suggestion.type === 'zip' ? (
                                <MapPin size={14} className="mr-2 shrink-0" />
                              ) : (
                                <Search size={14} className="mr-2 shrink-0" />
                              )}
                              {suggestion.display}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show recent locations if we have any */}
                    {hasRecentLocations && (
                      <div className={hasSuggestions ? 'border-t' : ''}>
                        <div className="flex items-center border-b p-2 text-xs font-medium text-gray-500">
                          <Clock size={12} className="mr-1" /> Recent Locations
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {recentLocations.map((loc, i) => (
                            <div 
                              key={`recent-${i}`}
                              className="flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-gray-100"
                              onClick={() => selectRecentLocation(loc)}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur event
                            >
                              <Clock size={14} className="mr-2 shrink-0 text-gray-400" />
                              {loc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={detectUserLocation}
                disabled={isDetectingLocation}
                title="Use my current location"
              >
                {isDetectingLocation ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MapPin className="size-4" />
                )}
              </Button>
            </div>
            
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {!error && (
              <p className="mt-1 text-xs text-gray-500">
                Enter a city name, full address, or ZIP code for weather data
              </p>
            )}
          </div>
          
          <Button 
            type="submit" 
            disabled={isValidating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isValidating ? 'Validating...' : 'Check Roof Weather'}
          </Button>
          
          <div className="text-sm text-gray-500">
            <p>Get current weather data essential for roofing work:</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Precipitation forecast</li>
              <li>Wind conditions</li>
              <li>Temperature</li>
              <li>Safety indicators for roofing work</li>
            </ul>
          </div>
        </form>
      ) : (
        <RooferWeatherWidget 
          location={location} 
          onClose={handleClose}
        />
      )}
    </div>
  );
}