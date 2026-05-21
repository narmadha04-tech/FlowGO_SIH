import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Navigation, Play, Square, Trash2, Plus, Map, Radio } from "lucide-react";
import { toast } from "sonner";
import { TrafficMap } from "./TrafficMap";

interface EmergencyVehicle {
  id: number;
  vehicle_type: string;
  starting_point: [number, number];
  destination: [number, number];
  current_position: [number, number];
  route: [number, number][];
  signals_on_route: number[];
  status: string;
  created_at: number;
  updated_at: number;
  eta: string;
  speed: number;
}

interface SignalJunction {
  id: number;
  name: string;
  position: [number, number];
  type: string;
  status: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function EmergencyVehicleManagement() {
  const [vehicles, setVehicles] = useState<EmergencyVehicle[]>([]);
  const [signalsJunctions, setSignalsJunctions] = useState<SignalJunction[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicle_type: "ambulance",
    starting_lat: "",
    starting_lng: "",
    destination_lat: "",
    destination_lng: "",
    eta: "5 min",
    speed: "60",
  });

  useEffect(() => {
    loadData();
    // Updates every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [vehiclesRes, signalsRes] = await Promise.all([
        fetch(`${API_BASE}/api/emergency-vehicles`),
        fetch(`${API_BASE}/api/signals-junctions`),
      ]);

      if (!vehiclesRes.ok) {
        throw new Error(`Failed to load vehicles: ${vehiclesRes.status} ${vehiclesRes.statusText}`);
      }

      if (!signalsRes.ok) {
        throw new Error(`Failed to load signals: ${signalsRes.status} ${signalsRes.statusText}`);
      }

      const vehiclesData = await vehiclesRes.json();
      const signalsData = await signalsRes.json();

