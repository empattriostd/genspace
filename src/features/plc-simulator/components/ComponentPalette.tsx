import type { Address, AddressType } from '@/simulator/types/address';
import type { NewComponentSpec } from '@/simulator/editor/componentSpec';

interface PaletteItem {
  label: string;
  dragKind: string; // serialized into dataTransfer, read back on drop
  glyph: string;
}

// The palette only needs to communicate "what kind of component" — the
// actual Address (which I/O number) is allocated at drop time by
// utils/addressAllocation.ts, not chosen here. Keeps every drag a single
// clean gesture instead of a picker dialog per drop.
const PALETTE_ITEMS: PaletteItem[] = [
  { label: 'NO Contact', dragKind: 'CONTACT_NO', glyph: '⊣⊢' },
  { label: 'NC Contact', dragKind: 'CONTACT_NC', glyph: '⊣╱⊢' },
  { label: 'Rising Edge', dragKind: 'CONTACT_RISING', glyph: '↑' },
  { label: 'Falling Edge', dragKind: 'CONTACT_FALLING', glyph: '↓' },
  { label: 'Output Coil', dragKind: 'COIL_O', glyph: '( )' },
  { label: 'SET Coil', dragKind: 'COIL_O_SET', glyph: '(S)' },
  { label: 'RESET Coil', dragKind: 'COIL_O_RESET', glyph: '(R)' },
  { label: 'Memory Coil', dragKind: 'COIL_M', glyph: '(M)' },
  { label: 'Memory Contact', dragKind: 'CONTACT_M', glyph: '⊣M⊢' },
  { label: 'Timer TON', dragKind: 'TIMER_TON', glyph: '[TON]' },
  { label: 'Timer TOF', dragKind: 'TIMER_TOF', glyph: '[TOF]' },
  { label: 'Timer TP', dragKind: 'TIMER_TP', glyph: '[TP]' },
  { label: 'Counter CTU', dragKind: 'COUNTER_CTU', glyph: '[CTU]' },
  { label: 'Counter CTD', dragKind: 'COUNTER_CTD', glyph: '[CTD]' },
  { label: 'Wire', dragKind: 'WIRE', glyph: '──' },
  { label: 'Comment', dragKind: 'COMMENT', glyph: '▭' },
];

export const DRAG_MIME = 'application/x-genspace-component';

export function ComponentPalette() {
  return (
    <div className="glass flex gap-2 overflow-x-auto rounded-2xl p-3 md:w-44 md:flex-col md:overflow-y-auto">
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.dragKind}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_MIME, item.dragKind);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="flex shrink-0 cursor-grab select-none items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted/40 active:cursor-grabbing dark:hover:bg-white/5 md:w-full"
          title={`Drag onto the canvas to add ${item.label}`}
        >
          <span className="w-10 text-center font-mono text-[11px] text-muted-foreground">{item.glyph}</span>
          <span className="whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Maps a palette drag-kind back into a full NewComponentSpec once we know
 * the drop position and which address number to allocate. */
export function specForDragKind(
  dragKind: string,
  address: Address | undefined,
  at: { gridX: number; gridY: number }
): NewComponentSpec | null {
  switch (dragKind) {
    case 'CONTACT_NO':
      return address ? { kind: 'CONTACT', mode: 'NO', address, at } : null;
    case 'CONTACT_NC':
      return address ? { kind: 'CONTACT', mode: 'NC', address, at } : null;
    case 'CONTACT_RISING':
      return address ? { kind: 'CONTACT', mode: 'RISING_EDGE', address, at } : null;
    case 'CONTACT_FALLING':
      return address ? { kind: 'CONTACT', mode: 'FALLING_EDGE', address, at } : null;
    case 'CONTACT_M':
      return address ? { kind: 'CONTACT', mode: 'NO', address, at } : null;
    case 'COIL_O':
    case 'COIL_M':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL' } : null;
    case 'COIL_O_SET':
      return address ? { kind: 'COIL', address, at, coilMode: 'SET' } : null;
    case 'COIL_O_RESET':
      return address ? { kind: 'COIL', address, at, coilMode: 'RESET' } : null;
    case 'TIMER_TON':
      return address ? { kind: 'TIMER', address, presetMs: 2000, at, timerType: 'TON' } : null;
    case 'TIMER_TOF':
      return address ? { kind: 'TIMER', address, presetMs: 2000, at, timerType: 'TOF' } : null;
    case 'TIMER_TP':
      return address ? { kind: 'TIMER', address, presetMs: 2000, at, timerType: 'TP' } : null;
    case 'COUNTER_CTU':
      return address ? { kind: 'COUNTER', address, presetCount: 3, at, counterType: 'CTU' } : null;
    case 'COUNTER_CTD':
      return address ? { kind: 'COUNTER', address, presetCount: 3, at, counterType: 'CTD' } : null;
    case 'WIRE':
      return { kind: 'WIRE', at };
    case 'COMMENT':
      return { kind: 'COMMENT', text: 'Comment', at };
    default:
      return null;
  }
}

/** Which AddressType a given drag-kind should allocate a number from. */
export function addressTypeForDragKind(dragKind: string): AddressType | null {
  switch (dragKind) {
    case 'CONTACT_NO':
    case 'CONTACT_NC':
    case 'CONTACT_RISING':
    case 'CONTACT_FALLING':
      return 'I';
    case 'CONTACT_M':
    case 'COIL_M':
      return 'M';
    case 'COIL_O':
    case 'COIL_O_SET':
    case 'COIL_O_RESET':
      return 'O';
    case 'TIMER_TON':
    case 'TIMER_TOF':
    case 'TIMER_TP':
      return 'TIM';
    case 'COUNTER_CTU':
    case 'COUNTER_CTD':
      return 'CTU';
    default:
      return null; // WIRE / COMMENT carry no address
  }
}
