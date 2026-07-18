export interface TimerState {
  presetMs: number;
  accumulatedMs: number;
  done: boolean;
  /** Tracked so the next scan can tell whether power was just gained/lost. */
  poweredLastScan: boolean;
}

export interface CounterState {
  presetCount: number;
  accumulatedCount: number;
  done: boolean;
  /** Tracked for rising-edge detection on the count input. */
  poweredLastScan: boolean;
}

/**
 * The full I/O + internal state of one simulated PLC, addresses 1-26 for
 * every type. Plain records (not arrays) so `state.inputs[7]` reads exactly
 * like the address it represents ("I7") — no off-by-one indexing.
 */
export interface PlcState {
  inputs: Record<number, boolean>;
  outputs: Record<number, boolean>;
  memory: Record<number, boolean>;
  timers: Record<number, TimerState>;
  counters: Record<number, CounterState>;
  scanCount: number;
  lastScanDurationMs: number;
}

export const ADDRESS_RANGE = Array.from({ length: 26 }, (_, i) => i + 1);

export function createEmptyState(): PlcState {
  const bits: Record<number, boolean> = {};
  for (const n of ADDRESS_RANGE) bits[n] = false;

  return {
    inputs: { ...bits },
    outputs: { ...bits },
    memory: { ...bits },
    timers: {},
    counters: {},
    scanCount: 0,
    lastScanDurationMs: 0,
  };
}
