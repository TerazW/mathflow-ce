import type {
  TikzFigure, TikzElement, ToolType,
  LineElement, ArrowElement, CircleElement, EllipseElement, ArcElement,
  PlotElement, FillElement, NodeElement, BezierElement, EdgeElement, MatrixElement,
} from '../model/TikzAST';
import { cloneFigure } from '../model/TikzAST';
import { hitTest } from './HitTest';

export interface ToolEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'dblclick';
  mathX: number;
  mathY: number;
  canvasX: number;
  canvasY: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  button?: number;
}

export interface ToolContext {
  figure: TikzFigure;
  snap: boolean;
  gridSize: number;
  currentColor: string;
  currentLineWidth: string;
  currentLineStyle: string;
  updateFigure: (fig: TikzFigure) => void;
  setPreview: (el: TikzElement | null) => void;
  pushUndo: (description: string) => void;
  selectElement: (id: string | null) => void;
  selectElements: (ids: Set<string>) => void;
  openLabelEditor: (at: [number, number], callback: (label: string) => void) => void;
  openPlotDialog: (callback: (fn: string, domain: [number, number]) => void) => void;
  requestRepaint: () => void;
}

export interface Tool {
  name: ToolType;
  cursor: string;
  onEvent(event: ToolEvent, ctx: ToolContext): void;
  reset(): void;
}

function snapCoord(x: number, y: number, ctx: ToolContext): [number, number] {
  if (!ctx.snap) return [x, y];
  const g = ctx.gridSize;
  return [Math.round(x / g) * g, Math.round(y / g) * g];
}

/** Constrain endpoint to 45-degree increments from origin */
function constrainAngle(fromX: number, fromY: number, toX: number, toY: number): [number, number] {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return [toX, toY];
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return [fromX + len * Math.cos(snapped), fromY + len * Math.sin(snapped)];
}

// ==========================================================================
// SELECT TOOL
// ==========================================================================
export class SelectTool implements Tool {
  name: ToolType = 'select';
  cursor = 'default';
  private state: 'idle' | 'dragging' | 'dragging-handle' | 'box-selecting' = 'idle';
  private dragStartMath: [number, number] = [0, 0];
  private dragElementId: string | null = null;
  private dragPointIndex: number | undefined;

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      const hit = hitTest(ctx.figure, event.mathX, event.mathY);
      if (!hit) {
        // Start box selection
        this.state = 'box-selecting';
        this.dragStartMath = [event.mathX, event.mathY];
        ctx.selectElement(null);
        return;
      }

      ctx.selectElement(hit.elementId);
      this.dragStartMath = [mx, my];
      this.dragElementId = hit.elementId;
      this.dragPointIndex = hit.pointIndex;

      const el = ctx.figure.elements.find(e => e.id === hit.elementId);
      if (!el) return;

      if (hit.part === 'endpoint' || hit.part === 'control-point') {
        this.state = 'dragging-handle';
        ctx.pushUndo('Move point');
      } else {
        this.state = 'dragging';
        ctx.pushUndo('Move element');
      }
    }

    if (event.type === 'mousemove') {
      if (this.state === 'box-selecting') {
        // Show a box-select preview rectangle
        const x1 = Math.min(this.dragStartMath[0], event.mathX);
        const y1 = Math.min(this.dragStartMath[1], event.mathY);
        const x2 = Math.max(this.dragStartMath[0], event.mathX);
        const y2 = Math.max(this.dragStartMath[1], event.mathY);
        const preview: LineElement = {
          id: 'box-select-preview',
          type: 'line',
          points: [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]],
          options: { color: 'blue', lineStyle: 'dashed', lineWidth: 'ultra thin' },
        };
        ctx.setPreview(preview);
        return;
      }
      if (this.state !== 'idle' && this.dragElementId) {
        const fig = cloneFigure(ctx.figure);
        const el = fig.elements.find(e => e.id === this.dragElementId);
        if (!el) return;

        const dx = mx - this.dragStartMath[0];
        const dy = my - this.dragStartMath[1];

        if (this.state === 'dragging') {
          moveElement(el, dx, dy);
        } else if (this.state === 'dragging-handle' && this.dragPointIndex !== undefined) {
          moveElementPoint(el, this.dragPointIndex, mx, my);
        }

        this.dragStartMath = [mx, my];
        ctx.updateFigure(fig);
      }
    }

    if (event.type === 'mouseup') {
      if (this.state === 'box-selecting') {
        ctx.setPreview(null);
        // Select all elements whose center/first point is inside the box
        const x1 = Math.min(this.dragStartMath[0], event.mathX);
        const y1 = Math.min(this.dragStartMath[1], event.mathY);
        const x2 = Math.max(this.dragStartMath[0], event.mathX);
        const y2 = Math.max(this.dragStartMath[1], event.mathY);
        // Only do box-select if dragged a meaningful area
        if (Math.abs(x2 - x1) > 0.05 || Math.abs(y2 - y1) > 0.05) {
          const ids = ctx.figure.elements
            .filter(el => {
              const pt = getElementCenter(el);
              return pt[0] >= x1 && pt[0] <= x2 && pt[1] >= y1 && pt[1] <= y2;
            })
            .map(el => el.id);
          if (ids.length > 0) {
            ctx.selectElements(new Set(ids));
          }
        }
      }
      this.state = 'idle';
      this.dragElementId = null;
    }
  }

  reset() {
    this.state = 'idle';
    this.dragElementId = null;
  }
}

