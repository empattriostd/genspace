import type { CompiledLadder } from '@/simulator/types/runtime';
import type { PlcState } from '@/simulator/types/plcState';
import { evaluateRung } from './evaluateRung';
import { updateTimer } from './timerEngine';
import { updateCounter } from './counterEngine';
import { deepClone } from '@/simulator/utils/clone';

export interface ScanResult {
  state: PlcState;
  /** elementId -> powered this scan. UI uses this for orange/gray rendering. */
  poweredElements: Record<string, boolean>;
  durationMs: number;
}

export const DEFAULT_SCAN_INTERVAL_MS = 100;

interface CoilWrite {
  addressType: 'O' | 'M';
  number: number;
  value: boolean;
}

/**
 * Runs exactly one PLC scan cycle, in the order a real PLC follows:
 *
 *   1. Read Inputs     — the live input image, frozen for the duration of this scan
 *   2. Execute Logic    — solve every rung's power flow against that frozen snapshot
 *   3. Update Timers    — advance/reset TON accumulators from this scan's power flow
 *   4. Update Counters  — edge-detect and advance CTU accumulators
 *   5. Update Memories  — commit this scan's M coil writes
 *   6. Write Outputs    — commit this scan's O coil writes
 *
 * Steps 3-6 are deliberately deferred until every rung has finished step 2,
 * instead of committing rung-by-rung as we go. Real PLCs update their input
 * and output image tables once per scan for exactly this reason: the result
 * stays independent of rung order, and a coil in Rung 5 can never see a
 * half-updated memory bit that Rung 1 wrote earlier in the *same* scan —
 * every rung reads the *previous* scan's values, consistently. This is what
 * makes the simulation behave like a real PLC instead of a spreadsheet that
 * recalculates top-to-bottom.
 */
export function runScanCycle(
  compiled: CompiledLadder,
  previousState: PlcState,
  scanIntervalMs: number = DEFAULT_SCAN_INTERVAL_MS
): ScanResult {
  const startedAt = Date.now();

  // Step 1: Read Inputs — previousState.inputs IS this scan's frozen image;
  // we only ever read it below, never mutate it mid-scan.
  const snapshot = previousState;

  // Step 2: Execute Ladder Logic — solve every rung, collect (but do not
  // yet commit) coil writes and timer/counter power-in signals.
  const poweredElements: Record<string, boolean> = {};
  const pendingCoilWrites: CoilWrite[] = [];
  const timerPowerIn: Record<number, boolean> = {};
  const counterPowerIn: Record<number, boolean> = {};

  for (const rung of compiled.rungs) {
    const result = evaluateRung(rung, snapshot);
    for (const [id, powered] of result.entries()) {
      poweredElements[id] = powered;
      const element = rung.nodes.get(id)!.element;

      if (element.kind === 'COIL') {
        pendingCoilWrites.push({
          addressType: element.address.type as 'O' | 'M',
          number: element.address.number,
          value: powered,
        });
      } else if (element.kind === 'TIMER') {
        timerPowerIn[element.address.number] = powered;
      } else if (element.kind === 'COUNTER') {
        counterPowerIn[element.address.number] = powered;
      }
    }
  }

  // Nothing above this line has mutated state — everything from here works
  // on a fresh copy, so `snapshot` stays a true "previous scan" reference
  // for counter edge-detection and reset-bit reads below.
  const nextState = deepClone(snapshot);

  // Step 3: Update Timers
  for (const rung of compiled.rungs) {
    for (const node of rung.nodes.values()) {
      if (node.element.kind !== 'TIMER') continue;
      const element = node.element;
      const isPowered = timerPowerIn[element.address.number] ?? false;
      nextState.timers[element.address.number] = updateTimer(
        element,
        isPowered,
        previousState.timers[element.address.number],
        scanIntervalMs
      );
    }
  }

  // Step 4: Update Counters
  for (const rung of compiled.rungs) {
    for (const node of rung.nodes.values()) {
      if (node.element.kind !== 'COUNTER') continue;
      const element = node.element;
      const isPowered = counterPowerIn[element.address.number] ?? false;
      nextState.counters[element.address.number] = updateCounter(
        element,
        isPowered,
        previousState.counters[element.address.number],
        snapshot
      );
    }
  }

  // Step 5: Update Memories — commit M coil writes only.
  for (const write of pendingCoilWrites) {
    if (write.addressType === 'M') nextState.memory[write.number] = write.value;
  }

  // Step 6: Write Outputs — commit O coil writes only.
  for (const write of pendingCoilWrites) {
    if (write.addressType === 'O') nextState.outputs[write.number] = write.value;
  }

  nextState.scanCount = previousState.scanCount + 1;
  nextState.lastScanDurationMs = Date.now() - startedAt;

  return { state: nextState, poweredElements, durationMs: nextState.lastScanDurationMs };
}
