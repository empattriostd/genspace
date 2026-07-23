import { useRef } from 'react';
import { Group, Line, Circle, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { LadderElement as LadderElementModel } from '@/simulator/types/ladder';
import { COLOR_ACTIVE, COLOR_INACTIVE, GRID_SIZE } from '../constants';

/** Android touch target floor (Material guidance: 44-48dp minimum). The
 * IEC glyph itself is drawn at its normal size; this invisible Rect just
 * widens the tappable area around it so thumbs don't miss on a phone. */
const TOUCH_TARGET = 48;
const LONG_PRESS_MS = 450;

interface LadderElementProps {
  element: LadderElementModel;
  x: number;
  y: number;
  isPowered: boolean;
  isSelected: boolean;
  isPendingAnchor: boolean;
  /** True while an armed toolbox tool would place on tap instead of
   * selecting — dims existing elements slightly so the "you're about to
   * place something" state is visually obvious. */
  isPlacingMode: boolean;
  onTap: (id: string) => void;
  onLongPress: (id: string, screenX: number, screenY: number) => void;
}

/**
 * Mobile equivalent of the desktop ElementNode: same IEC-style glyphs
 * (contact / coil / timer / counter / wire / branch / comment) driven by
 * the same live element + poweredElements data, but touch-first —
 * tap-to-select instead of drag, long-press opens the context menu
 * (ContextMenuSheet) instead of a right-click, and powered paths glow in
 * the brand orange per the design brief rather than a flat color swap.
 */
export function LadderElement({
  element,
  x,
  y,
  isPowered,
  isSelected,
  isPendingAnchor,
  isPlacingMode,
  onTap,
  onLongPress,
}: LadderElementProps) {
  const color = isPowered ? COLOR_ACTIVE : COLOR_INACTIVE;
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressMoved = useRef(false);

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handlePointerDown(e: Konva.KonvaEventObject<TouchEvent | MouseEvent>) {
    pressMoved.current = false;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      if (!pressMoved.current) onLongPress(element.id, pos?.x ?? x, pos?.y ?? y);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove() {
    pressMoved.current = true;
    clearPressTimer();
  }

  function handlePointerUp() {
    const wasLongPress = pressTimer.current === null && !pressMoved.current;
    clearPressTimer();
    if (!wasLongPress) onTap(element.id);
  }

  return (
    <Group
      x={x}
      y={y}
      opacity={isPlacingMode ? 0.55 : 1}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      {/* Invisible enlarged hit area — Android minimum touch target */}
      <Rect
        x={-TOUCH_TARGET / 2}
        y={-TOUCH_TARGET / 2}
        width={TOUCH_TARGET}
        height={TOUCH_TARGET}
        fill="transparent"
      />

      {(isSelected || isPendingAnchor) && (
        <Rect
          x={-30}
          y={-24}
          width={60}
          height={48}
          cornerRadius={12}
          stroke={isPendingAnchor ? COLOR_ACTIVE : '#F26B3A'}
          strokeWidth={2}
          dash={isPendingAnchor ? undefined : [5, 4]}
        />
      )}

      <Group shadowColor={isPowered ? COLOR_ACTIVE : undefined} shadowBlur={isPowered ? 14 : 0} shadowOpacity={0.75}>
        <ElementGlyph element={element} color={color} />
      </Group>

      <Text
        text={addressLabel(element)}
        x={-30}
        y={-40}
        width={60}
        align="center"
        fontSize={12}
        fontStyle="bold"
        fill={isPowered ? COLOR_ACTIVE : '#4A4A4A'}
      />

      {element.alias && (
        <Text text={element.alias} x={-30} y={20} width={60} align="center" fontSize={9} fill="#9A9A9A" />
      )}
    </Group>
  );
}

function addressLabel(element: LadderElementModel): string {
  if (element.kind === 'COMMENT') return '';
  if (!('address' in element) || !element.address) return '';
  return `${element.address.type}${element.address.number}`;
}

function ElementGlyph({ element, color }: { element: LadderElementModel; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2.5 };

  switch (element.kind) {
    case 'CONTACT': {
      const isEdge = element.mode === 'RISING_EDGE' || element.mode === 'FALLING_EDGE';
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, -8, 0]} {...stroke} />
          <Line points={[8, 0, GRID_SIZE / 2, 0]} {...stroke} />
          <Line points={[-8, -14, -8, 14]} {...stroke} />
          <Line points={[8, -14, 8, 14]} {...stroke} />
          {element.mode === 'NC' && <Line points={[-9, 13, 9, -13]} {...stroke} />}
          {isEdge && (
            <Text
              text={element.mode === 'RISING_EDGE' ? '↑' : '↓'}
              x={-5}
              y={-32}
              fontSize={15}
              fontStyle="bold"
              fill={color}
            />
          )}
        </>
      );
    }
    case 'COIL': {
      const modeMark = element.coilMode === 'SET' ? 'S' : element.coilMode === 'RESET' ? 'R' : null;
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, -16, 0]} {...stroke} />
          <Line points={[16, 0, GRID_SIZE / 2, 0]} {...stroke} />
          <Circle radius={16} {...stroke} />
          {modeMark && <Text text={modeMark} x={-5} y={-6} fontSize={13} fontStyle="bold" fill={color} />}
        </>
      );
    }
    case 'TIMER':
    case 'COUNTER':
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, -18, 0]} {...stroke} />
          <Line points={[18, 0, GRID_SIZE / 2, 0]} {...stroke} />
          <Rect x={-18} y={-16} width={36} height={32} cornerRadius={5} {...stroke} />
          <Text
            text={element.kind === 'TIMER' ? element.timerType : element.counterType}
            x={-18}
            y={-7}
            width={36}
            align="center"
            fontSize={10}
            fontStyle="bold"
            fill={color}
          />
        </>
      );
    case 'WIRE':
      return <Line points={[-GRID_SIZE / 2, 0, GRID_SIZE / 2, 0]} {...stroke} />;
    case 'BRANCH_START':
    case 'BRANCH_END':
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, GRID_SIZE / 2, 0]} {...stroke} />
          <Circle radius={5} fill={color} />
        </>
      );
    case 'COMMENT':
      return (
        <>
          <Rect x={-45} y={-16} width={90} height={32} cornerRadius={8} stroke="#B8B8B8" strokeWidth={1} dash={[3, 3]} fill="#FFF6EE" />
          <Text text={element.text} x={-42} y={-6} width={84} align="center" fontSize={10} fill="#6B6B6B" />
        </>
      );
    default: {
      const _exhaustive: never = element;
      return _exhaustive;
    }
  }
}
