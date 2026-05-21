import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { Camera, Maximize2, AlertCircle } from "lucide-react";

export function CameraPreview() {
  const { data } = useMonitoringData();
  const cameras = data?.cameras?.feeds ?? [];

  const onlineCount = cameras.filter((c) => c.status === "online").length;
  const offlineCount = cameras.length - onlineCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Live Camera Preview
          </h1>
          <p className="text-muted-foreground">
            Real-time video feed from traffic cameras
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="default" className="bg-success">
            {onlineCount} Online
          </Badge>
          <Badge variant="destructive">
            {offlineCount} Offline
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((camera) => (
          <Card key={camera.id} className="overflow-hidden bg-card border-border">
            <div className="relative aspect-video bg-secondary flex items-center justify-center">
              {camera.status === "online" ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <Camera className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Live Feed</p>
                  </div>
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                    <span className="text-xs text-foreground font-medium">REC</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-3 right-3 bg-background/50 hover:bg-background/80"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <AlertCircle className="w-12 h-12 text-destructive mb-2" />
                  <p className="text-sm text-destructive">Offline</p>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-rajdhani font-semibold text-foreground">{camera.id}</p>
                  <p className="text-sm text-muted-foreground">{camera.location}</p>
                </div>
                <Badge variant={camera.status === "online" ? "default" : "destructive"}>
                  {camera.status}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
        {!cameras.length && (
          <Card className="p-6 bg-secondary text-sm text-muted-foreground">
            Camera feeds will appear when the YOLO detector starts streaming counts.
          </Card>
        )}
      </div>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Camera Network Status
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Network Health</p>
            <div className="flex items-end space-x-2">
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                {((data?.cameras?.networkHealth ?? 0) * 100).toFixed(1)}%
              </p>
              <p className="text-success text-sm mb-1">Excellent</p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-success h-2 rounded-full" style={{ width: `${(data?.cameras?.networkHealth ?? 0) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Avg. Response Time</p>
            <p className="text-3xl font-rajdhani font-bold text-foreground">
              {data?.cameras?.avgResponseMs ?? "--"} ms
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Alerts Today</p>
            <p className="text-3xl font-rajdhani font-bold text-foreground">
              {data?.cameras?.alerts ?? 0}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
