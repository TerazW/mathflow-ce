// TikZ Abstract Syntax Tree — the single source of truth for visual diagrams

export interface TikzFigure {
  id: string;
  elements: TikzElement[];
  viewport: Viewport;
  showGrid: boolean;
  showAxes: boolean;
  options: Record<string, string>;
}

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type TikzElement =
  | LineElement
  | ArrowElement
  | CircleElement
  | EllipseElement
  | ArcElement
  | BezierElement
  | PathElement
  | PlotElement
  | FillElement
  | NodeElement
  | EdgeElement
  | MatrixElement
  | ScopeElement;

export interface BaseElement {
  id: string;
  options: DrawOptions;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: [number, number][];
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  from: [number, number];
  to: [number, number];
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  center: [number, number];
  radius: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  center: [number, number];
  rx: number;
  ry: number;
}

export interface ArcElement extends BaseElement {
  type: 'arc';
  center: [number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface BezierElement extends BaseElement {
  type: 'bezier';
  points: [number, number][]; // [start, ctrl1, ctrl2, end]
}

export interface PathElement extends BaseElement {
  type: 'path';
  points: [number, number][];
  closed: boolean;
  smooth: boolean;
}

export interface PlotElement extends BaseElement {
  type: 'plot';
  fn: string;
  domain: [number, number];
  variable: string;
}

export interface FillElement extends BaseElement {
  type: 'fill';
  path: [number, number][];
  fillOptions: FillOptions;
}

export interface NodeElement extends BaseElement {
  type: 'node';
  at: [number, number];
  label: string;
  name?: string;
  nodeOptions: NodeOptions;
}

export interface EdgeElement extends BaseElement {
  type: 'edge';
  from: string;         // source node name
  to: string;           // target node name
  fromPos: [number, number];  // resolved source position (for rendering)
  toPos: [number, number];    // resolved target position
  label: string;
  labelPosition: 'above' | 'below' | 'left' | 'right' | 'auto';
  bend: number;         // bend angle in degrees (positive = left, negative = right, 0 = straight)
}

export interface MatrixElement extends BaseElement {
  type: 'matrix';
  at: [number, number];
  rows: number;
  cols: number;
  cells: string[][];          // cells[row][col] = label string
  cellNames: string[][];      // auto-generated node names for edge references
  rowSep: number;             // spacing between rows in math units
  colSep: number;             // spacing between columns in math units
  nodeOptions: NodeOptions;
}

export interface ScopeElement extends BaseElement {
  type: 'scope';
  children: TikzElement[];
  transform: {
    shift: [number, number];
    rotate: number;        // degrees
    scale: number;
  };
}

export interface DrawOptions {
  color?: string;
  lineWidth?: string;   // 'ultra thin' | 'very thin' | 'thin' | 'thick' | 'very thick' | 'ultra thick'
  lineStyle?: string;   // 'solid' | 'dashed' | 'dotted' | 'dash dot'
  arrow?: string;       // '->' | '<-' | '<->' | '<<-' | '->>' etc.
  fill?: string;        // fill color
  smooth?: boolean;
}

export interface FillOptions {
  color: string;
  opacity?: number;
  pattern?: string;     // 'north east lines' | 'crosshatch' | 'dots'
}

export interface NodeOptions {
  anchor?: string;       // 'above' | 'below' | 'left' | 'right' | 'above left' | etc.
  shape?: string;        // 'circle' | 'rectangle' | 'diamond'
  draw?: boolean;
  fill?: string;
  fontSize?: string;
  innerSep?: string;
}

// Color name mapping TikZ → CSS
export const TIKZ_COLORS: Record<string, string> = {
  'black': '#000000',
  'blue': '#0000ff',
  'red': '#ff0000',
  'green': '#008000',
  'green!60!black': '#0d7a3b',
  'purple': '#800080',
  'orange': '#ff8c00',
  'gray': '#808080',
  'white': '#ffffff',
  'cyan': '#00bfff',
  'magenta': '#ff00ff',
  'yellow': '#ffd700',
  'brown': '#8b4513',
  'violet': '#7f00ff',
  'teal': '#008080',
};

// Line width mapping TikZ name → px
export const TIKZ_LINE_WIDTHS: Record<string, number> = {
  'ultra thin': 0.5,
  'very thin': 0.75,
  'thin': 1,
  'thick': 1.5,
  'very thick': 2.5,
  'ultra thick': 4,
};

// Line style → dash array
export const TIKZ_LINE_STYLES: Record<string, number[]> = {
  'solid': [],
  'dashed': [6, 4],
  'dotted': [2, 3],
  'dash dot': [6, 3, 2, 3],
};

export type ToolType = 'select' | 'line' | 'arrow' | 'rect' | 'circle' | 'ellipse' | 'arc' |
  'bezier' | 'plot' | 'fill' | 'label' | 'path' | 'edge' | 'matrix';

export function createDefaultFigure(): TikzFigure {
  return {
    id: crypto.randomUUID(),
    elements: [],
    viewport: { xMin: -1, xMax: 5, yMin: -1, yMax: 4 },
    showGrid: true,
    showAxes: false,
    options: {},
  };
}

export function cloneFigure(fig: TikzFigure): TikzFigure {
  return JSON.parse(JSON.stringify(fig));
}
