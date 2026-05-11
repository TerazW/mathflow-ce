import type {
  TikzFigure, TikzElement, DrawOptions,
  LineElement, ArrowElement, CircleElement, EllipseElement,
  ArcElement, NodeElement, PathElement, FillElement, PlotElement,
  BezierElement, ScopeElement, EdgeElement,
} from './TikzAST';

/**
 * TikZ Parser — converts TikZ source code back to TikzFigure AST.
 * Supports a practical subset of TikZ syntax for round-tripping.
 */

interface ParseContext {
  pos: number;
  src: string;
}

function peek(ctx: ParseContext): string {
  return ctx.src[ctx.pos] || '';
}

function advance(ctx: ParseContext, n = 1): string {
  const s = ctx.src.slice(ctx.pos, ctx.pos + n);
  ctx.pos += n;
  return s;
}

function skipWhitespace(ctx: ParseContext) {
  while (ctx.pos < ctx.src.length && /\s/.test(ctx.src[ctx.pos])) ctx.pos++;
}

function skipComment(ctx: ParseContext) {
  skipWhitespace(ctx);
  while (ctx.pos < ctx.src.length && ctx.src[ctx.pos] === '%') {
    while (ctx.pos < ctx.src.length && ctx.src[ctx.pos] !== '\n') ctx.pos++;
    skipWhitespace(ctx);
  }
}

function expectChar(ctx: ParseContext, ch: string): boolean {
  skipComment(ctx);
  if (ctx.src[ctx.pos] === ch) { ctx.pos++; return true; }
  return false;
}

function matchStr(ctx: ParseContext, s: string): boolean {
  skipComment(ctx);
  if (ctx.src.startsWith(s, ctx.pos)) { ctx.pos += s.length; return true; }
  return false;
}

function peekStr(ctx: ParseContext, s: string): boolean {
  skipComment(ctx);
  return ctx.src.startsWith(s, ctx.pos);
}

/** Parse a coordinate like (x,y) */
function parseCoord(ctx: ParseContext): [number, number] | null {
  skipComment(ctx);
  if (!expectChar(ctx, '(')) return null;
  skipComment(ctx);

  // Could be a named node reference like (nodename)
  let content = '';
  let depth = 1;
  while (ctx.pos < ctx.src.length && depth > 0) {
    const ch = ctx.src[ctx.pos];
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth === 0) break; }
    content += ch;
    ctx.pos++;
  }
  expectChar(ctx, ')');

  // Try to parse as numeric coordinates
  const parts = content.split(',').map(s => s.trim());
  if (parts.length === 2) {
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    if (!isNaN(x) && !isNaN(y)) return [x, y];
  }

  // Named reference — return [0,0] as placeholder
  return [0, 0];
}

/** Parse options like [color, thick, ->] */
function parseOptions(ctx: ParseContext): { draw: DrawOptions; extras: Record<string, string> } {
  const draw: DrawOptions = {};
  const extras: Record<string, string> = {};
  skipComment(ctx);
  if (peek(ctx) !== '[') return { draw, extras };
  advance(ctx); // skip [

  let depth = 1;
  let optStr = '';
  while (ctx.pos < ctx.src.length && depth > 0) {
    const ch = ctx.src[ctx.pos];
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth === 0) break; }
    optStr += ch;
    ctx.pos++;
  }
  expectChar(ctx, ']');

  const parts = optStr.split(',').map(s => s.trim()).filter(Boolean);
  const colorNames = ['black','blue','red','green','green!60!black','purple','orange','gray','white','cyan','magenta','yellow','brown','violet','teal'];
  const lineWidths = ['ultra thin','very thin','thin','thick','very thick','ultra thick'];
  const lineStyles = ['solid','dashed','dotted','dash dot'];
  const arrowTypes = ['->','<-','<->','->>','<<-','|-|'];

  for (const part of parts) {
    if (arrowTypes.includes(part)) { draw.arrow = part; continue; }
    if (lineStyles.includes(part)) { draw.lineStyle = part; continue; }
    if (lineWidths.includes(part)) { draw.lineWidth = part; continue; }
    if (colorNames.includes(part)) { draw.color = part; continue; }
    if (part.startsWith('fill=')) { draw.fill = part.slice(5); continue; }
    if (part === 'smooth') { draw.smooth = true; continue; }
    // bend
    if (part.startsWith('bend left')) {
      const m = part.match(/bend left(?:=(\d+))?/);
      extras['bend'] = m?.[1] || '30';
      continue;
    }
    if (part.startsWith('bend right')) {
      const m = part.match(/bend right(?:=(\d+))?/);
      extras['bend'] = '-' + (m?.[1] || '30');
      continue;
    }
    // key=value
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      extras[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
    } else {
      extras[part] = 'true';
    }
  }

  return { draw, extras };
}

