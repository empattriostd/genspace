import { Plus, Minus, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  scale: number;
}

/**
 * Floating vertical zoom stack, thumb-reachable in the bottom-right corner
 * of the canvas. Pinch-to-zoom (handled directly in MobileLadderCanvas)
 * covers the main gesture; these buttons are the precise/one-handed
 * fallback plus a readout of the current scale.
 */
export function ZoomControls({ onZoomIn, onZoomOut, onReset, scale }: ZoomControlsProps) {
  return (
    <div className="glass absolute bottom-3 right-3 flex flex-col items-center gap-0.5 rounded-2xl p-1">
      <button
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-dark active:scale-95 active:bg-muted/50 dark:text-secondary dark:active:bg-white/10"
      >
        <Plus size={17} />
      </button>
      <button
        onClick={onReset}
        aria-label="Reset zoom"
        className="flex h-8 w-10 items-center justify-center text-[10px] font-mono font-semibold text-muted-foreground active:scale-95"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-dark active:scale-95 active:bg-muted/50 dark:text-secondary dark:active:bg-white/10"
      >
        <Minus size={17} />
      </button>
      <button
        onClick={onReset}
        aria-label="Fit to screen"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-primary active:scale-95 active:bg-muted/50 dark:active:bg-white/10"
      >
        <Maximize size={15} />
      </button>
    </div>
  );
}
