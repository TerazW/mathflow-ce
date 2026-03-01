import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export interface TheoremEnvOptions {
  types: string[];
}

const THEOREM_LABELS: Record<string, string> = {
  theorem: 'Theorem',
  lemma: 'Lemma',
  proposition: 'Proposition',
  corollary: 'Corollary',
  definition: 'Definition',
  example: 'Example',
  remark: 'Remark',
  proof: 'Proof',
};

// Environment types that get numbered (proof does not get numbered)
const NUMBERED_TYPES = new Set(['theorem', 'lemma', 'proposition', 'corollary', 'definition', 'example', 'remark']);

const theoremNumberingKey = new PluginKey('theoremNumbering');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    theoremEnv: {
      insertTheoremEnv: (envType: string) => ReturnType;
    };
  }
}

/**
 * Shows a popup to edit the theorem number.
 * - Type a custom number (e.g. "18.1") and press Enter → custom number
 * - Clear input and press Enter → back to auto-numbering
 * - Click "Auto" → back to auto-numbering
 * - Click "No number" → remove number entirely
 */
function showNumberEditor(view: EditorView, nodePos: number, headerEl: HTMLElement) {
  // Remove any existing popup
  document.querySelector('.theorem-number-popup')?.remove();

  const node = view.state.doc.nodeAt(nodePos);
  if (!node || node.type.name !== 'theoremEnv') return;

  const envType = node.attrs.envType || 'theorem';
  if (!NUMBERED_TYPES.has(envType)) return;

  const hasCustom = node.attrs.customNumber !== null && node.attrs.customNumber !== undefined;
  const currentNum = hasCustom ? node.attrs.customNumber : (node.attrs.number || '');

  // Build popup
  const popup = document.createElement('div');
  popup.className = 'theorem-number-popup';

  const titleEl = document.createElement('div');
  titleEl.className = 'theorem-number-popup-title';
  titleEl.textContent = 'Edit number';
  popup.appendChild(titleEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'theorem-number-input';
  input.value = currentNum;
  input.placeholder = 'e.g. 18.1';
  popup.appendChild(input);

  const btnRow = document.createElement('div');
  btnRow.className = 'theorem-number-buttons';

  const autoBtn = document.createElement('button');
  autoBtn.textContent = 'Auto';
  autoBtn.className = 'theorem-number-btn';
  autoBtn.title = 'Reset to auto-numbering';

  const noneBtn = document.createElement('button');
  noneBtn.textContent = 'No number';
  noneBtn.className = 'theorem-number-btn';
  noneBtn.title = 'Remove number entirely';

  btnRow.appendChild(autoBtn);
  btnRow.appendChild(noneBtn);
  popup.appendChild(btnRow);

  // Position below header
  const headerRect = headerEl.getBoundingClientRect();
  popup.style.left = `${headerRect.left}px`;
  popup.style.top = `${headerRect.bottom + 4}px`;

  document.body.appendChild(popup);

  // Adjust if popup goes off-screen at bottom
  const popupRect = popup.getBoundingClientRect();
  if (popupRect.bottom > window.innerHeight - 8) {
    popup.style.top = `${headerRect.top - popupRect.height - 4}px`;
  }

  input.focus();
  input.select();

  let done = false;

  const finish = (customNumber: string | null) => {
    if (done) return;
    done = true;
    popup.remove();
    document.removeEventListener('mousedown', onClickOutside);

    const currentNode = view.state.doc.nodeAt(nodePos);
    if (!currentNode || currentNode.type.name !== 'theoremEnv') {
      view.focus();
      return;
    }

    const { tr } = view.state;
    tr.setNodeMarkup(nodePos, undefined, {
      ...currentNode.attrs,
      customNumber,
    });
    view.dispatch(tr);
    view.focus();
  };

  const cancel = () => {
    if (done) return;
    done = true;
    popup.remove();
    document.removeEventListener('mousedown', onClickOutside);
    view.focus();
  };

  autoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    finish(null);
  });

  noneBtn.addEventListener('click', (e) => {
    e.preventDefault();
    finish('');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      finish(val === '' ? null : val);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });

  const onClickOutside = (e: MouseEvent) => {
    if (!popup.contains(e.target as HTMLElement)) {
      const val = input.value.trim();
      finish(val === '' ? null : val);
    }
  };

  // Delay to avoid the current dblclick event immediately closing the popup
  setTimeout(() => {
    document.addEventListener('mousedown', onClickOutside);
  }, 0);
}