/** Parse content inside braces {content} */
function parseBraced(ctx: ParseContext): string {
  skipComment(ctx);
  if (!expectChar(ctx, '{')) return '';
  let depth = 1;
  let content = '';
  while (ctx.pos < ctx.src.length && depth > 0) {
    const ch = ctx.src[ctx.pos];
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) break; }
    content += ch;
    ctx.pos++;
  }
  expectChar(ctx, '}');
  return content;
}

/** Skip to end of command (semicolon) */
function skipToSemicolon(ctx: ParseContext) {
  while (ctx.pos < ctx.src.length && ctx.src[ctx.pos] !== ';') ctx.pos++;
  if (ctx.pos < ctx.src.length) ctx.pos++; // skip ;
}

/** Parse a single TikZ command and return element(s) */
function parseCommand(ctx: ParseContext): TikzElement[] {
  skipComment(ctx);
  if (ctx.pos >= ctx.src.length) return [];

  // \draw command
  if (matchStr(ctx, '\\draw')) {
    return parseDraw(ctx);
  }

  // \fill command
  if (matchStr(ctx, '\\fill')) {
    return parseFillCmd(ctx);
  }

  // \node command
  if (matchStr(ctx, '\\node')) {
    return parseNodeCmd(ctx);
  }

  // \begin{scope}
  if (matchStr(ctx, '\\begin{scope}')) {
    return parseScopeCmd(ctx);
  }

  // Skip unrecognized commands
  skipToSemicolon(ctx);
  return [];
}