function getElementCenter(el: TikzElement): [number, number] {
  switch (el.type) {
    case 'circle': case 'ellipse': case 'arc': return el.center;
    case 'node': return el.at;
    case 'arrow': return [(el.from[0] + el.to[0]) / 2, (el.from[1] + el.to[1]) / 2];
    case 'line': case 'bezier': case 'path':
      if (el.points.length === 0) return [0, 0];
      return el.points[Math.floor(el.points.length / 2)];
    case 'fill':
      if (el.path.length === 0) return [0, 0];
      return el.path[Math.floor(el.path.length / 2)];
    case 'plot': return [(el.domain[0] + el.domain[1]) / 2, 0];
    case 'edge': return [(el.fromPos[0] + el.toPos[0]) / 2, (el.fromPos[1] + el.toPos[1]) / 2];
    case 'matrix': return el.at;
    case 'scope': return [0, 0];
  }
}

function moveElement(el: TikzElement, dx: number, dy: number) {
  switch (el.type) {
    case 'line':
      el.points = el.points.map(([x, y]) => [x + dx, y + dy] as [number, number]);
      break;
    case 'arrow':
      el.from = [el.from[0] + dx, el.from[1] + dy];
      el.to = [el.to[0] + dx, el.to[1] + dy];
      break;
    case 'circle':
    case 'ellipse':
    case 'arc':
      el.center = [el.center[0] + dx, el.center[1] + dy];
      break;
    case 'bezier':
    case 'path':
      el.points = el.points.map(([x, y]) => [x + dx, y + dy] as [number, number]);
      break;
    case 'fill':
      el.path = el.path.map(([x, y]) => [x + dx, y + dy] as [number, number]);
      break;
    case 'node':
      el.at = [el.at[0] + dx, el.at[1] + dy];
      break;
    case 'plot':
      el.domain = [el.domain[0] + dx, el.domain[1] + dx];
      break;
    case 'edge':
      el.fromPos = [el.fromPos[0] + dx, el.fromPos[1] + dy];
      el.toPos = [el.toPos[0] + dx, el.toPos[1] + dy];
      break;
    case 'matrix':
      el.at = [el.at[0] + dx, el.at[1] + dy];
      break;
    case 'scope':
      el.transform.shift = [el.transform.shift[0] + dx, el.transform.shift[1] + dy];
      break;
  }
}

function moveElementPoint(el: TikzElement, pointIndex: number, mx: number, my: number) {
  switch (el.type) {
    case 'line':
      if (pointIndex < el.points.length) el.points[pointIndex] = [mx, my];
      break;
    case 'arrow':
      if (pointIndex === 0) el.from = [mx, my];
      else el.to = [mx, my];
      break;
    case 'circle':
      if (pointIndex === 0) el.center = [mx, my];
      break;
    case 'bezier':
      if (pointIndex < el.points.length) el.points[pointIndex] = [mx, my];
      break;
    case 'path':
      if (pointIndex < el.points.length) el.points[pointIndex] = [mx, my];
      break;
    case 'node':
      el.at = [mx, my];
      break;
  }
}

