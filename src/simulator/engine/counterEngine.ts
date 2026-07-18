import type { CounterElement } from '@/simulator/types/ladder';
import type { CounterState, PlcState } from '@/simulator/types/plcState';

/**
 * CTU — Count Up.
 *
 * States: preset (target count), accumulated (current count), done (accumulated >= preset).
 *
 * Behavior:
 *  - increments accumulated by exactly 1 on a false -> true transition (rising
 *    edge) of the count input — holding the input true does NOT keep counting
 *  - done flips true once accumulated reaches preset, and (matching real CTU
 *    behavior) accumulated keeps climbing past preset until reset — done does
 *    not clear on its own
 *  - an optional reset bit, while true, forces accumulated back to 0 and done
 *    back to false, taking priority over counting this scan
 */
export function updateCounter(
  element: CounterElement,
  isPowered: boolean,
  previous: CounterState | undefined,
  state: PlcState
): CounterState {
  const preset = element.presetCount;
  const wasPowered = previous?.poweredLastScan ?? false;
  const prevAccumulated = previous?.accumulatedCount ?? 0;

  const resetActive = element.resetAddress ? readResetBit(element.resetAddress, state) : false;
  if (resetActive) {
    return { presetCount: preset, accumulatedCount: 0, done: false, poweredLastScan: isPowered };
  }

  const risingEdge = isPowered && !wasPowered;
  const accumulatedCount = risingEdge ? prevAccumulated + 1 : prevAccumulated;
  const done = accumulatedCount >= preset;

  return { presetCount: preset, accumulatedCount, done, poweredLastScan: isPowered };
}

function readResetBit(address: { type: string; number: number }, state: PlcState): boolean {
  if (address.type === 'I') return !!state.inputs[address.number];
  if (address.type === 'M') return !!state.memory[address.number];
  return false;
}
