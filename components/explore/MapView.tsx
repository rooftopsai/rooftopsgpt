// components > explore > MapView.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  IconSearch, 
  IconMapPin, 
  IconLoader2, 
  IconBuildingSkyscraper, 
  IconInfoCircle, 
  IconRuler,
  Icon3dRotate 
} from '@tabler/icons-react';
import Script from 'next/script';

// Interface for MapView props
interface MapViewProps {
  workspaceId: string;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void;
  selectedAddress: string;
  setSelectedAddress: (address: string) => void;
  isAnalyzing: boolean;
  captureProgress: number;
  captureAngle: number;
  is3DMode: boolean;
  toggleIs3DMode: () => void;
  isDebugMode: boolean;
  logDebug: (message: string) => void;
  measuredArea: string | null;
  setMeasuredArea: (area: string | null) => void;
  measuredDistance: string | null;
  setMeasuredDistance: (distance: string | null) => void;
  captureMapView: (containerRef: React.RefObject<HTMLDivElement>, viewName: string) => Promise<{ 
    imageData: string;
    viewName: string;
    timestamp: string;
  } | null>;
  onAnalyzePropertyClick: () => void;
  // New prop to expose the map container reference
  setMapContainerRef?: (el: HTMLDivElement | null) => void;
  // Prop to expose the map reference
  setMapRef?: (map: google.maps.Map | null) => void;
  // NEW: Add these props for image processing options
  imageProcessingOptions?: {
    enhanceEdges: boolean;
    enhanceContrast: boolean;
    addMeasurementGrid: boolean;
    colorSegmentation?: boolean;
    pitchEnhancement?: boolean;
  };
  onToggleImageProcessingOption?: (option: string) => void;
}

