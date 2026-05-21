import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { TrafficSimulationEngine } from "@/simulation/TrafficSimulationEngine";
import { SimulationState, SignalId } from "@/simulation/types";
import { ControlPanel } from "./ControlPanel";
import "./TrafficSimulation.css";

interface TrafficSimulationProps {
  className?: string;
}

export const TrafficSimulation = ({ className }: TrafficSimulationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TrafficSimulationEngine | null>(null);
  const [state, setState] = useState<SimulationState | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    function initializeEngine() {
      if (!containerRef.current || !mounted) return;

      // Ensure container has dimensions
      const container = containerRef.current;
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        // Wait for container to be properly sized
        timeoutId = setTimeout(() => {
          if (mounted && containerRef.current) {
            initializeEngine();
          }
        }, 50);
        return;
      }

      try {
        const engine = new TrafficSimulationEngine(container);
        if (!mounted) {
          engine.dispose();
          return;
        }

        engineRef.current = engine;

        engine.setStateChangeCallback((newState) => {
          if (mounted) {
            setState({ ...newState });
          }
        });

        // Initialize state immediately
        if (mounted) {
          setState({ ...engine.state });
        }
      } catch (error) {
        console.error('Error initializing simulation engine:', error);
        if (mounted) {
          // Set default state on error
          const defaultState: SimulationState = {
            isRunning: false,
            autoCycle: true,
            currentSignal: 'A',
            vehicleDensity: 50,
            speedMultiplier: 1,
            signals: {
              A: { id: 'A', state: 'green', position: new THREE.Vector3(8, 0, -15), rotation: 0 },
              B: { id: 'B', state: 'red', position: new THREE.Vector3(15, 0, 8), rotation: -Math.PI / 2 },
              C: { id: 'C', state: 'red', position: new THREE.Vector3(-15, 0, -8), rotation: Math.PI / 2 },
            },
            vehicles: [],
            timeRemaining: 45,
            currentPhase: 'green',
          };
          setState(defaultState);
        }
      }
    }

    // Start initialization
    initializeEngine();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handleAutoCycleChange = useCallback((enabled: boolean) => {
    engineRef.current?.setAutoCycle(enabled);
  }, []);

  const handleManualSignal = useCallback((signalId: SignalId) => {
    engineRef.current?.setManualSignal(signalId);
  }, []);

  const handleDensityChange = useCallback((density: number) => {
    engineRef.current?.setVehicleDensity(density);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    engineRef.current?.setSpeedMultiplier(speed);
  }, []);

  return (
    <div className={`traffic-simulation-container ${className || ""}`}>
      <div ref={containerRef} className="traffic-simulation-canvas" />
      {!state ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading simulation...</p>
            <p className="text-xs text-muted-foreground mt-2">Initializing 3D environment...</p>
          </div>
        </div>
      ) : (
        <ControlPanel
          state={state}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onAutoCycleChange={handleAutoCycleChange}
          onManualSignal={handleManualSignal}
          onDensityChange={handleDensityChange}
          onSpeedChange={handleSpeedChange}
        />
      )}
    </div>
  );
};

