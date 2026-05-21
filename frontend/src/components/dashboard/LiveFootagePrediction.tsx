import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Play, Square, Camera, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_MONITORING_API ?? "http://localhost:8000";

interface Detection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface PredictionResult {
  camera_id: string;
  approach: string;
  timestamp: number;
  total_vehicles: number;
  detections: Detection[];
  class_counts: Record<string, number>;
  avg_confidence: number;
  frame_encoded?: string;
}

export function LiveFootagePrediction() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraId, setCameraId] = useState("CAM-001");
  const [approach, setApproach] = useState("north");
  const [isProcessing, setIsProcessing] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPrediction(null);
    } else {
      toast.error("Please select an image file");
    }
  };

  const processFrame = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("camera_id", cameraId);
      formData.append("approach", approach);
      formData.append("draw_boxes", "true");

      const response = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result: PredictionResult = await response.json();
      setPrediction(result);
      toast.success(`Detected ${result.total_vehicles} vehicles`);
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) {
      toast.error("Please select an image file first");
      return;
    }
    await processFrame(selectedFile);
  };

  const startWebcamStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);

        // Capture and process frames every 2 seconds
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
              }, "image/jpeg", 0.8);
            }
          }
        }, 2000);
      }
    } catch (error) {
      toast.error("Could not access webcam. Please check permissions.");
      console.error(error);
    }
  };

  const stopWebcamStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Live Footage Prediction
          </h1>
          <p className="text-muted-foreground">
            Upload images or stream webcam for real-time vehicle detection
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
            Upload Image
          </h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select Image File</Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="camera-id">Camera ID</Label>
                <Input
                  id="camera-id"
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                  placeholder="CAM-001"
                />
              </div>
              <div>
                <Label htmlFor="approach">Approach</Label>
                <Select value={approach} onValueChange={setApproach}>
                  <SelectTrigger id="approach">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North</SelectItem>
                    <SelectItem value="east">East</SelectItem>
                    <SelectItem value="south">South</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handlePredict}
              disabled={!selectedFile || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Predict Vehicles
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Webcam Stream Section */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
            Live Webcam Stream
          </h3>
          <div className="space-y-4">
            <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: isStreaming ? "block" : "none" }}
              />
              <canvas ref={canvasRef} className="hidden" />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isStreaming ? (
                <Button onClick={startWebcamStream} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Start Stream
                </Button>
              ) : (
                <Button onClick={stopWebcamStream} variant="destructive" className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Stream
                </Button>
              )}
            </div>
            {isStreaming && (
              <p className="text-sm text-muted-foreground text-center">
                Processing frames every 2 seconds...
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Prediction Results */}
      {prediction && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-rajdhani font-semibold text-foreground">
              Detection Results
            </h3>
            <Badge variant="default" className="bg-success">
              {prediction.total_vehicles} Vehicles Detected
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Annotated Image */}
            {prediction.frame_encoded && (
              <div>
                <Label className="mb-2 block">Annotated Frame</Label>
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={`data:image/jpeg;base64,${prediction.frame_encoded}`}
                    alt="Detection result"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Vehicle Counts by Type</Label>
                <div className="space-y-2">
                  {Object.entries(prediction.class_counts).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <span className="capitalize font-medium">{type}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-muted-foreground">Avg Confidence</Label>
                  <p className="text-2xl font-rajdhani font-bold text-foreground">
                    {(prediction.avg_confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Camera</Label>
                  <p className="text-lg font-rajdhani font-semibold text-foreground">
                    {prediction.camera_id}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Individual Detections
                </Label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {prediction.detections.map((det, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-secondary rounded text-sm"
                    >
                      <span className="capitalize">{det.class_name}</span>
                      <span className="text-muted-foreground">
                        {(det.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {prediction.detections.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No vehicles detected
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      {prediction && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-rajdhani font-bold text-foreground">
                  {prediction.total_vehicles}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div>
              <p className="text-sm text-muted-foreground">Cars</p>
              <p className="text-2xl font-rajdhani font-bold text-foreground">
                {prediction.class_counts.car || 0}
              </p>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div>
              <p className="text-sm text-muted-foreground">Trucks</p>
              <p className="text-2xl font-rajdhani font-bold text-foreground">
                {prediction.class_counts.truck || 0}
              </p>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div>
              <p className="text-sm text-muted-foreground">Buses</p>
              <p className="text-2xl font-rajdhani font-bold text-foreground">
                {prediction.class_counts.bus || 0}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

