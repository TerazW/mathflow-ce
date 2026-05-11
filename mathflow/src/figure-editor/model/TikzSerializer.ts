import type {
  TikzFigure, TikzElement, DrawOptions, LineElement, ArrowElement,
  CircleElement, EllipseElement, ArcElement, BezierElement, PathElement,
  PlotElement, FillElement, NodeElement, EdgeElement, MatrixElement, ScopeElement,
} from './TikzAST';

/**
 * Normalize common text shortcuts to LaTeX commands in labels.
 * Ensures TikZ output uses proper LaTeX symbols.
 */
function normalizeLabel(label: string): string {
  return label
    .replace(/(?<!\\[a-zA-Z]*)>=/g, '\\geq ')
    .replace(/(?<!\\[a-zA-Z]*)<=/g, '\\leq ')
    .replace(/(?<!\\[a-zA-Z]*)!=/g, '\\neq ')
    .replace(/(?<!\\[a-zA-Z]*):=/g, '\\coloneqq ')
    .replace(/(?<!\\[a-zA-Z]*)~=/g, '\\approx ')
    .replace(/(?<!\\[a-zA-Z]*)<<(?!=)/g, '\\ll ')
    .replace(/(?<!\\[a-zA-Z]*)>>(?!=)/g, '\\gg ')
    .replace(/(?<!\\[a-zA-Z]*)<->/g, '\\leftrightarrow ')
    .replace(/(?<!\\[a-zA-Z]*)-->/g, '\\longrightarrow ')
    .replace(/(?<!\\[a-zA-Z]*)->/g, '\\to ')
    .replace(/(?<!\\[a-zA-Z]*)<-(?!>)/g, '\\leftarrow ');
}

/** Round a number to 2 decimal places */
function r(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toString();
}

function coord(x: number, y: number): string {
  return `(${r(x)},${r(y)})`;
}

function buildOptions(opts: DrawOptions, extra: string[] = []): string {
  const parts: string[] = [...extra];

  if (opts.color && opts.color !== 'black') parts.push(opts.color);
  if (opts.lineWidth && opts.lineWidth !== 'thin') parts.push(opts.lineWidth);
  if (opts.lineStyle && opts.lineStyle !== 'solid') parts.push(opts.lineStyle === 'dash dot' ? 'dash dot' : opts.lineStyle);
  if (opts.arrow) parts.push(opts.arrow);
  if (opts.fill) parts.push(`fill=${opts.fill}`);
  if (opts.smooth) parts.push('smooth');

  return parts.length > 0 ? `[${parts.join(', ')}]` : '';
}

function serializeLine(el: LineElement): string {
  const opts = buildOptions(el.options);
  const pts = el.points.map(([x, y]) => coord(x, y)).join(' -- ');
  return `  \\draw${opts} ${pts};`;
}

function serializeArrow(el: ArrowElement): string {
  const arrow = el.options.arrow || '->';
  const opts = buildOptions({ ...el.options, arrow: undefined }, [arrow]);
  return `  \\draw${opts} ${coord(...el.from)} -- ${coord(...el.to)};`;
}

function serializeCircle(el: CircleElement): string {
  const opts = buildOptions(el.options);
  return `  \\draw${opts} ${coord(...el.center)} circle (${r(el.radius)});`;
}

function serializeEllipse(el: EllipseElement): string {
  const opts = buildOptions(el.options);
  return `  \\draw${opts} ${coord(...el.center)} ellipse (${r(el.rx)} and ${r(el.ry)});`;
}

function serializeArc(el: ArcElement): string {
  const opts = buildOptions(el.options);
  // Compute start point of arc
  const startX = el.center[0] + el.radius * Math.cos(el.startAngle * Math.PI / 180);
  const startY = el.center[1] + el.radius * Math.sin(el.startAngle * Math.PI / 180);
  return `  \\draw${opts} ${coord(startX, startY)} arc (${r(el.startAngle)}:${r(el.endAngle)}:${r(el.radius)});`;
}

function serializeBezier(el: BezierElement): string {
  const opts = buildOptions(el.options);
  const [start, ctrl1, ctrl2, end] = el.points;
  return `  \\draw${opts} ${coord(...start)} .. controls ${coord(...ctrl1)} and ${coord(...ctrl2)} .. ${coord(...end)};`;
}

function serializePath(el: PathElement): string {
  const extras: string[] = [];
  if (el.smooth) extras.push('smooth');
  const opts = buildOptions(el.options, extras);

  if (el.smooth) {
    const pts = el.points.map(([x, y]) => coord(x, y)).join(' ');
    const cycle = el.closed ? ' -- cycle' : '';
    return `  \\draw${opts} plot coordinates {${pts}}${cycle};`;
  }

  const pts = el.points.map(([x, y]) => coord(x, y)).join(' -- ');
  const cycle = el.closed ? ' -- cycle' : '';
  return `  \\draw${opts} ${pts}${cycle};`;
}

function serializePlot(el: PlotElement): string {
  const opts = buildOptions(el.options);
  const v = el.variable || '\\x';
  return `  \\draw${opts} plot[domain=${r(el.domain[0])}:${r(el.domain[1])}, smooth, samples=100] (${v}, {${el.fn}});`;
}

function serializeFill(el: FillElement): string {
  const colorOpt = el.fillOptions.color || 'blue';
  const parts: string[] = [colorOpt];
  if (el.fillOptions.opacity !== undefined && el.fillOptions.opacity < 1) {
    parts.push(`opacity=${r(el.fillOptions.opacity)}`);
  }
  if (el.fillOptions.pattern) {
    parts.push(`pattern=${el.fillOptions.pattern}`);
  }
  const opts = `[${parts.join(', ')}]`;
  const pts = el.path.map(([x, y]) => coord(x, y)).join(' -- ');
  return `  \\fill${opts} ${pts} -- cycle;`;
}

function serializeNode(el: NodeElement): string {
  const parts: string[] = [];
  if (el.nodeOptions.anchor) parts.push(el.nodeOptions.anchor);
  if (el.nodeOptions.shape && el.nodeOptions.shape !== 'rectangle') parts.push(el.nodeOptions.shape);
  if (el.nodeOptions.draw) parts.push('draw');
  if (el.nodeOptions.fill) parts.push(`fill=${el.nodeOptions.fill}`);
  if (el.nodeOptions.fontSize) parts.push(`font=${el.nodeOptions.fontSize}`);
  if (el.nodeOptions.innerSep) parts.push(`inner sep=${el.nodeOptions.innerSep}`);
  if (el.options.color && el.options.color !== 'black') parts.push(el.options.color);

  const opts = parts.length > 0 ? `[${parts.join(', ')}]` : '';
  const name = el.name ? `(${el.name}) ` : '';
  return `  \\node${opts} ${name}at ${coord(...el.at)} {${normalizeLabel(el.label)}};`;
}

function serializeEdge(el: EdgeElement): string {
  const parts: string[] = [];
  if (el.options.color && el.options.color !== 'black') parts.push(el.options.color);
  if (el.options.arrow) parts.push(el.options.arrow);
  else parts.push('->');
  if (el.bend > 0) parts.push(`bend left=${el.bend}`);
  else if (el.bend < 0) parts.push(`bend right=${Math.abs(el.bend)}`);
  if (el.options.lineStyle && el.options.lineStyle !== 'solid') parts.push(el.options.lineStyle);
  const opts = parts.length > 0 ? `[${parts.join(', ')}]` : '';
  const labelOpts = el.labelPosition !== 'auto' ? `[${el.labelPosition}]` : '';
  const labelStr = el.label ? ` node${labelOpts} {${normalizeLabel(el.label)}}` : '';
  return `  \\draw${opts} (${el.from}) to${labelStr} (${el.to});`;
}

function serializeMatrix(el: MatrixElement): string {
  const lines: string[] = [];
  const parts: string[] = ['matrix of nodes'];
  if (el.nodeOptions.draw) parts.push('draw');
  if (el.rowSep !== 1) parts.push(`row sep=${r(el.rowSep)}cm`);
  if (el.colSep !== 1) parts.push(`column sep=${r(el.colSep)}cm`);
  if (el.options.color && el.options.color !== 'black') parts.push(el.options.color);
  const opts = `[${parts.join(', ')}]`;
  lines.push(`  \\matrix${opts} at ${coord(...el.at)} {`);
  for (let row = 0; row < el.rows; row++) {
    const cells = [];
    for (let col = 0; col < el.cols; col++) {
      const name = el.cellNames[row]?.[col];
      const label = el.cells[row]?.[col] || '';
      cells.push(name ? `|[alias=${name}]| ${label}` : label);
    }
    lines.push(`    ${cells.join(' & ')} \\\\`);
  }
  lines.push('  };');
  return lines.join('\n');
}

function serializeScope(el: ScopeElement, indent: string = '  '): string {
  const parts: string[] = [];
  if (el.transform.shift[0] !== 0 || el.transform.shift[1] !== 0) {
    parts.push(`shift={${coord(...el.transform.shift)}}`);
  }
  if (el.transform.rotate !== 0) parts.push(`rotate=${r(el.transform.rotate)}`);
  if (el.transform.scale !== 1) parts.push(`scale=${r(el.transform.scale)}`);
  if (el.options.color && el.options.color !== 'black') parts.push(el.options.color);
  const opts = parts.length > 0 ? `[${parts.join(', ')}]` : '';
  const lines: string[] = [];
  lines.push(`${indent}\\begin{scope}${opts}`);
  for (const child of el.children) {
    lines.push(serializeElement(child));
  }
  lines.push(`${indent}\\end{scope}`);
  return lines.join('\n');
}

function serializeElement(el: TikzElement): string {
  switch (el.type) {
    case 'line': return serializeLine(el);
    case 'arrow': return serializeArrow(el);
    case 'circle': return serializeCircle(el);
    case 'ellipse': return serializeEllipse(el);
    case 'arc': return serializeArc(el);
    case 'bezier': return serializeBezier(el);
    case 'path': return serializePath(el);
    case 'plot': return serializePlot(el);
    case 'fill': return serializeFill(el);
    case 'node': return serializeNode(el);
    case 'edge': return serializeEdge(el);
    case 'matrix': return serializeMatrix(el);
    case 'scope': return serializeScope(el);
  }
}

/** Serialize a single element to TikZ (for live preview) */
export function serializeElementCode(el: TikzElement): string {
  return serializeElement(el).trim();
}

/**
 * Detect whether a figure is a commutative diagram (only nodes + edges).
 * If so, we can serialize it as tikz-cd for cleaner LaTeX output.
 */
export function isCommutativeDiagram(figure: TikzFigure): boolean {
  if (figure.elements.length === 0) return false;
  const hasEdges = figure.elements.some(el => el.type === 'edge');
  if (!hasEdges) return false;
  return figure.elements.every(el => el.type === 'node' || el.type === 'edge');
}

/**
 * Serialize a commutative diagram figure as tikz-cd.
 * Nodes are arranged in a grid and edges become tikz-cd arrows.
 */
