import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { TrafficCone, Power, Settings, Play, Pause } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function SignalManagement() {
  const { data } = useMonitoringData();
  const signals = data?.signals ?? [];
  const [controlMode, setControlMode] = useState<Record<string, "auto" | "manual">>({});
  const [manualTiming, setManualTiming] = useState<Record<string, string>>({});
  
  const handleModeChange = (signalId: string, mode: "auto" | "manual") => {
    setControlMode(prev => ({ ...prev, [signalId]: mode }));
    toast.success(`Signal ${signalId} set to ${mode} mode`);
    // In production, this would call the API to update signal control
  };
  
  const handleTimingUpdate = (signalId: string, timing: string) => {
    setManualTiming(prev => ({ ...prev, [signalId]: timing }));
    toast.success(`Signal ${signalId} timing updated to ${timing}s`);
    // In production, this would call the API to update signal timing
  };
  
  const handleEmergencyOverride = (signalId: string) => {
    toast.warning(`Emergency override activated for ${signalId}`);
    // In production, this would trigger emergency signal sequence
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Signal Management
          </h1>
          <p className="text-muted-foreground">
            Control and monitor all traffic signals
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-rajdhani">
          <Settings className="w-4 h-4 mr-2" />
          Configure All
        </Button>
      </div>

      <div className="grid gap-4">
        {signals.map((signal) => (
          <Card key={signal.id} className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  signal.status === "active" ? "bg-success/10" : "bg-warning/10"
                }`}>
                  <TrafficCone className={`w-6 h-6 ${
                    signal.status === "active" ? "text-success" : "text-warning"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="font-rajdhani font-semibold text-lg text-foreground">
                      {signal.id}
                    </h3>
                    <Badge variant={signal.status === "active" ? "default" : "secondary"}>
                      {signal.status}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {signal.mode}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{signal.location}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right mr-6">
                  <p className="text-sm text-muted-foreground">Cycle Time</p>
                  <p className="text-xl font-rajdhani font-bold text-foreground">{signal.timing}</p>
                  {signal.queue !== undefined && (
                    <p className="text-xs text-muted-foreground">{signal.queue} vehicles waiting</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-border">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Control Signal {signal.id}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Control Mode</Label>
                          <Select
                            value={controlMode[signal.id] || signal.mode}
                            onValueChange={(value) => handleModeChange(signal.id, value as "auto" | "manual")}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto (AI Optimized)</SelectItem>
                              <SelectItem value="manual">Manual Control</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(controlMode[signal.id] === "manual" || signal.mode === "manual") && (
                          <div>
                            <Label>Cycle Time (seconds)</Label>
                            <Input
                              type="number"
                              placeholder={signal.timing.replace("s", "")}
                              value={manualTiming[signal.id] || signal.timing.replace("s", "")}
                              onChange={(e) => setManualTiming(prev => ({ ...prev, [signal.id]: e.target.value }))}
                              min="10"
                              max="120"
                            />
                            <Button
                              className="mt-2 w-full"
                              onClick={() => handleTimingUpdate(signal.id, `${manualTiming[signal.id] || signal.timing.replace("s", "")}s`)}
                            >
                              Update Timing
                            </Button>
                          </div>
                        )}
                        <div className="pt-4 border-t">
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleEmergencyOverride(signal.id)}
                          >
                            <Power className="w-4 h-4 mr-2" />
                            Emergency Override
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border"
                    onClick={() => handleModeChange(signal.id, controlMode[signal.id] === "auto" ? "manual" : "auto")}
                  >
                    {controlMode[signal.id] === "manual" || signal.mode === "manual" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {!signals.length && (
          <Card className="p-6 bg-secondary text-sm text-muted-foreground">
            Awaiting signal telemetry. Start the monitoring server to stream live data.
          </Card>
        )}
      </div>
    </div>
  );
}
