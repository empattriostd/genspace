import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, RotateCcw, Users, AlertTriangle, Activity, Undo2, Redo2 } from 'lucide-react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { getLocalDb } from '@/services/localDb';
import { TopAppBar } from './TopAppBar';
import { BottomToolbox } from './BottomToolbox';
import { BottomIOPanel } from './BottomIOPanel';
import { MobileLadderCanvas, type MobileLadderCanvasHandle } from './MobileLadderCanvas';
import { ZoomControls } from './ZoomControls';
import { SelectionOverlay } from './SelectionOverlay';
import { PropertyBottomSheet } from './PropertyBottomSheet';
import { ContextMenuSheet } from './ContextMenuSheet';
import { findElement, findElementRungId } from '../utils/findElement';

interface SimulatorPageProps {
  onBack?: () => void;
}

/**
 * Android entry point for the PLC Simulator feature — the mobile
 * counterpart of LadderEditorScreen.tsx. Composition only: every action
 * below delegates straight into useLadderEditorStore / usePlcStore
 * (both untouched), exactly like the desktop screen does. RUN wires to
 * plcRuntime.start() (via usePlcStore.start), STOP to .stop(), RESET to
 * .reset(), input toggles to .setInput(), and every powered/active-path
 * color reads live from .poweredElements — nothing here recomputes
 * simulation state itself.
 */
