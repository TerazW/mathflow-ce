import { Snippet } from './index';

const greekLetters: [string, string, string?][] = [
  ['alpha', '\\alpha'],
  ['beta', '\\beta'],
  ['gamma', '\\gamma'],
  ['Gamma', '\\Gamma'],
  ['delta', '\\delta'],
  ['Delta', '\\Delta'],
  ['epsilon', '\\varepsilon'],
  ['zeta', '\\zeta'],
  ['eta', '\\eta'],
  ['theta', '\\theta'],
  ['Theta', '\\Theta'],
  ['iota', '\\iota'],
  ['kappa', '\\kappa'],
  ['lambda', '\\lambda'],
  ['Lambda', '\\Lambda'],
  ['mu', '\\mu'],
  ['nu', '\\nu'],
  ['xi', '\\xi'],
  ['Xi', '\\Xi'],
  ['pi', '\\pi'],
  ['Pi', '\\Pi'],
  ['rho', '\\rho'],
  ['sigma', '\\sigma'],
  ['Sigma', '\\Sigma'],
  ['tau', '\\tau'],
  ['upsilon', '\\upsilon'],
  ['phi', '\\varphi'],
  ['Phi', '\\Phi'],
  ['chi', '\\chi'],
  ['psi', '\\psi'],
  ['Psi', '\\Psi'],
  ['omega', '\\omega'],
  ['Omega', '\\Omega'],
];

// Short aliases for frequently used Greek letters
const greekShortcuts: [string, string][] = [
  ['alp', '\\alpha'],
  ['bet', '\\beta'],
  ['gam', '\\gamma'],
  ['del', '\\delta'],
  ['eps', '\\varepsilon'],
  ['lam', '\\lambda'],
  ['sig', '\\sigma'],
  ['ome', '\\omega'],
];

export const greekSnippets: Snippet[] = [
  ...greekLetters.map(([trigger, replacement]): Snippet => ({
    trigger,
    replacement,
    options: {
      mode: 'math',
      triggerKind: 'auto',
      priority: 40,
      wordBoundary: true,
    },
    description: `Greek letter ${replacement}`,
    category: 'Greek Letters',
  })),
  ...greekShortcuts.map(([trigger, replacement]): Snippet => ({
    trigger,
    replacement,
    options: {
      mode: 'math',
      triggerKind: 'tab',
      priority: 35,
      wordBoundary: true,
    },
    description: `Greek letter ${replacement}`,
    category: 'Greek Letters',
  })),
];
