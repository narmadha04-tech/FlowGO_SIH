import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Navigation, Rss, Ambulance, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TrafficMap } from "@/components/dashboard/TrafficMap";
import { useMonitoringData } from "@/hooks/useMonitoringData";

const PublicView = () => {
  const navigate = useNavigate();
  const { data } = useMonitoringData();
  const publicEvents = data?.recent_events ?? [];

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
            <h1 className="text-2xl font-rajdhani font-bold text-primary">
                FlowGo Traffic Info
            </h1>
              <p className="text-xs text-muted-foreground">Public Access Portal</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Description */}
        <Card className="p-6 mb-6 bg-card border-border">
          <h2 className="text-xl font-rajdhani font-semibold mb-3 text-foreground">
            Real-time Traffic Monitoring
          </h2>
          <p className="text-muted-foreground">
            Access live traffic information, accident alerts, and smart routing suggestions. 
            Stay informed about traffic conditions in your city and plan your journey accordingly.
          </p>
        </Card>

        {/* Quick Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-card border-border hover:border-accent/50 transition-all">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Navigation className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-foreground">Smart Rerouting</h3>
                <p className="text-sm text-muted-foreground">AI-powered route optimization</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border hover:border-destructive/50 transition-all">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-foreground">Accident Alerts</h3>
                <p className="text-sm text-muted-foreground">Real-time incident notifications</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border hover:border-success/50 transition-all">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Rss className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-foreground">Live Feed</h3>
                <p className="text-sm text-muted-foreground">Continuous traffic updates</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Emergency Vehicle Section */}
        <Card className="p-6 mb-6 bg-card border-border border-destructive/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Ambulance className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-rajdhani font-semibold mb-2 text-foreground">
                  Emergency Vehicle Coordinates
                </h2>
                <p className="text-muted-foreground mb-3">
                  Real-time tracking of emergency vehicles with green corridor support. 
                  View live coordinates and route information for active emergency vehicles.
                </p>
                <Button
                  onClick={() => navigate("/authority/dashboard?section=emergency-vehicles")}
                  variant="outline"
                  className="border-destructive/50 hover:bg-destructive/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Emergency Vehicle Management
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">
              <strong className="text-foreground">Features:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Real-time vehicle tracking with GPS coordinates</li>
              <li>Automatic green corridor activation for emergency routes</li>
              <li>Signal and junction marking with designated coordinates</li>
              <li>Route visualization from starting point to destination</li>
              <li>Live status updates and ETA information</li>
            </ul>
          </div>
        </Card>

        {/* Map */}
        <div className="mb-6">
          <TrafficMap isPublic={true} />
        </div>

        {/* Accident Zones & Traffic Feed */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Active Accident Zones
            </h3>
            <div className="space-y-3">
              {publicEvents.slice(0, 3).map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-secondary rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Live Traffic Feed
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {publicEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-secondary rounded-lg">
                  <div className="w-2 h-2 bg-success rounded-full flex-shrink-0 mt-1.5"></div>
                  <div>
                    <p className="text-sm text-foreground">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicView;