// ==========================================================================
// LINE TOOL
// ==========================================================================
export class LineTool implements Tool {
  name: ToolType = 'line';
  cursor = 'crosshair';
  private drawing = false;
  private startPoint: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      this.drawing = true;
      this.startPoint = [mx, my];
      ctx.pushUndo('Draw line');
    }

    if (event.type === 'mousemove' && this.drawing) {
      let [ex, ey] = [mx, my] as [number, number];
      if (event.shiftKey) [ex, ey] = constrainAngle(this.startPoint[0], this.startPoint[1], mx, my);
      const preview: LineElement = {
        id: 'preview',
        type: 'line',
        points: [this.startPoint, [ex, ey]],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'mouseup' && this.drawing) {
      this.drawing = false;
      ctx.setPreview(null);

      let [ex, ey] = [mx, my] as [number, number];
      if (event.shiftKey) [ex, ey] = constrainAngle(this.startPoint[0], this.startPoint[1], mx, my);

      const dx = ex - this.startPoint[0];
      const dy = ey - this.startPoint[1];
      if (Math.sqrt(dx * dx + dy * dy) < 0.1) return;

      const fig = cloneFigure(ctx.figure);
      const el: LineElement = {
        id: crypto.randomUUID(),
        type: 'line',
        points: [this.startPoint, [ex, ey]],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    }
  }

  reset() { this.drawing = false; }
}

// ==========================================================================
// ARROW TOOL
// ==========================================================================
export class ArrowTool implements Tool {
  name: ToolType = 'arrow';
  cursor = 'crosshair';
  private drawing = false;
  private startPoint: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      this.drawing = true;
      this.startPoint = [mx, my];
      ctx.pushUndo('Draw arrow');
    }

    if (event.type === 'mousemove' && this.drawing) {
      let [ex, ey] = [mx, my] as [number, number];
      if (event.shiftKey) [ex, ey] = constrainAngle(this.startPoint[0], this.startPoint[1], mx, my);
      const preview: ArrowElement = {
        id: 'preview',
        type: 'arrow',
        from: this.startPoint,
        to: [ex, ey],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, arrow: '->' },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'mouseup' && this.drawing) {
      this.drawing = false;
      ctx.setPreview(null);

      let [ex, ey] = [mx, my] as [number, number];
      if (event.shiftKey) [ex, ey] = constrainAngle(this.startPoint[0], this.startPoint[1], mx, my);

      const dx = ex - this.startPoint[0];
      const dy = ey - this.startPoint[1];
      if (Math.sqrt(dx * dx + dy * dy) < 0.1) return;

      const fig = cloneFigure(ctx.figure);
      const el: ArrowElement = {
        id: crypto.randomUUID(),
        type: 'arrow',
        from: this.startPoint,
        to: [ex, ey],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, arrow: '->' },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    }
  }

  reset() { this.drawing = false; }
}

// ==========================================================================
// CIRCLE TOOL
// ==========================================================================
export class CircleTool implements Tool {
  name: ToolType = 'circle';
  cursor = 'crosshair';
  private drawing = false;
  private center: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      this.drawing = true;
      this.center = [mx, my];
      ctx.pushUndo('Draw circle');
    }

    if (event.type === 'mousemove' && this.drawing) {
      const r = Math.sqrt((mx - this.center[0]) ** 2 + (my - this.center[1]) ** 2);
      const preview: CircleElement = {
        id: 'preview',
        type: 'circle',
        center: this.center,
        radius: r,
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'mouseup' && this.drawing) {
      this.drawing = false;
      ctx.setPreview(null);
      const r = Math.sqrt((mx - this.center[0]) ** 2 + (my - this.center[1]) ** 2);
      if (r < 0.05) return;

      const fig = cloneFigure(ctx.figure);
      const el: CircleElement = {
        id: crypto.randomUUID(),
        type: 'circle',
        center: this.center,
        radius: Math.round(r * 100) / 100,
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    }
  }

  reset() { this.drawing = false; }
}

