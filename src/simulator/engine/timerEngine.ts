import type { TimerElement } from '@/simulator/types/ladder';
import type { TimerState } from '@/simulator/types/plcState';

/**
 * TON — On-Delay Timer, non-retentive (the only kind requested this phase).
 *
 * States: preset (target ms), accumulated (elapsed ms), done (accumulated >= preset).
 *
 * Behavior:
 *  - while powered: accumulated climbs by one scan interval each scan, capped at preset
 *  - the instant power is lost: accumulated AND done both drop to 0/false immediately
 *    (this is what "non-retentive" means — nothing is remembered between power cycles)
 *  - done flips true once accumulated reaches preset, and stays true while still powered
 */
export function updateTimer(
  element: TimerElement,
  isPowered: boolean,
  previous: TimerState | undefined,
  scanIntervalMs: number
): TimerState {
  const preset = element.presetMs;

  if (!isPowered) {
    return { presetMs: preset, accumulatedMs: 0, done: false, poweredLastScan: false };
  }

  const prevAccumulated = previous?.accumulatedMs ?? 0;
  const accumulatedMs = Math.min(preset, prevAccumulated + scanIntervalMs);
  const done = accumulatedMs >= preset;

  return { presetMs: preset, accumulatedMs, done, poweredLastScan: true };
}
