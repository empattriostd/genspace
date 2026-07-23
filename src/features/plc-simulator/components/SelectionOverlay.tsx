import { Trash2, Pencil, X } from 'lucide-react';

interface SelectionOverlayProps {
  count: number;
  onEdit?: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * Floating action bar that appears over the canvas whenever the selection
 * is non-empty — the mobile stand-in for a desktop keyboard's Delete key
 * and the Selection/Multi-Selection features from the brief. onEdit only
 * shows for a single selection (opens PropertyBottomSheet); onDelete
 * removes every selected id via useLadderEditorStore.deleteComponent.
 */
export function SelectionOverlay({ count, onEdit, onDelete, onClear }: SelectionOverlayProps) {
  if (count === 0) return null;

  return (
    <div className="glass absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5">
      <span className="px-2 text-xs font-semibold text-dark dark:text-secondary">
        {count} selected
      </span>
      {count === 1 && onEdit && (
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-full text-primary active:scale-95 active:bg-primary/10"
          aria-label="Edit"
        >
          <Pencil size={15} />
        </button>
      )}
      <button
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 active:scale-95 active:bg-red-500/10"
        aria-label="Delete selection"
      >
        <Trash2 size={15} />
      </button>
      <button
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:scale-95 active:bg-muted/50"
        aria-label="Clear selection"
      >
        <X size={15} />
      </button>
    </div>
  );
}
