import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Bot, User, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useMonitoringData } from "@/hooks/useMonitoringData";

export function GreenCorridor() {
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [localCorridors, setLocalCorridors] = useState([
    { id: 1, type: "Emergency", route: "City Hospital → Downtown", eta: "4 min", mode: "ai" as const },
    { id: 2, type: "VIP", route: "Airport → Convention Center", eta: "12 min", mode: "manual" as const },
  ]);
  const { data } = useMonitoringData();
  const activeCorridors = data?.corridors.active?.length ? data.corridors.active : localCorridors;

  const handleActivateCorridor = () => {
    toast.success(`Green Corridor activated in ${mode} mode`);
    if (!data?.corridors.active?.length) {
      const nextId = localCorridors.length + 1;
      setLocalCorridors([
        ...localCorridors,
        { id: nextId, type: "Emergency", route: "Adhoc Route", eta: "6 min", mode },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Green Corridor Control
          </h1>
          <p className="text-muted-foreground">
            Priority traffic management for emergency and VIP vehicles
          </p>
        </div>
      </div>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Control Mode
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("ai")}
            className={`p-6 rounded-lg border-2 transition-all ${
              mode === "ai"
                ? "border-primary bg-primary/5 glow-primary"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="font-rajdhani font-semibold text-foreground">AI Mode</h4>
                <p className="text-sm text-muted-foreground">Automatic route optimization</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("manual")}
            className={`p-6 rounded-lg border-2 transition-all ${
              mode === "manual"
                ? "border-accent bg-accent/5 glow-accent"
                : "border-border hover:border-accent/30"
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <h4 className="font-rajdhani font-semibold text-foreground">Manual Mode</h4>
                <p className="text-sm text-muted-foreground">Operator-controlled routing</p>
              </div>
            </div>
          </button>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Activate New Corridor
        </h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Vehicle Type</label>
            <Select>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emergency">Emergency (Ambulance)</SelectItem>
                <SelectItem value="fire">Fire Brigade</SelectItem>
                <SelectItem value="police">Police</SelectItem>
                <SelectItem value="vip">VIP Convoy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Start Point</label>
            <Select>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hospital">City Hospital</SelectItem>
                <SelectItem value="airport">International Airport</SelectItem>
                <SelectItem value="station">Central Station</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Destination</label>
            <Select>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downtown">Downtown</SelectItem>
                <SelectItem value="convention">Convention Center</SelectItem>
                <SelectItem value="govt">Government Complex</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={handleActivateCorridor}
          className="w-full bg-success hover:bg-success/90 text-success-foreground font-rajdhani font-semibold glow-success"
        >
          <Zap className="w-4 h-4 mr-2" />
          Activate Green Corridor
        </Button>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Active Corridors
        </h3>
        <div className="space-y-4">
          {activeCorridors.map((corridor) => (
            <div key={corridor.id} className="p-4 bg-secondary rounded-lg border border-success/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="default" className="bg-success">
                        {corridor.type}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {corridor.mode}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground font-medium">{corridor.route}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center text-muted-foreground text-sm mb-1">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>ETA</span>
                    </div>
                    <p className="text-lg font-rajdhani font-bold text-foreground">{corridor.eta}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-border">
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!activeCorridors.length && (
            <p className="text-sm text-muted-foreground">No active corridors. Activate one above.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