function parseDraw(ctx: ParseContext): TikzElement[] {
  const { draw: opts, extras } = parseOptions(ctx);
  skipComment(ctx);

  // Check for plot
  if (peekStr(ctx, 'plot')) {
    return parsePlotSubcommand(ctx, opts, extras);
  }

  // Parse coordinate sequence
  const coords: [number, number][] = [];
  let isArc = false;
  let arcParams = { startAngle: 0, endAngle: 0, radius: 0 };
  let isBezier = false;
  const controlPoints: [number, number][] = [];

  while (ctx.pos < ctx.src.length) {
    skipComment(ctx);
    if (peek(ctx) === ';') { ctx.pos++; break; }
    if (peek(ctx) === '(') {
      const c = parseCoord(ctx);
      if (c) coords.push(c);
      skipComment(ctx);
      continue;
    }
    // -- connector
    if (matchStr(ctx, '--')) {
      skipComment(ctx);
      // Check for "cycle"
      if (peekStr(ctx, 'cycle')) {
        advance(ctx, 5);
        // Closed path
      }
      continue;
    }
    // arc (start:end:radius)
    if (matchStr(ctx, 'arc')) {
      isArc = true;
      skipComment(ctx);
      if (expectChar(ctx, '(')) {
        let arcStr = '';
        while (ctx.pos < ctx.src.length && peek(ctx) !== ')') arcStr += advance(ctx);
        expectChar(ctx, ')');
        const parts = arcStr.split(':').map(s => parseFloat(s.trim()));
        if (parts.length >= 3) {
          arcParams = { startAngle: parts[0], endAngle: parts[1], radius: parts[2] };
        }
      }
      continue;
    }
    // .. controls
    if (matchStr(ctx, '..')) {
      skipComment(ctx);
      if (matchStr(ctx, 'controls')) {
        isBezier = true;
        skipComment(ctx);
        const c1 = parseCoord(ctx);
        if (c1) controlPoints.push(c1);
        skipComment(ctx);
        matchStr(ctx, 'and');
        skipComment(ctx);
        const c2 = parseCoord(ctx);
        if (c2) controlPoints.push(c2);
        skipComment(ctx);
        matchStr(ctx, '..');
      }
      continue;
    }
    // to
    if (matchStr(ctx, 'to')) {
      skipComment(ctx);
      // Check for node inline
      if (peekStr(ctx, 'node')) {
        advance(ctx, 4);
        parseOptions(ctx); // skip node options
        skipComment(ctx);
        parseBraced(ctx); // skip node label
      }
      continue;
    }
    // node mid-path
    if (matchStr(ctx, 'node')) {
      parseOptions(ctx);
      skipComment(ctx);
      parseBraced(ctx);
      continue;
    }
    // circle (radius)
    if (matchStr(ctx, 'circle')) {
      skipComment(ctx);
      if (expectChar(ctx, '(')) {
        let rStr = '';
        while (ctx.pos < ctx.src.length && peek(ctx) !== ')') rStr += advance(ctx);
        expectChar(ctx, ')');
        const radius = parseFloat(rStr.trim());
        if (!isNaN(radius) && coords.length > 0) {
          const el: CircleElement = {
            id: crypto.randomUUID(), type: 'circle',
            center: coords[0], radius, options: opts,
          };
          skipToSemicolon(ctx);
          return [el];
        }
      }
      continue;
    }
    // ellipse (rx and ry)
    if (matchStr(ctx, 'ellipse')) {
      skipComment(ctx);
      if (expectChar(ctx, '(')) {
        let eStr = '';
        while (ctx.pos < ctx.src.length && peek(ctx) !== ')') eStr += advance(ctx);
        expectChar(ctx, ')');
        const parts = eStr.split('and').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && coords.length > 0) {
          const el: EllipseElement = {
            id: crypto.randomUUID(), type: 'ellipse',
            center: coords[0], rx: parts[0], ry: parts[1], options: opts,
          };
          skipToSemicolon(ctx);
          return [el];
        }
      }
      continue;
    }

    // Skip unknown tokens
    advance(ctx);
  }

  // Build element from collected data
  if (isArc && coords.length > 0) {
    const startPt = coords[0];
    const cx = startPt[0] - arcParams.radius * Math.cos(arcParams.startAngle * Math.PI / 180);
    const cy = startPt[1] - arcParams.radius * Math.sin(arcParams.startAngle * Math.PI / 180);
    const el: ArcElement = {
      id: crypto.randomUUID(), type: 'arc',
      center: [cx, cy], radius: arcParams.radius,
      startAngle: arcParams.startAngle, endAngle: arcParams.endAngle,
      options: opts,
    };
    return [el];
  }

  if (isBezier && coords.length >= 2 && controlPoints.length >= 2) {
    const el: BezierElement = {
      id: crypto.randomUUID(), type: 'bezier',
      points: [coords[0], controlPoints[0], controlPoints[1], coords[coords.length - 1]],
      options: opts,
    };
    return [el];
  }

  if (opts.arrow && coords.length >= 2) {
    const el: ArrowElement = {
      id: crypto.randomUUID(), type: 'arrow',
      from: coords[0], to: coords[coords.length - 1], options: opts,
    };
    return [el];
  }

  if (coords.length >= 2) {
    const el: LineElement = {
      id: crypto.randomUUID(), type: 'line',
      points: coords, options: opts,
    };
    return [el];
  }

  return [];
}