const MapView: React.FC<MapViewProps> = ({
  workspaceId,
  selectedLocation,
  setSelectedLocation,
  selectedAddress,
  setSelectedAddress,
  isAnalyzing,
  captureProgress,
  captureAngle,
  is3DMode,
  toggleIs3DMode,
  isDebugMode,
  logDebug,
  measuredArea,
  setMeasuredArea,
  measuredDistance,
  setMeasuredDistance,
  captureMapView,
  onAnalyzePropertyClick,
  setMapContainerRef,
  setMapRef
}) => {
  const [isClient, setIsClient] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [center, setCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Default to US center
  const [zoom, setZoom] = useState(4);
  const [isSearching, setIsSearching] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState(""); // Add state for search input value
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const activePolygonRef = useRef<google.maps.Polygon | null>(null);
  const activeRectangleRef = useRef<google.maps.Rectangle | null>(null);
  const measurementLabelRef = useRef<google.maps.Marker | null>(null);
  
  const { toast } = useToast();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLEMAPS_API_KEY || '';

  // Effect to update searchInputValue when selectedAddress changes
  useEffect(() => {
    if (selectedAddress) {
      setSearchInputValue(selectedAddress);
    }
  }, [selectedAddress]);

  // Mark when we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle script loading success
  const handleScriptLoad = useCallback(() => {
    console.log("Google Maps script loaded");
    setScriptLoaded(true);
  }, []);

  // Get direction name based on angle
  const getDirectionName = (angle: number): string => {
    const directions = [
      'north', 'northeast', 'east', 'southeast', 
      'south', 'southwest', 'west', 'northwest'
    ];
    return directions[Math.round(angle / 45) % 8];
  };

  // Calculate area of a polygon in square feet
  const calculatePolygonArea = (polygon: google.maps.Polygon): number => {
    const path = polygon.getPath();
    return window.google.maps.geometry.spherical.computeArea(path) * 10.7639; // Convert from sq meters to sq feet
  };

  // Calculate area of a rectangle in square feet
  const calculateRectangleArea = (rectangle: google.maps.Rectangle): number => {
    const bounds = rectangle.getBounds();
    if (!bounds) return 0;
    
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const se = new window.google.maps.LatLng(sw.lat(), ne.lng());
    
    const width = window.google.maps.geometry.spherical.computeDistanceBetween(sw, se);
    const height = window.google.maps.geometry.spherical.computeDistanceBetween(se, ne);
    
    return width * height * 10.7639; // Convert from sq meters to sq feet
  };

  // Generate solar potential heatmap data
  const generateHeatmapData = (center: { lat: number; lng: number }) => {
    const data = [];
    // Generate points with higher concentration near the center
    for (let i = 0; i < 100; i++) {
      // Random offset with gaussian-like distribution (more points near center)
      const latOffset = (Math.random() - 0.5) * 0.01 * (Math.random() * 10);
      const lngOffset = (Math.random() - 0.5) * 0.01 * (Math.random() * 10);
      
      // Make some areas have higher solar potential (higher weight)
      let weight = Math.random() * 10;
      
      // South-facing areas get higher solar potential
      if (latOffset < 0) {
        weight *= 1.5;
      }
      
      data.push({
        location: new window.google.maps.LatLng(
          center.lat + latOffset,
          center.lng + lngOffset
        ),
        weight: weight
      });
    }
    return data;
  };

  // Create or update measurement label
  const updateMeasurementLabel = (position: google.maps.LatLng, text: string) => {
    if (measurementLabelRef.current) {
      measurementLabelRef.current.setPosition(position);
      // Update the label content
      if (measurementLabelRef.current.getLabel) {
        measurementLabelRef.current.setLabel({
          text: text,
          color: '#FFFFFF',
          fontWeight: 'bold'
        });
      }
    } else {
      measurementLabelRef.current = new window.google.maps.Marker({
        position: position,
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
        label: {
          text: text,
          color: '#FFFFFF',
          fontWeight: 'bold'
        }
      });
    }
  };

  // Toggle drawing tools
  const toggleDrawingTools = useCallback(() => {
    if (!drawingManagerRef.current || !mapRef.current) return;
    
    if (showDrawingTools) {
      drawingManagerRef.current.setMap(null);
      
      // Clear measurement labels when hiding tools
      if (measurementLabelRef.current) {
        measurementLabelRef.current.setMap(null);
        measurementLabelRef.current = null;
      }
      setMeasuredArea(null);
      setMeasuredDistance(null);
      logDebug('Measurement tools deactivated');
    } else {
      drawingManagerRef.current.setMap(mapRef.current);
      logDebug('Measurement tools activated');
      
      toast({
        title: 'Measurement Tools Activated',
        description: 'Draw a shape to measure area in square feet, or a line to measure distance.',
        duration: 4000,
      });
    }
    
    setShowDrawingTools(!showDrawingTools);
  }, [showDrawingTools, logDebug, toast, setMeasuredArea, setMeasuredDistance]);

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  };

  // Initialize the map once the script is loaded and the DOM is ready
  useEffect(() => {
    if (!isClient || !scriptLoaded || !mapContainerRef.current || mapInitialized) return;
    
    try {
      logDebug('Initializing Google Maps');
      console.log('Initializing Google Maps with reference:', mapContainerRef.current ? "exists" : "null");
      
      // Initialize map
      const newMap = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeId: 'hybrid',
        fullscreenControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: window.google.maps.ControlPosition.TOP_RIGHT
        },
        streetViewControl: true,
        rotateControl: true,
        scaleControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        // Add this to show labels on satellite view
        styles: [
          {
            featureType: "all",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ]
      });
      
      mapRef.current = newMap;
      
      // Share the map reference with the parent component
      if (setMapRef) {
        console.log("Sharing map reference with parent component");
        setMapRef(newMap);
      }
      
      // Initialize geocoder
      geocoderRef.current = new window.google.maps.Geocoder();
      
      // Initialize InfoWindow
      infoWindowRef.current = new window.google.maps.InfoWindow();
      
      // Initialize autocomplete if the input ref is available
      if (autocompleteInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
          types: ['address']
        });
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            newMap.setCenter({ lat, lng });
            newMap.setZoom(19); // Zoom in closer for searched locations
            
            setCenter({ lat, lng });
            setSelectedLocation({ lat, lng });
            
            if (place.formatted_address) {
              setSelectedAddress(place.formatted_address);
              setSearchInputValue(place.formatted_address); // Update search input value
              logDebug(`Selected address: ${place.formatted_address}`);
            }
            
            // Create or move marker
            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng });
            } else {
              const marker = new window.google.maps.Marker({
                position: { lat, lng },
                map: newMap,
                animation: window.google.maps.Animation.DROP,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 0.8,
                  strokeColor: 'white',
                  strokeWeight: 2
                }
              });
              markerRef.current = marker;
              
              // Add click listener to marker
              marker.addListener('click', () => {
                if (infoWindowRef.current) {
                  infoWindowRef.current.setContent(`
                    <div style="padding: 8px; max-width: 200px;">
                      <h3 style="margin: 0 0 8px; font-size: 16px; color: #333;">${place.name || 'Selected Location'}</h3>
                      <p style="margin: 0; font-size: 13px; color: #666;">${place.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</p>
                      <div style="margin-top: 8px; font-size: 12px; color: #4285F4;">Click Analyze Property to analyze this property</div>
                    </div>
                  `);
                  infoWindowRef.current.open(newMap, marker);
                }
              });
            }
            
            // Update heatmap if visible
            if (heatmapRef.current && heatmapVisible) {
              const newData = generateHeatmapData({ lat, lng });
              heatmapRef.current.setData(newData);
            }
          }
        });
        
        autocompleteRef.current = autocomplete;
      }
      
      // Add click listener to map
      newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        logDebug(`Map clicked at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        // Create or move marker
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        } else {
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: newMap,
            animation: window.google.maps.Animation.DROP,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4285F4',
              fillOpacity: 0.8,
              strokeColor: 'white',
              strokeWeight: 2
            }
          });
          markerRef.current = marker;
          
          // Add click listener to marker
          marker.addListener('click', () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.setContent(`
                <div style="padding: 8px; max-width: 200px;">
                  <h3 style="margin: 0 0 8px; font-size: 16px; color: #333;">Selected Location</h3>
                  <p style="margin: 0; font-size: 13px; color: #666;">${selectedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</p>
                  <div style="margin-top: 8px; font-size: 12px; color: #4285F4;">Click Analyze Property to analyze this property</div>
                </div>
              `);
              infoWindowRef.current.open(newMap, marker);
            }
          });
        }
        
        setSelectedLocation({ lat, lng });
        
        // Reverse geocode
        if (geocoderRef.current) {
          geocoderRef.current.geocode({ 
            location: { lat, lng } 
          }, (results, status) => {
            if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
              setSelectedAddress(results[0].formatted_address);
              // Update the search input with the new address
              setSearchInputValue(results[0].formatted_address);
              logDebug(`Reverse geocoded to: ${results[0].formatted_address}`);
              
              // Update info window content
              if (infoWindowRef.current && markerRef.current) {
                infoWindowRef.current.setContent(`
                  <div style="padding: 8px; max-width: 200px;">
                    <h3 style="margin: 0 0 8px; font-size: 16px; color: #333;">Selected Location</h3>
                    <p style="margin: 0; font-size: 13px; color: #666;">${results[0].formatted_address}</p>
                    <div style="margin-top: 8px; font-size: 12px; color: #4285F4;">Click Analyze Property to analyze this property</div>
                  </div>
                `);
                infoWindowRef.current.open(newMap, markerRef.current);
              }
            } else {
              setSelectedAddress('');
              setSearchInputValue(''); // Clear search input when reverse geocoding fails
              logDebug('Reverse geocoding failed');
            }
          });
        }
        
        // Update heatmap if visible
        if (heatmapRef.current && heatmapVisible) {
          const newData = generateHeatmapData({ lat, lng });
          heatmapRef.current.setData(newData);
        }
      });
      
      // Initialize drawing tools
      if (window.google.maps.drawing) {
        const drawingManager = new window.google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: window.google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              window.google.maps.drawing.OverlayType.POLYGON,
              window.google.maps.drawing.OverlayType.RECTANGLE,
              window.google.maps.drawing.OverlayType.POLYLINE,
            ]
          },
          polygonOptions: {
            fillColor: '#4285F4',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#4285F4',
            clickable: true,
            editable: true,
            zIndex: 1
          },
          rectangleOptions: {
            fillColor: '#4285F4',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#4285F4',
            clickable: true,
            editable: true,
            zIndex: 1
          },
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 3,
            strokeOpacity: 1,
            clickable: true,
            editable: true,
            zIndex: 1
          }
        });
        
        drawingManagerRef.current = drawingManager;
        // Initially hide the drawing tools
        drawingManager.setMap(null);
        
        // Add event listener for when a shape is completed
        window.google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
          // Switch back to non-drawing mode after drawing is complete
          drawingManager.setDrawingMode(null);
          
          if (event.type === window.google.maps.drawing.OverlayType.POLYGON) {
            // Clear any previous active polygon
            if (activePolygonRef.current) {
              activePolygonRef.current.setMap(null);
            }
            
            const polygon = event.overlay as google.maps.Polygon;
            activePolygonRef.current = polygon;
            
            // Calculate and display area
            const area = calculatePolygonArea(polygon);
            const areaFormatted = area.toLocaleString(undefined, { maximumFractionDigits: 1 });
            setMeasuredArea(`Area: ${areaFormatted} sq ft`);
            
            // Get polygon center for label placement
            const bounds = new window.google.maps.LatLngBounds();
            polygon.getPath().forEach((latLng) => {
              bounds.extend(latLng);
            });
            
            updateMeasurementLabel(bounds.getCenter(), `${areaFormatted} sq ft`);
            
            // Add event listeners for when polygon is edited
            window.google.maps.event.addListener(polygon.getPath(), 'set_at', function() {
              const newArea = calculatePolygonArea(polygon);
              const newAreaFormatted = newArea.toLocaleString(undefined, { maximumFractionDigits: 1 });
              setMeasuredArea(`Area: ${newAreaFormatted} sq ft`);
              updateMeasurementLabel(bounds.getCenter(), `${newAreaFormatted} sq ft`);
            });
            
            window.google.maps.event.addListener(polygon.getPath(), 'insert_at', function() {
              const newArea = calculatePolygonArea(polygon);
              const newAreaFormatted = newArea.toLocaleString(undefined, { maximumFractionDigits: 1 });
              setMeasuredArea(`Area: ${newAreaFormatted} sq ft`);
              updateMeasurementLabel(bounds.getCenter(), `${newAreaFormatted} sq ft`);
            });
            
            toast({
              title: 'Area Measured',
              description: `The selected area is approximately ${areaFormatted} square feet.`,
              duration: 5000,
            });
          } 
          else if (event.type === window.google.maps.drawing.OverlayType.RECTANGLE) {
            // Clear any previous active rectangle
            if (activeRectangleRef.current) {
              activeRectangleRef.current.setMap(null);
            }
            
            const rectangle = event.overlay as google.maps.Rectangle;
            activeRectangleRef.current = rectangle;
            
            // Calculate and display area
            const area = calculateRectangleArea(rectangle);
            const areaFormatted = area.toLocaleString(undefined, { maximumFractionDigits: 1 });
            setMeasuredArea(`Area: ${areaFormatted} sq ft`);
            
            // Get rectangle center for label placement
            const bounds = rectangle.getBounds();
            if (bounds) {
              updateMeasurementLabel(bounds.getCenter(), `${areaFormatted} sq ft`);
            }
            
            // Add event listeners for when rectangle is edited
            window.google.maps.event.addListener(rectangle, 'bounds_changed', function() {
              const newArea = calculateRectangleArea(rectangle);
              const newAreaFormatted = newArea.toLocaleString(undefined, { maximumFractionDigits: 1 });
              setMeasuredArea(`Area: ${newAreaFormatted} sq ft`);
              
              const newBounds = rectangle.getBounds();
              if (newBounds) {
                updateMeasurementLabel(newBounds.getCenter(), `${newAreaFormatted} sq ft`);
              }
            });
            
            toast({
              title: 'Area Measured',
              description: `The selected area is approximately ${areaFormatted} square feet.`,
              duration: 5000,
            });
          }
          else if (event.type === window.google.maps.drawing.OverlayType.POLYLINE) {
            const polyline = event.overlay as google.maps.Polyline;
            
            // Calculate length
            const path = polyline.getPath();
            let length = 0;
            for (let i = 0; i < path.getLength() - 1; i++) {
              length += window.google.maps.geometry.spherical.computeDistanceBetween(
                path.getAt(i),
                path.getAt(i + 1)
              );
            }
            
            // Convert meters to feet
            const lengthFeet = length * 3.28084;
            const lengthFormatted = lengthFeet.toLocaleString(undefined, { maximumFractionDigits: 1 });
            setMeasuredDistance(`Distance: ${lengthFormatted} ft`);
            
            // Place label at midpoint
            const midpointIndex = Math.floor(path.getLength() / 2);
            if (midpointIndex < path.getLength()) {
              updateMeasurementLabel(path.getAt(midpointIndex), `${lengthFormatted} ft`);
            }
            
            // Add event listeners for when polyline is edited
            window.google.maps.event.addListener(polyline.getPath(), 'set_at', function() {
              let newLength = 0;
              for (let i = 0; i < path.getLength() - 1; i++) {
                newLength += window.google.maps.geometry.spherical.computeDistanceBetween(
                  path.getAt(i),
                  path.getAt(i + 1)
                );
              }
              
              const newLengthFeet = newLength * 3.28084;
              const newLengthFormatted = newLengthFeet.toLocaleString(undefined, { maximumFractionDigits: 1 });
              setMeasuredDistance(`Distance: ${newLengthFormatted} ft`);
              
              const midpointIndex = Math.floor(path.getLength() / 2);
              if (midpointIndex < path.getLength()) {
                updateMeasurementLabel(path.getAt(midpointIndex), `${newLengthFormatted} ft`);
              }
            });
            
            window.google.maps.event.addListener(polyline.getPath(), 'insert_at', function() {
              let newLength = 0;
              for (let i = 0; i < path.getLength() - 1; i++) {
                newLength += window.google.maps.geometry.spherical.computeDistanceBetween(
                  path.getAt(i),
                  path.getAt(i + 1)
                );
              }
              
              const newLengthFeet = newLength * 3.28084;
              const newLengthFormatted = newLengthFeet.toLocaleString(undefined, { maximumFractionDigits: 1 });
              setMeasuredDistance(`Distance: ${newLengthFormatted} ft`);
              
              const midpointIndex = Math.floor(path.getLength() / 2);
              if (midpointIndex < path.getLength()) {
                updateMeasurementLabel(path.getAt(midpointIndex), `${newLengthFormatted} ft`);
              }
            });
            
            toast({
              title: 'Distance Measured',
              description: `The measured distance is approximately ${lengthFormatted} feet.`,
              duration: 5000,
            });
          }
        });
      }
      
      // Initialize heatmap
      if (window.google.maps.visualization) {
        // Generate initial dummy data
        const heatmapData = generateHeatmapData(center);
        
        const heatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: null, // Initially hide the heatmap
          radius: 20,
          opacity: 0.7,
          gradient: [
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
          ]
        });
        
        heatmapRef.current = heatmap;
      }
      
      setMapInitialized(true);
      setMapLoaded(true);
      logDebug('Map initialization complete');
      
    } catch (error) {
      console.error('Error initializing map:', error);
      logDebug(`Map initialization error: ${error.message}`);
      toast({
        title: 'Map Error',
        description: 'There was a problem loading the map. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, [isClient, scriptLoaded, center, zoom, toast, mapInitialized, heatmapVisible, logDebug, setSelectedLocation, setSelectedAddress, setMapRef]);

  // Initialize map with user's location
  useEffect(() => {
    if (!isClient || !mapLoaded || !mapRef.current) return;
    
    setIsSearching(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(userLocation);
          mapRef.current?.setCenter(userLocation);
          mapRef.current?.setZoom(18);
          setZoom(18); // Zoom in when we have user location
          
          // Update heatmap data for this location
          if (heatmapRef.current && heatmapVisible) {
            const heatmapData = generateHeatmapData(userLocation);
            heatmapRef.current.setData(heatmapData);
          }
          
          setIsSearching(false);
        },
        () => {
          toast({
            title: 'Location Access Denied',
            description: 'Using default map view. You can search for a specific address.',
            variant: 'destructive',
          });
          setIsSearching(false);
        }
      );
    } else {
      setIsSearching(false);
    }
  }, [isClient, mapLoaded, toast, heatmapVisible, setSelectedLocation]);

  // Expose the map container ref to parent
  useEffect(() => {
    if (mapContainerRef.current && setMapContainerRef) {
      console.log("Setting parent's map container ref");
      setMapContainerRef(mapContainerRef.current);
    }
  }, [mapContainerRef.current, setMapContainerRef]);

  // Simple fixed style for map container - this is important for proper display
  const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
  };

  if (!isClient) {
    return (
      <div className="explore-map-container">
        <div className="flex items-center justify-center bg-gray-100" style={{height: '500px'}}>
          <div className="flex flex-col items-center text-gray-500">
            <IconLoader2 size={48} className="text-primary mb-2 animate-spin" />
            <div>Initializing map explorer...</div>
          </div>
        </div>
      </div>
    );
  }

  // Progress Indicator for capture process
  const ProgressIndicator = () => {
    if (!isAnalyzing) return null;
    
    let message = "Processing...";
    if (captureProgress < 10) {
      message = "Preparing capture...";
    } else if (captureProgress < 90) {
      message = `Capturing view from ${getDirectionName(captureAngle)} (${Math.round(captureProgress)}%)`;
    } else {
      message = "Thinking...";
    }
    
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black bg-opacity-60">
        <div className="flex max-w-md flex-col items-center space-y-4 rounded-lg bg-gray-800 p-6 text-white">
          <IconLoader2 size={32} className="animate-spin text-blue-400" />
          <div className="text-xl font-medium">{message}</div>
          <div className="h-2.5 w-full rounded-full bg-gray-700">
            <div 
              className="h-2.5 rounded-full bg-blue-500" 
              style={{ width: `${captureProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="size-full" style={{ height: '500px' }}>
      {/* Load Google Maps script directly with Next.js Script component */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,visualization,geometry`}
        onLoad={handleScriptLoad}
        strategy="afterInteractive"
      />

      <Card className="h-full overflow-hidden border-0 bg-gray-50 shadow-lg dark:bg-gray-900">
        <CardContent className="flex h-full flex-col p-4">
          {/* Search and Generate Button Container */}
          <div className="mb-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative grow">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <IconSearch className="size-5 text-gray-400" />
                </div>
                <Input 
                  ref={autocompleteInputRef}
                  type="text" 
                  placeholder="Search for an address" 
                  className="w-full border-gray-200 bg-white py-2 pl-10 pr-4 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                  value={searchInputValue}
                  onChange={handleSearchInputChange}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={onAnalyzePropertyClick}
                  disabled={!selectedLocation || isAnalyzing}
                  className="min-w-[220px] rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center">
                      <IconLoader2 size={18} className="mr-2 animate-spin" />
                      Analyzing Property...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <IconBuildingSkyscraper size={18} className="mr-2" />
                      Analyze Property
                    </span>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Advanced options and 3D toggle */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* <Button
                variant="outline"
                size="sm"
                onClick={toggleIs3DMode}
                className={`text-xs px-2 ${is3DMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'} border-gray-200 dark:border-gray-700`}
              >
                <Icon3dRotate size={14} className="mr-1" />
                {is3DMode ? '3D Mode On' : '3D Mode Off'}
              </Button> */}
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDrawingTools}
                className={`px-2 text-xs ${showDrawingTools ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'} border-gray-200 dark:border-gray-700`}
              >
                <IconRuler size={14} className="mr-1" />
                {showDrawingTools ? 'Hide Measurement Tools' : 'Drawing Tools'}
              </Button>
            </div>

            {/* Selected Location and Measurements Info */}
            <div className="mt-3 text-sm">
              {selectedLocation && (
                <div className="mb-1">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Selected Location: </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedAddress || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
                  </span>
                </div>
              )}
              
              {measuredArea && (
                <div className="mb-1">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    <IconBuildingSkyscraper size={14} className="mr-1 inline" />
                    {measuredArea}
                  </span>
                </div>
              )}
              
              {measuredDistance && (
                <div>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    <IconRuler size={14} className="mr-1 inline" />
                    {measuredDistance}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Map Container - Using flex-grow and position relative/absolute */}
          <div className="relative grow" style={{ minHeight: "300px" }}>
            {isSearching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-60">
                <div className="flex items-center space-x-3 rounded-lg bg-gray-800 p-4 text-white">
                  <IconLoader2 size={24} className="animate-spin text-blue-400" />
                  <span>Locating you...</span>
                </div>
              </div>
            )}
            
            {(!scriptLoaded || !mapInitialized) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
                <div className="flex flex-col items-center text-white">
                  <IconLoader2 size={36} className="mb-3 animate-spin text-blue-400" />
                  <div>Loading map...</div>
                </div>
              </div>
            )}
            
            <ProgressIndicator />
            
            {/* The actual map container - uses absolute positioning */}
            <div 
              ref={(el) => {
                mapContainerRef.current = el;
                // Also call the parent's setter if provided
                if (el && setMapContainerRef) {
                  setMapContainerRef(el);
                }
              }}
              style={mapContainerStyle}
              className="absolute inset-0 bg-gray-200 dark:bg-gray-800"
            ></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapView;