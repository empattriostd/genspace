import { Group, Line, Circle, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { LadderElement } from '@/simulator/types/ladder';
import { COLOR_POWER_ON, COLOR_INACTIVE, COLOR_SELECTED, GRID_SIZE } from '../constants';

export type InteractionMode = 'select' | 'connect' | 'branch';

interface ElementNodeProps {
  element: LadderElement;
  x: number;
  y: number;
  isPowered: boolean;
  isSelected: boolean;
  isPendingAnchor: boolean;
  interactionMode: InteractionMode;
  onSelect: (id: string) => void;
  onAnchorClick: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, worldX: number, worldY: number) => void;
  onDragEnd: (id: string, worldX: number, worldY: number) => void;
  /** Phase 5: opens the Address/Comment/Alias dialog. */
  onOpenProperties: (id: string) => void;
}

/** Renders one LadderElement as IEC-style ladder symbols — the same visual
 * language as the Phase-1 static mock, now real Konva shapes driven by
 * live element data + simulation power state instead of decoration.
 * Phase 5: power color is green (COLOR_POWER_ON) to match CX-Programmer's
 * live-monitor convention, and double-click opens the property dialog. */
export function ElementNode({
  element,
  x,
  y,
  isPowered,
  isSelected,
  isPendingAnchor,
  interactionMode,
  onSelect,
  onAnchorClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onOpenProperties,
}: ElementNodeProps) {
  const color = isPowered ? COLOR_POWER_ON : COLOR_INACTIVE;
  const draggable = interactionMode === 'select';

  const handleClick = () => {
    if (interactionMode === 'select') onSelect(element.id);
    else onAnchorClick(element.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(element.id, e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(element.id, e.target.x(), e.target.y());
  };

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={() => onOpenProperties(element.id)}
      onDblTap={() => onOpenProperties(element.id)}
      onDragStart={() => onDragStart(element.id)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {(isSelected || isPendingAnchor) && (
        <Rect
          x={-30}
          y={-24}
          width={60}
          height={48}
          cornerRadius={10}
          stroke={COLOR_SELECTED}
          strokeWidth={1.5}
          dash={[4, 3]}
        />
      )}

      <ElementGlyph element={element} color={color} />

      <Text
        text={addressLabel(element)}
        x={-30}
        y={-38}
        width={60}
        align="center"
        fontSize={11}
        fontStyle="bold"
        fill={color}
      />

      {element.alias && (
        <Text text={element.alias} x={-30} y={20} width={60} align="center" fontSize={9} fill="#9A9A9A" />
      )}
    </Group>
  );
}

function addressLabel(element: LadderElement): string {
  if (element.kind === 'COMMENT') return '';
  if (!('address' in element) || !element.address) return '';
  return `${element.address.type}${element.address.number}`;
}

function ElementGlyph({ element, color }: { element: LadderElement; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2 };

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
              fontSize={14}
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
          {modeMark && (
            <Text text={modeMark} x={-5} y={-6} fontSize={13} fontStyle="bold" fill={color} />
          )}
        </>
      );
    }
    case 'TIMER':
    case 'COUNTER':
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, -18, 0]} {...stroke} />
          <Line points={[18, 0, GRID_SIZE / 2, 0]} {...stroke} />
          <Rect x={-18} y={-16} width={36} height={32} cornerRadius={4} {...stroke} />
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
          <Circle radius={4} fill={color} />
        </>
      );
    case 'COMMENT':
      return (
        <>
          <Rect x={-45} y={-16} width={90} height={32} cornerRadius={6} stroke="#B8B8B8" strokeWidth={1} dash={[3, 3]} />
          <Text text={element.text} x={-42} y={-6} width={84} align="center" fontSize={10} fill="#6B6B6B" />
        </>
      );
    default: {
      const _exhaustive: never = element;
      return _exhaustive;
    }
  }
}