function parsePlotSubcommand(ctx: ParseContext, opts: DrawOptions, extras: Record<string, string>): TikzElement[] {
  matchStr(ctx, 'plot');
  skipComment(ctx);

  // Parse plot options [domain=..., smooth, samples=...]
  const plotOpts = parseOptions(ctx);
  const domain = plotOpts.extras['domain'] || '-3:3';
  const [dMin, dMax] = domain.split(':').map(s => parseFloat(s.trim()));

  skipComment(ctx);
  // parse (variable, {expression})
  if (expectChar(ctx, '(')) {
    let exprStr = '';
    let depth = 1;
    while (ctx.pos < ctx.src.length && depth > 0) {
      const ch = ctx.src[ctx.pos];
      if (ch === '(') depth++;
      if (ch === ')') { depth--; if (depth === 0) break; }
      exprStr += ch;
      ctx.pos++;
    }
    expectChar(ctx, ')');

    // Parse "variable, {fn}" or just variable
    const parts = exprStr.split(',').map(s => s.trim());
    let variable = 'x';
    let fn = exprStr;
    if (parts.length >= 2) {
      variable = parts[0].replace('\\', '');
      fn = parts.slice(1).join(',').replace(/^\{|\}$/g, '').trim();
    }

    const el: PlotElement = {
      id: crypto.randomUUID(), type: 'plot',
      fn, domain: [isNaN(dMin) ? -3 : dMin, isNaN(dMax) ? 3 : dMax],
      variable, options: opts,
    };
    skipToSemicolon(ctx);
    return [el];
  }

  // coordinates {} style plot
  if (matchStr(ctx, 'coordinates')) {
    skipComment(ctx);
    const coordsStr = parseBraced(ctx);
    const coords: [number, number][] = [];
    const coordRegex = /\(([^,]+),([^)]+)\)/g;
    let m;
    while ((m = coordRegex.exec(coordsStr))) {
      coords.push([parseFloat(m[1].trim()), parseFloat(m[2].trim())]);
    }
    if (coords.length >= 2) {
      const el: PathElement = {
        id: crypto.randomUUID(), type: 'path',
        points: coords, closed: false, smooth: extras['smooth'] === 'true' || opts.smooth || false,
        options: opts,
      };
      skipToSemicolon(ctx);
      return [el];
    }
  }

  skipToSemicolon(ctx);
  return [];
}

function parseFillCmd(ctx: ParseContext): TikzElement[] {
  const { draw: opts, extras } = parseOptions(ctx);
  const coords: [number, number][] = [];

  while (ctx.pos < ctx.src.length) {
    skipComment(ctx);
    if (peek(ctx) === ';') { ctx.pos++; break; }
    if (peek(ctx) === '(') {
      const c = parseCoord(ctx);
      if (c) coords.push(c);
    }
    if (matchStr(ctx, '--')) continue;
    if (matchStr(ctx, 'cycle')) continue;
    advance(ctx);
  }

  if (coords.length >= 3) {
    const el: FillElement = {
      id: crypto.randomUUID(), type: 'fill',
      path: coords,
      fillOptions: {
        color: opts.color || extras['color'] || 'blue',
        opacity: extras['opacity'] ? parseFloat(extras['opacity']) : 0.3,
        pattern: extras['pattern'],
      },
      options: opts,
    };
    return [el];
  }
  return [];
}

