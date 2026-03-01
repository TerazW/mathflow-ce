import { Snippet } from './index';

export const functionSnippets: Snippet[] = [
  // Trigonometric functions
  {
    trigger: 'sin',
    replacement: '\\sin',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Sine',
    category: 'Functions',
  },
  {
    trigger: 'cos',
    replacement: '\\cos',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Cosine',
    category: 'Functions',
  },
  {
    trigger: 'tan',
    replacement: '\\tan',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Tangent',
    category: 'Functions',
  },
  {
    trigger: 'cot',
    replacement: '\\cot',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Cotangent',
    category: 'Functions',
  },
  {
    trigger: 'sec',
    replacement: '\\sec',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Secant',
    category: 'Functions',
  },
  {
    trigger: 'csc',
    replacement: '\\csc',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Cosecant',
    category: 'Functions',
  },

  // Inverse trig
  {
    trigger: 'asin',
    replacement: '\\arcsin',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Arc sine',
    category: 'Functions',
  },
  {
    trigger: 'acos',
    replacement: '\\arccos',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Arc cosine',
    category: 'Functions',
  },
  {
    trigger: 'atan',
    replacement: '\\arctan',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Arc tangent',
    category: 'Functions',
  },

  // Logarithmic / Exponential
  {
    trigger: 'ln',
    replacement: '\\ln',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Natural log',
    category: 'Functions',
  },
  {
    trigger: 'log',
    replacement: '\\log',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Logarithm',
    category: 'Functions',
  },
  {
    trigger: 'exp',
    replacement: '\\exp',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Exponential',
    category: 'Functions',
  },

  // Hyperbolic
  {
    trigger: 'sinh',
    replacement: '\\sinh',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Hyperbolic sine',
    category: 'Functions',
  },
  {
    trigger: 'cosh',
    replacement: '\\cosh',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Hyperbolic cosine',
    category: 'Functions',
  },
  {
    trigger: 'tanh',
    replacement: '\\tanh',
    options: { mode: 'math', triggerKind: 'auto', priority: 45, wordBoundary: true },
    description: 'Hyperbolic tangent',
    category: 'Functions',
  },

  // Other common functions
  {
    trigger: 'gcd',
    replacement: '\\gcd',
    options: { mode: 'math', triggerKind: 'tab', priority: 45, wordBoundary: true },
    description: 'Greatest common divisor',
    category: 'Functions',
  },
  {
    trigger: 'lcm',
    replacement: '\\operatorname{lcm}',
    options: { mode: 'math', triggerKind: 'tab', priority: 45, wordBoundary: true },
    description: 'Least common multiple',
    category: 'Functions',
  },
  {
    trigger: 'deg',
    replacement: '\\deg',
    options: { mode: 'math', triggerKind: 'tab', priority: 45, wordBoundary: true },
    description: 'Degree',
    category: 'Functions',
  },
  {
    trigger: 'arg',
    replacement: '\\arg',
    options: { mode: 'math', triggerKind: 'tab', priority: 45, wordBoundary: true },
    description: 'Argument',
    category: 'Functions',
  },
];
