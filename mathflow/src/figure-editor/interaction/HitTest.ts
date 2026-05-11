import type { TikzElement, TikzFigure } from '../model/TikzAST';
import { CoordinateSystem } from '../canvas/CoordinateSystem';
import { compileMathFn } from '../canvas/Renderer';

export interface HitResult {
  elementId: string;
  part: 'body' | 'endpoint' | 'control-point';
  pointIndex?: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const HIT_THRESHOLD = 0.15; // math units

/** Test all elements back-to-front, return first hit */
export function hitTest(
  figure: TikzFigure,
  mx: number,
  my: number,
): HitResult | null {
  // Test back-to-front (last drawn = on top = hit first)
  for (let i = figure.elements.length - 1; i >= 0; i--) {
    const el = figure.elements[i];
    const result = hitTestElement(el, mx, my);
    if (result) return result;
  }
  return null;
}

function hitTestElement(el: TikzElement, mx: number, my: number): HitResult | null {
  switch (el.type) {
    case 'line': return hitTestLine(el, mx, my);
    case 'arrow': return hitTestArrow(el, mx, my);
    case 'circle': return hitTestCircle(el, mx, my);
    case 'ellipse': return hitTestEllipse(el, mx, my);
    case 'arc': return hitTestArc(el, mx, my);
    case 'bezier': return hitTestBezier(el, mx, my);
    case 'path': return hitTestPath(el, mx, my);
    case 'plot': return hitTestPlot(el, mx, my);
    case 'fill': return hitTestFill(el, mx, my);
    case 'node': return hitTestNode(el, mx, my);
    case 'edge': return hitTestEdge(el, mx, my);
    case 'matrix': return hitTestMatrix(el, mx, my);
    case 'scope': return hitTestScope(el, mx, my);
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

function hitTestLine(el: { id: string; type: string; points: [number, number][] }, mx: number, my: number): HitResult | null {
  // Check endpoints first
  for (let i = 0; i < el.points.length; i++) {
    if (dist(mx, my, el.points[i][0], el.points[i][1]) < HIT_THRESHOLD * 1.5) {
      return { elementId: el.id, part: 'endpoint', pointIndex: i };
    }
  }
  // Check segments
  for (let i = 0; i < el.points.length - 1; i++) {
    const d = distPointToSegment(mx, my, el.points[i][0], el.points[i][1], el.points[i + 1][0], el.points[i + 1][1]);
    if (d < HIT_THRESHOLD) return { elementId: el.id, part: 'body' };
  }
  return null;
}

function hitTestArrow(el: { id: string; from: [number, number]; to: [number, number] }, mx: number, my: number): HitResult | null {
  if (dist(mx, my, el.from[0], el.from[1]) < HIT_THRESHOLD * 1.5) {
    return { elementId: el.id, part: 'endpoint', pointIndex: 0 };
  }
  if (dist(mx, my, el.to[0], el.to[1]) < HIT_THRESHOLD * 1.5) {
    return { elementId: el.id, part: 'endpoint', pointIndex: 1 };
  }
  const d = distPointToSegment(mx, my, el.from[0], el.from[1], el.to[0], el.to[1]);
  if (d < HIT_THRESHOLD) return { elementId: el.id, part: 'body' };
  return null;
}

function hitTestCircle(el: { id: string; center: [number, number]; radius: number }, mx: number, my: number): HitResult | null {
  if (dist(mx, my, el.center[0], el.center[1]) < HIT_THRESHOLD * 1.5) {
    return { elementId: el.id, part: 'endpoint', pointIndex: 0 };
  }
  const d = Math.abs(dist(mx, my, el.center[0], el.center[1]) - el.radius);
  if (d < HIT_THRESHOLD) return { elementId: el.id, part: 'body' };
  return null;
}

function hitTestEllipse(el: { id: string; center: [number, number]; rx: number; ry: number }, mx: number, my: number): HitResult | null {
  const dx = (mx - el.center[0]) / el.rx;
  const dy = (my - el.center[1]) / el.ry;
  const d = Math.abs(Math.sqrt(dx * dx + dy * dy) - 1);
  if (d < HIT_THRESHOLD / Math.min(el.rx, el.ry)) return { elementId: el.id, part: 'body' };
  return null;
}

function hitTestArc(el: { id: string; center: [number, number]; radius: number; startAngle: number; endAngle: number }, mx: number, my: number): HitResult | null {
  const d = Math.abs(dist(mx, my, el.center[0], el.center[1]) - el.radius);
  if (d > HIT_THRESHOLD) return null;
  const angle = Math.atan2(my - el.center[1], mx - el.center[0]) * 180 / Math.PI;
  let a = ((angle % 360) + 360) % 360;
  let start = ((el.startAngle % 360) + 360) % 360;
  let end = ((el.endAngle % 360) + 360) % 360;
  if (start > end) end += 360;
  if (a < start) a += 360;
  if (a >= start && a <= end) return { elementId: el.id, part: 'body' };
  return null;
}

function hitTestBezier(el: { id: string; points: [number, number][] }, mx: number, my: number): HitResult | null {
  // Check control points
  for (let i = 0; i < el.points.length; i++) {
    if (dist(mx, my, el.points[i][0], el.points[i][1]) < HIT_THRESHOLD * 1.5) {
      return { elementId: el.id, part: i === 0 || i === 3 ? 'endpoint' : 'control-point', pointIndex: i };
    }
  }
  // Sample curve
  const [p0, p1, p2, p3] = el.points;
  for (let t = 0; t <= 1; t += 0.02) {
    const t2 = t * t, t3 = t2 * t;
    const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
    const x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0];
    const y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1];
    if (dist(mx, my, x, y) < HIT_THRESHOLD) return { elementId: el.id, part: 'body' };
  }
  return null;
}

function hitTestPath(el: { id: string; points: [number, number][] }, mx: number, my: number): HitResult | null {
  for (let i = 0; i < el.points.length; i++) {
    if (dist(mx, my, el.points[i][0], el.points[i][1]) < HIT_THRESHOLD * 1.5) {
      return { elementId: el.id, part: 'endpoint', pointIndex: i };
    }
  }
  for (let i = 0; i < el.points.length - 1; i++) {
    const d = distPointToSegment(mx, my, el.points[i][0], el.points[i][1], el.points[i + 1][0], el.points[i + 1][1]);
    if (d < HIT_THRESHOLD) return { elementId: el.id, part: 'body' };
  }
  return null;
}

function hitTestPlot(el: { id: string; fn: string; domain: [number, number]; variable?: string }, mx: number, my: number): HitResult | null {
  // Simple sampling test
  const fn = compileMathFn(el.fn, el.variable || 'x');
  if (!fn) return null;
  const [a, b] = el.domain;
  const samples = 100;
  const step = (b - a) / samples;
  for (let i = 0; i <= samples; i++) {
    const x = a + i * step;
    try {
      const y = fn(x);
      if (!isFinite(y)) continue;
      if (dist(mx, my, x, y) < HIT_THRESHOLD) return { elementId: el.id, part: 'body' };
    } catch { continue; }
  }
  return null;
}

function hitTestFill(el: { id: string; path: [number, number][] }, mx: number, my: number): HitResult | null {
  // Point-in-polygon test
  let inside = false;
  for (let i = 0, j = el.path.length - 1; i < el.path.length; j = i++) {
    const [xi, yi] = el.path[i];
    const [xj, yj] = el.path[j];
    if ((yi > my) !== (yj > my) && mx < (xj - xi) * (my - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  if (inside) return { elementId: el.id, part: 'body' };
  return null;
}

function hitTestNode(el: { id: string; at: [number, number] }, mx: number, my: number): HitResult | null {
  if (dist(mx, my, el.at[0], el.at[1]) < HIT_THRESHOLD * 2) {
    return { elementId: el.id, part: 'body' };
  }
  return null;
}

function hitTestEdge(el: { id: string; fromPos: [number, number]; toPos: [number, number] }, mx: number, my: number): HitResult | null {
  const d = distPointToSegment(mx, my, el.fromPos[0], el.fromPos[1], el.toPos[0], el.toPos[1]);
  if (d < HIT_THRESHOLD * 1.5) return { elementId: el.id, part: 'body' };
  return null;
}

function hitTestMatrix(el: { id: string; at: [number, number]; rows: number; cols: number; rowSep: number; colSep: number }, mx: number, my: number): HitResult | null {
  const hw = (el.cols - 1) * el.colSep / 2 + 0.5;
  const hh = (el.rows - 1) * el.rowSep / 2 + 0.5;
  if (mx >= el.at[0] - hw && mx <= el.at[0] + hw &&
      my >= el.at[1] - hh && my <= el.at[1] + hh) {
    return { elementId: el.id, part: 'body' };
  }
  return null;
}

function hitTestScope(el: { id: string; children: TikzElement[] }, mx: number, my: number): HitResult | null {
  // Test children (scope is a container)
  for (let i = el.children.length - 1; i >= 0; i--) {
    const result = hitTestElement(el.children[i], mx, my);
    if (result) return { elementId: el.id, part: 'body' };
  }
  return null;
}

/** Get bounding box in canvas pixels */
export function getElementBBox(el: TikzElement, coords: CoordinateSystem): BBox | null {
  const points = getElementPoints(el);
  if (points.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [mx, my] of points) {
    const [px, py] = coords.toCanvas(mx, my);
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }

  return { minX, minY, maxX, maxY };
}

function getElementPoints(el: TikzElement): [number, number][] {
  switch (el.type) {
    case 'line': return el.points;
    case 'arrow': return [el.from, el.to];
    case 'circle': return [
      [el.center[0] - el.radius, el.center[1] - el.radius],
      [el.center[0] + el.radius, el.center[1] + el.radius],
    ];
    case 'ellipse': return [
      [el.center[0] - el.rx, el.center[1] - el.ry],
      [el.center[0] + el.rx, el.center[1] + el.ry],
    ];
    case 'arc': {
      const pts: [number, number][] = [];
      for (let a = el.startAngle; a <= el.endAngle; a += 15) {
        pts.push([
          el.center[0] + el.radius * Math.cos(a * Math.PI / 180),
          el.center[1] + el.radius * Math.sin(a * Math.PI / 180),
        ]);
      }
      return pts;
    }
    case 'bezier': return el.points;
    case 'path': return el.points;
    case 'fill': return el.path;
    case 'node': return [el.at];
    case 'plot': {
      const pts: [number, number][] = [[el.domain[0], 0], [el.domain[1], 0]];
      return pts;
    }
    case 'edge': return [el.fromPos, el.toPos];
    case 'matrix': {
      const hw = (el.cols - 1) * el.colSep / 2 + 0.3;
      const hh = (el.rows - 1) * el.rowSep / 2 + 0.3;
      return [
        [el.at[0] - hw, el.at[1] - hh],
        [el.at[0] + hw, el.at[1] + hh],
      ];
    }
    case 'scope': {
      const allPts: [number, number][] = [];
      for (const child of el.children) {
        allPts.push(...getElementPoints(child));
      }
      return allPts;
    }
    default: return [];
  }
}
