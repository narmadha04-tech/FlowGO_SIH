/**
 * FlowGoBranding.tsx
 * -------------------
 * FlowGo team branding component
 */

import { Activity } from "lucide-react";

interface FlowGoBrandingProps {
  variant?: "full" | "compact" | "logo-only";
  className?: string;
}

export function FlowGoBranding({ variant = "full", className = "" }: FlowGoBrandingProps) {
  if (variant === "logo-only") {
    return (
      <div className={`flex items-center ${className}`}>
        <Activity className="w-6 h-6 text-primary mr-2" />
        <span className="font-rajdhani font-bold text-primary">FlowGo</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center ${className}`}>
        <Activity className="w-5 h-5 text-primary mr-2" />
        <div>
          <div className="font-rajdhani font-bold text-primary">FlowGo</div>
          <div className="text-xs text-muted-foreground">Traffic AI</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
        <Activity className="w-6 h-6 text-primary" />
      </div>
      <div>
        <div className="font-rajdhani font-bold text-lg text-primary">FlowGo</div>
        <div className="text-xs text-muted-foreground">Traffic AI by FlowGo Team</div>
      </div>
    </div>
  );
}

