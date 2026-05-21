import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Heart, AlertCircle, Download, Play, Pause } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Incident {
  id: string;
  type: "accident" | "lane_violation" | "illegal_parking" | "speeding";
  timestamp: number;
  frame_index: number;
  confidence: number;
  location: { x: number; y: number };
  description: string;
}

interface AnalysisResult {
  video_id: string;
  filename: string;
  congestion_rate: number;
  avg_vehicle_density: number;
  avg_speed_kmh: number;
  total_incidents: number;
  predicted_congestion: number;
  incidents: Incident[];
  congestion_timeline: Array<{ frame: number; congestion: number }>;
  density_timeline: Array<{ frame: number; density: number }>;
  speed_timeline: Array<{ frame: number; speed: number }>;
}

interface VideoAnalysisVisualizerProps {
  videoId: string;
}

export function VideoAnalysisVisualizer({
  videoId,
}: VideoAnalysisVisualizerProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/video/analysis/${videoId}`
        );
        if (response.ok) {
          const data = await response.json();
          setAnalysisData(data.results);
        }
      } catch (error) {
        toast.error("Failed to fetch analysis data");
      }
    };

    fetchAnalysis();
  }, [videoId]);

  useEffect(() => {
    if (!isPlaying || !analysisData) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % 300); // Assume 300 frames
    }, 33); // ~30fps

    return () => clearInterval(interval);
  }, [isPlaying, analysisData]);

  const getRiskColor = (congestion: number) => {
    if (congestion > 70) return "#ef4444"; // Red
    if (congestion > 40) return "#eab308"; // Yellow
    return "#22c55e"; // Green
  };

  const getIncidentColor = (type: string) => {
    switch (type) {
      case "accident":
        return "#dc2626"; // Red
      case "lane_violation":
        return "#ea580c"; // Orange
      case "illegal_parking":
        return "#eab308"; // Yellow
      case "speeding":
        return "#06b6d4"; // Cyan
      default:
        return "#8b5cf6"; // Purple
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case "accident":
        return "🚗💥";
      case "lane_violation":
        return "⚠️";
      case "illegal_parking":
        return "🚫";
      case "speeding":
        return "⚡";
      default:
        return "❓";
    }
  };

  const incidentsForFrame =
    analysisData?.incidents.filter(
      (i) => Math.abs(i.frame_index - currentFrame) < 5
    ) || [];

  const congestionTrend =
    analysisData?.congestion_timeline.map((item, idx) => ({
      ...item,
      frameTime: `${(item.frame * 0.033).toFixed(1)}s`,
    })) || [];

  const densityTrend =
    analysisData?.density_timeline.map((item, idx) => ({
      ...item,
      frameTime: `${(item.frame * 0.033).toFixed(1)}s`,
    })) || [];

  const speedTrend =
    analysisData?.speed_timeline.map((item, idx) => ({
      ...item,
      frameTime: `${(item.frame * 0.033).toFixed(1)}s`,
    })) || [];

  const getRiskLevel = (congestion: number) => {
    if (congestion > 70) return { label: "High Risk", color: "bg-red-500" };
    if (congestion > 40) return { label: "Medium Risk", color: "bg-yellow-500" };
    return { label: "Low Risk", color: "bg-green-500" };
  };

  if (!analysisData) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading analysis data...</p>
        </div>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(analysisData.congestion_rate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-rajdhani font-bold text-foreground">
            {analysisData.filename}
          </h2>
          <p className="text-muted-foreground mt-1">
            Video Congestion Analysis Report
          </p>
        </div>
        <Badge className={`${riskLevel.color} text-white`}>
          {riskLevel.label}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-xs text-muted-foreground mb-1">Congestion Rate</p>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {analysisData.congestion_rate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {analysisData.congestion_rate > 50
              ? "🔴 High"
              : analysisData.congestion_rate > 25
                ? "🟡 Moderate"
                : "🟢 Low"}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <p className="text-xs text-muted-foreground mb-1">Vehicle Density</p>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {analysisData.avg_vehicle_density.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">vehicles/100m²</p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <p className="text-xs text-muted-foreground mb-1">Average Speed</p>
          <p className="text-3xl font-rajdhani font-bold text-foreground">
            {analysisData.avg_speed_kmh.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">km/h</p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <p className="text-xs text-muted-foreground mb-1">
            Incidents Detected
          </p>
          <p className="text-3xl font-rajdhani font-bold text-destructive">
            {analysisData.total_incidents}
          </p>
          <p className="text-xs text-muted-foreground mt-2">events</p>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Event Timeline</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
        </TabsList>

        {/* Event Timeline Tab */}
        <TabsContent value="timeline">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Video Viewer */}
            <div className="md:col-span-2">
              <Card className="p-4 bg-card border-border">
                <div className="bg-black rounded-lg aspect-video flex items-center justify-center mb-4 relative overflow-hidden">
                  <canvas
                    ref={videoCanvasRef}
                    className="w-full h-full"
                    style={{ display: "block" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="absolute top-4 right-4 px-3 py-1 bg-black/50 rounded text-white text-sm font-rajdhani"
                      style={{
                        background: `${getRiskColor(analysisData.congestion_rate)}80`,
                      }}
                    >
                      {analysisData.congestion_rate.toFixed(1)}% Congestion
                    </div>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentFrame(0)}
                    >
                      Reset
                    </Button>
                  </div>

                  <div>
                    <input
                      type="range"
                      min="0"
                      max="300"
                      value={currentFrame}
                      onChange={(e) => {
                        setCurrentFrame(Number(e.target.value));
                        setIsPlaying(false);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Frame {currentFrame}</span>
                      <span>~{(currentFrame * 0.033).toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Incidents List */}
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-4">
                Incidents ({analysisData.total_incidents})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysisData.incidents.length > 0 ? (
                  analysisData.incidents.map((incident) => (
                    <div
                      key={incident.id}
                      onClick={() => {
                        setSelectedIncident(incident);
                        setCurrentFrame(incident.frame_index);
                      }}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all"
                      style={{
                        background: `${getIncidentColor(incident.type)}15`,
                        borderColor: getIncidentColor(incident.type),
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">
                          {getIncidentIcon(incident.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground capitalize">
                            {incident.type.replace("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {incident.timestamp.toFixed(1)}s
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Confidence: {(incident.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No incidents detected
                  </p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends">
          <div className="space-y-6">
            {/* Congestion Over Time */}
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-4">
                Congestion Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={congestionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="frameTime"
                    stroke="#888"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="congestion"
                    stroke="#ef4444"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Density & Speed */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4">
                  Vehicle Density
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={densityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="frameTime"
                      stroke="#888"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="density"
                      stroke="#3b82f6"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4">
                  Average Speed
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={speedTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="frameTime"
                      stroke="#888"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="speed"
                      stroke="#10b981"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap">
          <Card className="p-4 bg-card border-border">
            <h3 className="font-semibold text-foreground mb-4">
              Congestion Heatmap
            </h3>
            <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
              <canvas
                ref={heatmapCanvasRef}
                className="w-full h-full"
                style={{ display: "block" }}
              />
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Low (0-33%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span>Medium (33-66%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>High (66-100%)</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Prediction Tab */}
        <TabsContent value="prediction">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Prediction Metric */}
            <Card className="p-6 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-6">
                Future Congestion Prediction
              </h3>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Predicted in 1 hour
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-red-500"
                          style={{
                            width: `${analysisData.predicted_congestion}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-2xl font-rajdhani font-bold text-foreground">
                      {analysisData.predicted_congestion.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Current congestion
                  </p>
                  <p className="text-xl font-rajdhani font-bold text-foreground">
                    {analysisData.congestion_rate.toFixed(1)}%
                  </p>
                </div>

                {analysisData.predicted_congestion >
                  analysisData.congestion_rate ? (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-600">
                      Congestion expected to increase
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 flex gap-2">
                    <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-600">
                      Congestion expected to decrease
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Recommendations */}
            <Card className="p-6 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-6">
                Recommendations
              </h3>

              <div className="space-y-3">
                {analysisData.congestion_rate > 70 && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Activate emergency protocols
                    </p>
                    <p className="text-xs text-red-600/80 mt-1">
                      Congestion is critical. Consider diverting traffic.
                    </p>
                  </div>
                )}

                {analysisData.total_incidents > 5 && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <p className="text-sm font-medium text-orange-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      High incident rate detected
                    </p>
                    <p className="text-xs text-orange-600/80 mt-1">
                      {analysisData.total_incidents} incidents detected. Review
                      enforcement.
                    </p>
                  </div>
                )}

                {analysisData.avg_speed_kmh < 15 && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Very low average speed
                    </p>
                    <p className="text-xs text-yellow-600/80 mt-1">
                      Consider signal optimization for this segment.
                    </p>
                  </div>
                )}

                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export full report
                  </p>
                  <p className="text-xs text-blue-600/80 mt-1">
                    Generate PDF/CSV for stakeholder presentation.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
