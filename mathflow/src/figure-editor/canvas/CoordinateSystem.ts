import type { Viewport } from '../model/TikzAST';

/**
 * Converts between mathematical coordinates (y-up, origin anywhere)
 * and Canvas pixel coordinates (y-down, origin at top-left).
 * Maintains equal x/y scale to prevent distortion.
 */
export class CoordinateSystem {
  private scaleX = 1;
  private scaleY = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;

  constructor(
    viewport: Viewport,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    this.viewport = viewport;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.updateTransform();
  }

  updateViewport(viewport: Viewport) {
    this.viewport = viewport;
    this.updateTransform();
  }

  updateCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.updateTransform();
  }

  private updateTransform() {
    const { xMin, xMax, yMin, yMax } = this.viewport;
    const mathWidth = xMax - xMin;
    const mathHeight = yMax - yMin;

    this.scaleX = this.canvasWidth / mathWidth;
    this.scaleY = this.canvasHeight / mathHeight;
    // Use min to maintain equal aspect ratio
    this.scale = Math.min(this.scaleX, this.scaleY);

    // Center the viewport in the canvas
    this.offsetX = (this.canvasWidth - mathWidth * this.scale) / 2;
    this.offsetY = (this.canvasHeight - mathHeight * this.scale) / 2;
  }

  /** Math → Canvas pixel */
  toCanvas(x: number, y: number): [number, number] {
    const px = (x - this.viewport.xMin) * this.scale + this.offsetX;
    const py = (this.viewport.yMax - y) * this.scale + this.offsetY;
    return [px, py];
  }

  /** Canvas pixel → Math */
  toMath(px: number, py: number): [number, number] {
    const x = (px - this.offsetX) / this.scale + this.viewport.xMin;
    const y = this.viewport.yMax - (py - this.offsetY) / this.scale;
    return [x, y];
  }

  /** Convert a math distance to pixel distance */
  toPixelLength(mathLength: number): number {
    return mathLength * this.scale;
  }

  /** Convert a pixel distance to math distance */
  toMathLength(pixelLength: number): number {
    return pixelLength / this.scale;
  }

  /** Snap math coordinates to grid */
  snapToGrid(x: number, y: number, gridSize: number): [number, number] {
    return [
      Math.round(x / gridSize) * gridSize,
      Math.round(y / gridSize) * gridSize,
    ];
  }

  getScale(): number {
    return this.scale;
  }
}
