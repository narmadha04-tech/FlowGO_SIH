import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Users, Activity } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-6xl w-full z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Activity className="w-12 h-12 text-primary mr-3" />
            <h1 className="text-5xl md:text-7xl font-rajdhani font-bold text-gradient-gold">
              FlowGo Traffic AI
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-Powered Traffic Management System by FlowGo Team
          </p>
          <div className="mt-4">
            <span className="text-sm text-primary font-semibold">Powered by FlowGo</span>
          </div>
        </div>

        {/* Entry Options */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Authority Access */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:glow-primary transition-all duration-300">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
                  Authority Access
                </h2>
                <p className="text-muted-foreground">
                  Comprehensive traffic control dashboard with real-time monitoring, signal management, and green corridor control
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                  Live Traffic Map & Analytics
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                  Signal Management System
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                  Green Corridor Control (AI/Manual)
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                  Live Camera Preview
                </li>
              </ul>

              <Button 
                onClick={() => navigate("/authority/login")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-rajdhani font-semibold text-lg glow-primary"
              >
                Access Control Room
              </Button>
            </div>
          </div>

          {/* Public Access */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative bg-card border border-border rounded-2xl p-8 hover:border-accent/50 transition-all duration-300">
              <div className="mb-6">
                <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:glow-accent transition-all duration-300">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
                  Public Access
                </h2>
                <p className="text-muted-foreground">
                  Real-time traffic information, route planning, and live traffic feed for citizens
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></div>
                  Live Traffic Map
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></div>
                  Smart Rerouting
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></div>
                  Accident Zone Alerts
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></div>
                  Live Traffic Feed
                </li>
              </ul>

              <Button 
                onClick={() => navigate("/public")}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-rajdhani font-semibold text-lg glow-accent"
              >
                View Traffic Info
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-rajdhani font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">Monitoring</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-rajdhani font-bold text-accent">Real-time</div>
            <div className="text-sm text-muted-foreground">Updates</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-rajdhani font-bold text-success">AI Powered</div>
            <div className="text-sm text-muted-foreground">Control</div>
          </div>
        </div>

        {/* FlowGo Team Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-card border border-border rounded-full">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm font-rajdhani font-semibold text-foreground">
              Powered by <span className="text-primary">FlowGo</span> Team
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
