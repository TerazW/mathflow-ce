import { Snippet } from './index';

export const physicsSnippets: Snippet[] = [
  // Bra-ket notation (Dirac notation for quantum mechanics)
  {
    trigger: 'bra',
    replacement: '\\langle $1 |',
    options: { mode: 'math', triggerKind: 'tab', priority: 65, wordBoundary: true },
    tabStops: 1,
    description: 'Bra ⟨a|',
    category: 'Physics',
  },
  {
    trigger: 'ket',
    replacement: '| $1 \\rangle',
    options: { mode: 'math', triggerKind: 'tab', priority: 65, wordBoundary: true },
    tabStops: 1,
    description: 'Ket |a⟩',
    category: 'Physics',
  },
  {
    trigger: 'braket',
    replacement: '\\langle $1 | $2 \\rangle',
    options: { mode: 'math', triggerKind: 'tab', priority: 70, wordBoundary: true },
    tabStops: 2,
    description: 'Braket ⟨a|b⟩',
    category: 'Physics',
  },
  {
    trigger: 'ketbra',
    replacement: '| $1 \\rangle \\langle $2 |',
    options: { mode: 'math', triggerKind: 'tab', priority: 70, wordBoundary: true },
    tabStops: 2,
    description: 'Ket-bra |a⟩⟨b|',
    category: 'Physics',
  },
  {
    trigger: 'mel',
    replacement: '\\langle $1 | $2 | $3 \\rangle',
    options: { mode: 'math', triggerKind: 'tab', priority: 70, wordBoundary: true },
    tabStops: 3,
    description: 'Matrix element ⟨a|H|b⟩',
    category: 'Physics',
  },

  // Common physics operators
  {
    trigger: 'dgg',
    replacement: '^{\\dagger}',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: false },
    description: 'Dagger superscript (Hermitian conjugate)',
    category: 'Physics',
  },
  {
    trigger: 'hbar',
    replacement: '\\hbar',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: true },
    description: 'Reduced Planck constant',
    category: 'Physics',
  },
  {
    trigger: 'ell',
    replacement: '\\ell',
    options: { mode: 'math', triggerKind: 'auto', priority: 60, wordBoundary: true },
    description: 'Script l',
    category: 'Physics',
  },
  {
    trigger: 'opr',
    replacement: '\\operatorname{$1}',
    options: { mode: 'math', triggerKind: 'tab', priority: 55, wordBoundary: true },
    tabStops: 1,
    description: 'Custom operator name',
    category: 'Physics',
  },
  {
    trigger: 'tns',
    replacement: '\\otimes',
    options: { mode: 'math', triggerKind: 'auto', priority: 55, wordBoundary: true },
    description: 'Tensor product',
    category: 'Physics',
  },
  {
    trigger: 'dsum',
    replacement: '\\oplus',
    options: { mode: 'math', triggerKind: 'auto', priority: 55, wordBoundary: true },
    description: 'Direct sum (⊕)',
    category: 'Physics',
  },
];
