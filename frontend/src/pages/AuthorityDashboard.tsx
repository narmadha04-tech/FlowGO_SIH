import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthoritySidebar } from "@/components/AuthoritySidebar";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { TrafficMap } from "@/components/dashboard/TrafficMap";
import { SignalManagement } from "@/components/dashboard/SignalManagement";
import { TrafficAnalytics } from "@/components/dashboard/TrafficAnalytics";
import { GreenCorridor } from "@/components/dashboard/GreenCorridor";
import { CameraPreview } from "@/components/dashboard/CameraPreview";
import { LiveFootagePrediction } from "@/components/dashboard/LiveFootagePrediction";
import { TrafficSimulation } from "@/components/dashboard/traffic-simulation/TrafficSimulation";
import { AdvancedAnalytics } from "@/components/dashboard/AdvancedAnalytics";
import { AIPredictions } from "@/components/dashboard/AIPredictions";
import { EmergencyVehicleManagement } from "@/components/dashboard/EmergencyVehicleManagement";
import { LiveMapRealTime } from "@/components/dashboard/LiveMapRealTime";
import { AdvancedTrafficIntelligence } from "@/components/dashboard/AdvancedTrafficIntelligence";
import { CameraFeedWithOverlay } from "@/components/dashboard/CameraFeedWithOverlay";
import { SustainabilityDashboard } from "@/components/dashboard/SustainabilityDashboard";
import { ReportGeneration } from "@/components/dashboard/ReportGeneration";
import { VideoUploader } from "@/components/dashboard/VideoUploader";
import { VideoAnalysisVisualizer } from "@/components/dashboard/VideoAnalysisVisualizer";

const AuthorityDashboard = () => {
  // Check for section parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialSection = urlParams.get("section") || "overview";
  const [activeSection, setActiveSection] = useState<string>(initialSection);

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <DashboardOverview />;
      case "map":
        return <LiveMapRealTime />;
      case "signals":
        return <SignalManagement />;
      case "analytics":
        return <TrafficAnalytics />;
      case "green-corridor":
        return <GreenCorridor />;
      case "cameras":
        return <CameraPreview />;
      case "live-prediction":
        return <LiveFootagePrediction />;
      case "camera-overlay":
        return <CameraFeedWithOverlay />;
      case "traffic-simulation":
        return <TrafficSimulation />;
      case "advanced-analytics":
        return <AdvancedAnalytics />;
      case "ai-predictions":
        return <AIPredictions />;
      case "emergency-vehicles":
        return <EmergencyVehicleManagement />;
      case "traffic-intelligence":
        return <AdvancedTrafficIntelligence />;
      case "sustainability":
        return <SustainabilityDashboard />;
      case "reports":
        return <ReportGeneration />;
      case "video-analysis":
        return <VideoUploader />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background font-inter">
        <AuthoritySidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
        />
        <main className="flex-1 overflow-auto">
          <div className={activeSection === "traffic-simulation" || activeSection === "map" ? "h-full" : "p-6"}>
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AuthorityDashboard;
