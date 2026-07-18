import { create } from 'zustand';
import { createEmptyState, type PlcState } from '@/simulator/types/plcState';
import type { LadderProject } from '@/simulator/types/ladder';
import { plcRuntime } from '@/simulator/runtime/plcRuntime';

interface PlcStoreState {
  state: PlcState;
  poweredElements: Record<string, boolean>;
  isRunning: boolean;
  loadProject: (project: LadderProject) => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  step: () => void;
  setInput: (number: number, value: boolean) => void;
}

/**
 * Reactive mirror of the framework-agnostic PlcRuntime (see
 * simulator/runtime/plcRuntime.ts). This store owns no simulation logic
 * itself — every action just delegates to `plcRuntime`, and the
 * subscription below keeps this store's `state`/`poweredElements`/
 * `isRunning` in sync so any component can read them without prop drilling.
 */
export const usePlcStore = create<PlcStoreState>((set) => {
  plcRuntime.subscribe(({ state, poweredElements, isRunning }) => {
    set({ state, poweredElements, isRunning });
  });

  return {
    state: createEmptyState(),
    poweredElements: {},
    isRunning: false,
    loadProject: (project) => plcRuntime.loadProject(project),
    start: () => plcRuntime.start(),
    stop: () => plcRuntime.stop(),
    reset: () => plcRuntime.reset(),
    step: () => plcRuntime.step(),
    setInput: (number, value) => plcRuntime.setInput(number, value),
  };
});