// ==========================================================================
// BEZIER TOOL
// ==========================================================================
export class BezierTool implements Tool {
  name: ToolType = 'bezier';
  cursor = 'crosshair';
  private phase: 'idle' | 'placed-start' | 'placed-end' = 'idle';
  private startPoint: [number, number] = [0, 0];
  private endPoint: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      if (this.phase === 'idle') {
        this.startPoint = [mx, my];
        this.phase = 'placed-start';
        ctx.pushUndo('Draw bezier');
      } else if (this.phase === 'placed-start') {
        this.endPoint = [mx, my];
        this.phase = 'placed-end';
        // Auto-generate control points
        const midX = (this.startPoint[0] + this.endPoint[0]) / 2;
        const midY = (this.startPoint[1] + this.endPoint[1]) / 2;
        const ctrl1: [number, number] = [
          this.startPoint[0] + (midX - this.startPoint[0]) * 0.5,
          this.startPoint[1] + (midY - this.startPoint[1]) * 0.5 + 0.5,
        ];
        const ctrl2: [number, number] = [
          this.endPoint[0] - (this.endPoint[0] - midX) * 0.5,
          this.endPoint[1] - (this.endPoint[1] - midY) * 0.5 + 0.5,
        ];

        const fig = cloneFigure(ctx.figure);
        const el: BezierElement = {
          id: crypto.randomUUID(),
          type: 'bezier',
          points: [this.startPoint, ctrl1, ctrl2, this.endPoint],
          options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth },
        };
        fig.elements.push(el);
        ctx.updateFigure(fig);
        ctx.selectElement(el.id);
        ctx.setPreview(null);
        this.phase = 'idle';
      }
    }

    if (event.type === 'mousemove' && this.phase === 'placed-start') {
      const preview: LineElement = {
        id: 'preview',
        type: 'line',
        points: [this.startPoint, [mx, my]],
        options: { color: ctx.currentColor, lineStyle: 'dashed' },
      };
      ctx.setPreview(preview);
    }
  }

  reset() {
    this.phase = 'idle';
  }
}

// ==========================================================================
// LABEL TOOL
// ==========================================================================
export class LabelTool implements Tool {
  name: ToolType = 'label';
  cursor = 'text';

  onEvent(event: ToolEvent, ctx: ToolContext) {
    if (event.type !== 'mousedown') return;
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    ctx.openLabelEditor([mx, my], (label: string) => {
      if (!label.trim()) return;
      const fig = cloneFigure(ctx.figure);
      ctx.pushUndo('Add label');
      const el: NodeElement = {
        id: crypto.randomUUID(),
        type: 'node',
        at: [mx, my],
        label: label.startsWith('$') ? label : `$${label}$`,
        options: { color: ctx.currentColor },
        nodeOptions: { anchor: 'above' },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    });
  }

  reset() {}
}

// ==========================================================================
// PATH TOOL (multi-point polyline)
// ==========================================================================
export class PathTool implements Tool {
  name: ToolType = 'path';
  cursor = 'crosshair';
  private points: [number, number][] = [];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      if (this.points.length === 0) {
        ctx.pushUndo('Draw path');
      }
      this.points.push([mx, my]);
    }

    if (event.type === 'mousemove' && this.points.length > 0) {
      const preview: LineElement = {
        id: 'preview',
        type: 'line',
        points: [...this.points, [mx, my]],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'dblclick' && this.points.length >= 2) {
      ctx.setPreview(null);
      const fig = cloneFigure(ctx.figure);
      const el: LineElement = {
        id: crypto.randomUUID(),
        type: 'line',
        points: [...this.points],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
      this.points = [];
    }
  }

  reset() { this.points = []; }
}

// ==========================================================================
// ELLIPSE TOOL
// ==========================================================================
export class EllipseTool implements Tool {
  name: ToolType = 'ellipse';
  cursor = 'crosshair';
  private drawing = false;
  private center: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      this.drawing = true;
      this.center = [mx, my];
      ctx.pushUndo('Draw ellipse');
    }

