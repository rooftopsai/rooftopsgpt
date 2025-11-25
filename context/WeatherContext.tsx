// context/WeatherContext.tsx with AerisWeather Support

import React, { createContext, useContext, useState, useEffect } from 'react';

type WeatherContextType = {
  recentLocations: string[];
  addRecentLocation: (location: string) => void;
  lastSearchedLocation: string | null;
  setLastSearchedLocation: (location: string | null) => void;
  userLocation: string | null;
  detectUserLocation: () => Promise<void>;
  isDetectingLocation: boolean;
  // New API settings
  apiKeys: {
    openWeatherMap: string | null;
    aerisWeather: {
      clientId: string | null;
      clientSecret: string | null;
    }
  };
  useAerisWeather: boolean;
  toggleAerisWeather: () => void;
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [lastSearchedLocation, setLastSearchedLocation] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [useAerisWeather, setUseAerisWeather] = useState(true); // Default to using AerisWeather
  
  // Load API keys from environment variables
  const apiKeys = {
    openWeatherMap: process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY || null,
    aerisWeather: {
      clientId: process.env.NEXT_PUBLIC_AERISWEATHER_CLIENT_ID || null,
      clientSecret: process.env.NEXT_PUBLIC_AERISWEATHER_CLIENT_SECRET || null
    }
  };
  
  // Load recent locations from localStorage on mount
  useEffect(() => {
    try {
      const savedLocations = localStorage.getItem('recentWeatherLocations');
      if (savedLocations) {
        setRecentLocations(JSON.parse(savedLocations));
      }
      
      // Also load preference for using AerisWeather
      const useAerisPreference = localStorage.getItem('useAerisWeather');
      if (useAerisPreference !== null) {
        setUseAerisWeather(useAerisPreference === 'true');
      }
    } catch (e) {
      console.error('Failed to load weather settings', e);
    }
  }, []);
  
  // Save recent locations to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('recentWeatherLocations', JSON.stringify(recentLocations));
    } catch (e) {
      console.error('Failed to save recent locations', e);
    }
  }, [recentLocations]);
  
  // Save AerisWeather preference when updated
  useEffect(() => {
    try {
      localStorage.setItem('useAerisWeather', useAerisWeather.toString());
    } catch (e) {
      console.error('Failed to save AerisWeather preference', e);
    }
  }, [useAerisWeather]);
  
  // Toggle AerisWeather usage
  const toggleAerisWeather = () => {
    setUseAerisWeather(prev => !prev);
  };
  
  // Add a location to recent searches
  const addRecentLocation = (location: string) => {
    setRecentLocations(prev => {
      // Remove if already exists (to move to front)
      const filtered = prev.filter(loc => loc !== location);
      // Add to beginning and limit to 5 locations
      return [location, ...filtered].slice(0, 5);
    });
    
    setLastSearchedLocation(location);
  };
  
  // Attempt to detect user's current location
  const detectUserLocation = async (): Promise<void> => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }
    
    setIsDetectingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get location name
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKeys.openWeatherMap}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to reverse geocode location');
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const { name, state, country } = data[0];
        const formattedLocation = state
          ? `${name}, ${state}, ${country}`
          : `${name}, ${country}`;
        
        setUserLocation(formattedLocation);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsDetectingLocation(false);
    }
  };
  
  const value = {
    recentLocations,
    addRecentLocation,
    lastSearchedLocation,
    setLastSearchedLocation,
    userLocation,
    detectUserLocation,
    isDetectingLocation,
    apiKeys,
    useAerisWeather,
    toggleAerisWeather
  };
  
  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}