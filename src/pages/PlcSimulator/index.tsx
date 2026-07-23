import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  RotateCcw,
  Save,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Plus,
  Undo2,
  Redo2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { sqliteService, type OfflineProject } from '@/services/localDb/sqliteService';
import { EXAMPLES } from '@/simulator/models/examples';
import type { LadderElement } from '@/simulator/types/ladder';
import type { Address, AddressType } from '@/simulator/types/address';
import type { NewComponentSpec } from '@/simulator/editor/componentSpec';
import PlcCanvas, { MAX_RUNG_CELLS, type PlcCanvasHandle } from '@/features/simulator/components/PlcCanvas';
import AddressPicker from '@/features/simulator/components/AddressPicker';

// ─── Toolbox glyphs (IEC-style) ────────────────────────────────────────
function GlyphNO() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <line x1="0" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="1" x2="16" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphNC() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <line x1="0" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="1" x2="16" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="15" x2="18" y2="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphCoil() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <line x1="0" y1="8" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphTimer() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">T</text>
    </svg>
  );
}
function GlyphCounter() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">C</text>
    </svg>
  );
}
function GlyphMemory() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">M</text>
    </svg>
  );
}
function GlyphBranch() {
  return (
    <svg viewBox="0 0 24 16" width="28" height="20" className="shrink-0">
      <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="8" x2="4" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type ToolKind =
  | 'NO_CONTACT'
  | 'NC_CONTACT'
  | 'COIL'
  | 'TIMER'
  | 'COUNTER'
  | 'MEMORY'
  | 'BRANCH';

const TOOL_ALLOWED_TYPES: Record<ToolKind, AddressType[]> = {
  NO_CONTACT: ['I', 'O', 'M', 'TIM', 'CTU'],
  NC_CONTACT: ['I', 'O', 'M', 'TIM', 'CTU'],
  COIL: ['O', 'M'],
  TIMER: ['TIM'],
  COUNTER: ['CTU'],
  MEMORY: ['M'],
  BRANCH: [],
};

const TOOL_MAX_NUMBER: Record<ToolKind, Partial<Record<AddressType, number>>> = {
  NO_CONTACT: { I: 26, O: 26, M: 999, TIM: 999, CTU: 999 },
  NC_CONTACT: { I: 26, O: 26, M: 999, TIM: 999, CTU: 999 },
  COIL: { O: 26, M: 999 },
  TIMER: { TIM: 999 },
  COUNTER: { CTU: 999 },
  MEMORY: { M: 999 },
  BRANCH: {},
};

const PALETTE: { kind: ToolKind; label: string; Glyph: () => JSX.Element }[] = [
  { kind: 'NO_CONTACT', label: 'NO', Glyph: GlyphNO },
  { kind: 'NC_CONTACT', label: 'NC', Glyph: GlyphNC },
  { kind: 'COIL', label: 'OUT', Glyph: GlyphCoil },
  { kind: 'TIMER', label: 'TIM', Glyph: GlyphTimer },
  { kind: 'COUNTER', label: 'CTU', Glyph: GlyphCounter },
  { kind: 'MEMORY', label: 'MEM', Glyph: GlyphMemory },
  { kind: 'BRANCH', label: 'BRANCH', Glyph: GlyphBranch },
];

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.8;

export default function PlcSimulatorPage() {
  const editor = useLadderEditorStore();
  const plc = usePlcStore();
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<ToolKind | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<PlcCanvasHandle>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveOn] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Address picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTool, setPickerTool] = useState<ToolKind | null>(null);
  const [pickerEditTarget, setPickerEditTarget] = useState<{ rungId: string; el: LadderElement } | null>(null);
  const [pendingCell, setPendingCell] = useState<{ x: number; y: number } | null>(null);

  // IO panel tab
  const [ioTab, setIoTab] = useState<'inputs' | 'outputs'>('inputs');

  const flashHighlight = useCallback((id: string) => {
    setHighlightId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1800);
  }, []);

  const exportResult = useMemo(() => editor.exportToLadderJson(), [editor.document]);

  useEffect(() => {
    if (exportResult.errors.length === 0) plc.loadProject(exportResult.project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportResult.project]);

  useEffect(() => {
    if (!autoSaveOn || exportResult.errors.length > 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const proj: OfflineProject = {
        id: editor.document.id,
        name: editor.document.name,
        ladderJson: JSON.stringify(exportResult.project),
        synced: false,
        updatedAt: new Date().toISOString(),
      };
      await sqliteService.saveProject(proj);
    }, 1200);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [editor.document, autoSaveOn, exportResult]);

  const buildSpec = useCallback(
    (kind: ToolKind, address: Address, gx: number, gy: number): NewComponentSpec | null => {
      switch (kind) {
        case 'NO_CONTACT':
          return { kind: 'CONTACT', mode: 'NO', address, at: { gridX: gx, gridY: gy } };
        case 'NC_CONTACT':
          return { kind: 'CONTACT', mode: 'NC', address, at: { gridX: gx, gridY: gy } };
        case 'COIL':
          return { kind: 'COIL', address, at: { gridX: gx, gridY: gy } };
        case 'TIMER':
          return { kind: 'TIMER', address, presetMs: 2000, at: { gridX: gx, gridY: gy } };
        case 'COUNTER':
          return { kind: 'COUNTER', address, presetCount: 5, at: { gridX: gx, gridY: gy } };
        case 'MEMORY':
          return { kind: 'COIL', address, at: { gridX: gx, gridY: gy } };
        default:
          return null;
      }
    },
    []
  );

  const placeAtCell = useCallback(
    (kind: ToolKind, address: Address, gx: number, gy: number) => {
      let rungId = editor.document.rungOrder[0];
      if (!rungId) rungId = editor.addRung();
      if (!rungId) return;

      const usedCells = new Set<string>();
      for (const id of editor.document.rungs[rungId].elementOrder) {
        const el = editor.document.rungs[rungId].elements[id];
        usedCells.add(`${el.gridX},${el.gridY}`);
      }
      let x = Math.max(0, gx);
      let y = Math.max(0, gy);
      while (usedCells.has(`${x},${y}`)) x += 1;
      if (x >= MAX_RUNG_CELLS) {
        x = 0;
        y += 1;
        while (usedCells.has(`${x},${y}`)) x += 1;
      }

      const spec = buildSpec(kind, address, x, y);
      if (!spec) return;
      const created = editor.addComponent(rungId, spec);
      if (created) {
        flashHighlight(created.id);
        requestAnimationFrame(() => canvasRef.current?.scrollToGrid(x, y));
      }
    },
    [editor, buildSpec, flashHighlight]
  );

  const selectTool = useCallback(
    (kind: ToolKind) => {
      setSelectedTool(kind);
      if (kind === 'BRANCH') {
        if (editor.selection.length === 1) {
          const sel = editor.selection[0];
          const center = canvasRef.current?.centerGridCell() ?? { x: 0, y: 0 };
          editor.branch(sel.rungId, sel.elementId, sel.elementId, { gridX: center.x, gridY: center.y + 1 });
        }
        setSelectedTool(null);
        return;
      }
      setPickerEditTarget(null);
      setPickerTool(kind);
      setPendingCell(canvasRef.current?.centerGridCell() ?? { x: 0, y: 0 });
      setPickerOpen(true);
    },
    [editor]
  );

  const onPlaceAtCell = useCallback(
    (x: number, y: number) => {
      if (!selectedTool || selectedTool === 'BRANCH') return;
      setPickerEditTarget(null);
      setPickerTool(selectedTool);
      setPendingCell({ x, y });
      setPickerOpen(true);
    },
    [selectedTool]
  );

  const onPickerConfirm = useCallback(
    (addr: Address) => {
      setPickerOpen(false);
      if (pickerEditTarget) {
        editor.setElementAddress(pickerEditTarget.rungId, pickerEditTarget.el.id, addr);
        flashHighlight(pickerEditTarget.el.id);
        setPickerEditTarget(null);
        return;
      }
      if (pickerTool && pendingCell) {
        placeAtCell(pickerTool, addr, pendingCell.x, pendingCell.y);
      }
      setPickerTool(null);
      setPendingCell(null);
      setSelectedTool(null);
    },
    [pickerEditTarget, pickerTool, pendingCell, editor, flashHighlight, placeAtCell]
  );

  const onEditElement = useCallback((rungId: string, el: LadderElement) => {
    if (!('address' in el)) return;
    setPickerEditTarget({ rungId, el });
    setPickerTool(null);
    setPickerOpen(true);
  }, []);

  const saveProject = async () => {
    const proj: OfflineProject = {
      id: editor.document.id,
      name: editor.document.name,
      ladderJson: JSON.stringify(exportResult.project),
      synced: false,
      updatedAt: new Date().toISOString(),
    };
    await sqliteService.saveProject(proj);
  };

  const loadExample = (key: keyof typeof EXAMPLES) => {
    editor.loadProject(EXAMPLES[key]);
  };

  const inputNumbers = Array.from({ length: 26 }, (_, i) => i + 1);
  const outputNumbers = Array.from({ length: 26 }, (_, i) => i + 1);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#FFF6EE] md:h-[calc(100vh-4rem)]">
      {/* ─── Top Toolbar (56px) ─────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-2"
        style={{ height: 56 }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
          title="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="mx-1 h-7 w-px bg-gray-200" />

        {/* RUN / STOP / RESET */}
        <button
          onClick={plc.start}
          className={cn(
            'flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors',
            plc.isRunning
              ? 'bg-[#F26B3A] text-white shadow-md'
              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
          )}
        >
          <Play size={16} fill={plc.isRunning ? 'currentColor' : 'none'} />
          RUN
        </button>
        <button
          onClick={plc.stop}
          className={cn(
            'flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors',
            !plc.isRunning
              ? 'bg-gray-700 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
          )}
        >
          <Square size={16} fill={!plc.isRunning ? 'currentColor' : 'none'} />
          STOP
        </button>
        <button
          onClick={plc.reset}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-bold text-gray-700 active:bg-gray-200"
        >
          <RotateCcw size={16} />
          RESET
        </button>

        <div className="mx-1 h-7 w-px bg-gray-200" />

        {/* Save */}
        <button
          onClick={saveProject}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
          title="Save"
        >
          <Save size={20} />
        </button>

        {/* Undo / Redo */}
        <button
          onClick={editor.undo}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={editor.redo}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
          title="Redo"
        >
          <Redo2 size={18} />
        </button>

        <div className="mx-1 h-7 w-px bg-gray-200" />

        {/* Zoom */}
        <button
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.1).toFixed(2)))}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
        >
          <ZoomOut size={18} />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-mono text-gray-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.1).toFixed(2)))}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
        >
          <ZoomIn size={18} />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => editor.addRung()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
            title="Add rung"
          >
            <Plus size={20} />
          </button>
          {editor.selection.length > 0 && (
            <button
              onClick={() => {
                for (const sel of editor.selection) editor.deleteComponent(sel.rungId, sel.elementId);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Ladder Canvas (65-70%) ────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <PlcCanvas
          ref={canvasRef}
          zoom={zoom}
          highlightId={highlightId}
          onPlaceAtCell={selectedTool ? onPlaceAtCell : undefined}
          onEditElement={onEditElement}
        />
        {/* Status badges */}
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              plc.isRunning ? 'bg-[#F26B3A] text-white' : 'bg-gray-200 text-gray-600'
            )}
          >
            {plc.isRunning ? 'RUN' : 'STOP'}
          </span>
          {exportResult.errors.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
              {exportResult.errors.length} err
            </span>
          )}
          {editor.connectFrom && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
              Linking…
            </span>
          )}
          {selectedTool && (
            <span className="rounded-full bg-[#F26B3A]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F26B3A]">
              Tap cell to place
            </span>
          )}
        </div>
        {/* Examples quick-load (collapsed) */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          {(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[]).map((key) => (
            <button
              key={key}
              onClick={() => loadExample(key)}
              className="rounded-lg bg-white/80 px-2 py-1 text-[10px] font-medium text-gray-600 shadow-sm active:bg-white"
            >
              {EXAMPLES[key].name}
            </button>
          ))}
        </div>
        {/* Error detail */}
        {exportResult.errors.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 max-h-20 overflow-y-auto rounded-xl bg-red-500/10 p-2 text-[11px] text-red-600">
            {exportResult.errors.slice(0, 3).map((er, i) => (
              <div key={i}>{er}</div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Component Toolbar (64px) ──────────────────────────────────── */}
      <div
        className="shrink-0 overflow-x-auto border-t border-gray-200 bg-white"
        style={{ height: 64 }}
      >
        <div className="flex h-full items-center gap-2 px-2">
          {PALETTE.map(({ kind, label, Glyph }) => (
            <button
              key={kind}
              onClick={() => selectTool(kind)}
              className={cn(
                'flex h-12 min-w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-colors',
                selectedTool === kind
                  ? 'bg-[#F26B3A] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              )}
            >
              <Glyph />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── IO Panel (bottom fixed) ───────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-200 bg-white">
        {/* Tab switcher */}
        <div className="flex">
          <button
            onClick={() => setIoTab('inputs')}
            className={cn(
              'flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
              ioTab === 'inputs'
                ? 'border-b-2 border-[#F26B3A] text-[#F26B3A]'
                : 'text-gray-400'
            )}
          >
            Inputs I1–I26
          </button>
          <button
            onClick={() => setIoTab('outputs')}
            className={cn(
              'flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
              ioTab === 'outputs'
                ? 'border-b-2 border-[#F26B3A] text-[#F26B3A]'
                : 'text-gray-400'
            )}
          >
            Outputs O1–O26
          </button>
        </div>

        {/* IO grid */}
        <div className="max-h-[140px] overflow-y-auto px-2 pb-2">
          {ioTab === 'inputs' ? (
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-13">
              {inputNumbers.map((n) => {
                const on = plc.state.inputs[n] ?? false;
                return (
                  <button
                    key={n}
                    onClick={() => plc.setInput(n, !on)}
                    className={cn(
                      'flex h-10 flex-col items-center justify-center rounded-lg text-[10px] font-bold transition-all active:scale-95',
                      on
                        ? 'bg-[#F26B3A] text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    )}
                  >
                    <span className="font-mono">I{n}</span>
                    <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', on ? 'bg-white' : 'bg-gray-300')} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-13">
              {outputNumbers.map((n) => {
                const on = plc.state.outputs[n] ?? false;
                return (
                  <div
                    key={n}
                    className={cn(
                      'flex h-10 flex-col items-center justify-center rounded-lg text-[10px] font-bold transition-all',
                      on
                        ? 'bg-[#F26B3A]/15 text-[#F26B3A]'
                        : 'bg-gray-50 text-gray-400'
                    )}
                  >
                    <span className="font-mono">O{n}</span>
                    <span
                      className={cn(
                        'mt-0.5 h-2.5 w-2.5 rounded-full transition-all',
                        on ? 'bg-[#F26B3A] shadow-[0_0_8px_rgba(242,107,58,0.6)]' : 'bg-gray-300'
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Address Picker ────────────────────────────────────────────── */}
      <AddressPicker
        open={pickerOpen}
        allowedTypes={
          pickerTool
            ? TOOL_ALLOWED_TYPES[pickerTool]
            : pickerEditTarget && 'address' in pickerEditTarget.el
              ? [pickerEditTarget.el.address.type]
              : ['I']
        }
        maxForType={pickerTool ? TOOL_MAX_NUMBER[pickerTool] : undefined}
        title={
          pickerEditTarget
            ? 'Edit Address'
            : pickerTool
              ? `New ${PALETTE.find((p) => p.kind === pickerTool)?.label ?? 'Component'}`
              : 'Address'
        }
        initial={
          pickerEditTarget && 'address' in pickerEditTarget.el
            ? pickerEditTarget.el.address
            : null
        }
        onConfirm={onPickerConfirm}
        onCancel={() => {
          setPickerOpen(false);
          setPickerTool(null);
          setPickerEditTarget(null);
          setPendingCell(null);
          setSelectedTool(null);
        }}
      />
    </div>
  );
}
