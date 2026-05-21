import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Fuel, Wind, TrendingDown, Navigation, Download, AlertCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface EcoRoute {
  route_id: string;
  name: string;
  distance_km: number;
  estimated_time_min: number;
  estimated_fuel_liters: number;
  estimated_co2_kg: number;
  estimated_cost_usd: number;
  eco_score: number;
  congestion_level: string;
  recommendations: string[];
}

export function SustainabilityDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("car");
  const [ecoRoutes, setEcoRoutes] = useState<EcoRoute[]>([]);
  const [showRouting, setShowRouting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originLat, setOriginLat] = useState("28.6139");
  const [originLng, setOriginLng] = useState("77.2090");
  const [destLat, setDestLat] = useState("28.6300");
  const [destLng, setDestLng] = useState("77.2200");

  useEffect(() => {
    loadSustainabilityMetrics();
    const interval = setInterval(loadSustainabilityMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSustainabilityMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/traffic/sustainability`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to load sustainability metrics:", error);
      setLoading(false);
    }
  };

  const findEcoRoutes = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/traffic/eco-routes?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}&vehicle_type=${selectedVehicle}`
      );
      if (res.ok) {
        const data = await res.json();
        setEcoRoutes(data.routes || []);
        toast.success("Routes optimized!");
      }
    } catch (error) {
      toast.error("Failed to find eco-routes");
    }
  };

  const generateReport = async (format: "pdf" | "csv") => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "sustainability",
          period: "daily",
          format: format,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        window.open(data.download_url, "_blank");
        toast.success(`${format.toUpperCase()} report generated!`);
      }
    } catch (error) {
      toast.error("Failed to generate report");
    }
  };

  // Sample emissions trend data
  const emissionsTrend = [
    { time: "8:00 AM", co2: 450, fuel: 150 },
    { time: "10:00 AM", co2: 620, fuel: 210 },
    { time: "12:00 PM", co2: 380, fuel: 130 },
    { time: "2:00 PM", co2: 510, fuel: 170 },
    { time: "4:00 PM", co2: 780, fuel: 260 },
    { time: "6:00 PM", co2: 920, fuel: 310 },
  ];

  const vehicleBreakdown = metrics ? [
    { name: "Cars", value: 60 },
    { name: "Trucks", value: 15 },
    { name: "Buses", value: 20 },
    { name: "Motorcycles", value: 5 },
  ] : [];

  const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B"];

  if (loading && !metrics) {
    return <div className="text-center py-8">Loading sustainability metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Sustainability & Eco Metrics
          </h1>
          <p className="text-muted-foreground">
            Monitor emissions, fuel consumption, and eco-friendly routing
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => generateReport("pdf")} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            PDF Report
          </Button>
          <Button onClick={() => generateReport("csv")} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSV Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">CO₂ Emitted</p>
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                {metrics?.total_co2_emitted_kg || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">kg today</p>
            </div>
            <Wind className="w-8 h-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fuel Wasted</p>
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                {metrics?.total_fuel_wasted_liters || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">liters (idling)</p>
            </div>
            <Fuel className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fuel Cost</p>
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                ${metrics?.total_fuel_cost_usd || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">estimated</p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Trees Offset</p>
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                {metrics?.equivalent_co2_trees_offset || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">trees/year</p>
            </div>
            <Leaf className="w-8 h-8 text-success" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Speed</p>
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                {metrics?.avg_vehicle_speed_kmh || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">km/h</p>
            </div>
            <Navigation className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Emissions Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Vehicle Breakdown</TabsTrigger>
          <TabsTrigger value="routing">Eco Routes</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Daily Emissions & Fuel Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emissionsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="co2" stroke="#EF4444" name="CO₂ (kg)" />
                <Line type="monotone" dataKey="fuel" stroke="#F59E0B" name="Fuel (liters)" />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm font-medium text-foreground mb-2">Peak Hours Identified:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 6:00 PM - Highest emissions (920 kg CO₂)</li>
                <li>• 10:00 AM - Morning peak (620 kg CO₂)</li>
                <li>• 12:00 PM - Lunch break (lowest: 380 kg CO₂)</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Vehicle Type Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vehicleBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {vehicleBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                Idling Statistics
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Vehicles Idling</span>
                    <span className="text-sm font-semibold text-foreground">
                      {metrics?.vehicles_idling_percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-destructive h-3 rounded-full"
                      style={{ width: `${metrics?.vehicles_idling_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-foreground mb-3">Improvement Actions:</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Optimize signal timings to reduce idling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Encourage eco-driving practices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>Implement green light priority lanes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Eco Routing Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Find Eco-Friendly Routes
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-sm mb-2 block">Vehicle Type</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={findEcoRoutes} className="mt-6">
                Find Routes
              </Button>
            </div>

            {ecoRoutes.length > 0 && (
              <div className="space-y-4">
                {ecoRoutes.map((route) => (
                  <Card key={route.route_id} className="p-4 bg-secondary border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{route.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {route.distance_km} km • {route.estimated_time_min} min
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            route.eco_score > 80
                              ? "bg-success"
                              : route.eco_score > 60
                                ? "bg-yellow-500"
                                : "bg-destructive"
                          }
                        >
                          Score: {route.eco_score}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-2 mb-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fuel</p>
                        <p className="font-semibold text-foreground">
                          {route.estimated_fuel_liters}L
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CO₂</p>
                        <p className="font-semibold text-foreground">
                          {route.estimated_co2_kg}kg
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost</p>
                        <p className="font-semibold text-foreground">
                          ${route.estimated_cost_usd}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Congestion</p>
                        <Badge variant="outline">{route.congestion_level}</Badge>
                      </div>
                    </div>

                    {route.recommendations.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Recommendations:</p>
                        {route.recommendations.map((rec, i) => (
                          <p key={i} className="text-xs text-muted-foreground ml-2">
                            • {rec}
                          </p>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Eco Tips */}
      <Card className="p-6 bg-success/10 border-success/20">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground mb-2">Sustainability Tips:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Use eco-routes to reduce fuel consumption by 10-15%</li>
              <li>✓ Avoid peak hours (8-10 AM, 5-7 PM) when possible</li>
              <li>✓ Maintain steady speed to optimize fuel efficiency</li>
              <li>✓ Consider public transport for commutes over 10 km</li>
              <li>✓ Combine trips to reduce total distance traveled</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