function parseNodeCmd(ctx: ParseContext): TikzElement[] {
  const { draw: opts, extras } = parseOptions(ctx);
  skipComment(ctx);

  // Check for optional name (name)
  let name: string | undefined;
  if (peek(ctx) === '(') {
    const saved = ctx.pos;
    advance(ctx);
    let nameStr = '';
    while (ctx.pos < ctx.src.length && peek(ctx) !== ')') nameStr += advance(ctx);
    expectChar(ctx, ')');
    // If it looks like coordinates, restore
    if (nameStr.includes(',') && !isNaN(parseFloat(nameStr.split(',')[0]))) {
      ctx.pos = saved;
    } else {
      name = nameStr.trim();
    }
  }

  skipComment(ctx);
  // "at" keyword
  let at: [number, number] = [0, 0];
  if (matchStr(ctx, 'at')) {
    skipComment(ctx);
    const c = parseCoord(ctx);
    if (c) at = c;
  }

  skipComment(ctx);
  const label = parseBraced(ctx);
  skipToSemicolon(ctx);

  const el: NodeElement = {
    id: crypto.randomUUID(), type: 'node',
    at, label, name,
    nodeOptions: {
      anchor: extras['above'] ? 'above' : extras['below'] ? 'below' : extras['left'] ? 'left' : extras['right'] ? 'right' : undefined,
      draw: !!extras['draw'],
      fill: extras['fill'] || undefined,
      shape: extras['circle'] ? 'circle' : extras['diamond'] ? 'diamond' : undefined,
    },
    options: opts,
  };
  return [el];
}

function parseScopeCmd(ctx: ParseContext): TikzElement[] {
  const { extras } = parseOptions(ctx);
  const children: TikzElement[] = [];

  while (ctx.pos < ctx.src.length) {
    skipComment(ctx);
    if (peekStr(ctx, '\\end{scope}')) {
      ctx.pos += '\\end{scope}'.length;
      break;
    }
    if (ctx.pos >= ctx.src.length) break;
    const elements = parseCommand(ctx);
    children.push(...elements);
  }

  // Parse transform from extras
  let shift: [number, number] = [0, 0];
  if (extras['shift']) {
    const m = extras['shift'].match(/\{?\(([^,]+),([^)]+)\)\}?/);
    if (m) shift = [parseFloat(m[1]), parseFloat(m[2])];
  }
  const rotate = extras['rotate'] ? parseFloat(extras['rotate']) : 0;
  const scale = extras['scale'] ? parseFloat(extras['scale']) : 1;

  const el: ScopeElement = {
    id: crypto.randomUUID(), type: 'scope',
    children,
    transform: { shift, rotate, scale },
    options: {},
  };
  return [el];
}

/**
 * Parse a tikz-cd diagram into nodes + edges.
 * Format: \begin{tikzcd} A \arrow[r] & B \\ C & D \end{tikzcd}
 */