    if (event.type === 'mousemove' && this.drawing) {
      let rx = Math.abs(mx - this.center[0]);
      let ry = Math.abs(my - this.center[1]);
      if (event.shiftKey) { rx = ry = Math.max(rx, ry); } // Shift = circle
      const preview: EllipseElement = {
        id: 'preview',
        type: 'ellipse',
        center: this.center,
        rx: rx || 0.1,
        ry: ry || 0.1,
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'mouseup' && this.drawing) {
      this.drawing = false;
      ctx.setPreview(null);
      let rx = Math.abs(mx - this.center[0]);
      let ry = Math.abs(my - this.center[1]);
      if (event.shiftKey) { rx = ry = Math.max(rx, ry); }
      if (rx < 0.05 && ry < 0.05) return;

      const fig = cloneFigure(ctx.figure);
      const el: EllipseElement = {
        id: crypto.randomUUID(),
        type: 'ellipse',
        center: this.center,
        rx: Math.round(rx * 100) / 100 || 0.1,
        ry: Math.round(ry * 100) / 100 || 0.1,
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    }
  }

  reset() { this.drawing = false; }
}

// ==========================================================================
// ARC TOOL
// ==========================================================================
export class ArcTool implements Tool {
  name: ToolType = 'arc';
  cursor = 'crosshair';
  private phase: 'idle' | 'center-placed' | 'radius-set' = 'idle';
  private center: [number, number] = [0, 0];
  private radius = 0;
  private startAngle = 0;

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      if (this.phase === 'idle') {
        this.center = [mx, my];
        this.phase = 'center-placed';
        ctx.pushUndo('Draw arc');
      } else if (this.phase === 'center-placed') {
        this.radius = Math.sqrt((mx - this.center[0]) ** 2 + (my - this.center[1]) ** 2);
        this.startAngle = Math.atan2(my - this.center[1], mx - this.center[0]) * 180 / Math.PI;
        this.phase = 'radius-set';
      } else if (this.phase === 'radius-set') {
        const endAngle = Math.atan2(my - this.center[1], mx - this.center[0]) * 180 / Math.PI;
        const fig = cloneFigure(ctx.figure);
        const el: ArcElement = {
          id: crypto.randomUUID(),
          type: 'arc',
          center: this.center,
          radius: Math.round(this.radius * 100) / 100,
          startAngle: Math.round(this.startAngle),
          endAngle: Math.round(endAngle),
          options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
        };
        fig.elements.push(el);
        ctx.updateFigure(fig);
        ctx.selectElement(el.id);
        ctx.setPreview(null);
        this.phase = 'idle';
      }
    }

    if (event.type === 'mousemove') {
      if (this.phase === 'center-placed') {
        const r = Math.sqrt((mx - this.center[0]) ** 2 + (my - this.center[1]) ** 2);
        const preview: CircleElement = {
          id: 'preview',
          type: 'circle',
          center: this.center,
          radius: r,
          options: { color: ctx.currentColor, lineStyle: 'dashed', lineWidth: 'ultra thin' },
        };
        ctx.setPreview(preview);
      } else if (this.phase === 'radius-set') {
        const endAngle = Math.atan2(my - this.center[1], mx - this.center[0]) * 180 / Math.PI;
        const preview: ArcElement = {
          id: 'preview',
          type: 'arc',
          center: this.center,
          radius: this.radius,
          startAngle: this.startAngle,
          endAngle,
          options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth },
        };
        ctx.setPreview(preview);
      }
    }
  }

  reset() { this.phase = 'idle'; }
}

// ==========================================================================
// PLOT TOOL — opens dialog for function input
// ==========================================================================
export class PlotTool implements Tool {
  name: ToolType = 'plot';
  cursor = 'crosshair';

  onEvent(event: ToolEvent, ctx: ToolContext) {
    if (event.type !== 'mousedown') return;

    ctx.openPlotDialog((fn: string, domain: [number, number]) => {
      if (!fn.trim()) return;
      ctx.pushUndo('Add plot');
      const fig = cloneFigure(ctx.figure);
      const el: PlotElement = {
        id: crypto.randomUUID(),
        type: 'plot',
        fn,
        domain,
        variable: 'x',
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    });
  }

  reset() {}
}

// ==========================================================================
// FILL TOOL — click points to define fill region
// ==========================================================================
export class FillTool implements Tool {
  name: ToolType = 'fill';
  cursor = 'crosshair';
  private points: [number, number][] = [];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      if (this.points.length === 0) {
        ctx.pushUndo('Add fill');
      }
      this.points.push([mx, my]);
    }

