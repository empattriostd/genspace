import { Fragment, useMemo } from 'react';
import { Line } from 'react-konva';
import { GRID_SIZE, LEFT_RAIL_X } from '../constants';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface GridBackgroundProps {
  camera: CameraState;
  stageWidth: number;
  stageHeight: number;
}

/**
 * Draws only the grid lines currently inside the viewport — recomputed from
 * the camera transform on every pan/zoom — which is what makes the grid
 * feel infinite without ever rendering more than a couple hundred lines.
 */
export function GridBackground({ camera, stageWidth, stageHeight }: GridBackgroundProps) {
  const { verticalLines, horizontalLines, worldTop, worldBottom, worldLeft, worldRight } = useMemo(() => {
    const left = -camera.x / camera.scale;
    const right = (stageWidth - camera.x) / camera.scale;
    const top = -camera.y / camera.scale;
    const bottom = (stageHeight - camera.y) / camera.scale;

    const firstCol = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const lastCol = Math.ceil(right / GRID_SIZE) * GRID_SIZE;
    const firstRow = Math.floor(top / GRID_SIZE) * GRID_SIZE;
    const lastRow = Math.ceil(bottom / GRID_SIZE) * GRID_SIZE;

    const vLines: number[] = [];
    for (let x = firstCol; x <= lastCol; x += GRID_SIZE) vLines.push(x);

    const hLines: number[] = [];
    for (let y = firstRow; y <= lastRow; y += GRID_SIZE) hLines.push(y);

    return { verticalLines: vLines, horizontalLines: hLines, worldTop: top, worldBottom: bottom, worldLeft: left, worldRight: right };
  }, [camera.x, camera.y, camera.scale, stageWidth, stageHeight]);

  return (
    <Fragment>
      {verticalLines.map((x) => (
        <Line key={`v-${x}`} points={[x, worldTop, x, worldBottom]} stroke="rgba(128,128,128,0.15)" strokeWidth={1} />
      ))}
      {horizontalLines.map((y) => (
        <Line
          key={`h-${y}`}
          points={[worldLeft, y, worldRight, y]}
          stroke="rgba(128,128,128,0.15)"
          strokeWidth={1}
        />
      ))}
      <Line points={[LEFT_RAIL_X, worldTop, LEFT_RAIL_X, worldBottom]} stroke="#8A8A8A" strokeWidth={3} />
    </Fragment>
  );
}
