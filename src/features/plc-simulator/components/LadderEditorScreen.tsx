import { useEffect, useState } from 'react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { ComponentPalette } from './ComponentPalette';
import { SimulatorToolbar } from './SimulatorToolbar';
import { LadderCanvas } from './LadderCanvas';
import { SimulationPanel } from './SimulationPanel';
import { DebuggerPanel } from './DebuggerPanel';
import type { InteractionMode } from './ElementNode';

/**
 * Top-level composition for the real visual editor: Toolbar + Palette +
 * Canvas + Simulation Panel, wired to the existing useLadderEditorStore
 * (Phase 3, unmodified) and usePlcStore (Phase 2, unmodified — RESET and
 * STEP were already implemented there, just not exposed in the UI until
 * now) for the Run/highlight-active-path integration.
 */
export function LadderEditorScreen() {
  const [mode, setMode] = useState<InteractionMode>('select');
  const [isSimulating, setIsSimulating] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Phase 5.5 — Debugger visibility is purely a UI toggle; the underlying
  // diagnostics/scan-stats/watch data are collected every scan regardless
  // (see runtime/plcRuntime.ts), so opening/closing this panel never
  // changes Runtime behavior.
  const [showDebugger, setShowDebugger] = useState(false);

  const addRung = useLadderEditorStore((s) => s.addRung);
  const exportToLadderJson = useLadderEditorStore((s) => s.exportToLadderJson);
  const lastErrors = useLadderEditorStore((s) => s.lastErrors);

  const loadProject = usePlcStore((s) => s.loadProject);
  const start = usePlcStore((s) => s.start);
  const stop = usePlcStore((s) => s.stop);
  const step = usePlcStore((s) => s.step);
  const reset = usePlcStore((s) => s.reset);
  const scanCount = usePlcStore((s) => s.state.scanCount);
  const lastScanDurationMs = usePlcStore((s) => s.state.lastScanDurationMs);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (lastErrors.length > 0) setErrorMessage(lastErrors[lastErrors.length - 1]);
  }, [lastErrors]);

  /** Exports + loads the current diagram into the runtime. Returns false
   * (and surfaces the error) if the diagram doesn't parse yet. */
  function armSimulation(): boolean {
    const { project, errors } = exportToLadderJson();
    if (errors.length > 0) {
      setErrorMessage(errors[0]);
      return false;
    }
    loadProject(project);
    return true;
  }

  function handleToggleSimulate() {
    if (isSimulating) {
      stop();
      setIsSimulating(false);
      return;
    }
    if (!armSimulation()) return;
    if (continuousMode) start();
    setIsSimulating(true);
    setMode('select'); // running always implies plain click-to-toggle-input mode
  }

  function handleStep() {
    if (!isSimulating) {
      if (!armSimulation()) return;
      setIsSimulating(true);
      setMode('select');
    }
    step();
  }

  function handleReset() {
    reset();
    setIsSimulating(false);
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[520px] flex-col gap-3 md:h-[calc(100vh-140px)]">
      <SimulatorToolbar
        mode={mode}
        onModeChange={setMode}
        isSimulating={isSimulating}
        continuousMode={continuousMode}
        onContinuousModeChange={setContinuousMode}
        onToggleSimulate={handleToggleSimulate}
        onStep={handleStep}
        onReset={handleReset}
        onAddRung={() => addRung()}
        errorMessage={errorMessage}
        scanCount={scanCount}
        lastScanDurationMs={lastScanDurationMs}
      />

      <div className="flex justify-end">
        <button
          onClick={() => setShowDebugger((v) => !v)}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 dark:border-border-dark dark:hover:bg-white/5"
        >
          {showDebugger ? 'Hide Debugger' : 'Show Debugger'}
        </button>
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        <ComponentPalette />
        <div className="glass flex-1 overflow-hidden rounded-3xl p-1">
          <LadderCanvas
            interactionMode={mode}
            isSimulating={isSimulating}
            onAnchorActionDone={() => setMode('select')}
            onError={setErrorMessage}
          />
        </div>
        <SimulationPanel isSimulating={isSimulating} />
        {showDebugger && <DebuggerPanel />}
      </div>
    </div>
  );
}
