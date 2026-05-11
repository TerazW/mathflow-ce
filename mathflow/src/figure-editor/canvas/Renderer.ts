import type {
  TikzFigure, TikzElement, DrawOptions,
  LineElement, ArrowElement, CircleElement, EllipseElement,
  ArcElement, BezierElement, PathElement, PlotElement,
  FillElement, NodeElement, EdgeElement, MatrixElement, ScopeElement,
} from '../model/TikzAST';
import { TIKZ_COLORS, TIKZ_LINE_WIDTHS, TIKZ_LINE_STYLES } from '../model/TikzAST';
import { CoordinateSystem } from './CoordinateSystem';
import { getElementBBox } from '../interaction/HitTest';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private coords: CoordinateSystem;
  /** When true, skip canvas text drawing for labels (KaTeX overlay handles them) */
  public skipLabelText = false;

  constructor(
    ctx: CanvasRenderingContext2D,
    coords: CoordinateSystem,
  ) {
    this.ctx = ctx;
    this.coords = coords;
  }

  render(
    figure: TikzFigure,
    selectedIds: Set<string>,
    preview: TikzElement | null,
  ) {
    const { ctx } = this;
    const w = this.coords.canvasWidth;
    const h = this.coords.canvasHeight;

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (figure.showGrid) {
      this.drawGrid(figure);
    }

    // Axes
    if (figure.showAxes) {
      this.drawAxes(figure);
    }

    // Elements
    for (const el of figure.elements) {
      this.drawElement(el);
    }

    // Preview
    if (preview) {
      ctx.globalAlpha = 0.6;
      this.drawElement(preview);
      ctx.globalAlpha = 1;
    }

    // Selection overlays
    for (const el of figure.elements) {
      if (selectedIds.has(el.id)) {
        this.drawSelectionOverlay(el);
      }
    }
  }

  private drawGrid(figure: TikzFigure) {
    const { ctx, coords } = this;
    const { xMin, xMax, yMin, yMax } = figure.viewport;
    const gridSize = 0.5;

    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    // Vertical lines
    for (let x = Math.ceil(xMin / gridSize) * gridSize; x <= xMax; x += gridSize) {
      const [px1, py1] = coords.toCanvas(x, yMin);
      const [px2, py2] = coords.toCanvas(x, yMax);
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = Math.ceil(yMin / gridSize) * gridSize; y <= yMax; y += gridSize) {
      const [px1, py1] = coords.toCanvas(xMin, y);
      const [px2, py2] = coords.toCanvas(xMax, y);
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }
  }

  private drawAxes(figure: TikzFigure) {
    const { ctx, coords } = this;
    const { xMin, xMax, yMin, yMax } = figure.viewport;

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // X axis
    const [x0, y0] = coords.toCanvas(xMin - 0.2, 0);
    const [x1, _y1] = coords.toCanvas(xMax + 0.2, 0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.stroke();
    this.drawArrowHead(x1, y0, 0);

    // Y axis
    const [ax, ay0] = coords.toCanvas(0, yMin - 0.2);
    const [_ax2, ay1] = coords.toCanvas(0, yMax + 0.2);
    ctx.beginPath();
    ctx.moveTo(ax, ay0);
    ctx.lineTo(ax, ay1);
    ctx.stroke();
    this.drawArrowHead(ax, ay1, -Math.PI / 2);

    // Labels
    ctx.fillStyle = '#444';
    ctx.font = '12px serif';
    ctx.textAlign = 'left';
    ctx.fillText('x', x1 + 4, y0 + 4);
    ctx.fillText('y', ax + 4, ay1 - 4);
  }

  private applyDrawStyle(opts: DrawOptions) {
    const { ctx } = this;
    ctx.strokeStyle = TIKZ_COLORS[opts.color || 'black'] || opts.color || '#000';
    ctx.lineWidth = TIKZ_LINE_WIDTHS[opts.lineWidth || 'thin'] || 1;
    const dashArray = TIKZ_LINE_STYLES[opts.lineStyle || 'solid'] || [];
    ctx.setLineDash(dashArray);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  drawElement(el: TikzElement) {
    switch (el.type) {
      case 'line': this.drawLine(el); break;
      case 'arrow': this.drawArrow(el); break;
      case 'circle': this.drawCircle(el); break;
      case 'ellipse': this.drawEllipse(el); break;
      case 'arc': this.drawArc(el); break;
      case 'bezier': this.drawBezier(el); break;
      case 'path': this.drawPath(el); break;
      case 'plot': this.drawPlot(el); break;
      case 'fill': this.drawFill(el); break;
      case 'node': this.drawNode(el); break;
      case 'edge': this.drawEdge(el); break;
      case 'matrix': this.drawMatrix(el); break;
      case 'scope': this.drawScope(el); break;
    }
  }

  private drawLine(el: LineElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    ctx.beginPath();
    for (let i = 0; i < el.points.length; i++) {
      const [px, py] = coords.toCanvas(...el.points[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  private drawArrow(el: ArrowElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [x0, y0] = coords.toCanvas(...el.from);
    const [x1, y1] = coords.toCanvas(...el.to);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    const arrow = el.options.arrow || '->';
    const angle = Math.atan2(y1 - y0, x1 - x0);
    if (arrow.includes('>')) {
      this.drawArrowHead(x1, y1, angle);
    }
    if (arrow.includes('<')) {
      this.drawArrowHead(x0, y0, angle + Math.PI);
    }
  }

  private drawArrowHead(x: number, y: number, angle: number) {
    const { ctx } = this;
    const len = 10;
    const width = 5;
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - len * Math.cos(angle - Math.atan2(width, len)),
      y - len * Math.sin(angle - Math.atan2(width, len)),
    );
    ctx.lineTo(
      x - len * Math.cos(angle + Math.atan2(width, len)),
      y - len * Math.sin(angle + Math.atan2(width, len)),
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCircle(el: CircleElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [cx, cy] = coords.toCanvas(...el.center);
    const r = coords.toPixelLength(el.radius);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (el.options.fill) {
      ctx.fillStyle = TIKZ_COLORS[el.options.fill] || el.options.fill;
      ctx.fill();
    }
    ctx.stroke();
  }

  private drawEllipse(el: EllipseElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [cx, cy] = coords.toCanvas(...el.center);
    const rx = coords.toPixelLength(el.rx);
    const ry = coords.toPixelLength(el.ry);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (el.options.fill) {
      ctx.fillStyle = TIKZ_COLORS[el.options.fill] || el.options.fill;
      ctx.fill();
    }
    ctx.stroke();
  }

  private drawArc(el: ArcElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [cx, cy] = coords.toCanvas(...el.center);
    const r = coords.toPixelLength(el.radius);
    // Canvas angles go clockwise, TikZ counter-clockwise
    const startRad = -el.startAngle * Math.PI / 180;
    const endRad = -el.endAngle * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startRad, endRad, true);
    ctx.stroke();
  }

  private drawBezier(el: BezierElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [start, ctrl1, ctrl2, end] = el.points;
    const [sx, sy] = coords.toCanvas(...start);
    const [c1x, c1y] = coords.toCanvas(...ctrl1);
    const [c2x, c2y] = coords.toCanvas(...ctrl2);
    const [ex, ey] = coords.toCanvas(...end);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    ctx.stroke();

    // Draw control point lines (faint)
    ctx.save();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(c1x, c1y);
    ctx.moveTo(ex, ey);
    ctx.lineTo(c2x, c2y);
    ctx.stroke();
    ctx.restore();
  }

  private drawPath(el: PathElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    ctx.beginPath();
    if (el.smooth && el.points.length > 2) {
      // Catmull-Rom spline approximation
      this.drawSmoothPath(el.points);
    } else {
      for (let i = 0; i < el.points.length; i++) {
        const [px, py] = coords.toCanvas(...el.points[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    if (el.closed) ctx.closePath();
    if (el.options.fill) {
      ctx.fillStyle = TIKZ_COLORS[el.options.fill] || el.options.fill;
      ctx.fill();
    }
    ctx.stroke();
  }

  private drawSmoothPath(points: [number, number][]) {
    const { ctx, coords } = this;
    const pts = points.map(p => coords.toCanvas(...p));
    if (pts.length < 2) return;

    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
    }
  }

  private drawPlot(el: PlotElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [a, b] = el.domain;
    const samples = 200;
    const step = (b - a) / samples;
    const fn = compileMathFn(el.fn, el.variable || 'x');
    if (!fn) return;

    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= samples; i++) {
      const x = a + i * step;
      try {
        const y = fn(x);
        if (!isFinite(y)) { started = false; continue; }
        const [px, py] = coords.toCanvas(x, y);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      } catch { started = false; }
    }
    ctx.stroke();
  }

  private drawFill(el: FillElement) {
    const { ctx, coords } = this;
    ctx.beginPath();
    for (let i = 0; i < el.path.length; i++) {
      const [px, py] = coords.toCanvas(...el.path[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const color = TIKZ_COLORS[el.fillOptions.color] || el.fillOptions.color || 'rgba(0,0,255,0.3)';
    ctx.fillStyle = color;
    ctx.globalAlpha = el.fillOptions.opacity ?? 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawNode(el: NodeElement) {
    const { ctx, coords } = this;
    const [px, py] = coords.toCanvas(...el.at);
    const label = el.label.replace(/\$/g, '');

    ctx.save();
    ctx.fillStyle = TIKZ_COLORS[el.options.color || 'black'] || '#000';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Apply anchor offset
    let offsetX = 0, offsetY = 0;
    const anchor = el.nodeOptions.anchor || '';
    if (anchor.includes('above')) offsetY = -12;
    if (anchor.includes('below')) offsetY = 12;
    if (anchor.includes('left')) offsetX = -8;
    if (anchor.includes('right')) offsetX = 8;

    // Draw shape background if draw is set
    if (el.nodeOptions.draw || el.nodeOptions.fill) {
      const metrics = ctx.measureText(label);
      const w = metrics.width + 12;
      const h = 20;
      if (el.nodeOptions.fill) {
        ctx.fillStyle = TIKZ_COLORS[el.nodeOptions.fill] || el.nodeOptions.fill;
        ctx.fillRect(px + offsetX - w / 2, py + offsetY - h / 2, w, h);
      }
      if (el.nodeOptions.draw) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(px + offsetX - w / 2, py + offsetY - h / 2, w, h);
      }
      ctx.fillStyle = TIKZ_COLORS[el.options.color || 'black'] || '#000';
    }

    // Only draw canvas text when KaTeX overlay is NOT handling labels
    if (!this.skipLabelText) {
      ctx.fillText(label, px + offsetX, py + offsetY);
    }

    // Draw small dot at position
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();

    ctx.restore();
  }

  private drawEdge(el: EdgeElement) {
    const { ctx, coords } = this;
    this.applyDrawStyle(el.options);
    const [x0, y0] = coords.toCanvas(...el.fromPos);
    const [x1, y1] = coords.toCanvas(...el.toPos);

    // Shorten edge endpoints to avoid overlapping with node labels
    const edgeDx = x1 - x0;
    const edgeDy = y1 - y0;
    const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
    const shortenPx = 18; // pixels to pull back from each node center
    let sx0 = x0, sy0 = y0, sx1 = x1, sy1 = y1;
    if (edgeLen > shortenPx * 2.5) {
      const ux = edgeDx / edgeLen;
      const uy = edgeDy / edgeLen;
      sx0 = x0 + ux * shortenPx;
      sy0 = y0 + uy * shortenPx;
      sx1 = x1 - ux * shortenPx;
      sy1 = y1 - uy * shortenPx;
    }

    if (el.bend === 0) {
      // Straight edge
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
    } else {
      // Curved edge using quadratic bezier
      const midX = (sx0 + sx1) / 2;
      const midY = (sy0 + sy1) / 2;
      const dx = sx1 - sx0;
      const dy = sy1 - sy0;
      const len = Math.sqrt(dx * dx + dy * dy);
      // Perpendicular offset based on bend angle
      const bendPx = len * Math.tan(el.bend * Math.PI / 180) * 0.5;
      const nx = -dy / len;
      const ny = dx / len;
      const cpx = midX + nx * bendPx;
      const cpy = midY + ny * bendPx;

      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.quadraticCurveTo(cpx, cpy, sx1, sy1);
      ctx.stroke();
    }

    // Arrow head at shortened target
    const arrow = el.options.arrow || '->';
    const arrowAngle = Math.atan2(sy1 - sy0, sx1 - sx0);
    if (arrow.includes('>')) this.drawArrowHead(sx1, sy1, arrowAngle);
    if (arrow.includes('<')) this.drawArrowHead(sx0, sy0, arrowAngle + Math.PI);

    // Label — only draw on canvas when KaTeX overlay is not active
    if (el.label && !this.skipLabelText) {
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      ctx.save();
      ctx.fillStyle = TIKZ_COLORS[el.options.color || 'black'] || '#000';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = el.labelPosition === 'below' ? 'top' : 'bottom';
      const labelOffY = el.labelPosition === 'below' ? 8 : -8;
      ctx.fillText(el.label.replace(/\$/g, ''), midX, midY + labelOffY);
      ctx.restore();
    }
  }

  private drawMatrix(el: MatrixElement) {
    const { ctx, coords } = this;
    const [baseX, baseY] = coords.toCanvas(...el.at);

    ctx.save();
    ctx.fillStyle = TIKZ_COLORS[el.options.color || 'black'] || '#000';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const colSepPx = coords.toPixelLength(el.colSep);
    const rowSepPx = coords.toPixelLength(el.rowSep);
    const totalW = (el.cols - 1) * colSepPx;
    const totalH = (el.rows - 1) * rowSepPx;

    for (let row = 0; row < el.rows; row++) {
      for (let col = 0; col < el.cols; col++) {
        const label = el.cells[row]?.[col] || '';
        if (!label) continue;
        const cx = baseX - totalW / 2 + col * colSepPx;
        const cy = baseY - totalH / 2 + row * rowSepPx;
        const displayLabel = label.replace(/\$/g, '');

        if (el.nodeOptions.draw) {
          const metrics = ctx.measureText(displayLabel);
          const w = metrics.width + 12;
          const h = 20;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
        }
        if (!this.skipLabelText) {
          ctx.fillText(displayLabel, cx, cy);
        }
      }
    }
    ctx.restore();
  }

  private drawScope(el: ScopeElement) {
    const { ctx } = this;
    ctx.save();
    // Apply transform
    if (el.transform.shift[0] !== 0 || el.transform.shift[1] !== 0) {
      const [sx, sy] = this.coords.toCanvas(el.transform.shift[0], el.transform.shift[1]);
      const [ox, oy] = this.coords.toCanvas(0, 0);
      ctx.translate(sx - ox, sy - oy);
    }
    if (el.transform.rotate !== 0) {
      ctx.rotate(-el.transform.rotate * Math.PI / 180); // Canvas rotates clockwise
    }
    if (el.transform.scale !== 1) {
      ctx.scale(el.transform.scale, el.transform.scale);
    }
    // Draw children
    for (const child of el.children) {
      this.drawElement(child);
    }
    ctx.restore();
  }

  private drawSelectionOverlay(el: TikzElement) {
    const { ctx, coords } = this;
    const bbox = getElementBBox(el, coords);
    if (!bbox) return;

    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const pad = 6;
    ctx.strokeRect(
      bbox.minX - pad, bbox.minY - pad,
      bbox.maxX - bbox.minX + pad * 2,
      bbox.maxY - bbox.minY + pad * 2,
    );

    ctx.setLineDash([]);
    // Draw handles at corners
    const handles = [
      [bbox.minX, bbox.minY], [bbox.maxX, bbox.minY],
      [bbox.minX, bbox.maxY], [bbox.maxX, bbox.maxY],
    ];
    for (const [hx, hy] of handles) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx - pad - 3, hy - pad - 3, 6, 6);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(hx - pad - 3, hy - pad - 3, 6, 6);
    }

    // For bezier, show control point handles
    if (el.type === 'bezier') {
      for (let i = 1; i <= 2; i++) {
        const [cpx, cpy] = coords.toCanvas(...el.points[i]);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(cpx - 4, cpy);
        ctx.lineTo(cpx, cpy - 4);
        ctx.lineTo(cpx + 4, cpy);
        ctx.lineTo(cpx, cpy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

/** Compile a math expression string to a safe JS function */
function compileMathFn(expr: string, variable: string): ((x: number) => number) | null {
  try {
    // Replace math functions with Math.*
    let jsExpr = expr
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\blog\b/g, 'Math.log')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b(?!xp)/g, 'Math.E')
      .replace(/\bdeg\b\(([^)]+)\)/g, '(($1)*Math.PI/180)')
      .replace(/\^/g, '**');

    // Replace the variable with the function parameter
    jsExpr = jsExpr.replace(new RegExp(`\\b${variable}\\b`, 'g'), '__x__');

    const fn = new Function('__x__', `"use strict"; return (${jsExpr});`);
    // Test it
    fn(0);
    return fn as (x: number) => number;
  } catch {
    return null;
  }
}

export { compileMathFn };
