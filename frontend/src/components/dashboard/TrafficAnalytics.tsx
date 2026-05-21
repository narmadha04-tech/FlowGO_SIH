import { Card } from "@/components/ui/card";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function TrafficAnalytics() {
  const { data } = useMonitoringData();
  const hourlyData = data?.traffic?.hourlyVolume ?? [];
  const weeklyData = data?.traffic?.weeklyIncidents ?? [];

  const keyMetrics = [
    { label: "Avg. Speed", value: data ? `${(data.training.avg_reward ?? 42).toFixed(1)} km/h` : "--", change: "+5%" },
    { label: "Total Volume", value: data ? `${hourlyData.reduce((acc, cur) => acc + cur.volume, 0)}` : "--", change: "-2%" },
    { label: "Congestion", value: data ? `${Math.max(0, 100 - (data.training.improvement_pct * 100)).toFixed(0)}%` : "--", change: "-8%" },
    { label: "Incidents", value: data?.stats.incidents ?? "--", change: "+12%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
          Traffic Analytics
        </h1>
        <p className="text-muted-foreground">
          Comprehensive traffic data and insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {keyMetrics.map((metric) => (
          <Card key={metric.label} className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-rajdhani font-bold text-foreground">{metric.value}</p>
              <p className={`text-sm font-semibold ${metric.change.startsWith("+") ? "text-destructive" : "text-success"}`}>
                {metric.change}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
            Hourly Traffic Volume
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="volume" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
            Weekly Incidents
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="incidents" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
          Top Congested Routes
        </h3>
        <div className="space-y-3">
          {(data?.signals ?? []).slice(0, 4).map((signal) => (
            <div key={signal.id} className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{signal.location}</span>
                <span className="text-sm text-muted-foreground">{signal.queue ?? 0} vehicles queued</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-success to-destructive h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (signal.queue ?? 0) * 10)}%` }}
                ></div>
              </div>
            </div>
          ))}
          {!data?.signals?.length && <p className="text-sm text-muted-foreground">No signal telemetry ingested yet.</p>}
        </div>
      </Card>
    </div>
  );
}
