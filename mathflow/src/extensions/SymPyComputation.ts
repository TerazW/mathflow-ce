/**
 * SymPy Computation Extension
 *
 * Provides symbolic computation via AI in both:
 * 1. ProseMirror text content (main editor)
 * 2. Math node textareas (via exported helper function)
 *
 * Trigger: `sympy [expression] sympy` + Tab
 * Result: Expression is sent to AI for computation, and the
 *         `sympy ... sympy` text is replaced with the computed LaTeX.
 *
 * Examples:
 *   sympy integrate(x**2, x) sympy  →  \frac{x^3}{3}
 *   sympy diff(sin(x), x) sympy    →  \cos(x)
 *   sympy simplify((x**2-1)/(x-1)) sympy  →  x + 1
 *   sympy Matrix([[1,2],[3,4]]).det() sympy  →  -2
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { loadAISettings } from '../lib/ai-settings';

const sympyPluginKey = new PluginKey('sympyComputation');

const SYMPY_PATTERN = /sympy\s+([\s\S]+?)\s+sympy$/;

const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

/**
 * Send a SymPy expression to the AI compute endpoint.
 * Returns the computed LaTeX string.
 */
async function computeExpression(expression: string): Promise<string> {
  const settings = loadAISettings();
  if (!settings?.apiKey) {
    throw new Error('Configure AI API key in Settings to use SymPy computation');
  }

  const response = await fetch(`${API_BASE}/api/ai/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expression,
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Computation failed');
  }
  return data.latex;
}

/**
 * Process SymPy computation in a textarea (math node editors).
 * Call this from the textarea's Tab keydown handler.
 * Returns true if a sympy computation was triggered.
 *
 * When the computation is done, the textarea value is updated.
 * Provide a callback for re-rendering the preview.
 */
export function processSymPyTextarea(
  textarea: HTMLTextAreaElement,
  onResult?: () => void
): boolean {
  const cursorPos = textarea.selectionStart;
  if (cursorPos === null || cursorPos === undefined) return false;

  const text = textarea.value;
  const textBefore = text.substring(0, cursorPos);

  const match = textBefore.match(SYMPY_PATTERN);
  if (!match) return false;

  const expression = match[1].trim();
  const matchStart = match.index!;
  const textAfter = text.substring(cursorPos);

  // Show computing indicator
  const originalBg = textarea.style.background;
  textarea.style.background = '#fff9db';
  textarea.disabled = true;

  computeExpression(expression)
    .then((latex) => {
      textarea.value = text.substring(0, matchStart) + latex + textAfter;
      textarea.selectionStart = textarea.selectionEnd = matchStart + latex.length;
      textarea.style.background = originalBg;
      textarea.disabled = false;
      textarea.focus();
      onResult?.();
    })
    .catch((err) => {
      // Restore original text and show error briefly
      textarea.style.background = '#fff5f5';
      textarea.disabled = false;
      textarea.focus();
      console.error('SymPy computation error:', err.message);
      setTimeout(() => {
        textarea.style.background = originalBg;
      }, 2000);
    });

  return true;
}

/**
 * Process SymPy computation in a contentEditable element (inline math editors).
 * Returns true if a sympy computation was triggered.
 */
export function processSymPyContentEditable(
  element: HTMLElement,
  onResult?: () => void
): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const text = element.textContent || '';
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const cursorPos = preRange.toString().length;

  const textBefore = text.substring(0, cursorPos);
  const match = textBefore.match(SYMPY_PATTERN);
  if (!match) return false;

  const expression = match[1].trim();
  const matchStart = match.index!;
  const textAfter = text.substring(cursorPos);

  // Show computing indicator
  const originalBg = element.style.background;
  element.style.background = '#fff9db';
  element.contentEditable = 'false';

  computeExpression(expression)
    .then((latex) => {
      element.textContent = text.substring(0, matchStart) + latex + textAfter;
      element.style.background = originalBg;
      element.contentEditable = 'true';
      element.focus();
      // Set cursor after the inserted result
      const newPos = matchStart + latex.length;
      const textNode = element.firstChild;
      if (textNode) {
        const newRange = document.createRange();
        const newSel = window.getSelection();
        const safePos = Math.min(newPos, textNode.textContent?.length || 0);
        newRange.setStart(textNode, safePos);
        newRange.collapse(true);
        newSel?.removeAllRanges();
        newSel?.addRange(newRange);
      }
      onResult?.();
    })
    .catch((err) => {
      element.style.background = '#fff5f5';
      element.contentEditable = 'true';
      element.focus();
      console.error('SymPy computation error:', err.message);
      setTimeout(() => {
        element.style.background = originalBg;
      }, 2000);
    });

  return true;
}

export const SymPyComputation = Extension.create({
  name: 'sympyComputation',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: sympyPluginKey,

        props: {
          handleKeyDown(view, event) {
            if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.shiftKey) {
              return false;
            }

            const { state } = view;
            const { $from } = state.selection;

            // Don't handle inside math nodes (those use textarea handler)
            for (let depth = $from.depth; depth >= 0; depth--) {
              const node = $from.node(depth);
              if (node.type.name === 'mathInline' || node.type.name === 'mathDisplay') {
                return false;
              }
            }

            // Get text before cursor
            const pos = state.selection.from;
            const textNode = $from.parent;
            const textBefore = textNode.textBetween(0, $from.parentOffset, undefined, '\ufffc');

            const match = textBefore.match(SYMPY_PATTERN);
            if (!match) return false;

            event.preventDefault();

            const expression = match[1].trim();
            const matchStartInParent = match.index!;
            const matchEndInParent = $from.parentOffset;

            // Calculate absolute positions
            const parentStart = pos - $from.parentOffset;
            const absStart = parentStart + matchStartInParent;
            const absEnd = parentStart + matchEndInParent;

            // Use unique marker to avoid replacing wrong "computing..." on concurrent calls
            const computeId = `\u2009computing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}\u2009`;

            // Replace with loading indicator
            const tr = state.tr.replaceWith(
              absStart,
              absEnd,
              state.schema.text(computeId)
            );
            view.dispatch(tr);

            // Perform async computation
            computeExpression(expression)
              .then((latex) => {
                const { state: newState } = view;
                const doc = newState.doc;
                let found = false;

                doc.descendants((node, nodePos) => {
                  if (found) return false;
                  if (node.isText && node.text?.includes(computeId)) {
                    const textStart = node.text.indexOf(computeId);
                    const from = nodePos + textStart;
                    const to = from + computeId.length;

                    const mathNode = newState.schema.nodes.mathInline?.create({ latex });
                    if (mathNode) {
                      view.dispatch(newState.tr.replaceWith(from, to, mathNode));
                    } else {
                      view.dispatch(newState.tr.replaceWith(from, to, newState.schema.text(latex)));
                    }
                    found = true;
                    return false;
                  }
                });

                if (!found) {
                  editor.chain().focus().insertContent({
                    type: 'mathInline',
                    attrs: { latex },
                  }).run();
                }
              })
              .catch((err) => {
                const { state: newState } = view;
                const doc = newState.doc;
                doc.descendants((node, nodePos) => {
                  if (node.isText && node.text?.includes(computeId)) {
                    const textStart = node.text.indexOf(computeId);
                    const from = nodePos + textStart;
                    const to = from + computeId.length;
                    const errorText = `[Error: ${err.message}]`;
                    view.dispatch(newState.tr.replaceWith(from, to, newState.schema.text(errorText)));
                    return false;
                  }
                });
              });

            return true;
          },
        },
      }),
    ];
  },
});
