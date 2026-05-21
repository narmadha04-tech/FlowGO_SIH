import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Play, Pause, Download, Settings2, Camera } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Detection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DetectionFrame {
  timestamp: number;
  camera_id: string;
  approach: string;
  total_vehicles: number;
  detections: Detection[];
  class_counts: Record<string, number>;
  avg_confidence: number;
}

export function CameraFeedWithOverlay() {
  const [selectedCamera, setSelectedCamera] = useState("CAM-001");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfidence, setShowConfidence] = useState(true);
  const [detectionData, setDetectionData] = useState<DetectionFrame | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  // Color map for different vehicle classes
  const classColors: Record<string, string> = {
    car: "#3B82F6", // Blue
    truck: "#EF4444", // Red
    bus: "#10B981", // Green
    motorcycle: "#F59E0B", // Amber
    bicycle: "#8B5CF6", // Purple
    person: "#EC4899", // Pink
    unknown: "#6B7280", // Gray
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/emergency-vehicles`);
      if (res.ok) {
        // In real scenario, fetch actual cameras
        setCameras([
          { id: "CAM-001", location: "Junction 12", status: "online" },
          { id: "CAM-002", location: "Main St & Park Ave", status: "online" },
          { id: "CAM-003", location: "Highway Exit 7", status: "offline" },
        ]);
      }
    } catch (error) {
      console.error("Failed to load cameras:", error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsPlaying(true);

        // Capture and process frames every 3 seconds
        streamIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const ctx = canvas.getContext("2d");

            if (ctx && video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);

              canvas.toBlob(async (blob) => {
                if (blob) {
                  const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
                  await processFrame(file);
                }
              }, "image/jpeg", 0.85);
            }
          }
        }, 3000);
      }
    } catch (error) {
      toast.error("Could not access webcam");
      console.error(error);
    }
  };

  const stopCamera = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsPlaying(false);
  };

  const processFrame = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("camera_id", selectedCamera);
      formData.append("approach", "unknown");

      const response = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const frameData: DetectionFrame = {
          timestamp: result.timestamp || Date.now(),
          camera_id: result.camera_id,
          approach: result.approach,
          total_vehicles: result.total_vehicles,
          detections: result.detections || [],
          class_counts: result.class_counts || {},
          avg_confidence: result.avg_confidence || 0,
        };
        setDetectionData(frameData);
        drawOverlay(frameData);
      }
    } catch (error) {
      console.error("Frame processing error:", error);
    }
  };

  const drawOverlay = (frameData: DetectionFrame) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;

    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detections
    frameData.detections.forEach((detection, index) => {
      const { bbox, class_name, confidence, x1, y1, x2, y2 } = detection;
      
      // Use bbox or x1,y1,x2,y2 coordinates
      const [startX, startY, endX, endY] = bbox || [x1, y1, x2, y2];
      const width = endX - startX;
      const height = endY - startY;

      // Get color for this class
      const color = classColors[class_name.toLowerCase()] || classColors.unknown;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(startX, startY, width, height);

      // Draw filled rectangle for label background
      const label = `${class_name} ${(confidence * 100).toFixed(0)}%`;
      const font = "14px Arial";
      ctx.font = font;
      const textMetrics = ctx.measureText(label);
      const textHeight = 20;
      const textPadding = 4;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(
        startX,
        startY - textHeight - textPadding * 2,
        textMetrics.width + textPadding * 2,
        textHeight + textPadding * 2
      );
      ctx.globalAlpha = 1;

      // Draw label text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Arial";
      ctx.textBaseline = "top";
      ctx.fillText(label, startX + textPadding, startY - textHeight - textPadding);

      // Draw confidence bar below label
      if (showConfidence) {
        const barWidth = 60;
        const barHeight = 4;
        ctx.fillStyle = "#666666";
        ctx.fillRect(startX, startY - 4, barWidth, barHeight);
        ctx.fillStyle = confidence > 0.8 ? "#10B981" : confidence > 0.6 ? "#F59E0B" : "#EF4444";
        ctx.fillRect(startX, startY - 4, barWidth * confidence, barHeight);
      }
    });

    // Draw statistics
    drawStatistics(ctx, frameData, canvas.width, canvas.height);
  };

  const drawStatistics = (ctx: CanvasRenderingContext2D, frameData: DetectionFrame, width: number, height: number) => {
    const statsX = 10;
    const statsY = 10;
    const lineHeight = 22;

    // Draw semi-transparent background for stats
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(statsX, statsY, 250, 140);

    // Draw text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`${frameData.total_vehicles} Vehicles Detected`, statsX + 10, statsY + 20);

    ctx.font = "12px Arial";
    ctx.fillText(`Confidence: ${(frameData.avg_confidence * 100).toFixed(1)}%`, statsX + 10, statsY + 45);
    ctx.fillText(`Camera: ${frameData.camera_id}`, statsX + 10, statsY + 65);
    ctx.fillText(`Time: ${new Date(frameData.timestamp).toLocaleTimeString()}`, statsX + 10, statsY + 85);

    // Draw class breakdown
    let classY = statsY + 110;
    ctx.font = "11px Arial";
    Object.entries(frameData.class_counts).slice(0, 3).forEach(([className, count]) => {
      ctx.fillText(`${className}: ${count}`, statsX + 10, classY);
      classY += 15;
    });

    // Draw alerts if confidence is low
    if (frameData.avg_confidence < 0.6) {
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(width - 160, 10, 150, 50);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Arial";
      ctx.fillText("⚠ LOW CONFIDENCE", width - 150, 25);
      ctx.font = "12px Arial";
      ctx.fillText("Check camera alignment", width - 150, 43);
    }
  };

  const downloadFrame = () => {
    if (overlayCanvasRef.current) {
      const link = document.createElement("a");
      link.href = overlayCanvasRef.current.toDataURL("image/png");
      link.download = `traffic-detection-${Date.now()}.png`;
      link.click();
      toast.success("Frame downloaded");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Live Camera Feed with Overlay
          </h1>
          <p className="text-muted-foreground">
            Real-time vehicle detection with visual annotations
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Camera</label>
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((cam) => (
                <SelectItem key={cam.id} value={cam.id}>
                  {cam.id} - {cam.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={isPlaying ? stopCamera : startCamera}
            className={isPlaying ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"}
            size="lg"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Stop Feed
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Feed
              </>
            )}
          </Button>
        </div>

        <div className="flex items-end justify-end gap-2">
          <Button variant="outline" size="sm" onClick={downloadFrame} disabled={!detectionData}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfidence(!showConfidence)}
            className={showConfidence ? "bg-primary/10" : ""}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-card border-border overflow-hidden relative">
        <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
          {/* Video element (hidden, used for capture) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full"
            style={{ display: "none" }}
          />

          {/* Canvas for capture (hidden) */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Overlay canvas (visible) */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: isPlaying ? "transparent" : "#1a1f2e" }}
          />

          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <Camera className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click "Start Feed" to begin detection</p>
            </div>
          )}
        </div>
      </Card>

      {/* Detection Statistics */}
      {detectionData && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
            <p className="text-3xl font-rajdhani font-bold text-foreground">
              {detectionData.total_vehicles}
            </p>
          </Card>

          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">Avg Confidence</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-rajdhani font-bold text-foreground">
                {(detectionData.avg_confidence * 100).toFixed(0)}%
              </p>
              <Badge
                variant={
                  detectionData.avg_confidence > 0.8
                    ? "default"
                    : detectionData.avg_confidence > 0.6
                      ? "secondary"
                      : "destructive"
                }
              >
                {detectionData.avg_confidence > 0.8
                  ? "High"
                  : detectionData.avg_confidence > 0.6
                    ? "Med"
                    : "Low"}
              </Badge>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">Camera</p>
            <p className="text-2xl font-rajdhani font-bold text-foreground">
              {detectionData.camera_id}
            </p>
          </Card>

          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
            <p className="text-sm text-foreground">
              {new Date(detectionData.timestamp).toLocaleTimeString()}
            </p>
          </Card>
        </div>
      )}

      {/* Class Breakdown */}
      {detectionData && Object.keys(detectionData.class_counts).length > 0 && (
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
            Vehicle Type Breakdown
          </h3>
          <div className="grid md:grid-cols-6 gap-4">
            {Object.entries(detectionData.class_counts).map(([className, count]) => (
              <div key={className} className="text-center">
                <div
                  className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: classColors[className.toLowerCase()] + "30" }}
                >
                  <span className="text-sm font-bold" style={{ color: classColors[className.toLowerCase()] }}>
                    {count}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground capitalize">{className}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-4 bg-accent/10 border-accent/20">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">How it works:</p>
            <ul className="text-muted-foreground text-xs mt-2 space-y-1">
              <li>• Click "Start Feed" to access your webcam</li>
              <li>• System captures frames every 3 seconds and runs YOLOv8 detection</li>
              <li>• Bounding boxes show detected vehicles with class and confidence score</li>
              <li>• Color-coded by vehicle type for quick identification</li>
              <li>• Download frames for incident documentation</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
