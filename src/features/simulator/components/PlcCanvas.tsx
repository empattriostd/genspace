import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import type { LadderElement } from '@/simulator/types/ladder';
import { cn } from '@/utils/cn';

export const GRID = 64; // px per grid cell
export const CELL_W = 96; // element width in px
export const CELL_H = 56; // element height in px

const RAIL_X = 40;
const RAIL_RIGHT_OFFSET = 32;
/** Max horizontal cells per rung before a new rung is auto-created. */
export const MAX_RUNG_CELLS = 12;

function addrLabel(el: LadderElement): string {
  if (el.kind === 'CONTACT') return `${el.address.type}${el.address.number}`;
  if (el.kind === 'COIL') return `${el.address.type}${el.address.number}`;
  if (el.kind === 'TIMER') return `TIM${el.address.number}`;
  if (el.kind === 'COUNTER') return `CNT${el.address.number}`;
  if (el.kind === 'BRANCH_START') return '├';
  if (el.kind === 'BRANCH_END') return '┤';
  if (el.kind === 'WIRE') return '─';
  if (el.kind === 'COMMENT') return el.text || '//';
  return '';
}

function isPowered(elId: string, powered: Record<string, boolean>): boolean {
  return Boolean(powered[elId]);
}

function ElementShape({
  el,
  powered,
  selected,
  connectFrom,
  highlight,
}: {
  el: LadderElement;
  powered: boolean;
  selected: boolean;
  connectFrom: boolean;
  highlight: boolean;
}) {
  const stroke = powered ? '#F26B3A' : '#6B6B6B';
  const fill = powered ? 'rgba(242, 107, 58, 0.12)' : 'rgba(255,255,255,0.6)';
  const label = addrLabel(el);

  if (el.kind === 'COMMENT') {
    return (
      <foreignObject x={0} y={-14} width={CELL_W} height={CELL_H} style={{ overflow: 'visible' }}>
        <div className="rounded-md border border-dashed border-border bg-white/40 px-2 py-1 text-[10px] text-muted-foreground">
          {label}
        </div>
      </foreignObject>
    );
  }

  return (
    <g>
      {highlight && (
        <rect
          x={-CELL_W / 2 - 6}
          y={-CELL_H / 2 - 6}
          width={CELL_W + 12}
          height={CELL_H + 12}
          rx={14}
          fill="none"
          stroke="#F26B3A"
          strokeWidth={2}
          opacity={0.5}
        >
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}
      <rect
        x={-CELL_W / 2}
        y={-CELL_H / 2}
        width={CELL_W}
        height={CELL_H}
        rx={10}
        fill={fill}
        stroke={selected ? '#F26B3A' : connectFrom ? '#F26B3A' : stroke}
        strokeWidth={selected || connectFrom ? 2.5 : 1.5}
      />
      {el.kind === 'CONTACT' && (
        <g stroke={stroke} strokeWidth={1.8}>
          <line x1={-CELL_W / 2 + 8} y1={0} x2={-12} y2={0} />
          <line x1={-12} y1={-14} x2={-12} y2={14} />
          <line x1={12} y1={-14} x2={12} y2={14} />
          <line x1={12} y1={0} x2={CELL_W / 2 - 8} y2={0} />
          {el.mode === 'NC' && <line x1={-16} y1={14} x2={16} y2={-14} />}
        </g>
      )}
      {el.kind === 'COIL' && (
        <g stroke={stroke} strokeWidth={1.8} fill="none">
          <line x1={-CELL_W / 2 + 8} y1={0} x2={-10} y2={0} />
          <circle cx={0} cy={0} r={12} />
          <line x1={10} y1={0} x2={CELL_W / 2 - 8} y2={0} />
        </g>
      )}
      {el.kind === 'TIMER' && (
        <g stroke={stroke} strokeWidth={1.8} fill="none">
          <rect x={-22} y={-16} width={44} height={32} rx={4} />
          <text x={0} y={4} textAnchor="middle" fontSize={11} fill={stroke} stroke="none" fontWeight={600}>
            TON
          </text>
        </g>
      )}
      {el.kind === 'COUNTER' && (
        <g stroke={stroke} strokeWidth={1.8} fill="none">
          <rect x={-22} y={-16} width={44} height={32} rx={4} />
          <text x={0} y={4} textAnchor="middle" fontSize={11} fill={stroke} stroke="none" fontWeight={600}>
            CTU
          </text>
        </g>
      )}
      {el.kind === 'WIRE' && <line x1={-CELL_W / 2} y1={0} x2={CELL_W / 2} y2={0} stroke={stroke} strokeWidth={2} />}
      {(el.kind === 'BRANCH_START' || el.kind === 'BRANCH_END') && <circle cx={0} cy={0} r={6} fill={stroke} />}
      <text
        x={0}
        y={-CELL_H / 2 - 6}
        textAnchor="middle"
        fontSize={10}
        fill={powered ? '#F26B3A' : '#6B6B6B'}
        className="font-mono"
      >
        {label}
      </text>
    </g>
  );
}

export interface PlcCanvasHandle {
  /** Grid cell currently at the center of the scroll viewport. */
  centerGridCell: () => { x: number; y: number };
  /** Scroll so the given grid cell lands near the viewport center. */
  scrollToGrid: (x: number, y: number) => void;
}

export interface PlcCanvasProps {
  className?: string;
  zoom: number;
  highlightId: string | null;
}

const PlcCanvas = forwardRef<PlcCanvasHandle, PlcCanvasProps>(function PlcCanvas(
  { className, zoom, highlightId },
  ref
) {
  const doc = useLadderEditorStore((s) => s.document);
  const selection = useLadderEditorStore((s) => s.selection);
  const dragState = useLadderEditorStore((s) => s.dragState);
  const connectFrom = useLadderEditorStore((s) => s.connectFrom);
  const poweredElements = usePlcStore((s) => s.poweredElements);

  const beginDrag = useLadderEditorStore((s) => s.beginDrag);
  const updateDragPosition = useLadderEditorStore((s) => s.updateDragPosition);
  const endDrag = useLadderEditorStore((s) => s.endDrag);
  const selectElement = useLadderEditorStore((s) => s.selectElement);
  const clearSelection = useLadderEditorStore((s) => s.clearSelection);
  const connect = useLadderEditorStore((s) => s.connect);
  const beginConnect = useLadderEditorStore((s) => s.beginConnect);
  const cancelConnect = useLadderEditorStore((s) => s.cancelConnect);

  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const allElements = useMemo(() => {
    const out: { rungId: string; el: LadderElement; x: number; y: number }[] = [];
    for (const rungId of doc.rungOrder) {
      const rung = doc.rungs[rungId];
      for (const id of rung.elementOrder) {
        const el = rung.elements[id];
        out.push({ rungId, el, x: el.gridX, y: el.gridY });
      }
    }
    return out;
  }, [doc]);

  const width = Math.max(800, (Math.max(...allElements.map((e) => e.x), 4) + 2) * GRID + RAIL_X + RAIL_RIGHT_OFFSET);
  const height = Math.max(400, (Math.max(...allElements.map((e) => e.y), 2) + 2) * GRID);

  const toGrid = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const local = pt.matrixTransform(ctm.inverse());
      return { x: Math.round((local.x - RAIL_X) / GRID), y: Math.round(local.y / GRID) };
    },
    []
  );

  useImperativeHandle(ref, () => ({
    centerGridCell: () => {
      const sc = scrollRef.current;
      if (!sc) return { x: 0, y: 0 };
      const centerX = sc.scrollLeft + sc.clientWidth / 2;
      const centerY = sc.scrollTop + sc.clientHeight / 2;
      const localX = centerX / zoom;
      const localY = centerY / zoom;
      return {
        x: Math.round((localX - RAIL_X) / GRID),
        y: Math.round(localY / GRID),
      };
    },
    scrollToGrid: (x: number, y: number) => {
      const sc = scrollRef.current;
      if (!sc) return;
      const targetX = (RAIL_X + x * GRID) * zoom;
      const targetY = y * GRID * zoom;
      sc.scrollTo({
        left: targetX - sc.clientWidth / 2,
        top: targetY - sc.clientHeight / 2,
        behavior: 'smooth',
      });
    },
  }));

  const onBackgroundDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (connectFrom) {
      cancelConnect();
      return;
    }
    if (!e.shiftKey) clearSelection();
  };

  const onElementDown = (e: React.MouseEvent, rungId: string, el: LadderElement) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (connectFrom) {
      if (connectFrom.rungId === rungId && connectFrom.elementId !== el.id) {
        connect(rungId, connectFrom.elementId, el.id);
      }
      cancelConnect();
      return;
    }

    const additive = e.shiftKey;
    const already = selection.some((s) => s.rungId === rungId && s.elementId === el.id);
    if (!already || !additive) selectElement(rungId, el.id, additive);
    beginDrag(rungId, el.id);
  };

  const onMove = (e: React.MouseEvent) => {
    if (!dragState) {
      const g = toGrid(e.clientX, e.clientY);
      setHoverCell(g);
      return;
    }
    const g = toGrid(e.clientX, e.clientY);
    updateDragPosition(g.x, g.y);
  };

  const onUp = () => {
    if (dragState) endDrag(true);
  };

  const onDoubleClick = (e: React.MouseEvent, rungId: string, el: LadderElement) => {
    e.stopPropagation();
    beginConnect(rungId, el.id);
  };

  // Build connection lines from connectsTo
  const lines: { x1: number; y1: number; x2: number; y2: number; powered: boolean; key: string }[] = [];
  for (const { rungId, el } of allElements) {
    const fromX = RAIL_X + el.gridX * GRID + CELL_W / 2;
    const fromY = el.gridY * GRID;
    for (const targetId of el.connectsTo ?? []) {
      const target = doc.rungs[rungId]?.elements[targetId];
      if (!target) continue;
      const toX = RAIL_X + target.gridX * GRID - CELL_W / 2;
      const toY = target.gridY * GRID;
      const powered = isPowered(el.id, poweredElements);
      lines.push({ x1: fromX, y1: fromY, x2: toX, y2: toY, powered, key: `${el.id}->${targetId}` });
    }
  }
  // Left rail connections (elements with no predecessors connect to rail)
  const referenced = new Set<string>();
  for (const { rungId, el } of allElements) {
    for (const t of el.connectsTo ?? []) referenced.add(`${rungId}:${t}`);
  }
  const railLines: { x: number; y: number; powered: boolean; key: string }[] = [];
  for (const { rungId, el } of allElements) {
    if (el.kind === 'COMMENT') continue;
    if (!referenced.has(`${rungId}:${el.id}`)) {
      railLines.push({
        x: RAIL_X + el.gridX * GRID - CELL_W / 2,
        y: el.gridY * GRID,
        powered: isPowered(el.id, poweredElements),
        key: `rail-${el.id}`,
      });
    }
  }

  return (
    <div ref={scrollRef} className={cn('relative h-full w-full overflow-auto', className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
        onMouseDown={onBackgroundDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        {/* grid — intentionally very light so it guides without distracting */}
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="rgba(107,107,107,0.05)" strokeWidth={1} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="url(#grid)" />

        {/* power rails */}
        <line x1={RAIL_X} y1={0} x2={RAIL_X} y2={height} stroke="#F26B3A" strokeWidth={2.5} opacity={0.85} />
        <line
          x1={width - RAIL_RIGHT_OFFSET}
          y1={0}
          x2={width - RAIL_RIGHT_OFFSET}
          y2={height}
          stroke="#F26B3A"
          strokeWidth={2.5}
          opacity={0.85}
        />

        {/* hover cell — subtle placement guide */}
        {hoverCell && !dragState && (
          <rect
            x={RAIL_X + hoverCell.x * GRID - CELL_W / 2}
            y={hoverCell.y * GRID - CELL_H / 2}
            width={CELL_W}
            height={CELL_H}
            rx={10}
            fill="rgba(242,107,58,0.04)"
            stroke="rgba(242,107,58,0.18)"
            strokeDasharray="3 4"
          />
        )}

        {/* rail-to-element wires */}
        {railLines.map((l) => (
          <line
            key={l.key}
            x1={RAIL_X}
            y1={l.y}
            x2={l.x}
            y2={l.y}
            stroke={l.powered ? '#F26B3A' : '#B8B8B8'}
            strokeWidth={2}
          />
        ))}

        {/* element-to-element wires */}
        {lines.map((l) => (
          <line
            key={l.key}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={l.powered ? '#F26B3A' : '#B8B8B8'}
            strokeWidth={2}
          />
        ))}

        {/* elements */}
        {allElements.map(({ rungId, el }) => {
          const isDrag = dragState?.elementId === el.id;
          const gx = isDrag ? dragState!.previewX : el.gridX;
          const gy = isDrag ? dragState!.previewY : el.gridY;
          const cx = RAIL_X + gx * GRID;
          const cy = gy * GRID;
          const selected = selection.some((s) => s.rungId === rungId && s.elementId === el.id);
          const isConnFrom = connectFrom?.elementId === el.id;
          return (
            <g
              key={el.id}
              transform={`translate(${cx}, ${cy})`}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => onElementDown(e, rungId, el)}
              onDoubleClick={(e) => onDoubleClick(e, rungId, el)}
            >
              <ElementShape
                el={el}
                powered={isPowered(el.id, poweredElements)}
                selected={selected}
                connectFrom={isConnFrom}
                highlight={highlightId === el.id}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
});

export default PlcCanvas;
