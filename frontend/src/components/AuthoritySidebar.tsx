import { Home, Map, TrafficCone, BarChart3, Zap, Camera, LogOut, Video, Brain, TrendingUp, Car, Ambulance, Shield, Leaf, FileText, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface AuthoritySidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const menuItems = [
  { id: "overview", title: "Overview", icon: Home },
  { id: "map", title: "Live Map", icon: Map },
  { id: "signals", title: "Signal Management", icon: TrafficCone },
  { id: "analytics", title: "Traffic Analytics", icon: BarChart3 },
  { id: "advanced-analytics", title: "Advanced Analytics", icon: TrendingUp },
  { id: "ai-predictions", title: "AI Predictions", icon: Brain },
  { id: "green-corridor", title: "Green Corridor", icon: Zap },
  { id: "emergency-vehicles", title: "Emergency Vehicles", icon: Ambulance },
  { id: "traffic-intelligence", title: "Traffic Intelligence", icon: Shield },
  { id: "cameras", title: "Live Cameras", icon: Camera },
  { id: "live-prediction", title: "Live Prediction", icon: Video },
  { id: "camera-overlay", title: "Camera Overlay", icon: Camera },
  { id: "video-analysis", title: "Video Analysis", icon: Film },
  { id: "sustainability", title: "Sustainability", icon: Leaf },
  { id: "reports", title: "Report Generation", icon: FileText },
  { id: "traffic-simulation", title: "3D Traffic Simulation", icon: Car },
];

export function AuthoritySidebar({ activeSection, setActiveSection }: AuthoritySidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { logout } = await import("@/lib/auth");
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="font-rajdhani font-bold text-lg text-sidebar-primary">
              FlowGo Control Room
            </h2>
            <p className="text-xs text-muted-foreground">AI Traffic Management</p>
          </div>
        )}
        <SidebarTrigger className="ml-auto" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      ${activeSection === item.id 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "hover:bg-sidebar-accent/50"
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </Sidebar>
  );
}
