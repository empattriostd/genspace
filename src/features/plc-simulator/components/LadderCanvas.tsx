import { useRef, useState, Fragment, type DragEvent } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { ElementNode, type InteractionMode } from './ElementNode';
import { PropertyDialog } from './PropertyDialog';
import { ConnectionLine } from './ConnectionLine';
import { GridBackground } from './GridBackground';
import { DRAG_MIME, specForDragKind, addressTypeForDragKind } from './ComponentPalette';
import { gridToWorld, worldToGrid, worldToGridForRung } from '../utils/coords';
import { nextAvailableAddress } from '../utils/addressAllocation';
import { findElementRungId, findElement } from '../utils/findElement';
import { collectElementsInRect, type WorldRect } from '../utils/selection';
import { useElementSize } from '../utils/useElementSize';
import { COLOR_SELECTED, MIN_SCALE, MAX_SCALE, ZOOM_SCALE_BY, RUNG_HEIGHT } from '../constants';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface LadderCanvasProps {
  interactionMode: InteractionMode;
  isSimulating: boolean;
  onAnchorActionDone?: () => void;
  onError?: (message: string) => void;
}

/**
 * The Stage/Layer orchestrator: owns the camera (pan/zoom), the marquee
 * selection gesture, and the two-click flow for Connect/Branch modes.
 * Every actual document mutation goes through useLadderEditorStore's
 * existing actions — this component never touches EditorDocument directly.
 */
