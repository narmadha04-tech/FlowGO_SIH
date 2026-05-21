import React from 'react';
import { Play, Pause, Settings2, Zap } from 'lucide-react';
import { SimulationState, SignalId } from '@/simulation/types';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  state: SimulationState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onAutoCycleChange: (enabled: boolean) => void;
  onManualSignal: (signalId: SignalId) => void;
  onDensityChange: (density: number) => void;
  onSpeedChange: (speed: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  state,
  onStart,
  onPause,
  onResume,
  onAutoCycleChange,
  onManualSignal,
  onDensityChange,
  onSpeedChange,
}) => {
  const getSignalColor = (signalId: SignalId): string => {
    const signal = state.signals[signalId];
    switch (signal.state) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="absolute top-4 right-4 w-80 bg-background/95 backdrop-blur-sm border shadow-lg z-10 max-h-[calc(100vh-120px)] overflow-y-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Traffic Control</CardTitle>
            <p className="text-xs text-muted-foreground">3D Simulation</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playback Controls */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Playback
          </h3>
          <div className="flex gap-2">
            {!state.isRunning ? (
              <Button
                onClick={state.vehicles.length > 0 ? onResume : onStart}
                className="flex-1"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                {state.vehicles.length > 0 ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button
                onClick={onPause}
                className="flex-1"
                size="sm"
                variant="secondary"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Signal Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Signal Status
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {(['A', 'B', 'C'] as SignalId[]).map((signalId) => (
              <button
                key={signalId}
                onClick={() => !state.autoCycle && onManualSignal(signalId)}
                disabled={state.autoCycle}
                className={cn(
                  "p-3 rounded-lg border border-border/50 transition-all duration-300",
                  "flex flex-col items-center gap-2",
                  !state.autoCycle && "hover:bg-muted/50 cursor-pointer",
                  state.autoCycle && "opacity-60 cursor-not-allowed",
                  state.currentSignal === signalId && "ring-2 ring-primary/50"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full", getSignalColor(signalId))} />
                <span className="text-xs font-medium">Signal {signalId}</span>
              </button>
            ))}
          </div>

          {/* Timer */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Time Remaining</span>
            <span className="text-xl font-mono font-bold text-primary">
              {Math.ceil(state.timeRemaining)}s
            </span>
          </div>

          {/* Current Phase */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Current Phase</span>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium uppercase",
              state.currentPhase === 'green' && "bg-green-500/20 text-green-500",
              state.currentPhase === 'yellow' && "bg-yellow-500/20 text-yellow-500",
              state.currentPhase === 'red' && "bg-red-500/20 text-red-500",
            )}>
              {state.currentPhase}
            </span>
          </div>
        </div>

        <Separator />

        {/* Auto Cycle Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Auto Cycle</Label>
            <p className="text-xs text-muted-foreground">Automatic signal rotation</p>
          </div>
          <Switch
            checked={state.autoCycle}
            onCheckedChange={onAutoCycleChange}
          />
        </div>

        <Separator />

        {/* Vehicle Density */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Vehicle Density</Label>
            <span className="text-sm font-mono text-primary">{state.vehicleDensity}%</span>
          </div>
          <Slider
            value={[state.vehicleDensity]}
            onValueChange={(value) => onDensityChange(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <Label className="text-sm font-medium">Speed</Label>
            </div>
            <span className="text-sm font-mono text-primary">{state.speedMultiplier.toFixed(1)}x</span>
          </div>
          <Slider
            value={[state.speedMultiplier]}
            onValueChange={(value) => onSpeedChange(value[0])}
            min={0.1}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Stats */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Statistics
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{state.vehicles.length}</div>
              <div className="text-xs text-muted-foreground">Active Vehicles</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {state.vehicles.filter(v => v.stopped).length}
              </div>
              <div className="text-xs text-muted-foreground">Stopped</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