function serializeTikzCd(figure: TikzFigure): string {
  const nodes = figure.elements.filter(el => el.type === 'node') as NodeElement[];
  const edges = figure.elements.filter(el => el.type === 'edge') as EdgeElement[];

  if (nodes.length === 0) return '';

  // Find unique rows and columns by quantizing y and x coordinates
  const yValues = [...new Set(nodes.map(n => Math.round(n.at[1] * 2) / 2))].sort((a, b) => b - a); // top to bottom
  const xValues = [...new Set(nodes.map(n => Math.round(n.at[0] * 2) / 2))].sort((a, b) => a - b); // left to right

  // Build grid of nodes (row, col) → node
  const grid: (NodeElement | null)[][] = yValues.map(y =>
    xValues.map(x =>
      nodes.find(n => Math.abs(Math.round(n.at[0] * 2) / 2 - x) < 0.3 && Math.abs(Math.round(n.at[1] * 2) / 2 - y) < 0.3) || null
    )
  );

  // Map node name/id to grid position
  const nodePos = new Map<string, [number, number]>();
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const n = grid[row][col];
      if (n) {
        if (n.name) nodePos.set(n.name, [row, col]);
        nodePos.set(n.id, [row, col]);
      }
    }
  }

  // Build edge map: from (row,col) → list of edges going out
  const edgeMap = new Map<string, { edge: EdgeElement; toRow: number; toCol: number }[]>();
  for (const edge of edges) {
    const fromPos = nodePos.get(edge.from);
    const toPos = nodePos.get(edge.to);
    if (!fromPos || !toPos) continue;
    const key = `${fromPos[0]},${fromPos[1]}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key)!.push({ edge, toRow: toPos[0], toCol: toPos[1] });
  }

  const lines: string[] = [];
  lines.push('\\begin{tikzcd}');

  for (let row = 0; row < grid.length; row++) {
    const cells: string[] = [];
    for (let col = 0; col < grid[row].length; col++) {
      const node = grid[row][col];
      let cell = node ? normalizeLabel(node.label) : '';
      // Append arrows from this cell
      const key = `${row},${col}`;
      const outEdges = edgeMap.get(key) || [];
      for (const { edge, toRow, toCol } of outEdges) {
        const arrowParts: string[] = [];
        // Direction
        const dr = toRow - row;
        const dc = toCol - col;
        let dir = '';
        if (dr < 0) dir += 'u'.repeat(Math.abs(dr));
        if (dr > 0) dir += 'd'.repeat(dr);
        if (dc > 0) dir += 'r'.repeat(dc);
        if (dc < 0) dir += 'l'.repeat(Math.abs(dc));
        arrowParts.push(dir);
        // Bend
        if (edge.bend > 0) arrowParts.push(`bend left=${edge.bend}`);
        else if (edge.bend < 0) arrowParts.push(`bend right=${Math.abs(edge.bend)}`);
        // Style
        if (edge.options.lineStyle === 'dashed') arrowParts.push('dashed');
        if (edge.options.lineStyle === 'dotted') arrowParts.push('dotted');
        const arrowOpts = arrowParts.join(', ');
        const labelStr = edge.label ? `{${edge.label}}` : '';
        cell += ` \\arrow[${arrowOpts}]` + (labelStr ? `{${labelStr}}` : '');
      }
      cells.push(cell.trim());
    }
    const rowStr = '  ' + cells.join(' & ');
    lines.push(row < grid.length - 1 ? rowStr + ' \\\\' : rowStr);
  }

  lines.push('\\end{tikzcd}');
  return lines.join('\n');
}

/** Serialize a complete TikzFigure to full TikZ code */
export function serializeTikzFigure(figure: TikzFigure): string {
  // If the figure is a commutative diagram, serialize as tikz-cd
  if (isCommutativeDiagram(figure)) {
    return serializeTikzCd(figure);
  }

  const optEntries = Object.entries(figure.options);
  const optStr = optEntries.length > 0
    ? `[${optEntries.map(([k, v]) => v ? `${k}=${v}` : k).join(', ')}]`
    : '';

  const lines: string[] = [];
  lines.push(`\\begin{tikzpicture}${optStr}`);

  if (figure.showAxes) {
    const { xMin, xMax, yMin, yMax } = figure.viewport;
    lines.push(`  \\draw[->] (${r(xMin - 0.3)},0) -- (${r(xMax + 0.3)},0) node[right] {$x$};`);
    lines.push(`  \\draw[->] (0,${r(yMin - 0.3)}) -- (0,${r(yMax + 0.3)}) node[above] {$y$};`);
  }

  for (const el of figure.elements) {
    lines.push(serializeElement(el));
  }

  lines.push('\\end{tikzpicture}');
  return lines.join('\n');
}
