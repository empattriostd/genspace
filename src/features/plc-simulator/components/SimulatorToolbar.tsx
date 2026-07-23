import { MousePointer2, Cable, GitBranch, Play, Square, Plus, AlertCircle, RotateCcw, StepForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { InteractionMode } from './ElementNode';

interface SimulatorToolbarProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  isSimulating: boolean;
  continuousMode: boolean;
  onContinuousModeChange: (continuous: boolean) => void;
  onToggleSimulate: () => void;
  onStep: () => void;
  onReset: () => void;
  onAddRung: () => void;
  errorMessage: string | null;
  scanCount: number;
  lastScanDurationMs: number;
}

const MODES: { mode: InteractionMode; label: string; icon: typeof MousePointer2 }[] = [
  { mode: 'select', label: 'Select / Move', icon: MousePointer2 },
  { mode: 'connect', label: 'Connect', icon: Cable },
  { mode: 'branch', label: 'Branch', icon: GitBranch },
];

export function SimulatorToolbar({
  mode,
  onModeChange,
  isSimulating,
  continuousMode,
  onContinuousModeChange,
  onToggleSimulate,
  onStep,
  onReset,
  onAddRung,
  errorMessage,
  scanCount,
  lastScanDurationMs,
}: SimulatorToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <div className="flex items-center gap-1 border-r border-border pr-2 dark:border-border-dark">
          {MODES.map(({ mode: m, label, icon: Icon }) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'ghost'}
              size="sm"
              title={label}
              disabled={isSimulating}
              onClick={() => onModeChange(m)}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onAddRung} disabled={isSimulating} title="Add Rung">
          <Plus size={15} /> Rung
        </Button>

        <div className="flex items-center gap-1 border-l border-border pl-2 dark:border-border-dark">
          <Button
            variant={continuousMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onContinuousModeChange(true)}
            title="Continuous Scan"
          >
            Continuous
          </Button>
          <Button
            variant={!continuousMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onContinuousModeChange(false)}
            title="Single Scan — advance one scan cycle at a time"
          >
            Single Scan
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {!continuousMode && (
            <Button variant="outline" size="sm" onClick={onStep} title="Execute exactly one scan cycle">
              <StepForward size={15} /> Step
            </Button>
          )}
          <Button
            variant={isSimulating ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleSimulate}
            title={isSimulating ? 'Stop simulation' : 'Run simulation'}
          >
            {isSimulating ? <Square size={15} /> : <Play size={15} />}
            {isSimulating ? 'Stop' : 'Run'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} title="Reset — clears all I/O, timers, counters">
            <RotateCcw size={15} />
          </Button>
          {isSimulating && <Badge variant="success">Live</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {mode !== 'select' && !isSimulating ? (
          <p className="text-xs text-muted-foreground">
            {mode === 'connect'
              ? 'Click an element, then click another to wire them together — same rung only.'
              : 'Click two elements to add a parallel path between them, then drop a component onto the new wire.'}
          </p>
        ) : (
          <span />
        )}

        {isSimulating && (
          <span className="text-[11px] text-muted-foreground">
            Scan #{scanCount} · {lastScanDurationMs.toFixed(1)} ms
          </span>
        )}
      </div>

      {errorMessage && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400'
          )}
        >
          <AlertCircle size={14} />
          {errorMessage}
        </div>
      )}
    </div>
  );
}
