import type { LadderProject } from '@/simulator/types/ladder';
import type { CompiledLadder } from '@/simulator/types/runtime';
import { createEmptyState, type PlcState } from '@/simulator/types/plcState';
import { parseLadder } from '@/simulator/parser/parseLadder';
import { runScanCycle, DEFAULT_SCAN_INTERVAL_MS } from '@/simulator/engine/scanCycle';

export interface RuntimeSnapshot {
  state: PlcState;
  poweredElements: Record<string, boolean>;
  isRunning: boolean;
}

export type RuntimeListener = (snapshot: RuntimeSnapshot) => void;

/**
 * Framework-agnostic PLC runtime — no React, no Zustand, no Supabase.
 * This is the class src/simulator/hooks/useSimulator.ts and stores/plcStore.ts
 * wrap for the UI. Keeping it framework-agnostic is what makes it directly
 * reusable for a future Arduino/Industrial-simulation runtime — same shape
 * (loadProject/start/stop/reset/step/subscribe), different compiled graph
 * and engine underneath.
 */
export class PlcRuntime {
  private compiled: CompiledLadder | null = null;
  private state: PlcState = createEmptyState();
  private poweredElements: Record<string, boolean> = {};
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<RuntimeListener>();
  private scanIntervalMs: number;

  constructor(scanIntervalMs: number = DEFAULT_SCAN_INTERVAL_MS) {
    this.scanIntervalMs = scanIntervalMs;
  }

  loadProject(project: LadderProject): void {
    this.stop();
    this.compiled = parseLadder(project);
    this.state = createEmptyState();
    this.poweredElements = {};
    this.emit();
  }

  /** Simulates flipping a physical input switch, e.g. setInput(1, true) for I1. */
  setInput(number: number, value: boolean): void {
    this.state = { ...this.state, inputs: { ...this.state.inputs, [number]: value } };
    this.emit();
  }

  /** Runs a single scan cycle — useful for manual step-through debugging. */
  step(): void {
    if (!this.compiled) {
      throw new Error('PlcRuntime.step() called with no project loaded — call loadProject() first.');
    }
    const result = runScanCycle(this.compiled, this.state, this.scanIntervalMs);
    this.state = result.state;
    this.poweredElements = result.poweredElements;
    this.emit();
  }

  start(): void {
    if (this.intervalHandle || !this.compiled) return;
    this.intervalHandle = setInterval(() => this.step(), this.scanIntervalMs);
    this.emit();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.emit();
    }
  }

  reset(): void {
    this.stop();
    this.state = createEmptyState();
    this.poweredElements = {};
    this.emit();
  }

  isRunning(): boolean {
    return this.intervalHandle !== null;
  }

  getSnapshot(): RuntimeSnapshot {
    return { state: this.state, poweredElements: this.poweredElements, isRunning: this.isRunning() };
  }

  /** Returns an unsubscribe function, matching the convention React effects expect. */
  subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

/**
 * Single shared instance for the whole app — today there is only ever one
 * active Simulator screen. If multi-project/multi-tab simulation is ever
 * needed, replace this with a keyed registry; nothing above this line
 * would need to change.
 */
export const plcRuntime = new PlcRuntime();
