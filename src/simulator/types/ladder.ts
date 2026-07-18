import type { Address } from './address';

// ─── Ladder JSON Structure ───────────────────────────────────────────────
// Design goals (see src/simulator/ARCHITECTURE.md for the full rationale):
//   1. Series is just a chain of `connectsTo` references.
//   2. Parallel/branch needs NO special data — it falls out automatically
//      when two elements share a predecessor (fan-out) and both feed the
//      same successor (fan-in). BRANCH_START/BRANCH_END exist only as
//      visual markers for a future drag-and-drop editor to know where to
//      draw the branch box; the engine does not require them.
//   3. Every element carries gridX/gridY so a future editor can place and
//      re-place elements without the engine caring about pixel layout.

export type ContactMode = 'NO' | 'NC';

interface BaseElement {
  id: string;
  gridX: number;
  gridY: number;
  /** ids of elements this one feeds power into (graph edges). */
  connectsTo: string[];
}

export interface ContactElement extends BaseElement {
  kind: 'CONTACT';
  mode: ContactMode;
  /** Bit this contact reads. I/M/TIM(.DN)/CTU(.DN)/O are all valid sources. */
  address: Address;
}

export interface CoilElement extends BaseElement {
  kind: 'COIL';
  /** Bit this coil writes. Only O or M are valid targets. */
  address: Address;
}

export interface TimerElement extends BaseElement {
  kind: 'TIMER';
  timerType: 'TON'; // On-Delay. Other timer types (TOF, TP) are future work.
  address: Address; // type must be 'TIM'
  presetMs: number;
}

export interface CounterElement extends BaseElement {
  kind: 'COUNTER';
  counterType: 'CTU'; // Count Up. CTD (Count Down) is future work.
  address: Address; // type must be 'CTU'
  presetCount: number;
  /** Optional bit that, while true, forces the counter back to 0/not-done. */
  resetAddress?: Address;
}

export interface WireElement extends BaseElement {
  kind: 'WIRE';
}

/** Visual/editor marker only — see design goal #2 above. */
export interface BranchStartElement extends BaseElement {
  kind: 'BRANCH_START';
  branchId: string;
}

/** Visual/editor marker only — see design goal #2 above. */
export interface BranchEndElement extends BaseElement {
  kind: 'BRANCH_END';
  branchId: string;
}

export interface CommentElement extends Omit<BaseElement, 'connectsTo'> {
  kind: 'COMMENT';
  text: string;
  connectsTo?: string[]; // comments never carry power; kept optional/unused
}

export type LadderElement =
  | ContactElement
  | CoilElement
  | TimerElement
  | CounterElement
  | WireElement
  | BranchStartElement
  | BranchEndElement
  | CommentElement;

export interface Rung {
  id: string;
  /** Element ids wired directly to the left power rail (usually just one). */
  startIds: string[];
  elements: LadderElement[];
}

export interface LadderProject {
  id: string;
  name: string;
  rungs: Rung[];
  meta: {
    createdAt: string;
    updatedAt: string;
    engineVersion: string;
  };
}