export function LadderCanvas({ interactionMode, isSimulating, onAnchorActionDone, onError }: LadderCanvasProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage | null>(null);

  const document = useLadderEditorStore((s) => s.document);
  const selection = useLadderEditorStore((s) => s.selection);
  const selectElement = useLadderEditorStore((s) => s.selectElement);
  const clearSelection = useLadderEditorStore((s) => s.clearSelection);
  const addComponent = useLadderEditorStore((s) => s.addComponent);
  const connect = useLadderEditorStore((s) => s.connect);
  const branch = useLadderEditorStore((s) => s.branch);
  const beginDrag = useLadderEditorStore((s) => s.beginDrag);
  const updateDragPosition = useLadderEditorStore((s) => s.updateDragPosition);
  const endDrag = useLadderEditorStore((s) => s.endDrag);
  const updateElement = useLadderEditorStore((s) => s.updateElement);

  const plcState = usePlcStore((s) => s.state);
  const poweredElements = usePlcStore((s) => s.poweredElements);
  const setInput = usePlcStore((s) => s.setInput);

  const [camera, setCamera] = useState<CameraState>({ x: 80, y: 40, scale: 1 });
  const [pendingAnchorId, setPendingAnchorId] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<WorldRect | null>(null);
  const [propertyDialogElementId, setPropertyDialogElementId] = useState<string | null>(null);

  const marqueeGesture = useRef<{ active: boolean; startX: number; startY: number } | null>(null);
  const panGesture = useRef<{ active: boolean; startScreenX: number; startScreenY: number; startCameraX: number; startCameraY: number; moved: boolean } | null>(null);

  // ── 8. Zoom ────────────────────────────────────────────────────────────
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = camera.scale;
    const worldPointUnderCursor = {
      x: (pointer.x - camera.x) / oldScale,
      y: (pointer.y - camera.y) / oldScale,
    };

    const zoomingIn = e.evt.deltaY < 0;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, zoomingIn ? oldScale * ZOOM_SCALE_BY : oldScale / ZOOM_SCALE_BY)
    );

    setCamera({
      scale: nextScale,
      x: pointer.x - worldPointUnderCursor.x * nextScale,
      y: pointer.y - worldPointUnderCursor.y * nextScale,
    });
  }

  // ── 9. Pan + 10. Selection Box ──────────────────────────────────────────
  // Both gestures start from a mousedown on empty canvas (never on an
  // element — those are handled by ElementNode's own onClick/onDrag).
  // Plain drag = pan. Shift+drag = marquee-select. A drag that barely moves
  // is treated as a plain click that clears selection.
  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;

    const worldPos = stage.getRelativePointerPosition();
    if (!worldPos) return;

    if (e.evt.shiftKey) {
      marqueeGesture.current = { active: true, startX: worldPos.x, startY: worldPos.y };
      setMarqueeRect({ x: worldPos.x, y: worldPos.y, width: 0, height: 0 });
    } else {
      panGesture.current = {
        active: true,
        startScreenX: e.evt.clientX,
        startScreenY: e.evt.clientY,
        startCameraX: camera.x,
        startCameraY: camera.y,
        moved: false,
      };
    }
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage) return;

    if (marqueeGesture.current?.active) {
      const worldPos = stage.getRelativePointerPosition();
      if (!worldPos) return;
      const { startX, startY } = marqueeGesture.current;
      setMarqueeRect({
        x: Math.min(startX, worldPos.x),
        y: Math.min(startY, worldPos.y),
        width: Math.abs(worldPos.x - startX),
        height: Math.abs(worldPos.y - startY),
      });
      return;
    }

    if (panGesture.current?.active) {
      const dx = e.evt.clientX - panGesture.current.startScreenX;
      const dy = e.evt.clientY - panGesture.current.startScreenY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panGesture.current.moved = true;
      setCamera((c) => ({ ...c, x: panGesture.current!.startCameraX + dx, y: panGesture.current!.startCameraY + dy }));
    }
  }

  function handleStageMouseUp() {
    if (marqueeGesture.current?.active) {
      marqueeGesture.current.active = false;
      if (marqueeRect) {
        const ids = collectElementsInRect(document, marqueeRect);
        setMultiSelected(new Set(ids));
        if (ids.length > 0) {
          const rungId = findElementRungId(document, ids[0]);
          if (rungId) selectElement(rungId, ids[0]);
        }
      }
      setMarqueeRect(null);
      return;
    }

    if (panGesture.current?.active) {
      const wasClick = !panGesture.current.moved;
      panGesture.current.active = false;
      if (wasClick) {
        clearSelection();
        setMultiSelected(new Set());
      }
    }
  }

  // ── 3. Palette Drag & Drop ──────────────────────────────────────────────
  function handleDropFromPalette(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dragKind = e.dataTransfer.getData(DRAG_MIME);
    if (!dragKind || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = (screenX - camera.x) / camera.scale;
    const worldY = (screenY - camera.y) / camera.scale;

    const { gridX, gridY, rungIndex } = worldToGrid(worldX, worldY);
    const clampedIndex = Math.min(Math.max(rungIndex, 0), document.rungOrder.length - 1);
    const rungId = document.rungOrder[clampedIndex];
    if (!rungId) return;

    const addressType = addressTypeForDragKind(dragKind);
    const address = addressType ? { type: addressType, number: nextAvailableAddress(document, addressType) } : undefined;
    const spec = specForDragKind(dragKind, address, { gridX, gridY });
    if (spec) addComponent(rungId, spec);
  }

  // ── 5. Drag Element (existing elements) ─────────────────────────────────
  function handleElementDragStart(elementId: string) {
    const rungId = findElementRungId(document, elementId);
    if (rungId) beginDrag(rungId, elementId);
  }

  function handleElementDragMove(elementId: string, worldX: number, worldY: number) {
    const rungId = findElementRungId(document, elementId);
    if (!rungId) return;
    const rungIndex = document.rungOrder.indexOf(rungId);
    const { gridX, gridY } = worldToGridForRung(worldX, worldY, rungIndex);
    updateDragPosition(gridX, gridY);
  }

  function handleElementDragEnd(elementId: string, worldX: number, worldY: number) {
    const rungId = findElementRungId(document, elementId);
    if (!rungId) return;
    const rungIndex = document.rungOrder.indexOf(rungId);
    const { gridX, gridY } = worldToGridForRung(worldX, worldY, rungIndex);
    updateDragPosition(gridX, gridY);
    endDrag(true);
  }

  // ── 6. Connect Elements + 7. Branch Visual Editor (both are a two-click
  // "pick anchor A, then anchor B" flow; which store action fires depends
  // on `interactionMode`) ──────────────────────────────────────────────────
  function handleAnchorClick(elementId: string) {
    if (!pendingAnchorId) {
      setPendingAnchorId(elementId);
      return;
    }
    if (pendingAnchorId === elementId) {
      setPendingAnchorId(null); // clicking the same element again cancels
      return;
    }

    const rungA = findElementRungId(document, pendingAnchorId);
    const rungB = findElementRungId(document, elementId);
    if (!rungA || rungA !== rungB) {
      onError?.('Connect/branch can only link elements within the same rung.');
      setPendingAnchorId(null);
      return;
    }

    if (interactionMode === 'connect') {
      connect(rungA, pendingAnchorId, elementId);
    } else if (interactionMode === 'branch') {
      const a = findElement(document, pendingAnchorId);
      const b = findElement(document, elementId);
      const midGridX = a && b ? Math.round((a.gridX + b.gridX) / 2) : 0;
      const midGridY = a ? a.gridY + 1 : 1; // one row below the main line
      branch(rungA, pendingAnchorId, elementId, { gridX: midGridX, gridY: midGridY });
    }

    setPendingAnchorId(null);
    onAnchorActionDone?.();
  }

  // ── Selection / Highlight Active Path ────────────────────────────────────
  function handleSelectElement(elementId: string) {
    if (isSimulating) {
      const el = findElement(document, elementId);
      if (el?.kind === 'CONTACT' && el.address.type === 'I') {
        setInput(el.address.number, !plcState.inputs[el.address.number]);
        return;
      }
    }
    const rungId = findElementRungId(document, elementId);
    if (rungId) selectElement(rungId, elementId);
    setMultiSelected(new Set([elementId]));
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-3xl"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFromPalette}
    >
      <Stage
        ref={stageRef}
        width={size.width || 1}
        height={size.height || 1}
        x={camera.x}
        y={camera.y}
        scaleX={camera.scale}
        scaleY={camera.scale}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          <GridBackground camera={camera} stageWidth={size.width} stageHeight={size.height} />

          {document.rungOrder.map((rungId, rungIndex) => {
            const rung = document.rungs[rungId];
            return (
              <Fragment key={rungId}>
                <Text
                  text={`Rung ${rungIndex + 1}`}
                  x={-30}
                  y={rungIndex * RUNG_HEIGHT + 12}
                  fontSize={11}
                  fill="#9A9A9A"
                />

                {/* Connection lines first, so element glyphs draw on top */}
                {rung.elementOrder.map((id) => {
                  const el = rung.elements[id];
                  const fromPos = gridToWorld(el.gridX, el.gridY, rungIndex);
                  return (el.connectsTo ?? []).map((targetId) => {
                    const target = rung.elements[targetId];
                    if (!target) return null;
                    const toPos = gridToWorld(target.gridX, target.gridY, rungIndex);
                    return (
                      <ConnectionLine
                        key={`${id}->${targetId}`}
                        from={fromPos}
                        to={toPos}
                        isPowered={isSimulating && !!poweredElements[id]}
                      />
                    );
                  });
                })}

                {rung.elementOrder.map((id) => {
                  const el = rung.elements[id];
                  const pos = gridToWorld(el.gridX, el.gridY, rungIndex);
                  return (
                    <ElementNode
                      key={id}
                      element={el}
                      x={pos.x}
                      y={pos.y}
                      isPowered={isSimulating && !!poweredElements[id]}
                      isSelected={selection?.elementId === id || multiSelected.has(id)}
                      isPendingAnchor={pendingAnchorId === id}
                      interactionMode={interactionMode}
                      onSelect={handleSelectElement}
                      onAnchorClick={handleAnchorClick}
                      onDragStart={handleElementDragStart}
                      onDragMove={handleElementDragMove}
                      onDragEnd={handleElementDragEnd}
                      onOpenProperties={setPropertyDialogElementId}
                    />
                  );
                })}
              </Fragment>
            );
          })}

          {marqueeRect && (
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
              fill="rgba(37,99,235,0.08)"
              stroke={COLOR_SELECTED}
              strokeWidth={1}
              dash={[4, 3]}
            />
          )}
        </Layer>
      </Stage>

      {propertyDialogElementId &&
        (() => {
          const el = findElement(document, propertyDialogElementId);
          const rungId = findElementRungId(document, propertyDialogElementId);
          if (!el || !rungId) return null;
          return (
            <PropertyDialog
              element={el}
              onClose={() => setPropertyDialogElementId(null)}
              onSave={(updates) => updateElement(rungId, propertyDialogElementId, updates)}
            />
          );
        })()}
    </div>
  );
}