    if (event.type === 'mousemove' && this.points.length > 0) {
      const preview: LineElement = {
        id: 'preview',
        type: 'line',
        points: [...this.points, [mx, my], this.points[0]],
        options: { color: ctx.currentColor, lineStyle: 'dashed', lineWidth: 'ultra thin' },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'dblclick' && this.points.length >= 3) {
      ctx.setPreview(null);
      const fig = cloneFigure(ctx.figure);
      const el: FillElement = {
        id: crypto.randomUUID(),
        type: 'fill',
        path: [...this.points],
        fillOptions: { color: ctx.currentColor, opacity: 0.3 },
        options: { color: ctx.currentColor },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
      this.points = [];
    }
  }

  reset() { this.points = []; }
}

// ==========================================================================
// EDGE TOOL — click two nodes to create a curved arrow between them
// ==========================================================================
export class EdgeTool implements Tool {
  name: ToolType = 'edge';
  cursor = 'crosshair';
  private phase: 'idle' | 'from-placed' = 'idle';
  private fromNodeId: string | null = null;
  private fromPos: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      // Find nearest node element
      const nodeEl = ctx.figure.elements.find(el => {
        if (el.type !== 'node') return false;
        const d = Math.sqrt((el.at[0] - event.mathX) ** 2 + (el.at[1] - event.mathY) ** 2);
        return d < 0.4;
      });

      if (!nodeEl || nodeEl.type !== 'node') {
        // No node nearby — place edge at arbitrary position
        if (this.phase === 'idle') {
          this.fromPos = [mx, my];
          this.fromNodeId = null;
          this.phase = 'from-placed';
          ctx.pushUndo('Add edge');
        } else {
          // Create edge
          const fig = cloneFigure(ctx.figure);
          const el: EdgeElement = {
            id: crypto.randomUUID(),
            type: 'edge',
            from: this.fromNodeId || '',
            to: '',
            fromPos: this.fromPos,
            toPos: [mx, my],
            label: '',
            labelPosition: 'above',
            bend: 0,
            options: { color: ctx.currentColor, arrow: '->' },
          };
          fig.elements.push(el);
          ctx.updateFigure(fig);
          ctx.selectElement(el.id);
          ctx.setPreview(null);
          this.phase = 'idle';
        }
        return;
      }

      if (this.phase === 'idle') {
        this.fromNodeId = nodeEl.name || nodeEl.id;
        this.fromPos = nodeEl.at;
        this.phase = 'from-placed';
        ctx.pushUndo('Add edge');
      } else {
        const fig = cloneFigure(ctx.figure);
        const el: EdgeElement = {
          id: crypto.randomUUID(),
          type: 'edge',
          from: this.fromNodeId || '',
          to: nodeEl.name || nodeEl.id,
          fromPos: this.fromPos,
          toPos: nodeEl.at,
          label: '',
          labelPosition: 'above',
          bend: 0,
          options: { color: ctx.currentColor, arrow: '->' },
        };
        fig.elements.push(el);
        ctx.updateFigure(fig);
        ctx.selectElement(el.id);
        ctx.setPreview(null);
        this.phase = 'idle';
      }
    }

    if (event.type === 'mousemove' && this.phase === 'from-placed') {
      const preview: ArrowElement = {
        id: 'preview',
        type: 'arrow',
        from: this.fromPos,
        to: [mx, my],
        options: { color: ctx.currentColor, lineStyle: 'dashed', arrow: '->' },
      };
      ctx.setPreview(preview);
    }
  }

  reset() { this.phase = 'idle'; this.fromNodeId = null; }
}

// ==========================================================================
// MATRIX TOOL — click to place a matrix
// ==========================================================================
export class MatrixTool implements Tool {
  name: ToolType = 'matrix';
  cursor = 'crosshair';

