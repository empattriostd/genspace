import type { Address, ContactMode, LadderElement } from '@/simulator/types/ladder';
import {
  createContact,
  createCoil,
  createTimer,
  createCounter,
  createWire,
  createComment,
} from '@/simulator/models/elementFactory';

interface Placement {
  gridX: number;
  gridY: number;
}

/**
 * What a future "Add Component" toolbar/palette hands the editor — one spec
 * per component type, matching exactly what a Konva palette drag-drop would
 * know at drop time (kind + address + position). Dispatches straight to the
 * Phase 2 elementFactory (untouched) so the editor never hand-builds the
 * LadderElement union itself.
 */
export type NewComponentSpec =
  | { kind: 'CONTACT'; mode: ContactMode; address: Address; at: Placement }
  | { kind: 'COIL'; address: Address; at: Placement }
  | { kind: 'TIMER'; address: Address; presetMs: number; at: Placement }
  | { kind: 'COUNTER'; address: Address; presetCount: number; resetAddress?: Address; at: Placement }
  | { kind: 'WIRE'; at: Placement }
  | { kind: 'COMMENT'; text: string; at: Placement };

export function createElementFromSpec(spec: NewComponentSpec): LadderElement {
  switch (spec.kind) {
    case 'CONTACT':
      return createContact(spec.address, spec.mode, spec.at);
    case 'COIL':
      return createCoil(spec.address, spec.at);
    case 'TIMER':
      return createTimer(spec.address, spec.presetMs, spec.at);
    case 'COUNTER':
      return createCounter(spec.address, spec.presetCount, spec.at, spec.resetAddress);
    case 'WIRE':
      return createWire(spec.at);
    case 'COMMENT':
      return createComment(spec.text, spec.at);
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}
