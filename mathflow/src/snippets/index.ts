export interface Snippet {
  trigger: string | RegExp;
  replacement: string | ((match: string[]) => string);
  options: {
    mode: 'math' | 'text' | 'both';
    triggerKind: 'auto' | 'tab';
    priority: number;
    wordBoundary: boolean;
  };
  tabStops?: number;
  description?: string;
  category: string;
}

import { coreSnippets } from './core';
import { greekSnippets } from './greek';
import { operatorSnippets } from './operators';
import { environmentSnippets } from './environments';
import { decorationSnippets } from './decorations';
import { arrowSnippets } from './arrows';
import { setSnippets } from './sets';
import { functionSnippets } from './functions';
import { physicsSnippets } from './physics';

const builtinSnippets: Snippet[] = [
  ...coreSnippets,
  ...greekSnippets,
  ...operatorSnippets,
  ...environmentSnippets,
  ...decorationSnippets,
  ...arrowSnippets,
  ...setSnippets,
  ...functionSnippets,
  ...physicsSnippets,
].sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

// Load custom user snippets from localStorage and convert to Snippet format
function loadUserSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem('mathflow-custom-snippets');
    if (!raw) return [];
    const defs = JSON.parse(raw) as Array<{
      trigger: string;
      replacement: string;
      mode: 'math' | 'text' | 'both';
      triggerKind: 'auto' | 'tab';
      description: string;
    }>;
    return defs.map((d) => ({
      trigger: d.trigger,
      replacement: d.replacement,
      options: {
        mode: d.mode,
        triggerKind: d.triggerKind,
        priority: 100, // User snippets get highest priority
        wordBoundary: true,
      },
      tabStops: (d.replacement.match(/\$\d+/g) || []).length,
      description: d.description,
      category: 'Custom',
    }));
  } catch {
    return [];
  }
}

// Mutable snippet list that can be refreshed when user adds custom snippets
export let allSnippets: Snippet[] = [...builtinSnippets, ...loadUserSnippets()];

export function refreshCustomSnippets(): void {
  allSnippets = [...builtinSnippets, ...loadUserSnippets()].sort(
    (a, b) => (b.options.priority || 0) - (a.options.priority || 0)
  );
}

export function getSnippetsByCategory(): Record<string, Snippet[]> {
  // Ensure we have latest custom snippets
  refreshCustomSnippets();
  const categories: Record<string, Snippet[]> = {};
  for (const snippet of allSnippets) {
    if (!categories[snippet.category]) {
      categories[snippet.category] = [];
    }
    categories[snippet.category].push(snippet);
  }
  return categories;
}
