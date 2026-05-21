import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export function DashboardOverview() {
  const { data, isLoading } = useMonitoringData();

  // FlowGo branding
  const teamName = "FlowGo Team";

  const stats = [
    { label: "Active Signals", value: data?.stats.active_signals ?? 0, icon: Activity, color: "text-success" },
    { label: "Incidents", value: data?.stats.incidents ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Green Corridors", value: data?.stats.green_corridors ?? 0, icon: CheckCircle, color: "text-primary" },
    { label: "Avg. Response (min)", value: data?.stats.avg_response_min ?? 0, icon: Clock, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Real-time traffic management system status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 bg-card border-border hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-rajdhani font-bold text-foreground">{stat.value}</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-rajdhani font-semibold mb-4 text-foreground">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {(data?.recent_events ?? []).map((activity, i) => (
            <div key={i} className="flex items-start space-x-4 p-3 bg-secondary rounded-lg">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                activity.type === "success" ? "bg-success" : 
                activity.type === "warning" ? "bg-warning" : "bg-accent"
              }`}></div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{activity.event}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
          {!data?.recent_events?.length && <p className="text-sm text-muted-foreground">Awaiting live events...</p>}
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6 bg-card border-border">
          <h3 className="font-rajdhani font-semibold text-foreground mb-3">Signal Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Operational</span>
              <span className="text-success font-semibold">{data ? "98.6%" : "--"}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-success h-2 rounded-full" style={{ width: "98.6%" }}></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h3 className="font-rajdhani font-semibold text-foreground mb-3">Camera Network</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Online</span>
              <span className="text-success font-semibold">
                {data?.cameras ? `${data.cameras.online}/${data.cameras.online + data.cameras.offline}` : "--"}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-success h-2 rounded-full" style={{ width: `${(data?.cameras?.networkHealth ?? 0) * 100}%` }}></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h3 className="font-rajdhani font-semibold text-foreground mb-3">AI System</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Wait Reduction</span>
              <span className="text-success font-semibold">
                {data?.training ? `${(data.training.improvement_pct * 100).toFixed(1)}%` : "--"}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-success h-2 rounded-full" style={{ width: `${(data?.training?.improvement_pct ?? 0) * 100}%` }}></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
