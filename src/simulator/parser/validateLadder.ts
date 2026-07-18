import type { Rung } from '@/simulator/types/ladder';
import { isValidAddressNumber } from '@/simulator/models/addressRanges';

export class LadderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LadderValidationError';
  }
}

const TERMINAL_KINDS = new Set(['COIL', 'TIMER', 'COUNTER']);
const ADDRESSED_KINDS = new Set(['CONTACT', 'COIL', 'TIMER', 'COUNTER']);

/**
 * Structural + semantic checks run once, at load time, so the engine can
 * assume a well-formed graph on every scan afterward (no re-validating 100
 * times a second).
 */
export function validateRung(rung: Rung): void {
  const ids = new Set(rung.elements.map((el) => el.id));

  if (ids.size !== rung.elements.length) {
    throw new LadderValidationError(`Rung "${rung.id}" has duplicate element ids.`);
  }

  for (const startId of rung.startIds) {
    if (!ids.has(startId)) {
      throw new LadderValidationError(
        `Rung "${rung.id}" startIds references unknown element "${startId}".`
      );
    }
  }

  for (const el of rung.elements) {
    const connections = el.connectsTo ?? [];
    for (const targetId of connections) {
      if (!ids.has(targetId)) {
        throw new LadderValidationError(
          `Rung "${rung.id}" element "${el.id}" connects to unknown element "${targetId}".`
        );
      }
    }

    if (el.kind === 'COMMENT') continue;

    // A non-terminal element with nowhere to go is a dead end — very likely
    // an unfinished edit rather than intentional, so we fail loudly.
    if (!TERMINAL_KINDS.has(el.kind) && connections.length === 0) {
      throw new LadderValidationError(
        `Rung "${rung.id}" element "${el.id}" (${el.kind}) has no outgoing connection.`
      );
    }

    if (ADDRESSED_KINDS.has(el.kind)) {
      const address = (el as { address?: { number: number } }).address;
      if (!address || !isValidAddressNumber(address.number)) {
        throw new LadderValidationError(
          `Rung "${rung.id}" element "${el.id}" has an invalid address.`
        );
      }
    }

    if (el.kind === 'COIL' && el.address.type !== 'O' && el.address.type !== 'M') {
      throw new LadderValidationError(
        `Rung "${rung.id}" coil "${el.id}" must target address type O or M, got "${el.address.type}".`
      );
    }

    if (el.kind === 'TIMER' && el.address.type !== 'TIM') {
      throw new LadderValidationError(
        `Rung "${rung.id}" timer "${el.id}" address must be type TIM, got "${el.address.type}".`
      );
    }

    if (el.kind === 'COUNTER' && el.address.type !== 'CTU') {
      throw new LadderValidationError(
        `Rung "${rung.id}" counter "${el.id}" address must be type CTU, got "${el.address.type}".`
      );
    }
  }

  if (rung.startIds.length === 0) {
    throw new LadderValidationError(`Rung "${rung.id}" has no startIds — nothing connects to the left rail.`);
  }
}