  onEvent(event: ToolEvent, ctx: ToolContext) {
    if (event.type !== 'mousedown') return;
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    ctx.pushUndo('Add matrix');
    const fig = cloneFigure(ctx.figure);
    const rows = 2, cols = 2;
    const cells: string[][] = [];
    const cellNames: string[][] = [];
    for (let r = 0; r < rows; r++) {
      cells.push([]);
      cellNames.push([]);
      for (let c = 0; c < cols; c++) {
        cells[r].push(`$m_{${r + 1}${c + 1}}$`);
        cellNames[r].push(`m${r + 1}${c + 1}`);
      }
    }
    const el: MatrixElement = {
      id: crypto.randomUUID(),
      type: 'matrix',
      at: [mx, my],
      rows,
      cols,
      cells,
      cellNames,
      rowSep: 1.5,
      colSep: 1.5,
      nodeOptions: { draw: false },
      options: { color: ctx.currentColor },
    };
    fig.elements.push(el);
    ctx.updateFigure(fig);
    ctx.selectElement(el.id);
  }

  reset() {}
}

// ==========================================================================
// RECT TOOL — drag to draw a rectangle (4-point closed line)
// ==========================================================================
export class RectTool implements Tool {
  name: ToolType = 'rect';
  cursor = 'crosshair';
  private drawing = false;
  private startPoint: [number, number] = [0, 0];

  onEvent(event: ToolEvent, ctx: ToolContext) {
    const [mx, my] = snapCoord(event.mathX, event.mathY, ctx);

    if (event.type === 'mousedown') {
      this.drawing = true;
      this.startPoint = [mx, my];
      ctx.pushUndo('Draw rectangle');
    }

    if (event.type === 'mousemove' && this.drawing) {
      let [ex, ey] = [mx, my] as [number, number];
      if (event.shiftKey) {
        // Shift = square
        const size = Math.max(Math.abs(ex - this.startPoint[0]), Math.abs(ey - this.startPoint[1]));
        ex = this.startPoint[0] + size * Math.sign(ex - this.startPoint[0]);
        ey = this.startPoint[1] + size * Math.sign(ey - this.startPoint[1]);
      }
      const [x1, y1] = this.startPoint;
      const preview: LineElement = {
        id: 'preview',
        type: 'line',
        points: [[x1, y1], [ex, y1], [ex, ey], [x1, ey], [x1, y1]],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      ctx.setPreview(preview);
    }

    if (event.type === 'mouseup' && this.drawing) {
      this.drawing = false;
      ctx.setPreview(null);

      let [ex, ey] = [mx, my] as [number, number];
      if (event.shiftKey) {
        const size = Math.max(Math.abs(ex - this.startPoint[0]), Math.abs(ey - this.startPoint[1]));
        ex = this.startPoint[0] + size * Math.sign(ex - this.startPoint[0]);
        ey = this.startPoint[1] + size * Math.sign(ey - this.startPoint[1]);
      }

      const dx = ex - this.startPoint[0];
      const dy = ey - this.startPoint[1];
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;

      const [x1, y1] = this.startPoint;
      const fig = cloneFigure(ctx.figure);
      const el: LineElement = {
        id: crypto.randomUUID(),
        type: 'line',
        points: [[x1, y1], [ex, y1], [ex, ey], [x1, ey], [x1, y1]],
        options: { color: ctx.currentColor, lineWidth: ctx.currentLineWidth, lineStyle: ctx.currentLineStyle },
      };
      fig.elements.push(el);
      ctx.updateFigure(fig);
      ctx.selectElement(el.id);
    }
  }

  reset() { this.drawing = false; }
}

/** Create all tool instances */
export function createTools(): Record<ToolType, Tool> {
  return {
    select: new SelectTool(),
    line: new LineTool(),
    arrow: new ArrowTool(),
    rect: new RectTool(),
    circle: new CircleTool(),
    ellipse: new EllipseTool(),
    arc: new ArcTool(),
    bezier: new BezierTool(),
    plot: new PlotTool(),
    fill: new FillTool(),
    label: new LabelTool(),
    path: new PathTool(),
    edge: new EdgeTool(),
    matrix: new MatrixTool(),
  };
}