function parseTikzCdSource(source: string): TikzFigure {
  // Extract content between \begin{tikzcd}[opts] and \end{tikzcd}
  const cdMatch = source.match(/\\begin\{tikzcd\}(?:\[([^\]]*)\])?\s*([\s\S]*?)\\end\{tikzcd\}/);
  if (!cdMatch) {
    return { id: crypto.randomUUID(), elements: [], viewport: { xMin: -1, xMax: 5, yMin: -1, yMax: 4 }, showGrid: false, showAxes: false, options: {} };
  }

  const body = cdMatch[2];
  const rows = body.split('\\\\').map(r => r.trim()).filter(Boolean);
  const colSep = 3;
  const rowSep = 2;

  const elements: TikzElement[] = [];
  // Grid of node names: nodeGrid[row][col] = name
  const nodeGrid: string[][] = [];

  // First pass: create nodes
  for (let row = 0; row < rows.length; row++) {
    const cells = rows[row].split('&').map(c => c.trim());
    nodeGrid.push([]);
    for (let col = 0; col < cells.length; col++) {
      // Extract the node label (text before any \arrow)
      let cellContent = cells[col];
      // Remove \arrow[...]{...} commands to get the label
      let label = cellContent.replace(/\\arrow\[[^\]]*\](?:\{[^}]*\})?/g, '').trim();
      if (!label) label = '';

      const name = `cd-${row}-${col}`;
      nodeGrid[row].push(name);
      const x = col * colSep;
      const y = (rows.length - 1 - row) * rowSep; // top row has highest y

      const node: NodeElement = {
        id: crypto.randomUUID(), type: 'node',
        at: [x, y], label: label || '', name,
        nodeOptions: {}, options: {},
      };
      elements.push(node);
    }
  }

  // Second pass: parse arrows
  for (let row = 0; row < rows.length; row++) {
    const cells = rows[row].split('&').map(c => c.trim());
    for (let col = 0; col < cells.length; col++) {
      const cellContent = cells[col];
      // Find all \arrow[options]{label} in this cell
      const arrowRegex = /\\arrow\[([^\]]*)\](?:\{([^}]*)\})?/g;
      let m;
      while ((m = arrowRegex.exec(cellContent)) !== null) {
        const arrowOpts = m[1];
        const arrowLabel = m[2] || '';
        // Parse direction letters: r, l, u, d
        let dr = 0, dc = 0;
        const dirMatch = arrowOpts.match(/([rlud]+)/);
        if (dirMatch) {
          for (const ch of dirMatch[1]) {
            if (ch === 'r') dc++;
            if (ch === 'l') dc--;
            if (ch === 'u') dr--;
            if (ch === 'd') dr++;
          }
        }
        const targetRow = row + dr;
        const targetCol = col + dc;
        if (targetRow < 0 || targetRow >= nodeGrid.length) continue;
        if (targetCol < 0 || targetCol >= nodeGrid[targetRow].length) continue;

        const fromName = nodeGrid[row][col];
        const toName = nodeGrid[targetRow][targetCol];
        const fromX = col * colSep;
        const fromY = (rows.length - 1 - row) * rowSep;
        const toX = targetCol * colSep;
        const toY = (rows.length - 1 - targetRow) * rowSep;

        // Parse bend
        let bend = 0;
        const bendLeftMatch = arrowOpts.match(/bend left(?:=(\d+))?/);
        const bendRightMatch = arrowOpts.match(/bend right(?:=(\d+))?/);
        if (bendLeftMatch) bend = parseInt(bendLeftMatch[1] || '30');
        if (bendRightMatch) bend = -parseInt(bendRightMatch[1] || '30');

        // Parse label position
        let labelPosition: 'above' | 'below' | 'left' | 'right' | 'auto' = 'auto';
        if (arrowOpts.includes('above')) labelPosition = 'above';
        if (arrowOpts.includes('below')) labelPosition = 'below';

        const edge: EdgeElement = {
          id: crypto.randomUUID(), type: 'edge',
          from: fromName, to: toName,
          fromPos: [fromX, fromY], toPos: [toX, toY],
          label: arrowLabel, labelPosition, bend,
          options: { arrow: '->' },
        };
        if (arrowOpts.includes('dashed')) edge.options.lineStyle = 'dashed';
        if (arrowOpts.includes('dotted')) edge.options.lineStyle = 'dotted';
        elements.push(edge);
      }
    }
  }

  // Compute viewport
  const maxCol = Math.max(...nodeGrid.map(r => r.length - 1), 0);
  const maxRow = rows.length - 1;
  return {
    id: crypto.randomUUID(),
    elements,
    viewport: {
      xMin: -1,
      xMax: maxCol * colSep + 1,
      yMin: -1,
      yMax: maxRow * rowSep + 1,
    },
    showGrid: false,
    showAxes: false,
    options: {},
  };
}

/**
 * Parse a TikZ source string into a TikzFigure.
 * Handles: \draw, \fill, \node, \begin{scope}, \begin{tikzcd}, and common options.
 */
