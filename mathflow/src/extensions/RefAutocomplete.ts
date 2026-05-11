import type { Editor as TipTapEditor } from '@tiptap/core';
import { buildLabelIndex } from './EnvRef';

const ENV_LABELS: Record<string, string> = {
  theorem: 'Theorem',
  lemma: 'Lemma',
  proposition: 'Proposition',
  corollary: 'Corollary',
  definition: 'Definition',
  example: 'Example',
  remark: 'Remark',
  proof: 'Proof',
};

interface LabelEntry {
  label: string;
  envType: string;
  number: string;
  displayText: string;
}

/**
 * Resolves `\ref{label}` occurrences in a LaTeX string by replacing them with
 * the rendered display text wrapped in `\text{...}` so KaTeX renders them.
 *
 * Unresolved labels become `\text{??\ label}` so the user sees what's broken.
 */
export function resolveRefs(latex: string, editor: TipTapEditor): string {
  if (!latex.includes('\\ref{')) return latex;
  const index = buildLabelIndex(editor.state.doc);
  return latex.replace(/\\ref\{([^}]*)\}/g, (_match, label) => {
    const entry = index.get(label);
    if (!entry) {
      return `\\text{??\\ ${label}}`;
    }
    const typeName = ENV_LABELS[entry.envType] || entry.envType;
    const num = entry.customNumber ?? entry.number ?? '?';
    const display = num ? `${typeName} ${num}` : typeName;
    // KaTeX \text supports plain text, including spaces
    return `\\text{${display}}`;
  });
}

/**
 * Returns the list of available labels in the document, formatted for display.
 */
function getAllLabels(editor: TipTapEditor): LabelEntry[] {
  const index = buildLabelIndex(editor.state.doc);
  const out: LabelEntry[] = [];
  for (const [label, entry] of index) {
    const typeName = ENV_LABELS[entry.envType] || entry.envType;
    const num = entry.customNumber ?? entry.number ?? '';
    out.push({
      label,
      envType: entry.envType,
      number: num,
      displayText: num ? `${typeName} ${num}` : typeName,
    });
  }
  return out;
}

/**
 * Adapter interface so the autocomplete works for both contentEditable and textarea.
 */
interface SourceAdapter {
  /** Get current text content */
  getText(): string;
  /** Get caret position (character offset from start of text) */
  getCaretPos(): number;
  /** Replace a range [start, end) with text and place caret at end of insertion */
  replaceRange(start: number, end: number, text: string): void;
  /** Get DOM rect for positioning the popup */
  getRect(): DOMRect;
  /** Trigger any after-change side-effects (e.g. re-render KaTeX) */
  onChange(): void;
}

const TRIGGER_REGEX = /\\ref\{([^}\s]*)$/;

/**
 * Attaches the \ref{ autocomplete to a math editor surface.
 * Returns a teardown function.
 */