export function SimulatorPage({ onBack }: SimulatorPageProps) {
  const canvasRef = useRef<MobileLadderCanvasHandle | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [armedTool, setArmedTool] = useState<string | null>(null);
  const [isBranchMode, setIsBranchMode] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [propertyTargetId, setPropertyTargetId] = useState<string | null>(null);
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scale, setScale] = useState(0.85);

  const document = useLadderEditorStore((s) => s.document);
  const deleteComponent = useLadderEditorStore((s) => s.deleteComponent);
  const updateElement = useLadderEditorStore((s) => s.updateElement);
  const addRung = useLadderEditorStore((s) => s.addRung);
  const exportToLadderJson = useLadderEditorStore((s) => s.exportToLadderJson);
  const lastErrors = useLadderEditorStore((s) => s.lastErrors);

  const loadProject = usePlcStore((s) => s.loadProject);
  const start = usePlcStore((s) => s.start);
  const stop = usePlcStore((s) => s.stop);
  const reset = usePlcStore((s) => s.reset);
  const scanCount = usePlcStore((s) => s.state.scanCount);
  const diagnostics = usePlcStore((s) => s.diagnostics);

  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 3500);
    return () => clearTimeout(t);
  }, [errorMessage]);

  useEffect(() => {
    if (lastErrors.length > 0) setErrorMessage(lastErrors[lastErrors.length - 1]);
  }, [lastErrors]);

  function clearSelection() {
    setSelectedId(null);
    setMultiSelected(new Set());
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setMultiSelected(new Set([id]));
  }

  function handleToggleMultiSelect(id: string) {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedId(id);
  }

  function handleLongPress(id: string) {
    setSelectedId(id);
    setMultiSelected(new Set([id]));
    setContextMenuTargetId(id);
  }

  // ── RUN / STOP / RESET — the actual engine integration ────────────────
  function armSimulation(): boolean {
    const { project, errors } = exportToLadderJson();
    if (errors.length > 0) {
      setErrorMessage(errors[0]);
      return false;
    }
    loadProject(project);
    return true;
  }

  function handleToggleRun() {
    if (isSimulating) {
      stop();
      setIsSimulating(false);
      return;
    }
    if (!armSimulation()) return;
    start();
    setIsSimulating(true);
    setArmedTool(null);
    setIsBranchMode(false);
    clearSelection();
  }

  function handleReset() {
    reset();
    setIsSimulating(false);
    setMenuOpen(false);
  }

  // ── Save — persists the exported project via the existing offline-db
  // service (getLocalDb), the same storage layer Materials/Profile use.
  // Doesn't touch the runtime/parser at all; it only serializes the
  // editor document that exportToLadderJson() already produces. ──────────
  async function handleSave() {
    const { project, errors } = exportToLadderJson();
    if (errors.length > 0) {
      setErrorMessage(`Can't save yet: ${errors[0]}`);
      return;
    }
    setIsSaving(true);
    try {
      const db = getLocalDb();
      await db.init();
      await db.set('offline_projects', project.id, project);
    } catch {
      setErrorMessage('Save failed — check device storage.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Selection actions ──────────────────────────────────────────────────
  function deleteSelection() {
    const ids = multiSelected.size > 0 ? [...multiSelected] : selectedId ? [selectedId] : [];
    for (const id of ids) {
      const rungId = findElementRungId(document, id);
      if (rungId) deleteComponent(rungId, id);
    }
    clearSelection();
  }

  const contextMenuElement = contextMenuTargetId ? findElement(document, contextMenuTargetId) : null;
  const propertyElement = propertyTargetId ? findElement(document, propertyTargetId) : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-secondary dark:bg-dark">
      <TopAppBar
        projectName={document.name || 'Untitled Ladder'}
        isRunning={isSimulating}
        isSaving={isSaving}
        onBack={onBack}
        onSave={handleSave}
        onToggleRun={handleToggleRun}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {errorMessage && (
        <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500">
          <AlertTriangle size={13} className="shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {isBranchMode && (
        <div className="bg-primary/10 px-3 py-1.5 text-center text-xs font-medium text-primary">
          Tap two elements in the same rung to branch between them
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <MobileLadderCanvas
          ref={canvasRef}
          isSimulating={isSimulating}
          armedTool={armedTool}
          isBranchMode={isBranchMode}
          multiSelectMode={multiSelectMode}
          selectedId={selectedId}
          multiSelected={multiSelected}
          onSelect={handleSelect}
          onToggleMultiSelect={handleToggleMultiSelect}
          onClearSelection={clearSelection}
          onLongPress={handleLongPress}
          onBranchComplete={() => setIsBranchMode(false)}
          onScaleChange={setScale}
          onError={setErrorMessage}
        />

        <ZoomControls
          scale={scale}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onReset={() => canvasRef.current?.resetView()}
        />

        <SelectionOverlay
          count={multiSelected.size}
          onEdit={selectedId ? () => setPropertyTargetId(selectedId) : undefined}
          onDelete={deleteSelection}
          onClear={clearSelection}
        />
      </div>

      <BottomIOPanel isSimulating={isSimulating} />

      <BottomToolbox
        armedDragKind={armedTool}
        isBranchMode={isBranchMode}
        onArm={(kind) => {
          setArmedTool(kind);
          setIsBranchMode(false);
          clearSelection();
        }}
        onEnterBranchMode={() => {
          setIsBranchMode((v) => !v);
          setArmedTool(null);
          clearSelection();
        }}
        onAddRung={() => addRung()}
      />

      {propertyElement && (
        <PropertyBottomSheet
          element={propertyElement}
          onClose={() => setPropertyTargetId(null)}
          onSave={(updates) => {
            const rungId = findElementRungId(document, propertyElement.id);
            if (rungId) updateElement(rungId, propertyElement.id, updates);
          }}
        />
      )}

      {contextMenuElement && (
        <ContextMenuSheet
          element={contextMenuElement}
          onClose={() => setContextMenuTargetId(null)}
          onEditAddress={() => {
            setPropertyTargetId(contextMenuElement.id);
            setContextMenuTargetId(null);
          }}
          onInsertBranch={() => {
            setIsBranchMode(true);
            setArmedTool(null);
            setContextMenuTargetId(null);
          }}
          onDeleteBranch={() => {
            const rungId = findElementRungId(document, contextMenuElement.id);
            if (rungId) deleteComponent(rungId, contextMenuElement.id);
            setContextMenuTargetId(null);
            clearSelection();
          }}
          onDelete={() => {
            const rungId = findElementRungId(document, contextMenuElement.id);
            if (rungId) deleteComponent(rungId, contextMenuElement.id);
            setContextMenuTargetId(null);
            clearSelection();
          }}
        />
      )}

      {menuOpen && (
        <OverflowMenu
          onClose={() => setMenuOpen(false)}
          onReset={handleReset}
          onToggleMultiSelect={() => {
            setMultiSelectMode((v) => !v);
            setMenuOpen(false);
          }}
          multiSelectMode={multiSelectMode}
          scanCount={scanCount}
          diagnosticsCount={diagnostics.length}
        />
      )}
    </div>
  );
}

function OverflowMenu({
  onClose,
  onReset,
  onToggleMultiSelect,
  multiSelectMode,
  scanCount,
  diagnosticsCount,
}: {
  onClose: () => void;
  onReset: () => void;
  onToggleMultiSelect: () => void;
  multiSelectMode: boolean;
  scanCount: number;
  diagnosticsCount: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="animate-fade-in rounded-t-3xl bg-secondary p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-dark dark:text-secondary">Simulator Menu</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted/50">
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/60 p-3 text-xs dark:bg-white/5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity size={13} /> Scan #{scanCount}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle size={13} /> {diagnosticsCount} diagnostic{diagnosticsCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="space-y-1">
          <MenuRow icon={<RotateCcw size={18} />} label="Reset simulation" onClick={onReset} />
          <MenuRow
            icon={<Users size={18} />}
            label={multiSelectMode ? 'Exit multi-select' : 'Multi-select mode'}
            active={multiSelectMode}
            onClick={onToggleMultiSelect}
          />
          <MenuRow icon={<Undo2 size={18} />} label="Undo" disabled hint="Not yet supported by the editor" />
          <MenuRow icon={<Redo2 size={18} />} label="Redo" disabled hint="Not yet supported by the editor" />
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  active,
  disabled,
  hint,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium disabled:opacity-40 ${
        active ? 'bg-primary/10 text-primary' : 'text-dark active:bg-muted/50 dark:text-secondary dark:active:bg-white/10'
      }`}
      title={hint}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </button>
  );
}
