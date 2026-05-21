import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { TrafficMap } from "./TrafficMap";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function LiveMapRealTime() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    // Update timestamp every 5 seconds
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
      fetch(`${API_BASE}/api/congestion/now`).then(res => res.json()).then(setKpi).catch(() => {});
      fetch(`${API_BASE}/api/congestion/forecast`).then(res => res.json()).then(data => setForecast(data.horizons || [])).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col bg-background">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/30 rounded-full">
            <Radio className="w-3 h-3 text-success animate-pulse" />
            <span className="text-xs font-semibold text-success">LIVE</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Real-time Map</span>
            <span className="mx-2">•</span>
            <span>Last Update: {formatTime(lastUpdate)}</span>
            <span className="mx-2">•</span>
            <span>Updates: {updateCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kpi && (
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span>Congestion Index: <span className="text-foreground font-semibold">{(kpi.congestion_index * 100).toFixed(1)}%</span></span>
              <span>Avg Speed: <span className="text-foreground font-semibold">{kpi.avg_speed_kph} km/h</span></span>
              <span>Reduction vs Baseline: <span className="text-success font-semibold">{kpi.reduction_pct}%</span></span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Map Container - Takes full remaining space */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 120px)', width: '100%' }}>
        <TrafficMap isPublic={false} />
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-card border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-3">
            {forecast.slice(0,3).map((f, idx) => (
              <span key={idx} className="text-foreground">
                {f.minutes}m: {(f.congestion_index * 100).toFixed(0)}%
              </span>
            ))}
          </div>
          <div>
            <span className="text-success font-semibold">Real-time Updates: Every 5s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
