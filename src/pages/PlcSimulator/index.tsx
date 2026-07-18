import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Play,
  Square,
  RotateCcw,
  Save,
  PanelLeftClose,
  PanelLeftOpen,
  FilePlus,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Copy,
  ClipboardPaste,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { sqliteService, type OfflineProject } from '@/services/localDb/sqliteService';
import { EXAMPLES } from '@/simulator/models/examples';
import type { LadderProject } from '@/simulator/types/ladder';
import type { Address, AddressType } from '@/simulator/types/address';
import type { NewComponentSpec } from '@/simulator/editor/componentSpec';
import PlcCanvas, { MAX_RUNG_CELLS, type PlcCanvasHandle } from '@/features/simulator/components/PlcCanvas';
import StatePanel from '@/features/simulator/components/StatePanel';
import AddressPicker from '@/features/simulator/components/AddressPicker';
import type { LadderElement } from '@/simulator/types/ladder';

// ─── Toolbox glyphs (IEC-style) ────────────────────────────────────────
function GlyphNOContact() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="1" x2="16" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphNCContact() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
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
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphTimer() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor">T</text>
    </svg>
  );
}
function GlyphCounter() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor">C</text>
    </svg>
  );
}
function GlyphMemory() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor">M</text>
    </svg>
  );
}
function GlyphBranch() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="8" x2="4" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphWire() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphComment() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="2" y="2" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
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
  | 'BRANCH'
  | 'WIRE'
  | 'COMMENT';

/** Address types allowed per tool kind. */
const TOOL_ALLOWED_TYPES: Record<ToolKind, AddressType[]> = {
  NO_CONTACT: ['I', 'O', 'M', 'TIM', 'CTU'],
  NC_CONTACT: ['I', 'O', 'M', 'TIM', 'CTU'],
  COIL: ['O', 'M'],
  TIMER: ['TIM'],
  COUNTER: ['CTU'],
  MEMORY: ['M'],
  BRANCH: [],
  WIRE: [],
  COMMENT: [],
};

const TOOL_MAX_NUMBER: Record<ToolKind, Partial<Record<AddressType, number>>> = {
  NO_CONTACT: { I: 26, O: 26, M: 999, TIM: 999, CTU: 999 },
  NC_CONTACT: { I: 26, O: 26, M: 999, TIM: 999, CTU: 999 },
  COIL: { O: 26, M: 999 },
  TIMER: { TIM: 999 },
  COUNTER: { CTU: 999 },
  MEMORY: { M: 999 },
  BRANCH: {},
  WIRE: {},
  COMMENT: {},
};

const PALETTE: { kind: ToolKind; label: string; Glyph: () => JSX.Element }[] = [
  { kind: 'NO_CONTACT', label: 'NO Contact', Glyph: GlyphNOContact },
  { kind: 'NC_CONTACT', label: 'NC Contact', Glyph: GlyphNCContact },
  { kind: 'COIL', label: 'Output Coil', Glyph: GlyphCoil },
  { kind: 'TIMER', label: 'Timer', Glyph: GlyphTimer },
  { kind: 'COUNTER', label: 'Counter', Glyph: GlyphCounter },
  { kind: 'MEMORY', label: 'Memory', Glyph: GlyphMemory },
  { kind: 'BRANCH', label: 'Branch', Glyph: GlyphBranch },
  { kind: 'WIRE', label: 'Wire', Glyph: GlyphWire },
  { kind: 'COMMENT', label: 'Comment', Glyph: GlyphComment },
];

const GENSPACE_EXT = '.genspace';

