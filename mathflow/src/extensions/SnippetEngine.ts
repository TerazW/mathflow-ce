import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { allSnippets } from '../snippets';

const snippetPluginKey = new PluginKey('snippetEngine');

/**
 * Find the matching opening parenthesis for a closing paren at the end of text.
 * Returns the index of the opening paren, or -1 if not found.
 */
function findMatchingParen(text: string): number {
  // text should end with ')'
  if (!text.endsWith(')')) return -1;
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

interface TabStop {
  from: number;
  to: number;
}

interface SnippetState {
  tabStops: TabStop[];
  currentTabStop: number;
  active: boolean;
}

function isInMathNode(state: any): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'mathInline' || node.type.name === 'mathDisplay') {
      return true;
    }
  }
  return false;
}

export const SnippetEngine = Extension.create({
  name: 'snippetEngine',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: snippetPluginKey,

        state: {
          init(): SnippetState {
            return { tabStops: [], currentTabStop: -1, active: false };
          },
          apply(tr, value): SnippetState {
            const meta = tr.getMeta(snippetPluginKey);
            if (meta) return meta;
            if (!value.active) return value;
            // Adjust tab stop positions based on document changes
            if (tr.docChanged && value.tabStops.length > 0) {
              const newStops = value.tabStops.map((stop) => ({
                from: tr.mapping.map(stop.from),
                to: tr.mapping.map(stop.to),
              }));
              return { ...value, tabStops: newStops };
            }
            return value;
          },
        },

        props: {
          handleTextInput(view, from, to, text) {
            const state = view.state;

            // Selection fraction: select text then type '/' → \frac{selected}{}
            if (text === '/' && isInMathNode(state) && from !== to) {
              const selectedText = state.doc.textBetween(from, to);
              if (selectedText.trim()) {
                const replacement = `\\frac{${selectedText}}{\u200B}`;
                const tr = state.tr;
                tr.delete(from, to);
                tr.insertText(replacement, from);
                const tabStopPos = from + replacement.indexOf('\u200B');
                tr.setMeta(snippetPluginKey, {
                  tabStops: [{ from: tabStopPos, to: tabStopPos + 1 }],
                  currentTabStop: 0,
                  active: true,
                });
                tr.setSelection(Selection.near(tr.doc.resolve(tabStopPos)));
                view.dispatch(tr);
                return true;
              }
            }

            // Smart parenthesized fraction: (expr)/ → \frac{expr}{}
            if (text === '/' && isInMathNode(state)) {
              const $from = state.doc.resolve(from);
              const lineStart = from - $from.parentOffset;
              const textBefore = state.doc.textBetween(lineStart, from);
              if (textBefore.endsWith(')')) {
                const matchIdx = findMatchingParen(textBefore);
                if (matchIdx >= 0) {
                  const inner = textBefore.substring(matchIdx + 1, textBefore.length - 1);
                  const replacement = `\\frac{${inner}}{$1}`;
                  const cleanReplacement = replacement.replace(/\$(\d+)/g, '\u200B');
                  const deleteFrom = lineStart + matchIdx;
                  const tr = state.tr;
                  tr.delete(deleteFrom, to);
                  tr.insertText(cleanReplacement, deleteFrom);
                  // Set up tab stop
                  const tabStopPos = deleteFrom + cleanReplacement.indexOf('\u200B');
                  tr.setMeta(snippetPluginKey, {
                    tabStops: [{ from: tabStopPos, to: tabStopPos + 1 }],
                    currentTabStop: 0,
                    active: true,
                  });
                  tr.setSelection(Selection.near(tr.doc.resolve(tabStopPos)));
                  view.dispatch(tr);
                  return true;
                }
              }
            }

            // Try auto-expand snippets
            const autoSnippets = allSnippets.filter((s) => s.options.triggerKind === 'auto');

            for (const snippet of autoSnippets) {
              // Check context
              const inMath = isInMathNode(state);
              if (snippet.options.mode === 'math' && !inMath) continue;
              if (snippet.options.mode === 'text' && inMath) continue;

              if (typeof snippet.trigger === 'string') {
                // String trigger: check if the text before cursor + new text ends with trigger
                const $from = state.doc.resolve(from);
                const textBefore = $from.parent.textBetween(
                  Math.max(0, $from.parentOffset - snippet.trigger.length + text.length),
                  $from.parentOffset
                );
                const fullText = textBefore + text;

                if (fullText.endsWith(snippet.trigger)) {
                  // Check word boundary if required
                  if (snippet.options.wordBoundary) {
                    const charBefore = fullText[fullText.length - snippet.trigger.length - 1];
                    if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
                  }

                  const triggerLen = snippet.trigger.length;
                  const deleteFrom = from - (triggerLen - text.length);

                  let replacement: string;
                  if (typeof snippet.replacement === 'function') {
                    replacement = snippet.replacement([fullText]);
                  } else {
                    replacement = snippet.replacement;
                  }

                  // Handle tab stops ($1, $2, etc.)
                  const tabStopPositions: TabStop[] = [];
                  const cleanReplacement = replacement.replace(/\$(\d+)/g, () => {
                    tabStopPositions.push({
                      from: 0, // Will be calculated after insertion
                      to: 0,
                    });
                    return '\u200B'; // Zero-width space as placeholder
                  });

                  // Check if this is a math node insertion command
                  if (snippet.trigger === 'mk' || snippet.trigger === '$') {
                    // Insert inline math node
                    setTimeout(() => {
                      editor.chain().focus().insertMathInline('').run();
                    }, 0);
                    // Delete the trigger text
                    const tr = state.tr.delete(deleteFrom, to);
                    view.dispatch(tr);
                    return true;
                  }

                  if (snippet.trigger === 'dm' || snippet.trigger === '$$') {
                    // Insert display math node
                    setTimeout(() => {
                      editor.chain().focus().insertMathDisplay('').run();
                    }, 0);
                    const tr = state.tr.delete(deleteFrom, to);
                    view.dispatch(tr);
                    return true;
                  }

                  // For inline math content snippets, handle replacement
                  const tr = state.tr;
                  tr.delete(deleteFrom, to);
                  tr.insertText(cleanReplacement, deleteFrom);

                  // Calculate tab stop positions
                  if (tabStopPositions.length > 0) {
                    let offset = deleteFrom;
                    const parts = cleanReplacement.split('\u200B');
                    const actualStops: TabStop[] = [];
                    for (let i = 0; i < parts.length - 1; i++) {
                      offset += parts[i].length;
                      actualStops.push({ from: offset, to: offset + 1 });
                      offset += 1; // For the zero-width space
                    }
                    tr.setMeta(snippetPluginKey, {
                      tabStops: actualStops,
                      currentTabStop: 0,
                      active: true,
                    });
                    // Set cursor to first tab stop
                    if (actualStops.length > 0) {
                      tr.setSelection(
                        Selection.near(
                          tr.doc.resolve(actualStops[0].from)
                        )
                      );
                    }
                  }

                  view.dispatch(tr);
                  return true;
                }
              } else if (snippet.trigger instanceof RegExp) {
                // Regex trigger
                const $from = state.doc.resolve(from);
                const lineStart = from - $from.parentOffset;
                const textBefore = state.doc.textBetween(lineStart, from) + text;

                const match = textBefore.match(snippet.trigger);
                if (match) {
                  let replacement: string;
                  if (typeof snippet.replacement === 'function') {
                    replacement = snippet.replacement(match);
                  } else {
                    replacement = snippet.replacement;
                  }

                  const matchStart = from - (textBefore.length - (match.index || 0));

                  // Handle tab stops
                  const cleanReplacement = replacement.replace(/\$(\d+)/g, '\u200B');

                  const tr = state.tr;
                  tr.delete(matchStart, to);
                  tr.insertText(cleanReplacement, matchStart);
                  view.dispatch(tr);
                  return true;
                }
              }
            }

            return false;
          },

          handleKeyDown(view, event) {
            // Tab key: handle tab stops or tab-expand snippets
            if (event.key === 'Tab' && !event.shiftKey) {
              const pluginState = snippetPluginKey.getState(view.state) as SnippetState | undefined;

              // First check if we have active tab stops
              if (pluginState?.active && pluginState.tabStops.length > 0) {
                const nextStop = pluginState.currentTabStop + 1;
                if (nextStop < pluginState.tabStops.length) {
                  const stop = pluginState.tabStops[nextStop];
                  const tr = view.state.tr.setSelection(
                    Selection.near(
                      view.state.doc.resolve(stop.from)
                    )
                  );
                  tr.setMeta(snippetPluginKey, {
                    ...pluginState,
                    currentTabStop: nextStop,
                  });
                  view.dispatch(tr);
                  event.preventDefault();
                  return true;
                } else {
                  // All tab stops consumed, deactivate
                  const tr = view.state.tr.setMeta(snippetPluginKey, {
                    tabStops: [],
                    currentTabStop: -1,
                    active: false,
                  });
                  view.dispatch(tr);
                }
              }

              // Try tab-expand snippets
              const state = view.state;
              const { from } = state.selection;
              const $from = state.doc.resolve(from);
              const lineStart = from - $from.parentOffset;
              const textBefore = state.doc.textBetween(lineStart, from);

              const tabSnippets = allSnippets
                .filter((s) => s.options.triggerKind === 'tab')
                .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

              for (const snippet of tabSnippets) {
                const inMath = isInMathNode(state);
                if (snippet.options.mode === 'math' && !inMath) continue;
                if (snippet.options.mode === 'text' && inMath) continue;

                if (typeof snippet.trigger === 'string' && textBefore.endsWith(snippet.trigger)) {
                  if (snippet.options.wordBoundary) {
                    const charBefore = textBefore[textBefore.length - snippet.trigger.length - 1];
                    if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
                  }

                  let replacement: string;
                  if (typeof snippet.replacement === 'function') {
                    replacement = snippet.replacement([textBefore]);
                  } else {
                    replacement = snippet.replacement;
                  }

                  const deleteFrom = from - snippet.trigger.length;

                  // Handle environment snippets (beg, ali, etc.)
                  if (replacement.includes('\\begin{')) {
                    // Insert as math display node if we're not already in math
                    if (!inMath) {
                      // Check if this is a theorem-type environment
                      const theoremTypes = ['theorem', 'lemma', 'proof', 'definition', 'corollary', 'proposition', 'remark', 'example'];
                      const envMatch = replacement.match(/\\begin\{(\w+)\}/);
                      const envName = envMatch ? envMatch[1] : '';

                      if (theoremTypes.includes(envName)) {
                        // Insert as TheoremEnv ProseMirror node
                        const tr = state.tr.delete(deleteFrom, from);
                        view.dispatch(tr);
                        setTimeout(() => {
                          editor.chain().focus().insertTheoremEnv(envName).run();
                        }, 0);
                        event.preventDefault();
                        return true;
                      }

                      const tr = state.tr.delete(deleteFrom, from);
                      view.dispatch(tr);
                      setTimeout(() => {
                        editor.chain().focus().insertMathDisplay(
                          replacement.replace(/\$\d+/g, '')
                        ).run();
                      }, 0);
                      event.preventDefault();
                      return true;
                    }
                  }

                  const cleanReplacement = replacement.replace(/\$(\d+)/g, '\u200B');
                  const tr = state.tr;
                  tr.delete(deleteFrom, from);
                  tr.insertText(cleanReplacement, deleteFrom);
                  view.dispatch(tr);
                  event.preventDefault();
                  return true;
                }
              }
            }

            // Shift+Tab: go to previous tab stop
            if (event.key === 'Tab' && event.shiftKey) {
              const pluginState = snippetPluginKey.getState(view.state) as SnippetState | undefined;
              if (pluginState?.active && pluginState.currentTabStop > 0) {
                const prevStop = pluginState.currentTabStop - 1;
                const stop = pluginState.tabStops[prevStop];
                const tr = view.state.tr.setSelection(
                  Selection.near(
                    view.state.doc.resolve(stop.from)
                  )
                );
                tr.setMeta(snippetPluginKey, {
                  ...pluginState,
                  currentTabStop: prevStop,
                });
                view.dispatch(tr);
                event.preventDefault();
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
