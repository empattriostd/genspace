import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { LadderGrid } from './LadderGrid';
import { RungRenderer } from './RungRenderer';
import { specForDragKind, addressTypeForDragKind } from './ComponentPalette';
import { worldToGrid } from '../utils/coords';
import { nextAvailableAddress } from '../utils/addressAllocation';
import { findElementRungId, findElement } from '../utils/findElement';
import { useElementSize } from '../utils/useElementSize';
import { MIN_SCALE, MAX_SCALE, ZOOM_SCALE_BY } from '../constants';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

export interface MobileLadderCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface MobileLadderCanvasProps {
  isSimulating: boolean;
  /** dragKind armed from BottomToolbox, or null when in plain select mode. */
  armedTool: string | null;
  /** True while waiting for the second tap of a branch gesture. */
  isBranchMode: boolean;
  multiSelectMode: boolean;
  selectedId: string | null;
  multiSelected: Set<string>;
  onSelect: (id: string) => void;
  onToggleMultiSelect: (id: string) => void;
  onClearSelection: () => void;
  onLongPress: (id: string, screenX: number, screenY: number) => void;
  onBranchComplete: () => void;
  onScaleChange?: (scale: number) => void;
  onError?: (message: string) => void;
}

/**
 * The touch-driven Stage/Layer orchestrator — the mobile counterpart of
 * LadderCanvas.tsx. Every document mutation still goes through
 * useLadderEditorStore's existing actions (addComponent, branch, ...);
 * every powered-path color still comes from usePlcStore's live snapshot.
 * What's different from the desktop canvas is purely the gesture layer:
 * one-finger pan, two-finger pinch-zoom, tap-to-place instead of HTML5
 * drag-and-drop (which mobile WebViews don't support), and a long-press
 * timer instead of right-click for the context menu.
 */
