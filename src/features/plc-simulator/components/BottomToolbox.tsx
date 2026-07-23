import { Plus, GitBranch } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ToolDef {
  id: string;
  label: string;
  glyph: string;
  /** Tapping while already armed cycles to the next dragKind in this list
   * (e.g. NO -> Rising Edge). specForDragKind/addressTypeForDragKind in
   * ComponentPalette.tsx already understand every one of these kinds. */
  variants: string[];
}

const TOOLS: ToolDef[] = [
  { id: 'NO', label: 'NO', glyph: '⊣ ⊢', variants: ['CONTACT_NO', 'CONTACT_RISING'] },
  { id: 'NC', label: 'NC', glyph: '⊣╱⊢', variants: ['CONTACT_NC', 'CONTACT_FALLING'] },
  { id: 'OUT', label: 'OUT', glyph: '( )', variants: ['COIL_O', 'COIL_O_SET', 'COIL_O_RESET'] },
  { id: 'TIM', label: 'TIM', glyph: '⏱', variants: ['TIMER_TON', 'TIMER_TOF', 'TIMER_TP'] },
  { id: 'CTU', label: 'CTU', glyph: '#', variants: ['COUNTER_CTU', 'COUNTER_CTD'] },
  { id: 'MEM', label: 'MEM', glyph: 'M', variants: ['CONTACT_M', 'COIL_M'] },
  { id: 'LINE', label: 'LINE', glyph: '──', variants: ['WIRE'] },
  { id: 'COMMENT', label: 'CMT', glyph: '▭', variants: ['COMMENT'] },
];

interface BottomToolboxProps {
  armedDragKind: string | null;
  isBranchMode: boolean;
  onArm: (dragKind: string | null) => void;
  onEnterBranchMode: () => void;
  onAddRung: () => void;
}

/**
 * Android-first replacement for the desktop drag-and-drop ComponentPalette
 * (HTML5 drag doesn't work reliably on touch browsers). Tapping a tile
 * "arms" that component; the next tap on empty canvas in MobileLadderCanvas
 * places it via the same useLadderEditorStore.addComponent action the
 * desktop drag-drop flow already uses. Tapping an already-armed tile
 * cycles through its variants (e.g. NO Contact -> Rising Edge Contact)
 * instead of re-arming the same thing.
 */
export function BottomToolbox({ armedDragKind, isBranchMode, onArm, onEnterBranchMode, onAddRung }: BottomToolboxProps) {
  function handleTap(tool: ToolDef) {
    const currentIndex = tool.variants.indexOf(armedDragKind ?? '');
    if (currentIndex === -1) {
      onArm(tool.variants[0]);
    } else if (currentIndex === tool.variants.length - 1) {
      onArm(null); // tapping the last variant a third time disarms
    } else {
      onArm(tool.variants[currentIndex + 1]);
    }
  }

  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-secondary/95 px-2 py-2 backdrop-blur-glass dark:border-border-dark dark:bg-dark/95">
      {TOOLS.map((tool) => {
        const variantIndex = tool.variants.indexOf(armedDragKind ?? '');
        const isArmed = variantIndex !== -1;
        const variantLabel = isArmed && variantIndex > 0 ? variantHint(armedDragKind!) : null;
        return (
          <button
            key={tool.id}
            onClick={() => handleTap(tool)}
            className={cn(
              'flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[11px] font-semibold transition-all active:scale-95',
              isArmed
                ? 'border-transparent bg-primary text-white shadow-sm'
                : 'border-border bg-white/70 text-dark dark:border-border-dark dark:bg-white/5 dark:text-secondary'
            )}
          >
            <span className="font-mono text-sm leading-none">{tool.glyph}</span>
            <span>{variantLabel ?? tool.label}</span>
          </button>
        );
      })}

      <button
        onClick={onEnterBranchMode}
        className={cn(
          'flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[11px] font-semibold transition-all active:scale-95',
          isBranchMode
            ? 'border-transparent bg-primary text-white shadow-sm'
            : 'border-border bg-white/70 text-dark dark:border-border-dark dark:bg-white/5 dark:text-secondary'
        )}
      >
        <GitBranch size={16} />
        <span>BRANCH</span>
      </button>

      <button
        onClick={onAddRung}
        className="flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-dashed border-primary/60 text-[11px] font-semibold text-primary active:scale-95"
      >
        <Plus size={16} />
        <span>RUNG</span>
      </button>
    </div>
  );
}

function variantHint(dragKind: string): string {
  switch (dragKind) {
    case 'CONTACT_RISING':
      return '↑ EDGE';
    case 'CONTACT_FALLING':
      return '↓ EDGE';
    case 'COIL_O_SET':
      return 'SET';
    case 'COIL_O_RESET':
      return 'RESET';
    case 'TIMER_TOF':
      return 'TOF';
    case 'TIMER_TP':
      return 'TP';
    case 'COUNTER_CTD':
      return 'CTD';
    case 'COIL_M':
      return 'M COIL';
    default:
      return 'NO';
  }
}
