import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useMonitoringData } from "@/hooks/useMonitoringData";

// Import TomTom Maps SDK and CSS
import * as ttMaps from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

// Use the SDK
const tt = ttMaps;

// Type definitions for TomTom Maps (using any to avoid type conflicts with SDK)
type TomTomMap = any;
type TomTomMarker = any;
type TomTomPopup = any;

interface MarkerData {
  id: string;
  position: { lat: number; lng: number };
  type: string;
  status?: string;
}

interface TrafficMapProps {
  isPublic?: boolean;
  selectedVehicleId?: number | null;
}

const defaultCenter = [77.209, 28.6139] as [number, number]; // [lng, lat] for TomTom

const getMarkerColor = (type: string, status?: string): string => {
  if (type === "signal") {
    if (status === "green") return "#10b981";
    if (status === "red") return "#ef4444";
    return "#f59e0b";
  }
  return "#3b82f6";
};

export function TrafficMap({ isPublic = false, selectedVehicleId = null }: TrafficMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<TomTomMap | null>(null);
  const markersRef = useRef<TomTomMarker[]>([]);
  const popupRef = useRef<TomTomPopup | null>(null);
  const corridorLayerRef = useRef<string | null>(null);
  const routeLayerRef = useRef<string | null>(null);
  const vehicleMarkerRef = useRef<TomTomMarker | null>(null);
  const { data } = useMonitoringData();
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [emergencyVehicles, setEmergencyVehicles] = useState<any[]>([]);
  const [signalsJunctions, setSignalsJunctions] = useState<any[]>([]);
  const [accidents, setAccidents] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [weatherRisks, setWeatherRisks] = useState<any[]>([]);
  const [constructionZones, setConstructionZones] = useState<any[]>([]);
  const [ecoRoutes, setEcoRoutes] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY || import.meta.env.VITE_TOMTOM_KEY;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Extract data from monitoring hook
  const centerData = data?.map?.center 
    ? [data.map.center[1], data.map.center[0]] as [number, number] // Convert [lat, lng] to [lng, lat]
    : defaultCenter;
  
  const signals = (data?.map?.signals ?? []).map((signal: any) => ({
    id: signal.id.toString(),
    position: { lat: signal.position[0], lng: signal.position[1] },
    type: "signal",
    status: signal.status,
  }));

  const vehicles = (data?.map?.vehicles ?? []).map((vehicle: any) => ({
    id: vehicle.id.toString(),
    position: { lat: vehicle.position[0], lng: vehicle.position[1] },
    type: vehicle.type,
  }));

  const greenCorridorPath = (data?.map?.corridorPath ?? []).map((point: [number, number]) => [
    point[1], // lng
    point[0], // lat
  ] as [number, number]);

  // Load emergency vehicles and signals/junctions with real-time updates
  useEffect(() => {
    const loadEmergencyData = async () => {
      try {
        // Simulate movement for all active vehicles first
        try {
          await fetch(`${API_BASE}/api/emergency-vehicles/simulate-all`, {
            method: "POST",
          });
        } catch (error) {
          console.warn("Could not simulate vehicle movement:", error);
        }

        const [
          vehiclesRes,
          signalsRes,
          intelligenceRes,
          forecastRes,
          alertsRes,
          ecoRoutesRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/api/emergency-vehicles`),
          fetch(`${API_BASE}/api/signals-junctions`),
          fetch(`${API_BASE}/api/traffic/intelligence`),
          fetch(`${API_BASE}/api/congestion/forecast`),
          fetch(`${API_BASE}/api/eco/routes?origin=A&dest=B`),
          fetch(`${API_BASE}/api/traffic/alerts`),
        ]);

        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          setEmergencyVehicles(vehiclesData.vehicles || []);
        }

        if (signalsRes.ok) {
          const signalsData = await signalsRes.json();
          setSignalsJunctions(signalsData.signals_junctions || []);
        }

        if (intelligenceRes.ok) {
          const intelligenceData = await intelligenceRes.json();
          setAccidents(intelligenceData.accidents || []);
          setHazards(intelligenceData.hazards || []);
          setViolations(intelligenceData.violations || []);
        }

        if (forecastRes.ok) {
          const forecastData = await forecastRes.json();
          setForecast(forecastData.horizons || []);
        }

        if (ecoRoutesRes.ok) {
          const ecoData = await ecoRoutesRes.json();
          setEcoRoutes(ecoData.routes || []);
        }

        if (alertsRes.ok) {
          const alertData = await alertsRes.json();
          setAlerts(alertData.alerts || []);
          setWeatherRisks(alertData.alerts || []);
        }
      } catch (error) {
        console.error("Error loading emergency data:", error);
      }
    };

    loadEmergencyData();
    // Update every 5 seconds
    const interval = setInterval(loadEmergencyData, 5000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  const heatmapLanes = (data?.heatmap?.lanes ?? []).map((lane: any) => ({
    position: [lane.position[1], lane.position[0]] as [number, number], // [lng, lat]
    congestion: lane.congestion ?? 0.5,
  }));

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initializeMap = () => {
      // Wait for container to be ready
      if (!mapContainer.current) {
        console.warn("Map container not available, retrying...");
        setTimeout(initializeMap, 200);
        return;
      }

      // Check if container has dimensions
      const container = mapContainer.current;
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.warn("Map container has no dimensions, retrying...", {
          width: container.clientWidth,
          height: container.clientHeight
        });
        setTimeout(initializeMap, 200);
        return;
      }

      if (!mounted) return;

      if (!apiKey || apiKey === "your_tomtom_api_key_here" || apiKey.length < 20) {
        console.error("TomTom API key not configured. Please set VITE_TOMTOM_API_KEY in .env.local");
        return;
      }

      if (!tt || !tt.map) {
        console.error("TomTom Maps SDK is not loaded. Please install: npm install @tomtom-international/web-sdk-maps --legacy-peer-deps");
        return;
      }

      // Don't reinitialize if map already exists
      if (mapInstance.current) {
        console.log("Map already initialized");
        return;
      }

      console.log("Initializing TomTom map with API key:", apiKey.substring(0, 10) + "...");
      console.log("Map container:", container);
      console.log("Container dimensions:", container.clientWidth, "x", container.clientHeight);

      let map: any;
    try {
      // Initialize TomTom map with real-time traffic
      const mapOptions: any = {
        key: apiKey,
        container: mapContainer.current,
        center: centerData,
        zoom: 13,
        style: "tomtom-night", // Dark theme to match the app
      };
      
      // Add traffic options if supported
      if (tt.map) {
        map = tt.map(mapOptions);
        console.log("TomTom map instance created");
      } else {
        console.error("TomTom map function not available");
        return;
      }

      // Ensure map loads properly
      map.on("load", () => {
        console.log("TomTom map loaded successfully");
        // Resize map after load
        if (map.resize) {
          setTimeout(() => {
            try {
              map.resize();
              console.log("Map resized after load");
            } catch (error) {
              console.warn("Error resizing map after load:", error);
            }
          }, 100);
        }
      });

      map.on("error", (e?: any) => {
        console.error("TomTom map error:", e);
        if (e && e.error) {
          console.error("Error details:", e.error);
        }
      });

      // Handle style loading errors
      map.on("style.load", () => {
        console.log("Map style loaded");
      });

      map.on("data", (e?: any) => {
        if (e && e.dataType === "style") {
          console.log("Map style data loaded");
        }
      });

      mapInstance.current = map;

      // Resize map when container size changes
      const resizeObserver = new ResizeObserver(() => {
        if (map && map.resize && mounted) {
          try {
            setTimeout(() => {
              if (mounted) map.resize();
            }, 100);
          } catch (error) {
            console.warn("Error resizing map:", error);
          }
        }
      });

      if (mapContainer.current) {
        resizeObserver.observe(mapContainer.current);
      }

      // Force resize after a short delay to ensure container has dimensions
      setTimeout(() => {
        if (map && map.resize && mounted) {
          try {
            map.resize();
            console.log("Map resized after initialization");
          } catch (error) {
            console.warn("Error resizing map after delay:", error);
          }
        }
      }, 500);

      // Add navigation controls
      try {
        map.addControl(new tt.NavigationControl(), "top-right");
      } catch (error) {
        console.warn("Failed to add navigation control:", error);
      }

      // Add traffic flow layer (real-time traffic)
      map.on("load", () => {
        console.log("Map loaded, initializing markers and layers");
        // Traffic flow and incidents are automatically enabled
        // Update markers when map is ready
        updateMarkers();
        
        // Add green corridor path if not public
        if (!isPublic && greenCorridorPath.length > 0) {
          addGreenCorridorPath();
        }
      });

      // Handle map errors
      map.on("error", (e?: any) => {
        console.error("TomTom map initialization error:", e);
        if (e && e.error && e.error.message) {
          console.error("Error details:", e.error.message);
        }
      });
    } catch (error) {
      console.error("Failed to initialize TomTom map:", error);
      return;
    }
    };

    initializeMap();

    return () => {
      mounted = false;
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (popupRef.current) {
        popupRef.current.remove();
      }
      if (corridorLayerRef.current && mapInstance.current) {
        if (mapInstance.current.getLayer(corridorLayerRef.current)) {
          mapInstance.current.removeLayer(corridorLayerRef.current);
        }
        if (mapInstance.current.getSource("green-corridor")) {
          mapInstance.current.removeSource("green-corridor");
        }
      }
      if (routeLayerRef.current && mapInstance.current) {
        if (mapInstance.current.getLayer(routeLayerRef.current)) {
          mapInstance.current.removeLayer(routeLayerRef.current);
        }
        if (mapInstance.current.getSource("emergency-route")) {
          mapInstance.current.removeSource("emergency-route");
        }
      }
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
      }
      // Remove all emergency vehicle markers
      allVehicleMarkersRef.current.forEach(marker => marker.remove());
      allVehicleMarkersRef.current.clear();
      // Remove intelligence markers
      intelligenceMarkersRef.current.forEach(marker => marker.remove());
      intelligenceMarkersRef.current.clear();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [apiKey, isPublic, centerData]);

  // Update markers when data changes (real-time updates)
  useEffect(() => {
    if (mapInstance.current && mapInstance.current.loaded()) {
      updateMarkers();
      if (!isPublic && greenCorridorPath.length > 0) {
        addGreenCorridorPath();
      }
      // Update emergency vehicle tracking (real-time)
      if (selectedVehicleId) {
        updateEmergencyVehicleTracking();
      }
      // Update signals/junctions from API
      updateSignalsJunctionsMarkers();
      
      // Show all active emergency vehicles on map (not just selected)
      if (!isPublic) {
        updateAllEmergencyVehicles();
        updateIntelligenceMarkers(); // Add accidents, hazards, violations
      }
    }
  }, [data, isPublic, greenCorridorPath.length, selectedVehicleId, emergencyVehicles, signalsJunctions, accidents, hazards, violations]);

  // Function to show all active emergency vehicles
  const allVehicleMarkersRef = useRef<Map<number, any>>(new Map<number, any>());
  const intelligenceMarkersRef = useRef<Map<string, any>>(new Map<string, any>());
  
  const updateIntelligenceMarkers = () => {
    if (!mapInstance.current || !tt) return;

    // Remove old markers
    intelligenceMarkersRef.current.forEach((marker) => marker.remove());
    intelligenceMarkersRef.current.clear();

    // Add accident markers (red)
    accidents.filter((a: any) => a.status === "active").forEach((accident: any) => {
      try {
        const marker = new tt.Marker({ color: "#ef4444" })
          .setLngLat([accident.location[1], accident.location[0]])
          .addTo(mapInstance.current!);
        
        marker.getElement().addEventListener("click", () => {
          showPopup(
            {
              id: `accident-${accident.id}`,
              position: { lat: accident.location[0], lng: accident.location[1] },
              type: "accident",
            },
            [accident.location[1], accident.location[0]]
          );
        });
        
        intelligenceMarkersRef.current.set(`accident-${accident.id}`, marker);
      } catch (error) {
        console.warn("Failed to add accident marker:", error);
      }
    });

    // Add hazard markers (yellow/orange)
    hazards.filter((h: any) => h.status === "active").forEach((hazard: any) => {
      try {
        const color = hazard.severity === "high" ? "#ff6b00" : "#f59e0b";
        const marker = new tt.Marker({ color })
          .setLngLat([hazard.location[1], hazard.location[0]])
          .addTo(mapInstance.current!);
        
        marker.getElement().addEventListener("click", () => {
          showPopup(
            {
              id: `hazard-${hazard.id}`,
              position: { lat: hazard.location[0], lng: hazard.location[1] },
              type: hazard.type,
            },
            [hazard.location[1], hazard.location[0]]
          );
        });
        
        intelligenceMarkersRef.current.set(`hazard-${hazard.id}`, marker);
      } catch (error) {
        console.warn("Failed to add hazard marker:", error);
      }
    });

    // Add violation markers (purple)
    violations.slice(0, 50).forEach((violation: any) => { // Limit to 50 most recent
      try {
        const marker = new tt.Marker({ color: "#a855f7" })
          .setLngLat([violation.location[1], violation.location[0]])
          .addTo(mapInstance.current!);
        
        marker.getElement().addEventListener("click", () => {
          showPopup(
            {
              id: `violation-${violation.id}`,
              position: { lat: violation.location[0], lng: violation.location[1] },
              type: violation.type,
            },
            [violation.location[1], violation.location[0]]
          );
        });
        
        intelligenceMarkersRef.current.set(`violation-${violation.id}`, marker);
      } catch (error) {
        console.warn("Failed to add violation marker:", error);
      }
    });

    // Forecast hotspot markers (purple)
    forecast.forEach((fh: any, idx: number) => {
      try {
        const marker = new tt.Marker({ color: "#8b5cf6" })
          .setLngLat([centerData[0] + idx * 0.002, centerData[1] + idx * 0.002])
          .addTo(mapInstance.current!);
        intelligenceMarkersRef.current.set(`forecast-${idx}`, marker);
      } catch (error) {
        console.warn("Failed to add forecast marker:", error);
      }
    });

    // Weather/construction risk markers (blue)
    weatherRisks.forEach((risk: any, idx: number) => {
      try {
        if (!risk.location) return;
        const marker = new tt.Marker({ color: "#0ea5e9" })
          .setLngLat([risk.location[1], risk.location[0]])
          .addTo(mapInstance.current!);
        intelligenceMarkersRef.current.set(`weather-${idx}`, marker);
      } catch (error) {
        console.warn("Failed to add weather marker:", error);
      }
    });
  };
  
  const updateAllEmergencyVehicles = () => {
    if (!mapInstance.current || !tt) return;

    const activeVehicles = emergencyVehicles.filter(v => v.status === "active");
    
    // Remove markers for vehicles that no longer exist or are inactive
    allVehicleMarkersRef.current.forEach((marker, vehicleId) => {
      if (!activeVehicles.find(v => v.id === vehicleId)) {
        marker.remove();
        allVehicleMarkersRef.current.delete(vehicleId);
      }
    });

    // Add or update markers for active vehicles
    activeVehicles.forEach((vehicle) => {
      const vehicleColor = vehicle.vehicle_type === "ambulance" ? "#ef4444" : 
                          vehicle.vehicle_type === "fire_truck" ? "#ff6b00" :
                          vehicle.vehicle_type === "police" ? "#0066ff" : "#f59e0b";
      
      if (allVehicleMarkersRef.current.has(vehicle.id)) {
        // Update existing marker position
        const marker = allVehicleMarkersRef.current.get(vehicle.id);
        marker.setLngLat([vehicle.current_position[1], vehicle.current_position[0]]);
      } else {
        // Create new marker
        try {
          const markerOptions: any = {
            color: vehicleColor,
          };
          const marker = new tt.Marker(markerOptions)
            .setLngLat([vehicle.current_position[1], vehicle.current_position[0]])
            .addTo(mapInstance.current!);

          marker.getElement().addEventListener("click", () => {
            setSelectedMarker({
              id: vehicle.id.toString(),
              position: { lat: vehicle.current_position[0], lng: vehicle.current_position[1] },
              type: vehicle.vehicle_type,
            });
            showPopup(
              {
                id: vehicle.id.toString(),
                position: { lat: vehicle.current_position[0], lng: vehicle.current_position[1] },
                type: vehicle.vehicle_type,
              },
              [vehicle.current_position[1], vehicle.current_position[0]]
            );
          });

          allVehicleMarkersRef.current.set(vehicle.id, marker);
        } catch (error) {
          console.warn("Failed to add emergency vehicle marker:", error);
        }
      }
    });
  };

  const updateSignalsJunctionsMarkers = () => {
    if (!mapInstance.current || !tt) return;

    // Add markers for signals/junctions from API
    signalsJunctions.forEach((signal) => {
      try {
        const markerOptions: any = {
          color: getMarkerColor("signal", signal.status),
        };
        const marker = new tt.Marker(markerOptions)
          .setLngLat([signal.position[1], signal.position[0]]) // [lng, lat]
          .addTo(mapInstance.current!);

        marker.getElement().addEventListener("click", () => {
          setSelectedMarker({
            id: signal.id.toString(),
            position: { lat: signal.position[0], lng: signal.position[1] },
            type: signal.type,
            status: signal.status,
          });
          showPopup(
            {
              id: signal.id.toString(),
              position: { lat: signal.position[0], lng: signal.position[1] },
              type: signal.type,
              status: signal.status,
            },
            [signal.position[1], signal.position[0]]
          );
        });

        markersRef.current.push(marker);
      } catch (error) {
        console.warn("Failed to add signal/junction marker:", error);
      }
    });
  };

  const updateEmergencyVehicleTracking = () => {
    if (!mapInstance.current || !tt || !selectedVehicleId) return;

    const vehicle = emergencyVehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle) return;

    try {
      const vehicleColor = vehicle.vehicle_type === "ambulance" ? "#ef4444" : 
                           vehicle.vehicle_type === "fire_truck" ? "#ff6b00" :
                           vehicle.vehicle_type === "police" ? "#0066ff" : "#f59e0b";
      
      // Update existing marker position smoothly, or create new one
      if (vehicleMarkerRef.current) {
        // Smoothly update position
        vehicleMarkerRef.current.setLngLat([vehicle.current_position[1], vehicle.current_position[0]]);
      } else {
        // Create new marker
        const markerOptions: any = {
          color: vehicleColor,
        };
        const marker = new tt.Marker(markerOptions)
          .setLngLat([vehicle.current_position[1], vehicle.current_position[0]]) // [lng, lat]
          .addTo(mapInstance.current!);

        marker.getElement().addEventListener("click", () => {
          setSelectedMarker({
            id: vehicle.id.toString(),
            position: { lat: vehicle.current_position[0], lng: vehicle.current_position[1] },
            type: vehicle.vehicle_type,
          });
          showPopup(
            {
              id: vehicle.id.toString(),
              position: { lat: vehicle.current_position[0], lng: vehicle.current_position[1] },
              type: vehicle.vehicle_type,
            },
            [vehicle.current_position[1], vehicle.current_position[0]]
          );
        });

        vehicleMarkerRef.current = marker;
      }
    } catch (error) {
      console.warn("Failed to add emergency vehicle marker:", error);
    }

    // Draw route path
    if (vehicle.route && vehicle.route.length > 0) {
      // Remove existing route layer
      if (routeLayerRef.current && mapInstance.current.getLayer(routeLayerRef.current)) {
        mapInstance.current.removeLayer(routeLayerRef.current);
        mapInstance.current.removeSource("emergency-route");
        routeLayerRef.current = null;
      }

      // Add route path
      const routeCoordinates = vehicle.route.map((point: [number, number]) => [
        point[1], // lng
        point[0], // lat
      ] as [number, number]);

      mapInstance.current.addSource("emergency-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeCoordinates,
          },
        },
      });

      mapInstance.current.addLayer({
        id: "emergency-route",
        type: "line",
        source: "emergency-route",
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-opacity": 0.8,
          "line-dasharray": [2, 2],
        },
      });

      routeLayerRef.current = "emergency-route";

      // Center map on vehicle (if method exists)
      if (mapInstance.current.setCenter && mapInstance.current.setZoom) {
        mapInstance.current.setCenter([vehicle.current_position[1], vehicle.current_position[0]]);
        mapInstance.current.setZoom(14);
      } else if (mapInstance.current.flyTo) {
        mapInstance.current.flyTo({
          center: [vehicle.current_position[1], vehicle.current_position[0]],
          zoom: 14,
        });
      }
    }
  };

  const updateMarkers = () => {
    if (!mapInstance.current || !tt) return;

    // Remove existing markers (except emergency vehicle marker)
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add signal markers from monitoring data
    signals.forEach((signal) => {
      try {
        const markerOptions: any = {
          color: getMarkerColor("signal", signal.status),
        };
        const marker = new tt.Marker(markerOptions)
          .setLngLat([signal.position.lng, signal.position.lat])
          .addTo(mapInstance.current!);

        marker.getElement().addEventListener("click", () => {
          setSelectedMarker(signal);
          showPopup(signal, [signal.position.lng, signal.position.lat]);
        });

        markersRef.current.push(marker);
      } catch (error) {
        console.warn("Failed to add signal marker:", error);
      }
    });

    // Add vehicle markers (only for admin)
    if (!isPublic) {
      vehicles.forEach((vehicle) => {
        try {
          const markerOptions: any = {
            color: getMarkerColor(vehicle.type),
          };
          const marker = new tt.Marker(markerOptions)
            .setLngLat([vehicle.position.lng, vehicle.position.lat])
            .addTo(mapInstance.current!);

          marker.getElement().addEventListener("click", () => {
            setSelectedMarker(vehicle);
            showPopup(vehicle, [vehicle.position.lng, vehicle.position.lat]);
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.warn("Failed to add vehicle marker:", error);
        }
      });
    }
  };

  const addGreenCorridorPath = () => {
    if (!mapInstance.current || greenCorridorPath.length === 0 || !tt) return;

    // Remove existing corridor layer if any
    if (corridorLayerRef.current && mapInstance.current.getLayer(corridorLayerRef.current)) {
      mapInstance.current.removeLayer(corridorLayerRef.current);
      mapInstance.current.removeSource("green-corridor");
      corridorLayerRef.current = null;
    }

    // Add green corridor as a line
    mapInstance.current.addSource("green-corridor", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: greenCorridorPath,
        },
      },
    });

    mapInstance.current.addLayer({
      id: "green-corridor",
      type: "line",
      source: "green-corridor",
      paint: {
        "line-color": "#10b981",
        "line-width": 4,
        "line-opacity": 0.7,
      },
    });

    corridorLayerRef.current = "green-corridor";
  };

  const showPopup = (markerData: MarkerData, position: [number, number]) => {
    if (!mapInstance.current || !tt) return;

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    try {
      const content = `
        <div style="padding: 8px; color: white; font-family: system-ui;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">
            ${markerData.type === "signal" ? `Signal ${markerData.id}` : markerData.type.toUpperCase()}
          </p>
          ${
            markerData.type === "signal" || markerData.type === "junction"
              ? `<p style="margin: 0; font-size: 14px;">
                  Status: <span style="color: ${getMarkerColor("signal", markerData.status)}; font-weight: 500;">
                    ${markerData.status}
                  </span>
                </p>
                <p style="margin: 0; font-size: 12px; color: #888;">
                  Coordinates: ${markerData.position.lat.toFixed(4)}, ${markerData.position.lng.toFixed(4)}
                </p>`
              : markerData.type === "ambulance" || markerData.type === "fire_truck" || markerData.type === "police"
              ? `<p style="margin: 0; font-size: 14px;">Emergency Vehicle</p>
                <p style="margin: 0; font-size: 12px; color: #888;">
                  Position: ${markerData.position.lat.toFixed(4)}, ${markerData.position.lng.toFixed(4)}
                </p>`
              : `<p style="margin: 0; font-size: 14px;">ID: ${markerData.id}</p>`
          }
        </div>
      `;

      const popupOptions: any = { offset: 25, closeButton: true };
      popupRef.current = new tt.Popup(popupOptions)
        .setLngLat(position as any)
        .setHTML(content)
        .addTo(mapInstance.current);

      popupRef.current.on("close", () => {
        setSelectedMarker(null);
        popupRef.current = null;
      });
    } catch (error) {
      console.warn("Failed to show popup:", error);
    }
  };

  if (!apiKey) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-rajdhani font-semibold text-foreground">
            {isPublic ? "Live Traffic Map" : "Real-time Traffic Map"}
          </h2>
        </div>
        <div className="h-[500px] w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">TomTom API Key not configured</p>
            <p className="text-sm text-muted-foreground">
              Please set VITE_TOMTOM_API_KEY or VITE_TOMTOM_KEY in your .env.local file
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Get your free API key at <a href="https://developer.tomtom.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developer.tomtom.com</a>
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!tt || !tt.map) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-rajdhani font-semibold text-foreground">
            {isPublic ? "Live Traffic Map" : "Real-time Traffic Map"}
          </h2>
        </div>
        <div className="h-[500px] w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">TomTom Maps SDK not loaded</p>
            <p className="text-sm text-muted-foreground mb-2">
              Please install the package:
            </p>
            <code className="text-xs bg-secondary px-2 py-1 rounded block mb-2">
              npm install @tomtom-international/web-sdk-maps --legacy-peer-deps
            </code>
            <p className="text-xs text-muted-foreground">
              Then restart the dev server (Ctrl+C, then npm run dev)
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Check if used in fullscreen/live map mode
  const isFullscreenMode = typeof window !== 'undefined' && 
                          (window.location.pathname.includes('live-map') || 
                           document.querySelector('.flex-1.relative.overflow-hidden'));

  // Render without Card wrapper in fullscreen mode
  if (isFullscreenMode) {
    return (
      <div className="w-full h-full relative bg-background" style={{ width: "100%", height: "100%" }}>
        <div 
          ref={mapContainer} 
          className="w-full h-full" 
          style={{ 
            width: "100%", 
            height: "100%", 
            position: "relative",
            minHeight: "500px"
          }}
        />
        {!mapInstance.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10 pointer-events-none">
            <div className="text-center">
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-rajdhani font-semibold text-foreground">
          {isPublic ? "Live Traffic Map" : "Real-time Traffic Map"}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          {!isPublic && heatmapLanes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>High</span>
              </div>
              <span className="ml-2">Congestion</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Free Flow</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Slow</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Congested</span>
            </div>
            <span className="ml-1 text-primary font-semibold">Live Traffic</span>
          </div>
        </div>
      </div>
      <div className="h-[500px] w-full rounded-lg overflow-hidden relative">
        <div 
          ref={mapContainer} 
          className="w-full h-full" 
          style={{ minHeight: "500px", position: "relative" }}
        />
        {!mapInstance.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="text-center">
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