export const MobileLadderCanvas = forwardRef<MobileLadderCanvasHandle, MobileLadderCanvasProps>(
  function MobileLadderCanvas(
    {
      isSimulating,
      armedTool,
      isBranchMode,
      multiSelectMode,
      selectedId,
      multiSelected,
      onSelect,
      onToggleMultiSelect,
      onClearSelection,
      onLongPress,
      onBranchComplete,
      onScaleChange,
      onError,
    },
    ref
  ) {
    const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
    const stageRef = useRef<Konva.Stage | null>(null);

    const document = useLadderEditorStore((s) => s.document);
    const addComponent = useLadderEditorStore((s) => s.addComponent);
    const branch = useLadderEditorStore((s) => s.branch);

    const poweredElements = usePlcStore((s) => s.poweredElements);

    const [camera, setCamera] = useState<CameraState>({ x: 60, y: 40, scale: 0.85 });
    const [pendingAnchorId, setPendingAnchorId] = useState<string | null>(null);

    const panGesture = useRef<{ startX: number; startY: number; camX: number; camY: number; moved: boolean } | null>(null);
    const pinchGesture = useRef<{ startDist: number; startScale: number; center: { x: number; y: number } } | null>(null);

    useEffect(() => onScaleChange?.(camera.scale), [camera.scale, onScaleChange]);
    useEffect(() => {
      if (!isBranchMode) setPendingAnchorId(null);
    }, [isBranchMode]);

    useImperativeHandle(ref, () => ({
      zoomIn: () => setCamera((c) => ({ ...c, scale: Math.min(MAX_SCALE, c.scale * ZOOM_SCALE_BY * 3) })),
      zoomOut: () => setCamera((c) => ({ ...c, scale: Math.max(MIN_SCALE, c.scale / (ZOOM_SCALE_BY * 3)) })),
      resetView: () => setCamera({ x: 60, y: 40, scale: 0.85 }),
    }));

    function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function touchPoint(touch: Touch, stage: Konva.Stage) {
      const rect = stage.container().getBoundingClientRect();
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    // ── Pan + Pinch-zoom (touch) ────────────────────────────────────────
    function handleTouchStart(e: Konva.KonvaEventObject<TouchEvent>) {
      const stage = stageRef.current;
      if (!stage) return;
      const touches = e.evt.touches;

      if (touches.length === 2) {
        panGesture.current = null;
        const p1 = touchPoint(touches[0], stage);
        const p2 = touchPoint(touches[1], stage);
        pinchGesture.current = {
          startDist: distance(p1, p2),
          startScale: camera.scale,
          center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        };
        return;
      }

      if (touches.length === 1 && e.target === stage) {
        const p = touchPoint(touches[0], stage);
        panGesture.current = { startX: p.x, startY: p.y, camX: camera.x, camY: camera.y, moved: false };
      }
    }

    function handleTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
      const stage = stageRef.current;
      if (!stage) return;
      const touches = e.evt.touches;
      e.evt.preventDefault();

      if (touches.length === 2 && pinchGesture.current) {
        const p1 = touchPoint(touches[0], stage);
        const p2 = touchPoint(touches[1], stage);
        const dist = distance(p1, p2);
        const ratio = dist / pinchGesture.current.startDist;
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchGesture.current.startScale * ratio));
        const { center } = pinchGesture.current;
        const worldUnderCenter = { x: (center.x - camera.x) / camera.scale, y: (center.y - camera.y) / camera.scale };
        setCamera({
          scale: nextScale,
          x: center.x - worldUnderCenter.x * nextScale,
          y: center.y - worldUnderCenter.y * nextScale,
        });
        return;
      }

      if (touches.length === 1 && panGesture.current) {
        const p = touchPoint(touches[0], stage);
        const dx = p.x - panGesture.current.startX;
        const dy = p.y - panGesture.current.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panGesture.current.moved = true;
        setCamera((c) => ({ ...c, x: panGesture.current!.camX + dx, y: panGesture.current!.camY + dy }));
      }
    }

    function handleTouchEnd(e: Konva.KonvaEventObject<TouchEvent>) {
      if (e.evt.touches.length > 0) return; // still mid-gesture with remaining fingers
      const wasTap = panGesture.current && !panGesture.current.moved;
      pinchGesture.current = null;
      panGesture.current = null;
      if (wasTap) handleEmptyCanvasTap();
    }

    // ── Pan + Zoom (mouse/trackpad, for desktop-browser testing) ────────
    function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const oldScale = camera.scale;
      const worldPoint = { x: (pointer.x - camera.x) / oldScale, y: (pointer.y - camera.y) / oldScale };
      const zoomingIn = e.evt.deltaY < 0;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoomingIn ? oldScale * ZOOM_SCALE_BY : oldScale / ZOOM_SCALE_BY));
      setCamera({ scale: nextScale, x: pointer.x - worldPoint.x * nextScale, y: pointer.y - worldPoint.y * nextScale });
    }

    function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
      const stage = stageRef.current;
      if (!stage || e.target !== stage) return;
      panGesture.current = { startX: e.evt.clientX, startY: e.evt.clientY, camX: camera.x, camY: camera.y, moved: false };
    }

    function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
      if (!panGesture.current) return;
      const dx = e.evt.clientX - panGesture.current.startX;
      const dy = e.evt.clientY - panGesture.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panGesture.current.moved = true;
      setCamera((c) => ({ ...c, x: panGesture.current!.camX + dx, y: panGesture.current!.camY + dy }));
    }

    function handleMouseUp() {
      const wasTap = panGesture.current && !panGesture.current.moved;
      panGesture.current = null;
      if (wasTap) handleEmptyCanvasTap();
    }

    // ── Tap-to-place / tap-empty-to-deselect ────────────────────────────
    function handleEmptyCanvasTap() {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        if (!armedTool) onClearSelection();
        return;
      }

      if (armedTool) {
        const worldX = (pointer.x - camera.x) / camera.scale;
        const worldY = (pointer.y - camera.y) / camera.scale;
        const { gridX, gridY, rungIndex } = worldToGrid(worldX, worldY);
        const clampedIndex = Math.min(Math.max(rungIndex, 0), document.rungOrder.length - 1);
        const rungId = document.rungOrder[clampedIndex];
        if (!rungId) return;

        const addressType = addressTypeForDragKind(armedTool);
        const address = addressType ? { type: addressType, number: nextAvailableAddress(document, addressType) } : undefined;
        const spec = specForDragKind(armedTool, address, { gridX, gridY });
        if (spec) addComponent(rungId, spec);
        return;
      }

      onClearSelection();
    }

    // ── Element tap / long-press (bubbled up from LadderElement) ────────
    function handleElementTap(elementId: string) {
      if (isBranchMode) {
        if (!pendingAnchorId) {
          setPendingAnchorId(elementId);
          return;
        }
        if (pendingAnchorId === elementId) {
          setPendingAnchorId(null);
          return;
        }
        const rungA = findElementRungId(document, pendingAnchorId);
        const rungB = findElementRungId(document, elementId);
        if (!rungA || rungA !== rungB) {
          onError?.('Branch can only link elements within the same rung.');
          setPendingAnchorId(null);
          return;
        }
        const a = findElement(document, pendingAnchorId);
        const b = findElement(document, elementId);
        const midGridX = a && b ? Math.round((a.gridX + b.gridX) / 2) : 0;
        const midGridY = a ? a.gridY + 1 : 1;
        branch(rungA, pendingAnchorId, elementId, { gridX: midGridX, gridY: midGridY });
        setPendingAnchorId(null);
        onBranchComplete();
        return;
      }

      if (multiSelectMode) {
        onToggleMultiSelect(elementId);
        return;
      }
      onSelect(elementId);
    }

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full touch-none overflow-hidden"
        style={{ touchAction: 'none' }}
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            <LadderGrid
              camera={camera}
              stageWidth={size.width}
              stageHeight={size.height}
              maxGridX={maxGridX(document)}
              isSimulating={isSimulating}
            />

            {document.rungOrder.map((rungId, rungIndex) => (
              <RungRenderer
                key={rungId}
                rung={document.rungs[rungId]}
                rungIndex={rungIndex}
                isSimulating={isSimulating}
                poweredElements={poweredElements}
                selectedId={selectedId}
                multiSelected={multiSelected}
                pendingAnchorId={pendingAnchorId}
                isPlacingMode={!!armedTool}
                onElementTap={handleElementTap}
                onElementLongPress={onLongPress}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    );
  }
);

function maxGridX(document: ReturnType<typeof useLadderEditorStore.getState>['document']): number {
  let max = 4;
  for (const rungId of document.rungOrder) {
    for (const id of document.rungs[rungId].elementOrder) {
      max = Math.max(max, document.rungs[rungId].elements[id].gridX);
    }
  }
  return max;
}