export function attachRefAutocomplete(
  adapter: SourceAdapter,
  element: HTMLElement,
  editor: TipTapEditor,
): () => void {
  let popup: HTMLDivElement | null = null;
  let items: LabelEntry[] = [];
  let activeIndex = 0;
  let triggerStart = -1; // position of '\' in '\ref{'
  let queryStart = -1; // position right after '{'

  const closePopup = () => {
    if (popup) {
      popup.remove();
      popup = null;
    }
    triggerStart = -1;
    queryStart = -1;
    items = [];
    activeIndex = 0;
  };

  const renderItems = () => {
    if (!popup) return;
    popup.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ref-ac-empty';
      empty.textContent = 'No matching labels';
      popup.appendChild(empty);
      return;
    }
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'ref-ac-item' + (i === activeIndex ? ' active' : '');
      const head = document.createElement('div');
      head.className = 'ref-ac-item-head';
      head.textContent = item.displayText;
      const lbl = document.createElement('div');
      lbl.className = 'ref-ac-item-label';
      lbl.textContent = item.label;
      row.appendChild(head);
      row.appendChild(lbl);
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = i;
        confirmSelection();
      });
      popup!.appendChild(row);
    });
  };

  const showOrUpdatePopup = (query: string) => {
    const allLabels = getAllLabels(editor);
    const q = query.toLowerCase();
    items = q
      ? allLabels.filter(
          (l) =>
            l.label.toLowerCase().includes(q) ||
            l.displayText.toLowerCase().includes(q),
        )
      : allLabels;
    activeIndex = 0;

    if (allLabels.length === 0) {
      closePopup();
      return;
    }

    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'ref-ac-popup';
      document.body.appendChild(popup);

      const rect = adapter.getRect();
      popup.style.left = `${rect.left}px`;
      popup.style.top = `${rect.bottom + 4}px`;
    }

    renderItems();

    // Re-check vertical position in case popup goes off-screen
    if (popup) {
      const popupRect = popup.getBoundingClientRect();
      if (popupRect.bottom > window.innerHeight - 8) {
        const rect = adapter.getRect();
        popup.style.top = `${rect.top - popupRect.height - 4}px`;
      }
    }
  };

  const confirmSelection = () => {
    if (!popup || items.length === 0 || triggerStart < 0 || queryStart < 0) {
      closePopup();
      return;
    }
    const chosen = items[activeIndex];
    if (!chosen) {
      closePopup();
      return;
    }
    const text = adapter.getText();
    // Replace from queryStart up to the next '}' if it's already there, else just caret
    const caret = adapter.getCaretPos();
    let endPos = caret;
    if (text[endPos] === '}') endPos += 1;
    // If user already typed partial text, replace it; add closing brace
    const hasClose = text[caret] === '}';
    const inserted = hasClose ? chosen.label : `${chosen.label}}`;
    adapter.replaceRange(queryStart, endPos > queryStart ? endPos : caret, inserted);
    adapter.onChange();
    closePopup();
  };

  const onInput = () => {
    const text = adapter.getText();
    const caret = adapter.getCaretPos();
    const before = text.slice(0, caret);
    const m = before.match(TRIGGER_REGEX);

    if (!m) {
      closePopup();
      return;
    }

    triggerStart = before.length - m[0].length;
    queryStart = triggerStart + '\\ref{'.length;
    const query = m[1];
    showOrUpdatePopup(query);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!popup) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      activeIndex = (activeIndex + 1) % Math.max(items.length, 1);
      renderItems();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      activeIndex = (activeIndex - 1 + items.length) % Math.max(items.length, 1);
      renderItems();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (items.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        confirmSelection();
        return;
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePopup();
      return;
    }
  };

  const onBlur = () => {
    // Delay so mousedown on an item can fire first
    setTimeout(() => closePopup(), 150);
  };

  element.addEventListener('input', onInput);
  // Capture phase so we intercept Enter/Tab before the math editor's own handlers
  element.addEventListener('keydown', onKeyDown, true);
  element.addEventListener('blur', onBlur);

  return () => {
    element.removeEventListener('input', onInput);
    element.removeEventListener('keydown', onKeyDown, true);
    element.removeEventListener('blur', onBlur);
    closePopup();
  };
}

/**
 * Adapter for a textarea element.
 */
export function makeTextareaAdapter(
  ta: HTMLTextAreaElement,
  onChange: () => void,
): SourceAdapter {
  return {
    getText: () => ta.value,
    getCaretPos: () => ta.selectionStart || 0,
    replaceRange: (start, end, text) => {
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(end);
      ta.value = before + text + after;
      const newCaret = start + text.length;
      ta.setSelectionRange(newCaret, newCaret);
      // Trigger input event so the rest of the system reacts
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    },
    getRect: () => ta.getBoundingClientRect(),
    onChange,
  };
}

/**
 * Adapter for a contentEditable element. Treats the editor's plain-text content
 * (textContent) as the source. Caret position is the offset within textContent.
 */
export function makeContentEditableAdapter(
  el: HTMLElement,
  onChange: () => void,
): SourceAdapter {
  function getCaretPos(): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return (el.textContent || '').length;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer)) return (el.textContent || '').length;
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function setCaretPos(offset: number) {
    const text = el.textContent || '';
    const clamped = Math.max(0, Math.min(offset, text.length));
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    // Walk the tree finding the right text node
    let remaining = clamped;
    let placed = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    while (node) {
      const len = (node.nodeValue || '').length;
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        placed = true;
        break;
      }
      remaining -= len;
      node = walker.nextNode();
    }
    if (!placed) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }

  return {
    getText: () => el.textContent || '',
    getCaretPos,
    replaceRange: (start, end, text) => {
      const full = el.textContent || '';
      const newText = full.slice(0, start) + text + full.slice(end);
      el.textContent = newText;
      setCaretPos(start + text.length);
      // Fire input event so other handlers run
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    getRect: () => el.getBoundingClientRect(),
    onChange,
  };
}
