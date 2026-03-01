import { Snippet } from './index';

export const coreSnippets: Snippet[] = [
  // Mode switching
  {
    trigger: 'mk',
    replacement: '$1',
    options: { mode: 'text', triggerKind: 'auto', priority: 100, wordBoundary: true },
    description: 'Inline math mode',
    category: 'Mode Switching',
  },
  {
    trigger: 'dm',
    replacement: '$1',
    options: { mode: 'text', triggerKind: 'auto', priority: 100, wordBoundary: true },
    description: 'Display math mode',
    category: 'Mode Switching',
  },

  // Fractions
  {
    trigger: '//',
    replacement: '\\frac{$1}{$2}',
    options: { mode: 'math', triggerKind: 'auto', priority: 90, wordBoundary: false },
    tabStops: 2,
    description: 'Fraction',
    category: 'Fractions',
  },
  // Numeric fraction: digit(s) followed by /
  {
    trigger: /(\d+)\//,
    replacement: (match: string[]) => `\\frac{${match[1]}}{$1}`,
    options: { mode: 'math', triggerKind: 'auto', priority: 85, wordBoundary: false },
    tabStops: 1,
    description: 'Numeric fraction (e.g., 3/ → \\frac{3}{})',
    category: 'Fractions',
  },
  // Expression fraction: expression followed by /
  {
    trigger: /((\d*)(\\)?([A-Za-z]+)((\^|_)(\{\d+\}|\d))*)\//,
    replacement: (match: string[]) => `\\frac{${match[1]}}{$1}`,
    options: { mode: 'math', triggerKind: 'auto', priority: 80, wordBoundary: false },
    tabStops: 1,
    description: 'Expression fraction (e.g., 4\\pi^2/ → \\frac{4\\pi^2}{})',
    category: 'Fractions',
  },

  // Superscripts & Subscripts
  {
    trigger: 'sr',
    replacement: '^2',
    options: { mode: 'math', triggerKind: 'auto', priority: 70, wordBoundary: false },
    description: 'Squared',
    category: 'Superscripts & Subscripts',
  },
  {
    trigger: 'cb',
    replacement: '^3',
    options: { mode: 'math', triggerKind: 'auto', priority: 70, wordBoundary: false },
    description: 'Cubed',
    category: 'Superscripts & Subscripts',
  },
  {
    trigger: 'td',
    replacement: '^{$1}',
    options: { mode: 'math', triggerKind: 'auto', priority: 70, wordBoundary: false },
    tabStops: 1,
    description: 'General superscript',
    category: 'Superscripts & Subscripts',
  },
  {
    trigger: '__',
    replacement: '_{$1}',
    options: { mode: 'math', triggerKind: 'auto', priority: 70, wordBoundary: false },
    tabStops: 1,
    description: 'General subscript',
    category: 'Superscripts & Subscripts',
  },
  {
    trigger: 'compl',
    replacement: '^{c}',
    options: { mode: 'math', triggerKind: 'auto', priority: 65, wordBoundary: false },
    description: 'Complement',
    category: 'Superscripts & Subscripts',
  },
  {
    trigger: 'invs',
    replacement: '^{-1}',
    options: { mode: 'math', triggerKind: 'auto', priority: 65, wordBoundary: false },
    description: 'Inverse',
    category: 'Superscripts & Subscripts',
  },
  // Auto subscript: letter + digit
  {
    trigger: /([A-Za-z])(\d)$/,
    replacement: (match: string[]) => `${match[1]}_${match[2]}`,
    options: { mode: 'math', triggerKind: 'auto', priority: 50, wordBoundary: false },
    description: 'Auto subscript (a1 → a_1)',
    category: 'Superscripts & Subscripts',
  },
  // Auto subscript: letter_digit digit → letter_{digits}
  {
    trigger: /([A-Za-z])_(\d)(\d)$/,
    replacement: (match: string[]) => `${match[1]}_{${match[2]}${match[3]}}`,
    options: { mode: 'math', triggerKind: 'auto', priority: 55, wordBoundary: false },
    description: 'Auto subscript with braces (a12 → a_{12})',
    category: 'Superscripts & Subscripts',
  },

  // Dots
  {
    trigger: '...',
    replacement: '\\ldots',
    options: { mode: 'math', triggerKind: 'auto', priority: 100, wordBoundary: false },
    description: 'Dots',
    category: 'Symbols',
  },
  {
    trigger: 'cdot',
    replacement: '\\cdots',
    options: { mode: 'math', triggerKind: 'tab', priority: 50, wordBoundary: true },
    description: 'Centered dots',
    category: 'Symbols',
  },

  // Square root
  {
    trigger: 'sq',
    replacement: '\\sqrt{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Square root',
    category: 'Functions',
  },

  // Text in math mode
  {
    trigger: 'tt',
    replacement: '\\text{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Text in math mode',
    category: 'Formatting',
  },

  // Bold/italic math
  {
    trigger: 'bf',
    replacement: '\\mathbf{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Bold math',
    category: 'Formatting',
  },
  {
    trigger: 'cal',
    replacement: '\\mathcal{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Calligraphic',
    category: 'Formatting',
  },
  {
    trigger: 'frak',
    replacement: '\\mathfrak{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Fraktur',
    category: 'Formatting',
  },
  {
    trigger: 'scr',
    replacement: '\\mathscr{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Script',
    category: 'Formatting',
  },

  // Brackets
  {
    trigger: 'lr(',
    replacement: '\\left( $1 \\right)',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: false },
    tabStops: 1,
    description: 'Left-right parentheses',
    category: 'Brackets',
  },
  {
    trigger: 'lr[',
    replacement: '\\left[ $1 \\right]',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: false },
    tabStops: 1,
    description: 'Left-right brackets',
    category: 'Brackets',
  },
  {
    trigger: 'lr{',
    replacement: '\\left\\{ $1 \\right\\}',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: false },
    tabStops: 1,
    description: 'Left-right braces',
    category: 'Brackets',
  },
  {
    trigger: 'lr|',
    replacement: '\\left| $1 \\right|',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: false },
    tabStops: 1,
    description: 'Left-right absolute value',
    category: 'Brackets',
  },
  {
    trigger: 'lr<',
    replacement: '\\left\\langle $1 \\right\\rangle',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: false },
    tabStops: 1,
    description: 'Left-right angle brackets',
    category: 'Brackets',
  },
  {
    trigger: 'ceil',
    replacement: '\\lceil $1 \\rceil',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Ceiling',
    category: 'Brackets',
  },
  {
    trigger: 'floor',
    replacement: '\\lfloor $1 \\rfloor',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Floor',
    category: 'Brackets',
  },
  {
    trigger: 'norm',
    replacement: '\\left\\| $1 \\right\\|',
    options: { mode: 'math', triggerKind: 'tab', priority: 60, wordBoundary: true },
    tabStops: 1,
    description: 'Norm',
    category: 'Brackets',
  },

  // Miscellaneous
  {
    trigger: '**',
    replacement: '\\cdot',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Dot product',
    category: 'Operators',
  },
  {
    trigger: 'xx',
    replacement: '\\times',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Cross product',
    category: 'Operators',
  },
  {
    trigger: '!=',
    replacement: '\\neq',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Not equal',
    category: 'Operators',
  },
  {
    trigger: '<=',
    replacement: '\\le',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Less than or equal',
    category: 'Operators',
  },
  {
    trigger: '>=',
    replacement: '\\ge',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Greater than or equal',
    category: 'Operators',
  },
  {
    trigger: '~~',
    replacement: '\\sim',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Similar',
    category: 'Operators',
  },
  {
    trigger: '~=',
    replacement: '\\cong',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Congruent',
    category: 'Operators',
  },
  {
    trigger: '+-',
    replacement: '\\pm',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Plus minus',
    category: 'Operators',
  },
  {
    trigger: '-+',
    replacement: '\\mp',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Minus plus',
    category: 'Operators',
  },
];
