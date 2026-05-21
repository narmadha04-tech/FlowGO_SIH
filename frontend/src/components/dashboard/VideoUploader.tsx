import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Play, Loader2, CheckCircle, AlertCircle, X, Video, FileVideo, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface VideoAnalysis {
  video_id: string;
  filename: string;
  duration_seconds: number;
  upload_timestamp: string;
  analysis_status: "pending" | "processing" | "completed" | "failed";
  progress_percentage: number;
  congestion_rate: number;
  avg_vehicle_density: number;
  avg_speed_kmh: number;
  total_incidents: number;
  predicted_congestion: number;
}

export function VideoUploader() {
  const [videos, setVideos] = useState<VideoAnalysis[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      // 500MB limit
      toast.error("Video file too large. Maximum size is 500MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const newVideo: VideoAnalysis = {
            video_id: response.video_id,
            filename: file.name,
            duration_seconds: response.duration || 0,
            upload_timestamp: new Date().toISOString(),
            analysis_status: "pending",
            progress_percentage: 0,
            congestion_rate: 0,
            avg_vehicle_density: 0,
            avg_speed_kmh: 0,
            total_incidents: 0,
            predicted_congestion: 0,
          };

          setVideos((prev) => [newVideo, ...prev]);
          setSelectedVideo(newVideo);
          toast.success("Video uploaded! Analysis starting...");

          // Start polling for analysis progress
          pollAnalysisProgress(response.video_id);
        }
      });

      xhr.addEventListener("error", () => {
        toast.error("Upload failed. Please try again.");
        setIsUploading(false);
      });

      xhr.open("POST", `${API_BASE}/api/video/upload`);
      xhr.send(formData);
    } catch (error) {
      toast.error("Error uploading video");
      setIsUploading(false);
    }
  };

  const pollAnalysisProgress = async (videoId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/video/analysis/${videoId}`
        );
        if (response.ok) {
          const data = await response.json();

          setVideos((prev) =>
            prev.map((v) =>
              v.video_id === videoId
                ? {
                    ...v,
                    analysis_status: data.status,
                    progress_percentage: data.progress,
                    congestion_rate: data.results?.congestion_rate || 0,
                    avg_vehicle_density:
                      data.results?.avg_vehicle_density || 0,
                    avg_speed_kmh: data.results?.avg_speed_kmh || 0,
                    total_incidents: data.results?.total_incidents || 0,
                    predicted_congestion:
                      data.results?.predicted_congestion || 0,
                  }
                : v
            )
          );

          setSelectedVideo((prev) =>
            prev?.video_id === videoId
              ? {
                  ...prev,
                  analysis_status: data.status,
                  progress_percentage: data.progress,
                  congestion_rate: data.results?.congestion_rate || 0,
                  avg_vehicle_density:
                    data.results?.avg_vehicle_density || 0,
                  avg_speed_kmh: data.results?.avg_speed_kmh || 0,
                  total_incidents: data.results?.total_incidents || 0,
                  predicted_congestion:
                    data.results?.predicted_congestion || 0,
                }
              : prev
          );

          if (data.status === "completed" || data.status === "failed") {
            clearInterval(interval);
            if (data.status === "completed") {
              toast.success("Video analysis completed!");
            } else {
              toast.error("Video analysis failed");
            }
          }
        }
      } catch (error) {
        console.error("Error polling analysis progress:", error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-primary", "bg-primary/5");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "processing":
        return (
          <Badge className="bg-blue-500">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
          </Badge>
        );
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Video Congestion Analysis
          </h1>
          <p className="text-muted-foreground">
            Upload traffic video clips for AI-powered congestion analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
          <TabsTrigger value="history">Analysis History</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Upload Panel */}
            <div className="md:col-span-1">
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
                  Upload Video
                </h3>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-all cursor-pointer hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">
                    Drag video here or click
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports MP4, MOV, AVI (Max 500MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {isUploading && (
                  <div className="mt-4">
                    <p className="text-sm text-foreground mb-2">
                      Uploading: {uploadProgress}%
                    </p>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-xs text-foreground font-medium mb-2">
                    Analysis includes:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Incident detection (accidents, violations)</li>
                    <li>✓ Congestion rate calculation</li>
                    <li>✓ Vehicle density & speed analysis</li>
                    <li>✓ Trend prediction</li>
                    <li>✓ Heatmap generation</li>
                  </ul>
                </div>
              </Card>
            </div>

            {/* Analysis Display Panel */}
            <div className="md:col-span-2">
              {selectedVideo ? (
                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-rajdhani font-semibold text-foreground">
                        {selectedVideo.filename}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedVideo.duration_seconds}s duration
                      </p>
                    </div>
                    {getStatusBadge(selectedVideo.analysis_status)}
                  </div>

                  {selectedVideo.analysis_status === "processing" && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-foreground">Analysis Progress</p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedVideo.progress_percentage}%
                        </p>
                      </div>
                      <Progress
                        value={selectedVideo.progress_percentage}
                        className="h-2"
                      />
                    </div>
                  )}

                  {selectedVideo.analysis_status === "completed" && (
                    <div className="space-y-4">
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-secondary rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Congestion Rate
                          </p>
                          <p className="text-2xl font-rajdhani font-bold text-foreground">
                            {selectedVideo.congestion_rate.toFixed(1)}%
                          </p>
                        </div>

                        <div className="p-3 bg-secondary rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Vehicle Density
                          </p>
                          <p className="text-2xl font-rajdhani font-bold text-foreground">
                            {selectedVideo.avg_vehicle_density.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            vehicles/100m²
                          </p>
                        </div>

                        <div className="p-3 bg-secondary rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Avg Speed
                          </p>
                          <p className="text-2xl font-rajdhani font-bold text-foreground">
                            {selectedVideo.avg_speed_kmh.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">km/h</p>
                        </div>

                        <div className="p-3 bg-secondary rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Incidents Detected
                          </p>
                          <p className="text-2xl font-rajdhani font-bold text-destructive">
                            {selectedVideo.total_incidents}
                          </p>
                        </div>
                      </div>

                      {/* Prediction */}
                      <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Predicted Future Congestion
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-red-500"
                                style={{
                                  width: `${selectedVideo.predicted_congestion}%`,
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-lg font-rajdhani font-bold text-foreground">
                            {selectedVideo.predicted_congestion.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-primary hover:bg-primary/90">
                          <Play className="w-4 h-4 mr-2" />
                          View Analysis
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedVideo.analysis_status === "failed" && (
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">
                        Analysis failed. Please try uploading the video again.
                      </p>
                    </div>
                  )}

                  {selectedVideo.analysis_status === "pending" && (
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Video queued for analysis. Please wait...
                      </p>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-6 bg-card border-border h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileVideo className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Upload a video to see analysis results
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Uploaded Videos
            </h3>

            {videos.length > 0 ? (
              <div className="space-y-3">
                {videos.map((video) => (
                  <div
                    key={video.video_id}
                    onClick={() => setSelectedVideo(video)}
                    className="p-4 bg-secondary rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {video.filename}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {video.duration_seconds}s
                          </span>
                          {video.analysis_status === "completed" && (
                            <>
                              <span>
                                Congestion: {video.congestion_rate.toFixed(1)}%
                              </span>
                              <span>
                                Incidents: {video.total_incidents}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(video.analysis_status)}
                        {video.analysis_status === "processing" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {video.progress_percentage}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No videos uploaded yet</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Missing import - add Download icon
import { Download } from "lucide-react";