export const TheoremEnv = Node.create<TheoremEnvOptions>({
  name: 'theoremEnv',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      types: Object.keys(THEOREM_LABELS),
    };
  },

  addAttributes() {
    return {
      envType: {
        default: 'theorem',
        parseHTML: (element) => element.getAttribute('data-env-type') || 'theorem',
        renderHTML: (attributes) => ({
          'data-env-type': attributes.envType,
        }),
      },
      number: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-env-number') || null,
        renderHTML: (attributes) => {
          if (!attributes.number) return {};
          return { 'data-env-number': attributes.number };
        },
      },
      customNumber: {
        default: null,
        parseHTML: (element) => {
          if (!element.hasAttribute('data-env-custom-number')) return null;
          return element.getAttribute('data-env-custom-number') ?? '';
        },
        renderHTML: (attributes) => {
          if (attributes.customNumber === null || attributes.customNumber === undefined) return {};
          return { 'data-env-custom-number': attributes.customNumber };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="theorem-env"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const envType = node.attrs.envType || 'theorem';
    const label = THEOREM_LABELS[envType] || envType;

    let headerText: string;
    if (node.attrs.customNumber !== null && node.attrs.customNumber !== undefined) {
      // Custom number override
      headerText = node.attrs.customNumber === ''
        ? `${label}.`
        : `${label} ${node.attrs.customNumber}.`;
    } else {
      // Auto-numbered
      const num = node.attrs.number;
      headerText = num ? `${label} ${num}.` : `${label}.`;
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'theorem-env',
        'data-env-type': envType,
        class: `theorem-env theorem-${envType}`,
      }),
      ['div', { class: 'theorem-env-header', contenteditable: 'false' }, headerText],
      ['div', { class: 'theorem-env-body' }, 0],
    ];
  },

  addCommands() {
    return {
      insertTheoremEnv:
        (envType: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { envType },
            content: [
              {
                type: 'paragraph',
              },
            ],
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      // Auto-numbering plugin (skips nodes with custom numbers)
      new Plugin({
        key: theoremNumberingKey,
        view() {
          let pendingUpdate = false;

          return {
            update(view) {
              if (pendingUpdate) return;

              // Compute expected numbering from document order
              let counter = 0;
              let needsUpdate = false;

              view.state.doc.descendants((node) => {
                if (node.type.name === 'theoremEnv') {
                  const envType = node.attrs.envType || 'theorem';

                  if (NUMBERED_TYPES.has(envType)) {
                    // Skip custom-numbered nodes
                    if (node.attrs.customNumber !== null && node.attrs.customNumber !== undefined) {
                      return false;
                    }
                    counter++;
                    if (node.attrs.number !== String(counter)) {
                      needsUpdate = true;
                    }
                  }

                  return false;
                }
              });

              if (!needsUpdate) return;

              // Schedule attribute updates via transaction (not direct DOM manipulation)
              pendingUpdate = true;
              setTimeout(() => {
                pendingUpdate = false;

                // Re-check in case state changed between scheduling and execution
                const { state } = view;
                let tr = state.tr;
                let changed = false;

                let c = 0;
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'theoremEnv') {
                    const envType = node.attrs.envType || 'theorem';

                    if (NUMBERED_TYPES.has(envType)) {
                      // Skip custom-numbered nodes
                      if (node.attrs.customNumber !== null && node.attrs.customNumber !== undefined) {
                        return false;
                      }

                      c++;
                      const expectedNum = String(c);

                      if (node.attrs.number !== expectedNum) {
                        tr = tr.setNodeMarkup(pos, undefined, {
                          ...node.attrs,
                          number: expectedNum,
                        });
                        changed = true;
                      }
                    }

                    return false;
                  }
                });

                if (changed) {
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(theoremNumberingKey, true);
                  view.dispatch(tr);
                }
              }, 0);
            },
          };
        },
      }),

      // Double-click handler for editing theorem numbers
      new Plugin({
        key: new PluginKey('theoremNumberEditor'),
        props: {
          handleDOMEvents: {
            dblclick: (view, event) => {
              const target = event.target as HTMLElement;
              if (!target.closest) return false;
              const header = target.closest('.theorem-env-header') as HTMLElement | null;
              if (!header) return false;

              const theoremEl = header.closest('.theorem-env') as HTMLElement | null;
              if (!theoremEl) return false;

              const envType = theoremEl.getAttribute('data-env-type') || 'theorem';
              if (!NUMBERED_TYPES.has(envType)) return false;

              try {
                const bodyEl = theoremEl.querySelector('.theorem-env-body');
                if (!bodyEl) return false;

                const innerPos = view.posAtDOM(bodyEl, 0);
                const resolved = view.state.doc.resolve(innerPos);

                for (let depth = resolved.depth; depth >= 0; depth--) {
                  if (resolved.node(depth).type.name === 'theoremEnv') {
                    const nodePos = resolved.before(depth);
                    event.preventDefault();
                    event.stopPropagation();
                    showNumberEditor(view, nodePos, header);
                    return true;
                  }
                }
              } catch { /* ignore position errors */ }

              return false;
            },
          },
        },
      }),
    ];
  },
});
