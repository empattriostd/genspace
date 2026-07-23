import { GridBackground } from './GridBackground';
import { PowerRail, rightRailXFor } from './PowerRail';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface LadderGridProps {
  camera: CameraState;
  stageWidth: number;
  stageHeight: number;
  /** Widest gridX among all currently loaded elements — used to place the
   * right rail past the last element instead of at a fixed screen edge. */
  maxGridX: number;
  isSimulating: boolean;
}

/**
 * Composes the infinite dot/line grid (GridBackground — unchanged, its
 * viewport-clipped line math is reused as-is) with the two PowerRail
 * lines, themed for the Android canvas. Kept as its own file so the grid
 * "look" (spacing, rail placement) is one place to tune independent of
 * gesture handling in MobileLadderCanvas.
 */
export function LadderGrid({ camera, stageWidth, stageHeight, maxGridX, isSimulating }: LadderGridProps) {
  const worldTop = -camera.y / camera.scale;
  const worldBottom = (stageHeight - camera.y) / camera.scale;

  return (
    <>
      <GridBackground camera={camera} stageWidth={stageWidth} stageHeight={stageHeight} />
      <PowerRail
        worldTop={worldTop}
        worldBottom={worldBottom}
        rightRailX={rightRailXFor(maxGridX)}
        isLive={isSimulating}
      />
    </>
  );
}
