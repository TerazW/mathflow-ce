import type { TikzFigure } from '../model/TikzAST';

export interface TikzTemplate {
  id: string;
  name: string;
  category: string;
  snippet: string;
  description: string;
  figure: TikzFigure;
}

// Base axes elements used by many templates
function axesElements() {
  return [
    {
      id: 'axis-x', type: 'arrow' as const,
      from: [-0.5, 0] as [number, number], to: [5, 0] as [number, number],
      options: { color: 'black', arrow: '->' },
    },
    {
      id: 'axis-y', type: 'arrow' as const,
      from: [0, -0.5] as [number, number], to: [0, 4] as [number, number],
      options: { color: 'black', arrow: '->' },
    },
    {
      id: 'label-x', type: 'node' as const,
      at: [5, 0] as [number, number], label: '$x$',
      options: {}, nodeOptions: { anchor: 'below right' },
    },
    {
      id: 'label-y', type: 'node' as const,
      at: [0, 4] as [number, number], label: '$y$',
      options: {}, nodeOptions: { anchor: 'above left' },
    },
    {
      id: 'label-O', type: 'node' as const,
      at: [0, 0] as [number, number], label: '$O$',
      options: {}, nodeOptions: { anchor: 'below left' },
    },
  ];
}

export const TEMPLATE_REGISTRY: TikzTemplate[] = [
  // #01 Coordinate Axes
  {
    id: 'tpl-axes',
    name: 'Coordinate Axes',
    category: 'general',
    snippet: 'figxy',
    description: 'Standard x-y coordinate axes with labels',
    figure: {
      id: crypto.randomUUID(),
      elements: axesElements(),
      viewport: { xMin: -1, xMax: 6, yMin: -1, yMax: 5 },
      showGrid: true,
      showAxes: false,
      options: {},
    },
  },

  // #02 Function Graph
  {
    id: 'tpl-function',
    name: 'Function Graph',
    category: 'calculus',
    snippet: 'figfn',
    description: 'Function curve with axes and annotation',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        ...axesElements(),
        {
          id: 'curve', type: 'plot' as const,
          fn: 'sqrt(x)', domain: [0, 4.5] as [number, number], variable: 'x',
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'curve-label', type: 'node' as const,
          at: [3.5, 2.1] as [number, number], label: '$f(x) = \\sqrt{x}$',
          options: { color: 'blue' }, nodeOptions: { anchor: 'above right' },
        },
      ],
      viewport: { xMin: -1, xMax: 6, yMin: -1, yMax: 4 },
      showGrid: true,
      showAxes: false,
      options: {},
    },
  },

  // #03 Integral Region
  {
    id: 'tpl-integral',
    name: 'Integral Region',
    category: 'calculus',
    snippet: 'figint',
    description: 'Shaded area under curve with boundary labels',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        ...axesElements(),
        {
          id: 'curve', type: 'plot' as const,
          fn: 'sqrt(x)', domain: [0, 4.5] as [number, number], variable: 'x',
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'bound-a', type: 'line' as const,
          points: [[1, 0], [1, 1]] as [number, number][],
          options: { color: 'red', lineStyle: 'dashed' },
        },
        {
          id: 'bound-b', type: 'line' as const,
          points: [[4, 0], [4, 2]] as [number, number][],
          options: { color: 'red', lineStyle: 'dashed' },
        },
        {
          id: 'label-a', type: 'node' as const,
          at: [1, 0] as [number, number], label: '$a$',
          options: { color: 'red' }, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'label-b', type: 'node' as const,
          at: [4, 0] as [number, number], label: '$b$',
          options: { color: 'red' }, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'int-label', type: 'node' as const,
          at: [2.5, 0.6] as [number, number], label: '$\\int_a^b f(x)\\,dx$',
          options: { color: 'blue' }, nodeOptions: { anchor: '' },
        },
      ],
      viewport: { xMin: -1, xMax: 6, yMin: -1, yMax: 4 },
      showGrid: true,
      showAxes: false,
      options: {},
    },
  },

  // #04 ε-δ Proof
  {
    id: 'tpl-epsilon-delta',
    name: 'ε-δ Proof Diagram',
    category: 'calculus',
    snippet: 'figed',
    description: 'Classic ε-δ limit illustration',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        ...axesElements(),
        {
          id: 'curve', type: 'plot' as const,
          fn: '0.5*x + 0.5', domain: [0, 4.5] as [number, number], variable: 'x',
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'eps-upper', type: 'line' as const,
          points: [[0, 2.3], [5, 2.3]] as [number, number][],
          options: { color: 'red', lineStyle: 'dashed' },
        },
        {
          id: 'eps-lower', type: 'line' as const,
          points: [[0, 1.7], [5, 1.7]] as [number, number][],
          options: { color: 'red', lineStyle: 'dashed' },
        },
        {
          id: 'delta-left', type: 'line' as const,
          points: [[2.4, 0], [2.4, 3.5]] as [number, number][],
          options: { color: 'green!60!black', lineStyle: 'dashed' },
        },
        {
          id: 'delta-right', type: 'line' as const,
          points: [[3.6, 0], [3.6, 3.5]] as [number, number][],
          options: { color: 'green!60!black', lineStyle: 'dashed' },
        },
        {
          id: 'label-L', type: 'node' as const,
          at: [0, 2] as [number, number], label: '$L$',
          options: {}, nodeOptions: { anchor: 'left' },
        },
        {
          id: 'label-eps', type: 'node' as const,
          at: [5.2, 2.3] as [number, number], label: '$L+\\varepsilon$',
          options: { color: 'red' }, nodeOptions: { anchor: 'right' },
        },
        {
          id: 'label-a', type: 'node' as const,
          at: [3, 0] as [number, number], label: '$a$',
          options: {}, nodeOptions: { anchor: 'below' },
        },
      ],
      viewport: { xMin: -1, xMax: 6, yMin: -1, yMax: 4 },
      showGrid: true,
      showAxes: false,
      options: {},
    },
  },

  // #05 Vector Addition
  {
    id: 'tpl-vectors',
    name: 'Vector Addition',
    category: 'linear-algebra',
    snippet: 'figvec',
    description: 'Two vectors with parallelogram sum',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        {
          id: 'vec-u', type: 'arrow' as const,
          from: [0, 0] as [number, number], to: [3, 1] as [number, number],
          options: { color: 'blue', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'vec-v', type: 'arrow' as const,
          from: [0, 0] as [number, number], to: [1, 2.5] as [number, number],
          options: { color: 'red', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'vec-sum', type: 'arrow' as const,
          from: [0, 0] as [number, number], to: [4, 3.5] as [number, number],
          options: { color: 'purple', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'para-1', type: 'line' as const,
          points: [[3, 1], [4, 3.5]] as [number, number][],
          options: { color: 'gray', lineStyle: 'dashed' },
        },
        {
          id: 'para-2', type: 'line' as const,
          points: [[1, 2.5], [4, 3.5]] as [number, number][],
          options: { color: 'gray', lineStyle: 'dashed' },
        },
        {
          id: 'label-u', type: 'node' as const,
          at: [1.5, 0.2] as [number, number], label: '$\\vec{u}$',
          options: { color: 'blue' }, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'label-v', type: 'node' as const,
          at: [0.3, 1.5] as [number, number], label: '$\\vec{v}$',
          options: { color: 'red' }, nodeOptions: { anchor: 'left' },
        },
        {
          id: 'label-sum', type: 'node' as const,
          at: [2.3, 2.2] as [number, number], label: '$\\vec{u}+\\vec{v}$',
          options: { color: 'purple' }, nodeOptions: { anchor: 'above left' },
        },
      ],
      viewport: { xMin: -1, xMax: 5.5, yMin: -0.5, yMax: 4.5 },
      showGrid: true,
      showAxes: false,
      options: {},
    },
  },

  // #06 Linear Transformation
  {
    id: 'tpl-lintrans',
    name: 'Linear Transformation',
    category: 'linear-algebra',
    snippet: 'figlt',
    description: 'Unit square before/after transformation',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        // Left side: unit square
        {
          id: 'unit-sq', type: 'path' as const,
          points: [[0, 0], [1, 0], [1, 1], [0, 1]] as [number, number][],
          closed: true, smooth: false,
          options: { color: 'blue', fill: 'blue', lineStyle: 'dashed' },
        },
        {
          id: 'e1', type: 'arrow' as const,
          from: [0, 0] as [number, number], to: [1, 0] as [number, number],
          options: { color: 'red', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'e2', type: 'arrow' as const,
          from: [0, 0] as [number, number], to: [0, 1] as [number, number],
          options: { color: 'green!60!black', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'label-e1', type: 'node' as const,
          at: [0.5, 0] as [number, number], label: '$\\vec{e}_1$',
          options: { color: 'red' }, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'label-e2', type: 'node' as const,
          at: [0, 0.5] as [number, number], label: '$\\vec{e}_2$',
          options: { color: 'green!60!black' }, nodeOptions: { anchor: 'left' },
        },
        // Arrow
        {
          id: 'transform-arrow', type: 'arrow' as const,
          from: [1.5, 0.5] as [number, number], to: [2.5, 0.5] as [number, number],
          options: { color: 'black', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'label-T', type: 'node' as const,
          at: [2, 0.5] as [number, number], label: '$T$',
          options: {}, nodeOptions: { anchor: 'above' },
        },
        // Right side: transformed
        {
          id: 'trans-sq', type: 'path' as const,
          points: [[3, 0], [5, 0.5], [4.5, 2.5], [2.5, 2]] as [number, number][],
          closed: true, smooth: false,
          options: { color: 'purple', fill: 'purple', lineStyle: 'dashed' },
        },
        {
          id: 'Te1', type: 'arrow' as const,
          from: [3, 0] as [number, number], to: [5, 0.5] as [number, number],
          options: { color: 'red', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'Te2', type: 'arrow' as const,
          from: [3, 0] as [number, number], to: [2.5, 2] as [number, number],
          options: { color: 'green!60!black', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'label-Te1', type: 'node' as const,
          at: [4, 0.1] as [number, number], label: '$T(\\vec{e}_1)$',
          options: { color: 'red' }, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'label-Te2', type: 'node' as const,
          at: [2.5, 1.2] as [number, number], label: '$T(\\vec{e}_2)$',
          options: { color: 'green!60!black' }, nodeOptions: { anchor: 'left' },
        },
      ],
      viewport: { xMin: -0.5, xMax: 6, yMin: -0.5, yMax: 3.5 },
      showGrid: true,
      showAxes: false,
      options: {},
    },
  },

  // #07 Open Set / Topological Space
  {
    id: 'tpl-blob',
    name: 'Open Set (Topology)',
    category: 'topology',
    snippet: 'figblob',
    description: 'Nested smooth regions with labeled points',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        {
          id: 'outer-blob', type: 'bezier' as const,
          points: [[0.5, 0.5], [2, -0.5], [4, 0.5], [4.5, 2]] as [number, number][],
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'outer-blob2', type: 'bezier' as const,
          points: [[4.5, 2], [5, 3.5], [2, 4], [0.5, 2.5]] as [number, number][],
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'outer-blob3', type: 'line' as const,
          points: [[0.5, 2.5], [0.5, 0.5]] as [number, number][],
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'inner-blob', type: 'circle' as const,
          center: [2.5, 2] as [number, number], radius: 0.8,
          options: { color: 'red', lineStyle: 'dashed' },
        },
        {
          id: 'point-p', type: 'node' as const,
          at: [2.5, 2] as [number, number], label: '$p$',
          options: { color: 'red' }, nodeOptions: { anchor: 'above right' },
        },
        {
          id: 'label-omega', type: 'node' as const,
          at: [4, 3] as [number, number], label: '$\\Omega$',
          options: { color: 'blue' }, nodeOptions: { anchor: '' },
        },
        {
          id: 'label-U', type: 'node' as const,
          at: [2.5, 1] as [number, number], label: '$U$',
          options: { color: 'red' }, nodeOptions: { anchor: '' },
        },
      ],
      viewport: { xMin: -0.5, xMax: 5.5, yMin: -1, yMax: 4.5 },
      showGrid: false,
      showAxes: false,
      options: {},
    },
  },

  // #08 Contour Integration
  {
    id: 'tpl-contour',
    name: 'Contour Integration',
    category: 'complex-analysis',
    snippet: 'figcont',
    description: 'Circular contour in complex plane with poles',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        // Re/Im axes
        {
          id: 'axis-re', type: 'arrow' as const,
          from: [-2.5, 0] as [number, number], to: [3, 0] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'axis-im', type: 'arrow' as const,
          from: [0, -2.5] as [number, number], to: [0, 3] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'label-re', type: 'node' as const,
          at: [3, 0] as [number, number], label: '$\\mathrm{Re}$',
          options: {}, nodeOptions: { anchor: 'below right' },
        },
        {
          id: 'label-im', type: 'node' as const,
          at: [0, 3] as [number, number], label: '$\\mathrm{Im}$',
          options: {}, nodeOptions: { anchor: 'above left' },
        },
        // Contour
        {
          id: 'contour', type: 'circle' as const,
          center: [0, 0] as [number, number], radius: 2,
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'label-gamma', type: 'node' as const,
          at: [1.7, 1.7] as [number, number], label: '$\\Gamma$',
          options: { color: 'blue' }, nodeOptions: { anchor: 'above right' },
        },
        // Poles
        {
          id: 'pole1', type: 'node' as const,
          at: [0.8, 0.5] as [number, number], label: '$\\times$',
          options: { color: 'red' }, nodeOptions: { anchor: '' },
        },
        {
          id: 'pole1-label', type: 'node' as const,
          at: [0.8, 0.5] as [number, number], label: '$z_1$',
          options: { color: 'red' }, nodeOptions: { anchor: 'below right' },
        },
        {
          id: 'pole2', type: 'node' as const,
          at: [-0.5, -1] as [number, number], label: '$\\times$',
          options: { color: 'red' }, nodeOptions: { anchor: '' },
        },
        {
          id: 'pole2-label', type: 'node' as const,
          at: [-0.5, -1] as [number, number], label: '$z_2$',
          options: { color: 'red' }, nodeOptions: { anchor: 'below right' },
        },
        // R label
        {
          id: 'label-R', type: 'node' as const,
          at: [2, 0] as [number, number], label: '$R$',
          options: {}, nodeOptions: { anchor: 'below right' },
        },
      ],
      viewport: { xMin: -3, xMax: 3.5, yMin: -3, yMax: 3.5 },
      showGrid: false,
      showAxes: false,
      options: {},
    },
  },

  // #09 Commutative Diagram (simple 2x2)
  {
    id: 'tpl-commdiag',
    name: 'Commutative Diagram',
    category: 'algebra',
    snippet: 'figcd',
    description: '2x2 square diagram (A → B, C → D)',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        {
          id: 'node-A', type: 'node' as const,
          at: [0, 2] as [number, number], label: '$A$', name: 'A',
          options: {}, nodeOptions: {},
        },
        {
          id: 'node-B', type: 'node' as const,
          at: [3, 2] as [number, number], label: '$B$', name: 'B',
          options: {}, nodeOptions: {},
        },
        {
          id: 'node-C', type: 'node' as const,
          at: [0, 0] as [number, number], label: '$C$', name: 'C',
          options: {}, nodeOptions: {},
        },
        {
          id: 'node-D', type: 'node' as const,
          at: [3, 0] as [number, number], label: '$D$', name: 'D',
          options: {}, nodeOptions: {},
        },
        // Edges (tikz-cd arrows between nodes)
        {
          id: 'edge-AB', type: 'edge' as const,
          from: 'A', to: 'B',
          fromPos: [0, 2] as [number, number], toPos: [3, 2] as [number, number],
          label: '$f$', labelPosition: 'above' as const, bend: 0,
          options: { arrow: '->' },
        },
        {
          id: 'edge-CD', type: 'edge' as const,
          from: 'C', to: 'D',
          fromPos: [0, 0] as [number, number], toPos: [3, 0] as [number, number],
          label: '$g$', labelPosition: 'below' as const, bend: 0,
          options: { arrow: '->' },
        },
        {
          id: 'edge-AC', type: 'edge' as const,
          from: 'A', to: 'C',
          fromPos: [0, 2] as [number, number], toPos: [0, 0] as [number, number],
          label: '$h$', labelPosition: 'left' as const, bend: 0,
          options: { arrow: '->' },
        },
        {
          id: 'edge-BD', type: 'edge' as const,
          from: 'B', to: 'D',
          fromPos: [3, 2] as [number, number], toPos: [3, 0] as [number, number],
          label: '$k$', labelPosition: 'right' as const, bend: 0,
          options: { arrow: '->' },
        },
      ],
      viewport: { xMin: -1, xMax: 4, yMin: -1, yMax: 3 },
      showGrid: false,
      showAxes: false,
      options: {},
    },
  },

  // #10 Sequence Convergence
  {
    id: 'tpl-sequence',
    name: 'Sequence Convergence',
    category: 'calculus',
    snippet: 'figseq',
    description: 'Converging sequence with ε-band and limit',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        {
          id: 'axis-n', type: 'arrow' as const,
          from: [-0.5, 0] as [number, number], to: [8, 0] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'axis-y', type: 'arrow' as const,
          from: [0, -0.5] as [number, number], to: [0, 3.5] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'label-n', type: 'node' as const,
          at: [8, 0] as [number, number], label: '$n$',
          options: {}, nodeOptions: { anchor: 'below right' },
        },
        // Limit line
        {
          id: 'limit-line', type: 'line' as const,
          points: [[0, 2], [8, 2]] as [number, number][],
          options: { color: 'blue', lineStyle: 'dashed' },
        },
        {
          id: 'label-L', type: 'node' as const,
          at: [0, 2] as [number, number], label: '$L$',
          options: { color: 'blue' }, nodeOptions: { anchor: 'left' },
        },
        // ε-band
        {
          id: 'eps-upper', type: 'line' as const,
          points: [[0, 2.4], [8, 2.4]] as [number, number][],
          options: { color: 'red', lineStyle: 'dotted' },
        },
        {
          id: 'eps-lower', type: 'line' as const,
          points: [[0, 1.6], [8, 1.6]] as [number, number][],
          options: { color: 'red', lineStyle: 'dotted' },
        },
        // Sequence points
        ...([1, 2, 3, 4, 5, 6, 7].map((n) => ({
          id: `seq-${n}`, type: 'node' as const,
          at: [n, 2 + ((-1) ** n) * 2 / n] as [number, number],
          label: '$\\bullet$',
          options: { color: 'black' }, nodeOptions: {},
        }))),
      ],
      viewport: { xMin: -0.5, xMax: 8.5, yMin: -0.5, yMax: 4 },
      showGrid: false,
      showAxes: false,
      options: {},
    },
  },

  // #11 Probability Distribution
  {
    id: 'tpl-normal',
    name: 'Normal Distribution',
    category: 'probability',
    snippet: 'figpdf',
    description: 'Bell curve with shaded tail region',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        {
          id: 'axis-x', type: 'arrow' as const,
          from: [-3.5, 0] as [number, number], to: [3.5, 0] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'bell', type: 'plot' as const,
          fn: '1.5*exp(-x*x/2)', domain: [-3, 3] as [number, number], variable: 'x',
          options: { color: 'blue', lineWidth: 'thick' },
        },
        {
          id: 'mu-label', type: 'node' as const,
          at: [0, 0] as [number, number], label: '$\\mu$',
          options: {}, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'sigma-1', type: 'node' as const,
          at: [1, 0] as [number, number], label: '$\\sigma$',
          options: { color: 'gray' }, nodeOptions: { anchor: 'below' },
        },
        {
          id: 'sigma-m1', type: 'node' as const,
          at: [-1, 0] as [number, number], label: '$-\\sigma$',
          options: { color: 'gray' }, nodeOptions: { anchor: 'below' },
        },
      ],
      viewport: { xMin: -4, xMax: 4, yMin: -0.5, yMax: 2 },
      showGrid: false,
      showAxes: false,
      options: {},
    },
  },

  // #12 Parametric Surface
  {
    id: 'tpl-surface',
    name: 'Parametric Surface',
    category: 'diff-geometry',
    snippet: 'figsurf',
    description: 'Parameter domain U mapping to surface x(U)',
    figure: {
      id: crypto.randomUUID(),
      elements: [
        // Left: parameter domain
        {
          id: 'param-u-axis', type: 'arrow' as const,
          from: [-0.3, 0] as [number, number], to: [2.5, 0] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'param-v-axis', type: 'arrow' as const,
          from: [0, -0.3] as [number, number], to: [0, 2.5] as [number, number],
          options: { color: 'black', arrow: '->' },
        },
        {
          id: 'param-rect', type: 'path' as const,
          points: [[0.3, 0.3], [2, 0.3], [2, 2], [0.3, 2]] as [number, number][],
          closed: true, smooth: false,
          options: { color: 'blue', fill: 'blue' },
        },
        {
          id: 'label-u', type: 'node' as const,
          at: [2.5, 0] as [number, number], label: '$u$',
          options: {}, nodeOptions: { anchor: 'below right' },
        },
        {
          id: 'label-v', type: 'node' as const,
          at: [0, 2.5] as [number, number], label: '$v$',
          options: {}, nodeOptions: { anchor: 'above left' },
        },
        {
          id: 'label-U', type: 'node' as const,
          at: [1.2, 1.2] as [number, number], label: '$U$',
          options: { color: 'blue' }, nodeOptions: {},
        },
        // Arrow
        {
          id: 'map-arrow', type: 'arrow' as const,
          from: [3, 1.2] as [number, number], to: [4, 1.2] as [number, number],
          options: { color: 'black', lineWidth: 'thick', arrow: '->' },
        },
        {
          id: 'label-x', type: 'node' as const,
          at: [3.5, 1.2] as [number, number], label: '$\\mathbf{x}$',
          options: {}, nodeOptions: { anchor: 'above' },
        },
        // Right: surface
        {
          id: 'surface-boundary', type: 'bezier' as const,
          points: [[4.5, 0.3], [5.5, -0.5], [7, 1], [7, 2.5]] as [number, number][],
          options: { color: 'purple', lineWidth: 'thick' },
        },
        {
          id: 'surface-boundary2', type: 'bezier' as const,
          points: [[7, 2.5], [6.5, 3.5], [5, 3], [4.5, 2]] as [number, number][],
          options: { color: 'purple', lineWidth: 'thick' },
        },
        {
          id: 'surface-boundary3', type: 'line' as const,
          points: [[4.5, 2], [4.5, 0.3]] as [number, number][],
          options: { color: 'purple', lineWidth: 'thick' },
        },
        {
          id: 'label-xU', type: 'node' as const,
          at: [5.8, 1.5] as [number, number], label: '$\\mathbf{x}(U)$',
          options: { color: 'purple' }, nodeOptions: {},
        },
      ],
      viewport: { xMin: -0.5, xMax: 7.5, yMin: -1, yMax: 4 },
      showGrid: false,
      showAxes: false,
      options: {},
    },
  },
];

/** Get templates by category */
export function getTemplatesByCategory(): Record<string, TikzTemplate[]> {
  const groups: Record<string, TikzTemplate[]> = {};
  for (const tpl of TEMPLATE_REGISTRY) {
    if (!groups[tpl.category]) groups[tpl.category] = [];
    groups[tpl.category].push(tpl);
  }
  return groups;
}

/** Find template by snippet trigger */
export function findTemplateBySnippet(snippet: string): TikzTemplate | undefined {
  return TEMPLATE_REGISTRY.find(t => t.snippet === snippet);
}