export function parseTikzSource(source: string): TikzFigure {
  // Check if it's a tikz-cd diagram
  if (source.includes('\\begin{tikzcd}')) {
    return parseTikzCdSource(source);
  }
  const ctx: ParseContext = { pos: 0, src: source };

  // Detect viewport from axis draw commands
  let hasAxes = false;
  let hasGrid = false;

  // Try to find \begin{tikzpicture}
  const tpIdx = source.indexOf('\\begin{tikzpicture}');
  if (tpIdx >= 0) {
    ctx.pos = tpIdx + '\\begin{tikzpicture}'.length;
    // Skip tikzpicture options
    skipComment(ctx);
    if (peek(ctx) === '[') parseOptions(ctx);
  }

  const elements: TikzElement[] = [];

  while (ctx.pos < ctx.src.length) {
    skipComment(ctx);
    if (ctx.pos >= ctx.src.length) break;
    if (peekStr(ctx, '\\end{tikzpicture}')) break;
    if (peekStr(ctx, '\\end{')) break;

    const startPos = ctx.pos;
    const els = parseCommand(ctx);

    // Detect axis-like draw commands (arrows with x/y labels)
    for (const el of els) {
      if (el.type === 'arrow' && el.options.arrow) {
        // Check if this looks like an axis
        if (Math.abs(el.from[1]) < 0.01 && Math.abs(el.to[1]) < 0.01) hasAxes = true;
        if (Math.abs(el.from[0]) < 0.01 && Math.abs(el.to[0]) < 0.01) hasAxes = true;
      }
    }

    elements.push(...els);

    // Prevent infinite loop
    if (ctx.pos === startPos) ctx.pos++;
  }

  // Compute viewport from elements
  let xMin = -1, xMax = 5, yMin = -1, yMax = 4;
  const allPts: [number, number][] = [];
  for (const el of elements) {
    if (el.type === 'line') allPts.push(...el.points);
    if (el.type === 'arrow') { allPts.push(el.from, el.to); }
    if (el.type === 'circle') { allPts.push([el.center[0] - el.radius, el.center[1] - el.radius], [el.center[0] + el.radius, el.center[1] + el.radius]); }
    if (el.type === 'ellipse') { allPts.push([el.center[0] - el.rx, el.center[1] - el.ry], [el.center[0] + el.rx, el.center[1] + el.ry]); }
    if (el.type === 'node') allPts.push(el.at);
    if (el.type === 'edge') { allPts.push(el.fromPos, el.toPos); }
    if (el.type === 'matrix') allPts.push(el.at);
    if (el.type === 'bezier') allPts.push(...el.points);
    if (el.type === 'path') allPts.push(...el.points);
    if (el.type === 'fill') allPts.push(...el.path);
    if (el.type === 'arc') { allPts.push(el.center); }
  }

  if (allPts.length > 0) {
    xMin = Math.min(...allPts.map(p => p[0])) - 0.5;
    xMax = Math.max(...allPts.map(p => p[0])) + 0.5;
    yMin = Math.min(...allPts.map(p => p[1])) - 0.5;
    yMax = Math.max(...allPts.map(p => p[1])) + 0.5;
    // Ensure minimum size
    if (xMax - xMin < 2) { xMin -= 1; xMax += 1; }
    if (yMax - yMin < 2) { yMin -= 1; yMax += 1; }
  }

  // Filter out axis-like elements if detected
  const filteredElements = hasAxes
    ? elements.filter(el => {
        // Remove arrow elements that look like axis lines
        if (el.type !== 'arrow') return true;
        const isHorizontal = Math.abs(el.from[1]) < 0.01 && Math.abs(el.to[1]) < 0.01;
        const isVertical = Math.abs(el.from[0]) < 0.01 && Math.abs(el.to[0]) < 0.01;
        return !(isHorizontal || isVertical);
      })
    : elements;

  return {
    id: crypto.randomUUID(),
    elements: filteredElements,
    viewport: { xMin, xMax, yMin, yMax },
    showGrid: hasGrid,
    showAxes: hasAxes,
    options: {},
  };
}
