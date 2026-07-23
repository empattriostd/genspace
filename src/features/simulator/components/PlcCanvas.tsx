import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import type { LadderElement } from '@/simulator/types/ladder';
import { cn } from '@/utils/cn';

export const CELL = 64;
export const RAIL_LEFT = 32;
export const RAIL_RIGHT_OFFSET = 32;
export const MAX_RUNG_CELLS = 20;
const ROWS_VISIBLE = 8;

export interface PlcCanvasHandle {
  scrollToGrid: (gx: number, gy: number) => void;
  centerGridCell: () => { x: number; y: number };
}

export interface PlcCanvasProps {
  className?: string;
  zoom: number;
  highlightId: string | null;
  onPlaceAtCell?: (x: number, y: number) => void;
  onEditElement?: (rungId: string, el: LadderElement) => void;
}

function addressLabel(el: LadderElement): string {
  if ('address' in el && el.address) {
    const prefix =
      el.address.type === 'TIM' ? 'T' : el.address.type === 'CTU' ? 'C' : el.address.type;
    return `${prefix}${el.address.number}`;
  }
  if (el.kind === 'WIRE') return '';
  if (el.kind === 'COMMENT') return el.text;
  return '';
}

function ElementGlyph({ el, powered }: { el: LadderElement; powered: boolean }) {
  const color = powered ? '#F26B3A' : '#6B6B6B';
  const stroke = el.kind === 'COIL' ? (powered ? '#F26B3A' : '#6B6B6B') : color;

  switch (el.kind) {
    case 'CONTACT': {
      const slash = el.mode === 'NC';
      return (
        <svg viewBox="0 0 48 32" width="48" height="32" className="overflow-visible">
          <line x1="0" y1="16" x2="14" y2="16" stroke={stroke} strokeWidth="2" />
          <line x1="14" y1="4" x2="14" y2="28" stroke={stroke} strokeWidth="2" />
          <line x1="34" y1="4" x2="34" y2="28" stroke={stroke} strokeWidth="2" />
          <line x1="34" y1="16" x2="48" y2="16" stroke={stroke} strokeWidth="2" />
          {slash && <line x1="12" y1="28" x2="36" y2="4" stroke={stroke} strokeWidth="2" />}
        </svg>
      );
    }
    case 'COIL':
      return (
        <svg viewBox="0 0 48 32" width="48" height="32" className="overflow-visible">
          <line x1="0" y1="16" x2="12" y2="16" stroke={stroke} strokeWidth="2" />
          <circle cx="24" cy="16" r="9" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="36" y1="16" x2="48" y2="16" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'TIMER':
      return (
        <svg viewBox="0 0 48 32" width="48" height="32" className="overflow-visible">
          <line x1="0" y1="16" x2="10" y2="16" stroke={stroke} strokeWidth="2" />
          <rect x="10" y="4" width="28" height="24" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
          <text x="24" y="20" fontSize="10" textAnchor="middle" fill={stroke} fontWeight="bold">T</text>
          <line x1="38" y1="16" x2="48" y2="16" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'COUNTER':
      return (
        <svg viewBox="0 0 48 32" width="48" height="32" className="overflow-visible">
          <line x1="0" y1="16" x2="10" y2="16" stroke={stroke} strokeWidth="2" />
          <rect x="10" y="4" width="28" height="24" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
          <text x="24" y="20" fontSize="10" textAnchor="middle" fill={stroke} fontWeight="bold">C</text>
          <line x1="38" y1="16" x2="48" y2="16" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'WIRE':
      return (
        <svg viewBox="0 0 48 32" width="48" height="32" className="overflow-visible">
          <line x1="0" y1="16" x2="48" y2="16" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'BRANCH_START':
    case 'BRANCH_END':
      return null;
    case 'COMMENT':
      return (
        <span className="text-[10px] italic text-muted-foreground">{el.text}</span>
      );
    default:
      return null;
  }
}

const PlcCanvas = forwardRef<PlcCanvasHandle, PlcCanvasProps>(function PlcCanvas(
  { className, zoom, highlightId, onPlaceAtCell, onEditElement },
  ref
) {
  const editor = useLadderEditorStore();
  const plc = usePlcStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const toGrid = useCallback(
    (clientX: number, clientY: number) => {
      const el = scrollRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const px = (clientX - rect.left - pan.x) / zoom;
      const py = (clientY - rect.top - pan.y) / zoom;
      return {
        x: Math.round((px - RAIL_LEFT) / CELL),
        y: Math.max(0, Math.floor(py / CELL)),
      };
    },
    [pan, zoom]
  );

  useImperativeHandle(ref, () => ({
    scrollToGrid: (gx, gy) => {
      setPan({
        x: Math.min(0, size.w / 2 - (RAIL_LEFT + gx * CELL) * zoom - CELL * zoom / 2),
        y: -gy * CELL * zoom,
      });
    },
    centerGridCell: () => {
      const el = scrollRef.current;
      if (!el) return { x: 2, y: 0 };
      const cx = (-pan.x + el.clientWidth / 2) / zoom;
      const cy = (-pan.y + el.clientHeight / 2) / zoom;
      return {
        x: Math.max(0, Math.round((cx - RAIL_LEFT) / CELL)),
        y: Math.max(0, Math.floor(cy / CELL)),
      };
    },
  }));

  // ── Pan handlers ─────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      // If clicking on background (not an element), start panning
      const target = e.target as HTMLElement;
      if (target.dataset.bg !== 'true') return;
      if (onPlaceAtCell) {
        const g = toGrid(e.clientX, e.clientY);
        onPlaceAtCell(g.x, g.y);
        return;
      }
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pan, onPlaceAtCell, toGrid]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    },
    [isPanning]
  );

  const onPointerUp = useCallback(() => setIsPanning(false), []);

  // ── Build flat list of elements with screen coords ────────────────────
  const flatElements = useMemo(() => {
    const items: {
      rungId: string;
      el: LadderElement;
      sx: number;
      sy: number;
    }[] = [];
    for (const rungId of editor.document.rungOrder) {
      const rung = editor.document.rungs[rungId];
      for (const id of rung.elementOrder) {
        const el = rung.elements[id];
        items.push({
          rungId,
          el,
          sx: RAIL_LEFT + el.gridX * CELL,
          sy: el.gridY * CELL,
        });
      }
    }
    return items;
  }, [editor.document]);

  // ── Build wire list ──────────────────────────────────────────────────
  const wires = useMemo(() => {
    const ws: { x1: number; y1: number; x2: number; y2: number; powered: boolean }[] = [];
    for (const rungId of editor.document.rungOrder) {
      const rung = editor.document.rungs[rungId];
      for (const id of rung.elementOrder) {
        const el = rung.elements[id];
        const sx = RAIL_LEFT + el.gridX * CELL;
        const sy = el.gridY * CELL;
        // Rail-to-start wires: elements with no predecessor get a wire from left rail
        const referenced = new Set<string>();
        for (const oid of rung.elementOrder) {
          for (const t of rung.elements[oid].connectsTo ?? []) referenced.add(t);
        }
        if (el.kind !== 'COMMENT' && !referenced.has(id)) {
          ws.push({ x1: 0, y1: sy + CELL / 2, x2: sx, y2: sy + CELL / 2, powered: plc.poweredElements[id] ?? false });
        }
        for (const targetId of el.connectsTo ?? []) {
          const target = rung.elements[targetId];
          if (!target) continue;
          const tx = RAIL_LEFT + target.gridX * CELL;
          const ty = target.gridY * CELL;
          ws.push({
            x1: sx + CELL,
            y1: sy + CELL / 2,
            x2: tx,
            y2: ty + CELL / 2,
            powered: plc.poweredElements[targetId] ?? false,
          });
        }
      }
    }
    return ws;
  }, [editor.document, plc.poweredElements]);

  const totalRows = useMemo(() => {
    let max = ROWS_VISIBLE;
    for (const rungId of editor.document.rungOrder) {
      for (const id of editor.document.rungs[rungId].elementOrder) {
        const el = editor.document.rungs[rungId].elements[id];
        if (el.gridY + 1 > max) max = el.gridY + 1;
      }
    }
    return max;
  }, [editor.document]);

  return (
    <div
      ref={scrollRef}
      data-bg="true"
      className={cn('relative h-full w-full overflow-hidden touch-none select-none', className)}
      style={{
        backgroundColor: '#FFF6EE',
        backgroundImage: `radial-gradient(circle, rgba(27,27,27,0.07) 1px, transparent 1px)`,
        backgroundSize: `${CELL * zoom}px ${CELL * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: isPanning ? 'grabbing' : onPlaceAtCell ? 'crosshair' : 'grab',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Content layer */}
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: RAIL_LEFT + MAX_RUNG_CELLS * CELL + RAIL_RIGHT_OFFSET,
          height: totalRows * CELL,
        }}
      >
        {/* Left power rail */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{ left: RAIL_LEFT - 2, height: totalRows * CELL, backgroundColor: '#1B1B1B' }}
        />
        {/* Right power rail */}
        <div
          className="absolute top-0 w-1 rounded-full"
          style={{ left: RAIL_LEFT + MAX_RUNG_CELLS * CELL, height: totalRows * CELL, backgroundColor: '#1B1B1B' }}
        />

        {/* Wires */}
        <svg
          className="absolute left-0 top-0 pointer-events-none"
          width={RAIL_LEFT + MAX_RUNG_CELLS * CELL + RAIL_RIGHT_OFFSET}
          height={totalRows * CELL}
        >
          {wires.map((w, i) => (
            <line
              key={i}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={w.powered ? '#F26B3A' : '#9CA3AF'}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Elements */}
        {flatElements.map(({ rungId, el, sx, sy }) => {
          const powered = plc.poweredElements[el.id] ?? false;
          const selected = editor.selection.some((s) => s.elementId === el.id);
          const highlighted = highlightId === el.id;
          return (
            <div
              key={el.id}
              data-el="true"
              className={cn(
                'absolute flex flex-col items-center justify-center rounded-lg transition-all',
                selected && 'ring-2 ring-blue-500',
                highlighted && 'ring-2 ring-primary animate-pulse'
              )}
              style={{
                left: sx,
                top: sy,
                width: CELL,
                height: CELL,
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (onPlaceAtCell) return;
                if (e.shiftKey) editor.selectElement(rungId, el.id, true);
                else editor.selectElement(rungId, el.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onEditElement && 'address' in el) onEditElement(rungId, el);
              }}
            >
              <ElementGlyph el={el} powered={powered} />
              <span className="mt-0.5 text-[9px] font-mono font-semibold text-dark/70">
                {addressLabel(el)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 rounded-md bg-white/80 px-2 py-1 text-[10px] font-mono text-dark/60 shadow-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
});

export default PlcCanvas;
