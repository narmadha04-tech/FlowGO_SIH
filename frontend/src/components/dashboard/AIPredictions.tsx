import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { 
  Brain, TrendingUp, AlertTriangle, Clock, MapPin, 
  Lightbulb, Zap, Target, BarChart3 
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Prediction {
  type: "congestion" | "optimization" | "incident" | "maintenance";
  title: string;
  description: string;
  confidence: number;
  timeWindow: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
  location?: string;
}

export function AIPredictions() {
  const { data } = useMonitoringData();

  // Simulated AI predictions based on current data
  const predictions: Prediction[] = [
    {
      type: "congestion",
      title: "Expected Congestion at Junction 12",
      description: "Traffic volume is increasing. High congestion predicted in 15-20 minutes.",
      confidence: 87,
      timeWindow: "15-20 min",
      impact: "high",
      recommendation: "Increase green time for North-South approach by 10 seconds",
      location: "Junction 12",
    },
    {
      type: "optimization",
      title: "Signal Timing Optimization Opportunity",
      description: "Current pattern shows 12% wait time reduction possible with adjusted timings.",
      confidence: 92,
      timeWindow: "Next cycle",
      impact: "medium",
      recommendation: "Apply AI-suggested timing: Green 50s, Yellow 5s, Red 55s",
    },
    {
      type: "incident",
      title: "Potential Incident Detection",
      description: "Unusual traffic pattern detected. Possible accident or breakdown.",
      confidence: 65,
      timeWindow: "5-10 min",
      impact: "high",
      recommendation: "Dispatch traffic patrol and activate emergency response protocol",
      location: "Main St & Park Ave",
    },
    {
      type: "maintenance",
      title: "Signal Maintenance Recommended",
      description: "Signal SIG-003 showing performance degradation. Schedule maintenance.",
      confidence: 78,
      timeWindow: "Within 24h",
      impact: "low",
      recommendation: "Schedule maintenance window during off-peak hours (2-4 AM)",
    },
  ];

  const predictionTrend = [
    { time: "Now", congestion: 45, predicted: 45 },
    { time: "+5min", congestion: 48, predicted: 50 },
    { time: "+10min", congestion: 52, predicted: 58 },
    { time: "+15min", congestion: 58, predicted: 65 },
    { time: "+20min", congestion: 62, predicted: 70 },
    { time: "+25min", congestion: 65, predicted: 72 },
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "congestion": return AlertTriangle;
      case "optimization": return Zap;
      case "incident": return AlertTriangle;
      case "maintenance": return Clock;
      default: return Brain;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
          AI Predictions & Recommendations
        </h1>
        <p className="text-muted-foreground">
          Machine learning-powered insights and proactive traffic management suggestions
        </p>
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {predictions.map((prediction, idx) => {
          const Icon = getTypeIcon(prediction.type);
          return (
            <Card key={idx} className="bg-card border-border hover:border-primary/30 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{prediction.title}</CardTitle>
                      <CardDescription className="mt-1">{prediction.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={getImpactColor(prediction.impact)}>
                    {prediction.impact}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-semibold">{prediction.confidence}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{prediction.timeWindow}</span>
                  </div>
                </div>
                {prediction.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{prediction.location}</span>
                  </div>
                )}
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Recommendation:</p>
                      <p className="text-sm text-muted-foreground">{prediction.recommendation}</p>
                    </div>
                  </div>
                </div>
                <Button className="w-full" size="sm">
                  Apply Recommendation
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Prediction Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Congestion Prediction Trend</CardTitle>
          <CardDescription>
            AI-predicted traffic congestion levels over the next 25 minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: "Congestion Level", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="congestion" 
                stroke="#8884d8" 
                strokeWidth={2} 
                name="Current"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#FF8042" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name="AI Predicted"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Model Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Model Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold">Model Accuracy</span>
              </div>
              <p className="text-2xl font-bold">94.2%</p>
              <p className="text-xs text-muted-foreground mt-1">+2.1% from last week</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-semibold">Avg. Wait Reduction</span>
              </div>
              <p className="text-2xl font-bold">12.5%</p>
              <p className="text-xs text-muted-foreground mt-1">vs baseline system</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold">Predictions Today</span>
              </div>
              <p className="text-2xl font-bold">247</p>
              <p className="text-xs text-muted-foreground mt-1">87% actionable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

