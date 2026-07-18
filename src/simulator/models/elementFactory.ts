import { generateId } from '@/simulator/utils/id';
import type {
  Address,
  ContactElement,
  CoilElement,
  TimerElement,
  CounterElement,
  WireElement,
  BranchStartElement,
  BranchEndElement,
  CommentElement,
  ContactMode,
} from '@/simulator/types/ladder';

// Factory helpers so a future drag-and-drop editor never hand-builds the
// LadderElement union directly — it calls one of these, gets sane defaults
// (id, empty connectsTo, grid position), and wires up connectsTo afterward.

interface Placement {
  gridX: number;
  gridY: number;
}

export function createContact(address: Address, mode: ContactMode, at: Placement): ContactElement {
  return { id: generateId('contact'), kind: 'CONTACT', mode, address, connectsTo: [], ...at };
}

export function createCoil(address: Address, at: Placement): CoilElement {
  return { id: generateId('coil'), kind: 'COIL', address, connectsTo: [], ...at };
}

export function createTimer(address: Address, presetMs: number, at: Placement): TimerElement {
  return {
    id: generateId('timer'),
    kind: 'TIMER',
    timerType: 'TON',
    address,
    presetMs,
    connectsTo: [],
    ...at,
  };
}

export function createCounter(
  address: Address,
  presetCount: number,
  at: Placement,
  resetAddress?: Address
): CounterElement {
  return {
    id: generateId('counter'),
    kind: 'COUNTER',
    counterType: 'CTU',
    address,
    presetCount,
    resetAddress,
    connectsTo: [],
    ...at,
  };
}

export function createWire(at: Placement): WireElement {
  return { id: generateId('wire'), kind: 'WIRE', connectsTo: [], ...at };
}

export function createBranchStart(branchId: string, at: Placement): BranchStartElement {
  return { id: generateId('branch_start'), kind: 'BRANCH_START', branchId, connectsTo: [], ...at };
}

export function createBranchEnd(branchId: string, at: Placement): BranchEndElement {
  return { id: generateId('branch_end'), kind: 'BRANCH_END', branchId, connectsTo: [], ...at };
}

export function createComment(text: string, at: Placement): CommentElement {
  return { id: generateId('comment'), kind: 'COMMENT', text, ...at };
}