      setVehicles(vehiclesData.vehicles || []);
      setSignalsJunctions(signalsData.signals_junctions || []);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError(error.message || "Failed to load data. Please check if the backend API is running.");
      setLoading(false);
    }
  };

  const calculateRoute = (start: [number, number], dest: [number, number]): [number, number][] => {
    // Simple route calculation - in production, use routing API
    const steps = 10;
    const route: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      route.push([
        start[0] + (dest[0] - start[0]) * t,
        start[1] + (dest[1] - start[1]) * t,
      ]);
    }
    return route;
  };

  const findSignalsOnRoute = (route: [number, number][], signals: SignalJunction[]): number[] => {
    // Find signals that are near the route (within 0.01 degrees ~ 1km)
    const threshold = 0.01;
    const signalIds: number[] = [];

    signals.forEach((signal) => {
      const signalPos = signal.position;
      for (const routePoint of route) {
        const distance = Math.sqrt(
          Math.pow(signalPos[0] - routePoint[0], 2) + Math.pow(signalPos[1] - routePoint[1], 2)
        );
        if (distance < threshold) {
          signalIds.push(signal.id);
          break;
        }
      }
    });

    return signalIds;
  };

  const handleCreateVehicle = async () => {
    try {
      const starting_point: [number, number] = [
        parseFloat(formData.starting_lat),
        parseFloat(formData.starting_lng),
      ];
      const destination: [number, number] = [
        parseFloat(formData.destination_lat),
        parseFloat(formData.destination_lng),
      ];

      const route = calculateRoute(starting_point, destination);
      const signals_on_route = findSignalsOnRoute(route, signalsJunctions);

      const response = await fetch(`${API_BASE}/api/emergency-vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_type: formData.vehicle_type,
          starting_point,
          destination,
          route,
          signals_on_route,
          eta: formData.eta,
          speed: parseInt(formData.speed),
        }),
      });

      if (response.ok) {
        toast.success("Emergency vehicle route created");
        setShowCreateForm(false);
        setFormData({
          vehicle_type: "ambulance",
          starting_lat: "",
          starting_lng: "",
          destination_lat: "",
          destination_lng: "",
          eta: "5 min",
          speed: "60",
        });
        loadData();
      } else {
        toast.error("Failed to create vehicle route");
      }
    } catch (error) {
      toast.error("Error creating vehicle route");
      console.error(error);
    }
  };

  const handleActivateGreenCorridor = async (vehicleId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/emergency-vehicles/${vehicleId}/activate-green-corridor`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Green corridor activated");
        loadData();
      } else {
        toast.error("Failed to activate green corridor");
      }
    } catch (error) {
      toast.error("Error activating green corridor");
      console.error(error);
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm("Are you sure you want to delete this emergency vehicle route?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/emergency-vehicles/${vehicleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Vehicle route deleted");
        loadData();
      } else {
        toast.error("Failed to delete vehicle route");
      }
    } catch (error) {
      toast.error("Error deleting vehicle route");
      console.error(error);
    }
  };

  const handleStartTracking = (vehicleId: number) => {
    setSelectedVehicle(vehicleId);
    toast.info("Vehicle tracking started. Position will update automatically.");
  };

  const handleStopTracking = () => {
    setSelectedVehicle(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
              Emergency Vehicle Management
            </h1>
            <p className="text-muted-foreground">
              Manage emergency vehicle routes and green corridor control
            </p>
          </div>
        </div>
        <Card className="p-6 bg-card border-border">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading emergency vehicle data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
              Emergency Vehicle Management
            </h1>
            <p className="text-muted-foreground">
              Manage emergency vehicle routes and green corridor control
            </p>
          </div>
        </div>
        <Card className="p-6 bg-card border-destructive/50">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-semibold mb-2">Error Loading Data</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">
              Retry
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Make sure the backend API is running at {API_BASE}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-rajdhani font-bold text-foreground">
              Emergency Vehicle Management
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 border border-success/30 rounded-full">
              <Radio className="w-3 h-3 text-success animate-pulse" />
              <span className="text-xs font-semibold text-success">LIVE</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Real-time tracking and green corridor control for emergency vehicles
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {showCreateForm ? "Cancel" : "New Route"}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
            Create Emergency Vehicle Route
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Vehicle Type</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambulance">Ambulance</SelectItem>
                  <SelectItem value="fire_truck">Fire Truck</SelectItem>
                  <SelectItem value="police">Police Vehicle</SelectItem>
                  <SelectItem value="vip">VIP Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ETA</Label>
              <Input
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                placeholder="5 min"
              />
            </div>

            <div>
              <Label>Starting Point - Latitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.starting_lat}
                onChange={(e) => setFormData({ ...formData, starting_lat: e.target.value })}
                placeholder="28.6139"
              />
            </div>

            <div>
              <Label>Starting Point - Longitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.starting_lng}
                onChange={(e) => setFormData({ ...formData, starting_lng: e.target.value })}
                placeholder="77.2090"
              />
            </div>

            <div>
              <Label>Destination - Latitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.destination_lat}
                onChange={(e) => setFormData({ ...formData, destination_lat: e.target.value })}
                placeholder="28.6200"
              />
            </div>

            <div>
              <Label>Destination - Longitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.destination_lng}
                onChange={(e) => setFormData({ ...formData, destination_lng: e.target.value })}
                placeholder="77.2150"
              />
            </div>

            <div>
              <Label>Speed (km/h)</Label>
              <Input
                type="number"
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                placeholder="60"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreateVehicle}>Create Route</Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Signals and Junctions List */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Signals & Junctions ({signalsJunctions.length})
        </h3>
        {signalsJunctions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No signals/junctions found. They will be initialized automatically when you create your first route.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {signalsJunctions.map((signal) => (
            <div
              key={signal.id}
              className="p-3 bg-secondary rounded-lg border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{signal.name}</span>
                <Badge
                  variant={
                    signal.status === "green"
                      ? "default"
                      : signal.status === "red"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {signal.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <div>Type: {signal.type}</div>
                <div>
                  Coordinates: {signal.position[0].toFixed(4)}, {signal.position[1].toFixed(4)}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </Card>

      {/* Active Vehicles */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Active Emergency Vehicles ({vehicles.length})
        </h3>
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="p-4 bg-secondary rounded-lg border border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="font-semibold text-foreground">
                      {vehicle.vehicle_type.toUpperCase()} - Route #{vehicle.id}
                    </span>
                    <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        Start: {vehicle.starting_point[0].toFixed(4)}, {vehicle.starting_point[1].toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      <span>
                        Dest: {vehicle.destination[0].toFixed(4)}, {vehicle.destination[1].toFixed(4)}
                      </span>
                    </div>
                    <div>
                      Current: {vehicle.current_position[0].toFixed(4)}, {vehicle.current_position[1].toFixed(4)}
                    </div>
                    <div>ETA: {vehicle.eta} | Speed: {vehicle.speed} km/h</div>
                    <div>Signals on Route: {vehicle.signals_on_route.length}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedVehicle === vehicle.id ? (
                    <Button variant="outline" size="sm" onClick={handleStopTracking}>
                      <Square className="w-4 h-4 mr-2" />
                      Stop Tracking
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleStartTracking(vehicle.id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Track
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivateGreenCorridor(vehicle.id)}
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Activate Green Corridor
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active emergency vehicles. Create a new route to get started.
            </div>
          )}
        </div>
      </Card>

      {/* Map View */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Live Tracking Map
        </h3>
        <TrafficMap isPublic={false} selectedVehicleId={selectedVehicle} />
      </Card>
    </div>
  );
}
