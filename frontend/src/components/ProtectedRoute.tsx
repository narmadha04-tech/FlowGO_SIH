/**
 * ProtectedRoute.tsx
 * ------------------
 * Component to protect routes that require authentication
 */

import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        await getCurrentUser();
        setIsAuthorized(true);
      } catch (error) {
        setIsAuthorized(false);
        if (error instanceof Error && error.message.includes("Session expired")) {
          toast.error("Session expired. Please login again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/authority/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

