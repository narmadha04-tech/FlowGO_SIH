import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, AlertTriangle, Car, Download, Bell, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { TrafficMap } from "./TrafficMap";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Accident {
  id: number;
  location: [number, number];
  severity: string;
  type: string;
  description: string;
  reported_at: number;
  status: string;
  vehicles_involved: number;
  injuries: number;
}

interface Hazard {
  id: number;
  type: string;
  location: [number, number];
  severity: string;
  description: string;
  start_time: number;
  end_time: number;
  status: string;
}

interface Violation {
  id: number;
  type: string;
  location: [number, number];
  timestamp: number;
  description: string;
  status: string;
}

interface Alert {
  id: number;
  type: string;
  severity: string;
  location: [number, number];
  message: string;
  timestamp: number;
  status: string;
}

export function AdvancedTrafficIntelligence() {
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [sustainability, setSustainability] = useState<any>(null);
  const [congestionRate, setCongestionRate] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const [intelRes, analyticsRes, predictionsRes, sustainabilityRes, congestionRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/api/traffic/intelligence`),
        fetch(`${API_BASE}/api/traffic/analytics/live`),
        fetch(`${API_BASE}/api/traffic/predictions`),
        fetch(`${API_BASE}/api/traffic/sustainability`),
        fetch(`${API_BASE}/api/traffic/congestion/rate`),
        fetch(`${API_BASE}/api/traffic/alerts`),
      ]);

      if (intelRes.ok) {
        const data = await intelRes.json();
        setIntelligenceData(data);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setLiveAnalytics(data);
      }

      if (predictionsRes.ok) {
        const data = await predictionsRes.json();
        setPredictions(data);
      }

      if (sustainabilityRes.ok) {
        const data = await sustainabilityRes.json();
        setSustainability(data);
      }

      if (congestionRes.ok) {
        const data = await congestionRes.json();
        setCongestionRate(data);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        const newAlerts = data.alerts || [];
        
        // Check for new high-priority alerts
        if (newAlerts.length > alerts.length) {
          const newHighPriority = newAlerts.filter((a: Alert) => 
            !alerts.find(old => old.id === a.id) && 
            (a.severity === "critical" || a.severity === "high")
          );
          
          newHighPriority.forEach((alert: Alert) => {
            toast.error(alert.message, {
              duration: 5000,
              icon: <AlertTriangle className="w-5 h-5" />,
            });
            
            // Play sound for critical alerts
            if (soundEnabled && alert.severity === "critical") {
              playAlertSound();
            }
          });
        }
        
        setAlerts(newAlerts);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading intelligence data:", error);
      setLoading(false);
    }
  };

  const playAlertSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleExport = async (format: "pdf" | "csv") => {
    try {
      const { exportToCSV, exportToPDF } = await import("@/utils/exportUtils");
      
      const exportData = {
        accidents: accidents,
        hazards: hazards,
        violations: violations,
        analytics: liveAnalytics,
        predictions: predictions,
        sustainability: sustainability,
        timestamp: Date.now() / 1000,
      };
      
      if (format === "csv") {
        await exportToCSV(exportData);
        toast.success("CSV report exported successfully");
      } else {
        await exportToPDF(exportData);
        toast.success("PDF report opened for printing");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      case "low": return "bg-green-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading traffic intelligence...</p>
        </div>
      </div>
    );
  }

  const accidents = intelligenceData?.accidents || [];
  const hazards = intelligenceData?.hazards || [];
  const violations = intelligenceData?.violations || [];
  const weather = intelligenceData?.weather || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Advanced Traffic Intelligence
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring, prediction, and sustainability metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* High-Priority Alerts Dashboard */}
      <Card className="p-6 bg-card border-destructive/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-rajdhani font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-destructive" />
            High-Priority Alerts ({alerts.length})
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
          {alerts.slice(0, 9).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  {alert.type}
                </Badge>
                <span className="text-xs opacity-80">
                  {new Date(alert.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm font-semibold">{alert.message}</p>
              <p className="text-xs opacity-80 mt-1">
                {alert.location[0].toFixed(4)}, {alert.location[1].toFixed(4)}
              </p>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="col-span-3 text-center py-8 text-muted-foreground">
              No active alerts
            </div>
          )}
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Congestion Rate</span>
            <Badge className={getSeverityColor(congestionRate?.severity || "low")}>
              {congestionRate?.severity?.toUpperCase() || "LOW"}
            </Badge>
          </div>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {congestionRate?.rate?.toFixed(1) || "0"}%
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Active Accidents</span>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {accidents.filter((a: Accident) => a.status === "active").length}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">CO₂ Emissions</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {sustainability?.co2_emissions?.total_today?.toFixed(1) || "0"} kg
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Violations Today</span>
            <Car className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {violations.length}
          </p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Live Analytics</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="sustainability">Sustainability</TabsTrigger>
          <TabsTrigger value="events">Event Timeline</TabsTrigger>
          <TabsTrigger value="map">Intelligence Map</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Accidents */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Active Accidents
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {accidents.filter((a: Accident) => a.status === "active").map((accident: Accident) => (
                  <div key={accident.id} className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="destructive">{accident.severity.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(accident.reported_at * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground mb-1">{accident.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Location: {accident.location[0].toFixed(4)}, {accident.location[1].toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vehicles: {accident.vehicles_involved} | Injuries: {accident.injuries}
                    </p>
                  </div>
                ))}
                {accidents.filter((a: Accident) => a.status === "active").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active accidents
                  </div>
                )}
              </div>
            </Card>

            {/* Hazards */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Active Hazards
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {hazards.filter((h: Hazard) => h.status === "active").map((hazard: Hazard) => (
                  <div key={hazard.id} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className="bg-yellow-500 text-black">{hazard.type.toUpperCase()}</Badge>
                      <Badge variant="outline">{hazard.severity}</Badge>
                    </div>
                    <p className="font-semibold text-foreground mb-1">{hazard.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Location: {hazard.location[0].toFixed(4)}, {hazard.location[1].toFixed(4)}
                    </p>
                  </div>
                ))}
                {hazards.filter((h: Hazard) => h.status === "active").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active hazards
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Speed Flow */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Speed Flow Analysis
              </h3>
              {liveAnalytics?.speed_flow && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Speed</span>
                    <span className="text-2xl font-bold text-foreground">
                      {liveAnalytics.speed_flow.average_speed.toFixed(1)} km/h
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-4">
                    <div
                      className="bg-primary h-4 rounded-full transition-all"
                      style={{ width: `${liveAnalytics.speed_flow.current_flow}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Free Flow: {liveAnalytics.speed_flow.free_flow_speed} km/h
                  </p>
                </div>
              )}
            </Card>

            {/* Density */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Traffic Density
              </h3>
              {liveAnalytics?.density && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Vehicles/km</span>
                    <span className="text-2xl font-bold text-foreground">
                      {liveAnalytics.density.vehicles_per_km.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-4">
                    <div
                      className="bg-orange-500 h-4 rounded-full transition-all"
                      style={{ width: `${liveAnalytics.density.congestion_level}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Queue Length: {liveAnalytics.density.queue_length} vehicles
                  </p>
                </div>
              )}
            </Card>

            {/* Wait Time */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Wait Time Analysis
              </h3>
              {liveAnalytics?.wait_time && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average</span>
                    <span className="font-semibold">{liveAnalytics.wait_time.average.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Min</span>
                    <span className="font-semibold">{liveAnalytics.wait_time.min.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max</span>
                    <span className="font-semibold">{liveAnalytics.wait_time.max.toFixed(1)}s</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Signal Delay */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Signal Delay
              </h3>
              {liveAnalytics?.signal_delay && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Delay</span>
                    <span className="font-semibold">
                      {liveAnalytics.signal_delay.average_delay.toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Delay</span>
                    <span className="font-semibold">
                      {liveAnalytics.signal_delay.total_delay.toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Future Congestion */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Future Congestion Prediction
              </h3>
              {predictions?.future_congestion && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={predictions.future_congestion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="predicted_volume"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="congestion_probability"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Accident Likelihood */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Accident Likelihood
              </h3>
              {predictions?.accident_likelihood && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-foreground mb-2">
                      {predictions.accident_likelihood.probability.toFixed(0)}%
                    </div>
                    <Badge className={getSeverityColor(predictions.accident_likelihood.risk_level)}>
                      {predictions.accident_likelihood.risk_level.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Contributing Factors:</p>
                    {predictions.accident_likelihood.factors.map((factor: string, idx: number) => (
                      <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {factor}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Travel Time Estimation */}
            <Card className="p-6 bg-card border-border col-span-2">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Travel Time Estimation
              </h3>
              {predictions?.travel_time_estimation && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Average</p>
                    <p className="text-3xl font-bold text-foreground">
                      {predictions.travel_time_estimation.average.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {predictions.travel_time_estimation.units}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Best Case</p>
                    <p className="text-3xl font-bold text-success">
                      {predictions.travel_time_estimation.range[0].toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {predictions.travel_time_estimation.units}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Worst Case</p>
                    <p className="text-3xl font-bold text-destructive">
                      {predictions.travel_time_estimation.range[1].toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {predictions.travel_time_estimation.units}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sustainability" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fuel Wastage */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Fuel Wastage
              </h3>
              {sustainability?.fuel_wastage && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Per Hour</span>
                    <span className="text-2xl font-bold text-foreground">
                      {sustainability.fuel_wastage.liters_per_hour.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Today</span>
                    <span className="text-2xl font-bold text-foreground">
                      {sustainability.fuel_wastage.total_today.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Cost Estimate</span>
                    <span className="text-xl font-semibold text-foreground">
                      ₹{sustainability.fuel_wastage.cost_estimate.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* CO₂ Emissions */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                CO₂ Emissions
              </h3>
              {sustainability?.co2_emissions && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Per Hour</span>
                    <span className="text-2xl font-bold text-foreground">
                      {sustainability.co2_emissions.kg_per_hour.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Today</span>
                    <span className="text-2xl font-bold text-foreground">
                      {sustainability.co2_emissions.total_today.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tree Equivalent</span>
                    <span className="text-xl font-semibold text-success">
                      {sustainability.co2_emissions.equivalent_trees} trees
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Eco-Friendly Routing */}
            <Card className="p-6 bg-card border-border col-span-2">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Eco-Friendly Routing Suggestions
              </h3>
              {sustainability?.eco_routing && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {sustainability.eco_routing.available_routes.map((route: any) => (
                      <div key={route.route_id} className="p-4 bg-success/10 rounded-lg border border-success/30">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">Route #{route.route_id}</span>
                          <Badge variant="outline" className="bg-success/20">
                            Save {route.co2_saved.toFixed(2)} kg CO₂
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Distance: {route.distance} km | Time: {route.estimated_time} min
                        </p>
                        <p className="text-xs text-success">
                          Fuel Saved: {route.fuel_saved.toFixed(2)} L
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm font-semibold mb-2">Total Potential Savings:</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel:</span>
                      <span className="font-bold text-foreground">
                        {sustainability.eco_routing.potential_savings.fuel_liters.toFixed(2)} L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CO₂:</span>
                      <span className="font-bold text-success">
                        {sustainability.eco_routing.potential_savings.co2_kg.toFixed(2)} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Event Timeline
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Combine all events */}
              {[
                ...accidents.map((a: Accident) => ({
                  ...a,
                  event_type: "accident",
                  timestamp: a.reported_at,
                })),
                ...hazards.map((h: Hazard) => ({
                  ...h,
                  event_type: "hazard",
                  timestamp: h.start_time,
                })),
                ...violations.map((v: Violation) => ({
                  ...v,
                  event_type: "violation",
                  timestamp: v.timestamp,
                })),
              ]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 20)
                .map((event: any, idx: number) => (
                  <div
                    key={`${event.event_type}-${event.id}`}
                    className="flex items-start gap-4 p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2 bg-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            event.event_type === "accident"
                              ? "destructive"
                              : event.event_type === "hazard"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {event.event_type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {event.description || event.type}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.location[0].toFixed(4)}, {event.location[1].toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              {accidents.length === 0 && hazards.length === 0 && violations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No events recorded
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Intelligence Map with All Events
            </h3>
            <TrafficMap isPublic={false} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
