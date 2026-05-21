import { useEffect, useRef, useState } from "react";
import * as tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import { Card } from "@/components/ui/card";
import { useMonitoringData } from "@/hooks/useMonitoringData";

interface MarkerData {
  id: string;
  position: { lat: number; lng: number };
  type: string;
  status?: string;
}

interface TrafficMapProps {
  isPublic?: boolean;
}

const defaultCenter = [77.209, 28.6139]; // [lng, lat] for TomTom

const getMarkerColor = (type: string, status?: string): string => {
  if (type === "signal") {
    if (status === "green") return "#10b981";
    if (status === "red") return "#ef4444";
    return "#f59e0b";
  }
  return "#3b82f6";
};

export function TrafficMapTomTom({ isPublic = false }: TrafficMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const markersRef = useRef<tt.Marker[]>([]);
  const popupRef = useRef<tt.Popup | null>(null);
  const { data } = useMonitoringData();
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY || import.meta.env.VITE_TOMTOM_KEY;

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

  const heatmapLanes = (data?.heatmap?.lanes ?? []).map((lane: any) => ({
    position: [lane.position[1], lane.position[0]] as [number, number], // [lng, lat]
    congestion: lane.congestion ?? 0.5,
  }));

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !apiKey) return;

    // Initialize TomTom map
    const map = tt.map({
      key: apiKey,
      container: mapContainer.current,
      center: centerData as [number, number],
      zoom: 13,
      style: "tomtom-night",
    });

    mapInstance.current = map;

    // Add navigation controls
    map.addControl(new tt.NavigationControl(), "top-right");

    // Add traffic flow layer (real-time traffic)
    map.on("load", () => {
      // Traffic flow is automatically enabled with trafficFlow: "relative"
      // Traffic incidents are automatically enabled with trafficIncidents: true
      
      // Add custom markers
      updateMarkers();
      
      // Add green corridor path if not public
      if (!isPublic && greenCorridorPath.length > 0) {
        addGreenCorridorPath();
      }
    });

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (popupRef.current) {
        popupRef.current.remove();
      }
      map.remove();
    };
  }, [apiKey, isPublic]);

  // Update markers when data changes
  useEffect(() => {
    if (mapInstance.current) {
      updateMarkers();
      if (!isPublic && greenCorridorPath.length > 0) {
        addGreenCorridorPath();
      }
    }
  }, [data, isPublic]);

  const updateMarkers = () => {
    if (!mapInstance.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add signal markers
    signals.forEach((signal) => {
      const marker = new tt.Marker({
        color: getMarkerColor("signal", signal.status),
      })
        .setLngLat([signal.position.lng, signal.position.lat])
        .addTo(mapInstance.current!);

      marker.getElement().addEventListener("click", () => {
        setSelectedMarker(signal);
        showPopup(signal, [signal.position.lng, signal.position.lat]);
      });

      markersRef.current.push(marker);
    });

    // Add vehicle markers (only for admin)
    if (!isPublic) {
      vehicles.forEach((vehicle) => {
        const marker = new tt.Marker({
          color: getMarkerColor(vehicle.type),
        })
          .setLngLat([vehicle.position.lng, vehicle.position.lat])
          .addTo(mapInstance.current!);

        marker.getElement().addEventListener("click", () => {
          setSelectedMarker(vehicle);
          showPopup(vehicle, [vehicle.position.lng, vehicle.position.lat]);
        });

        markersRef.current.push(marker);
      });
    }
  };

  const addGreenCorridorPath = () => {
    if (!mapInstance.current || greenCorridorPath.length === 0) return;

    // Remove existing corridor layer if any
    if (mapInstance.current.getLayer("green-corridor")) {
      mapInstance.current.removeLayer("green-corridor");
      mapInstance.current.removeSource("green-corridor");
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
  };

  const showPopup = (markerData: MarkerData, position: [number, number]) => {
    if (!mapInstance.current) return;

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    const content = `
      <div style="padding: 8px; color: white; font-family: system-ui;">
        <p style="font-weight: 600; margin: 0 0 4px 0;">
          ${markerData.type === "signal" ? `Signal ${markerData.id}` : markerData.type.toUpperCase()}
        </p>
        ${
          markerData.type === "signal"
            ? `<p style="margin: 0; font-size: 14px;">
                Status: <span style="color: ${getMarkerColor("signal", markerData.status)}; font-weight: 500;">
                  ${markerData.status}
                </span>
              </p>`
            : `<p style="margin: 0; font-size: 14px;">ID: ${markerData.id}</p>`
        }
      </div>
    `;

    popupRef.current = new tt.Popup({ offset: 25, closeButton: true })
      .setLngLat(new tt.LngLat(position[0], position[1]))
      .setHTML(content)
      .addTo(mapInstance.current);

    popupRef.current.on("close", () => {
      setSelectedMarker(null);
      popupRef.current = null;
    });
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
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-rajdhani font-semibold text-foreground">
          {isPublic ? "Live Traffic Map" : "Real-time Traffic Map"}
        </h2>
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
        </div>
      </div>
      <div className="h-[500px] w-full rounded-lg overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </Card>
  );
}