export default function PlcSimulatorPage() {
  const editor = useLadderEditorStore();
  const plc = usePlcStore();
  const [toolboxOpen, setToolboxOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ToolKind | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<PlcCanvasHandle>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recent, setRecent] = useState<OfflineProject[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [autoSaveOn, setAutoSaveOn] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Address picker state — used for both insertion and editing.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTool, setPickerTool] = useState<ToolKind | null>(null);
  const [pickerEditTarget, setPickerEditTarget] = useState<{ rungId: string; el: LadderElement } | null>(null);
  const [pendingCell, setPendingCell] = useState<{ x: number; y: number } | null>(null);

  const firstRungId = editor.document.rungOrder[0];

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 1.8;

  const flashHighlight = useCallback((id: string) => {
    setHighlightId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1800);
  }, []);

  // Load project into runtime whenever the document changes & is valid
  const exportResult = useMemo(() => editor.exportToLadderJson(), [editor.document]);
  useEffect(() => {
    if (exportResult.errors.length === 0) {
      plc.loadProject(exportResult.project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportResult.project]);

  // Auto-save (debounced)
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

  // Refresh recent list on mount
  useEffect(() => {
    sqliteService.listProjects().then((p) => setRecent(p.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
  }, []);

  // ─── Build a spec from a tool kind + chosen address + cell ───────────
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
        case 'WIRE':
          return { kind: 'WIRE', at: { gridX: gx, gridY: gy } };
        case 'COMMENT':
          return { kind: 'COMMENT', text: 'comment', at: { gridX: gx, gridY: gy } };
        default:
          return null;
      }
    },
    []
  );

  // ─── Place a component at a specific cell (called after address pick) ──
  const placeAtCell = useCallback(
    (kind: ToolKind, address: Address, gx: number, gy: number) => {
      // Auto-create a rung if none exist.
      let rungId = editor.document.rungOrder[0];
      if (!rungId) rungId = editor.addRung();
      if (!rungId) return;

      // Resolve collisions by nudging right; wrap to next row if rung full.
      const usedCells = new Set<string>();
      for (const id of editor.document.rungs[rungId].elementOrder) {
        const el = editor.document.rungs[rungId].elements[id];
        usedCells.add(`${el.gridX},${el.gridY}`);
      }
      let x = Math.max(0, gx);
      let y = Math.max(0, gy);
      while (usedCells.has(`${x},${y}`)) x += 1;
      if (x >= MAX_RUNG_CELLS) {
 x = 0; y += 1; while (usedCells.has(`${x},${y}`)) x += 1; }

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

  // ─── Tool selection: opens address picker (CX-Programmer flow) ────────
  const selectTool = useCallback(
    (kind: ToolKind) => {
      setSelectedTool(kind);
      if (kind === 'BRANCH') {
        // Branch acts on the current selection immediately.
        if (editor.selection.length === 1) {
          const sel = editor.selection[0];
          const center = canvasRef.current?.centerGridCell() ?? { x: 0, y: 0 };
          editor.branch(sel.rungId, sel.elementId, sel.elementId, { gridX: center.x, gridY: center.y + 1 });
        }
        setSelectedTool(null);
        return;
      }
      if (TOOL_ALLOWED_TYPES[kind].length === 0) {
        // WIRE / COMMENT: place at viewport center without an address.
        const center = canvasRef.current?.centerGridCell() ?? { x: 0, y: 0 };
        placeAtCell(kind, { type: 'I', number: 1 }, center.x, center.y);
        setSelectedTool(null);
        return;
      }
      // Addressed component: open the picker, then place at viewport center.
      setPickerEditTarget(null);
      setPickerTool(kind);
      setPendingCell(canvasRef.current?.centerGridCell() ?? { x: 0, y: 0 });
      setPickerOpen(true);
    },
    [editor, placeAtCell]
  );

  // ─── Canvas cell click in placement mode ─────────────────────────────
  const onPlaceAtCell = useCallback(
    (x: number, y: number) => {
      if (!selectedTool) return;
      if (selectedTool === 'BRANCH') return;
      if (TOOL_ALLOWED_TYPES[selectedTool].length === 0) {
        placeAtCell(selectedTool, { type: 'I', number: 1 }, x, y);
        setSelectedTool(null);
        return;
      }
      setPickerEditTarget(null);
      setPickerTool(selectedTool);
      setPendingCell({ x, y });
      setPickerOpen(true);
    },
    [selectedTool, placeAtCell]
  );

  // ─── Address picker confirm ──────────────────────────────────────────
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

  // ─── Double-click element to edit address ────────────────────────────
  const onEditElement = useCallback((rungId: string, el: LadderElement) => {
    if (!('address' in el)) return;
    setPickerEditTarget({ rungId, el });
    setPickerTool(null);
    setPickerOpen(true);
  }, []);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if ((ctrl && e.key.toLowerCase() === 'y') || (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        editor.redo();
      } else if (ctrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        editor.copySelection();
      } else if (ctrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (firstRungId) editor.paste(firstRungId, { gridX: 0, gridY: 0 });
      } else if (ctrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        editor.selectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selection.length === 0) return;
        e.preventDefault();
        for (const sel of editor.selection) editor.deleteComponent(sel.rungId, sel.elementId);
      } else if (e.key === 'Escape') {
        editor.clearSelection();
        editor.cancelConnect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, firstRungId]);

  // ─── Project actions ─────────────────────────────────────────────────
  const newProject = () => {
    editor.resetDocument(`Untitled ${new Date().toLocaleTimeString()}`);
    plc.reset();
  };

  const saveProject = async () => {
    const proj: OfflineProject = {
      id: editor.document.id,
      name: editor.document.name,
      ladderJson: JSON.stringify(exportResult.project),
      synced: false,
      updatedAt: new Date().toISOString(),
    };
    await sqliteService.saveProject(proj);
    setRecent((r) => [proj, ...r.filter((p) => p.id !== proj.id)].slice(0, 20));
  };

  const openProject = async (p: OfflineProject) => {
    const project = JSON.parse(p.ladderJson) as LadderProject;
    editor.loadProject(project);
    setShowRecent(false);
  };

  const deleteRecent = async (id: string) => {
    await sqliteService.deleteProject(id);
    setRecent((r) => r.filter((p) => p.id !== id));
  };

  const exportFile = (ext: '.json' | '.genspace') => {
    const blob = new Blob([JSON.stringify(exportResult.project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editor.document.name}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(String(reader.result)) as LadderProject;
        editor.loadProject(project);
      } catch {
        // ignore malformed
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadExample = (key: keyof typeof EXAMPLES) => {
    editor.loadProject(EXAMPLES[key]);
    setShowExamples(false);
  };

  const scanTime = plc.state.lastScanDurationMs > 0 ? `${plc.state.lastScanDurationMs} ms` : '-- ms';
  const mode = plc.isRunning ? 'RUN' : 'STOP';

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3">
      {/* ─── Top toolbar ─────────────────────────────────────────────── */}
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <Button variant="ghost" size="icon" onClick={() => setToolboxOpen((v) => !v)} title="Toggle toolbox">
          {toolboxOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </Button>
        <div className="mx-1 h-6 w-px bg-border dark:bg-border-dark" />

        <Button variant="ghost" size="icon" onClick={editor.undo} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={editor.redo} title="Redo (Ctrl+Y)">
          <Redo2 size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={editor.copySelection} title="Copy (Ctrl+C)">
          <Copy size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => firstRungId && editor.paste(firstRungId, { gridX: 0, gridY: 0 })}
          title="Paste (Ctrl+V)"
        >
          <ClipboardPaste size={18} />
        </Button>
        <div className="mx-1 h-6 w-px bg-border dark:bg-border-dark" />

        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.1).toFixed(2)))} title="Zoom out">
          <ZoomOut size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.1).toFixed(2)))} title="Zoom in">
          <ZoomIn size={18} />
        </Button>
        <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={newProject} title="New project">
            <FilePlus size={15} /> New
          </Button>
          <Button variant="ghost" size="sm" onClick={saveProject} title="Save project">
            <Save size={15} /> Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowRecent(true)} title="Open project">
            <FolderOpen size={15} /> Open
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowExamples(true)} title="Examples">
            <Plus size={15} /> Examples
          </Button>
          <div className="mx-1 h-6 w-px bg-border dark:bg-border-dark" />
          <Button variant="ghost" size="icon" onClick={() => exportFile('.json')} title="Export JSON">
            <Download size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => exportFile(GENSPACE_EXT)} title="Export .genspace">
            <span className="text-[10px] font-bold">.gs</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Import">
            <Upload size={16} />
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,.genspace" onChange={importFile} className="hidden" />
        </div>
      </div>

      {/* ─── Main workspace ──────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Left toolbox */}
        <AnimatePresence initial={false}>
          {toolboxOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass shrink-0 overflow-hidden rounded-2xl"
            >
              <div className="flex w-16 flex-col gap-1 p-2 lg:w-56">
                <p className="hidden px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:block">
                  Components
                </p>
                {PALETTE.map(({ kind, label, Glyph }) => (
                  <button
                    key={kind}
                    onClick={() => selectTool(kind)}
                    className={cn(
                      'group flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors',
                      'justify-center lg:justify-start',
                      selectedTool === kind
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted/40 dark:hover:bg-white/5'
                    )}
                    title={`Add ${label}`}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        selectedTool === kind ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-dark dark:bg-white/5 dark:text-secondary'
                      )}
                    >
                      <Glyph />
                    </span>
                    <span className="hidden whitespace-nowrap lg:inline">{label}</span>
                  </button>
                ))}
                <div className="mt-1 hidden border-t border-border px-2 pt-2 dark:border-border-dark lg:block">
                  <p className="mb-1 text-[10px] text-muted-foreground">Pick a component, choose its address, then click a cell to place it.</p>
                  <p className="text-[10px] text-muted-foreground">Double-click an element to edit its address.</p>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center canvas */}
        <div className="glass relative min-w-0 flex-1 overflow-hidden rounded-3xl p-2">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
            <Badge variant={plc.isRunning ? 'success' : 'muted'}>{mode}</Badge>
            {exportResult.errors.length > 0 && <Badge variant="outline">{exportResult.errors.length} err</Badge>}
            {editor.connectFrom && <Badge variant="default">Linking…</Badge>}
          </div>
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => firstRungId && editor.addRung()}
              title="Add rung"
            >
              <Plus size={16} />
            </Button>
          </div>
          <div className="h-full w-full overflow-hidden rounded-2xl" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <PlcCanvas
              ref={canvasRef}
              zoom={zoom}
              highlightId={highlightId}
              onPlaceAtCell={selectedTool ? onPlaceAtCell : undefined}
              onEditElement={onEditElement}
            />
          </div>
          {exportResult.errors.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 z-10 max-h-24 overflow-y-auto rounded-xl bg-red-500/10 p-2 text-[11px] text-red-600">
              {exportResult.errors.slice(0, 3).map((er, i) => (
                <div key={i}>{er}</div>
              ))}
            </div>
          )}
        </div>

        {/* Right state panel */}
        <aside className="glass hidden w-64 shrink-0 flex-col gap-2 overflow-hidden rounded-2xl p-3 xl:flex">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Realtime States</h3>
            <Badge variant={plc.isRunning ? 'success' : 'muted'}>{plc.isRunning ? 'LIVE' : 'IDLE'}</Badge>
          </div>
          <div className="min-h-0 flex-1">
            <StatePanel />
          </div>
        </aside>
      </div>

      {/* ─── Bottom status panel ─────────────────────────────────────── */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <Button variant={plc.isRunning ? 'default' : 'outline'} size="sm" onClick={plc.start}>
          <Play size={14} /> RUN
        </Button>
        <Button variant={!plc.isRunning ? 'outline' : 'ghost'} size="sm" onClick={plc.stop}>
          <Square size={14} /> STOP
        </Button>
        <Button variant="ghost" size="sm" onClick={plc.reset}>
          <RotateCcw size={14} /> RESET
        </Button>
        <div className="mx-1 h-6 w-px bg-border dark:bg-border-dark" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Scan Cycle</span>
          <span className="font-mono font-semibold text-dark dark:text-secondary">{scanTime}</span>
        </div>
        <div className="mx-1 h-6 w-px bg-border dark:bg-border-dark" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Mode</span>
          <Badge variant={plc.isRunning ? 'success' : 'muted'}>{mode}</Badge>
        </div>
        <div className="mx-1 h-6 w-px bg-border dark:bg-border-dark" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Scans</span>
          <span className="font-mono font-semibold text-dark dark:text-secondary">{plc.state.scanCount}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <button
            onClick={() => setAutoSaveOn((v) => !v)}
            className={cn('rounded-md px-2 py-1 text-[11px]', autoSaveOn ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground')}
          >
            Auto-save {autoSaveOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* ─── Recent projects modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showRecent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowRecent(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="glass w-full max-w-lg rounded-3xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Recent Projects</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowRecent(false)}>
                  <X size={18} />
                </Button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {recent.length === 0 && <p className="text-sm text-muted-foreground">No saved projects yet.</p>}
                {recent.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl bg-muted/40 p-2 dark:bg-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(p.updatedAt).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openProject(p)}>
                      Open
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRecent(p.id)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Examples modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowExamples(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="glass w-full max-w-lg rounded-3xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Load Example</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowExamples(false)}>
                  <X size={18} />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadExample(key)}
                    className="rounded-xl bg-muted/40 p-3 text-left text-sm font-medium hover:bg-primary/15 hover:text-primary dark:bg-white/5"
                  >
                    {EXAMPLES[key].name}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddressPicker
        open={pickerOpen}
        allowedTypes={pickerTool ? TOOL_ALLOWED_TYPES[pickerTool] : pickerEditTarget && 'address' in pickerEditTarget.el ? [pickerEditTarget.el.address.type] : ['I']}
        maxForType={pickerTool ? TOOL_MAX_NUMBER[pickerTool] : undefined}
        title={pickerEditTarget ? 'Edit Address' : pickerTool ? `New ${PALETTE.find((p) => p.kind === pickerTool)?.label ?? 'Component'}` : 'Address'}
        initial={pickerEditTarget ? ('address' in pickerEditTarget.el ? pickerEditTarget.el.address : null) : null}
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
