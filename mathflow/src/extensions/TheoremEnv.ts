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
  const currentLabel = node.attrs.label || '';

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

  const labelTitle = document.createElement('div');
  labelTitle.className = 'theorem-number-popup-title';
  labelTitle.textContent = 'Label (for \\ref)';
  labelTitle.style.marginTop = '8px';
  popup.appendChild(labelTitle);

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'theorem-number-input';
  labelInput.value = currentLabel;
  labelInput.placeholder = 'e.g. thm:pythagoras';
  popup.appendChild(labelInput);

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

    const labelVal = labelInput.value.trim();
    const { tr } = view.state;
    tr.setNodeMarkup(nodePos, undefined, {
      ...currentNode.attrs,
      customNumber,
      label: labelVal === '' ? null : labelVal,
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

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      finish(val === '' ? null : val);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };
  input.addEventListener('keydown', handleEnter);
  labelInput.addEventListener('keydown', handleEnter);

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

/**
 * TheoremTitle — optional inline title inside a theorem environment header.
 * Supports plain text + marks (bold/italic/etc.) + inline math nodes.
 * Renders as: <div.theorem-title> <span.theorem-title-prefix>Theorem 1.</span> <span.theorem-title-content>...</span> </div>
 * The prefix is non-editable; the content is editable inline content.
 */
export const TheoremTitle = Node.create({
  name: 'theoremTitle',

  content: 'inline*',

  selectable: false,

  addAttributes() {
    return {
      envPrefix: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-prefix') || '',
        renderHTML: (attrs) => ({ 'data-prefix': attrs.envPrefix || '' }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="theorem-title"]' },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'theorem-title',
        class: 'theorem-title',
      }),
      ['span', { class: 'theorem-title-prefix', contenteditable: 'false' }, node.attrs.envPrefix || ''],
      ['span', { class: 'theorem-title-content' }, 0],
    ];
  },
});

export const TheoremEnv = Node.create<TheoremEnvOptions>({
  name: 'theoremEnv',

  group: 'block',

  content: 'theoremTitle? block+',

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
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-env-label') || null,
        renderHTML: (attributes) => {
          if (!attributes.label) return {};
          return { 'data-env-label': attributes.label, id: `env-${attributes.label}` };
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

    let prefixText: string;
    if (node.attrs.customNumber !== null && node.attrs.customNumber !== undefined) {
      prefixText = node.attrs.customNumber === ''
        ? label
        : `${label} ${node.attrs.customNumber}`;
    } else {
      const num = node.attrs.number;
      prefixText = num ? `${label} ${num}` : label;
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'theorem-env',
        'data-env-type': envType,
        'data-env-prefix': prefixText,
        class: `theorem-env theorem-${envType}`,
      }),
      [
        'button',
        {
          class: 'theorem-env-delete',
          contenteditable: 'false',
          title: 'Delete this environment',
          type: 'button',
        },
        '×',
      ],
      ['div', { class: 'theorem-env-content' }, 0],
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
              { type: 'theoremTitle' },
              { type: 'paragraph' },
            ],
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Allow deleting an empty theorem env with Backspace
      Backspace: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        if (!selection.empty) return false;
        const { $from } = selection;

        // Walk up to find an enclosing theoremEnv
        for (let d = $from.depth; d >= 0; d--) {
          const node = $from.node(d);
          if (node.type.name !== 'theoremEnv') continue;

          // Cursor must be at the very start of its enclosing block
          if ($from.parentOffset !== 0) return false;

          // Title must be empty (or absent)
          const first = node.firstChild;
          const titleEmpty =
            !first || first.type.name !== 'theoremTitle' || first.content.size === 0;

          // Body must be empty (only a single empty paragraph)
          const startIdx = first?.type.name === 'theoremTitle' ? 1 : 0;
          let bodyEmpty = true;
          for (let i = startIdx; i < node.childCount; i++) {
            const child = node.child(i);
            if (child.content.size > 0) {
              bodyEmpty = false;
              break;
            }
          }

          if (!titleEmpty || !bodyEmpty) return false;

          // Delete the whole env
          const envPos = $from.before(d);
          view.dispatch(state.tr.delete(envPos, envPos + node.nodeSize));
          return true;
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    /** Compute the prefix string (e.g. "Theorem 1.") for a theorem env. */
    function computePrefix(envType: string, number: string | null, customNumber: string | null): string {
      const label = THEOREM_LABELS[envType] || envType;
      if (customNumber !== null && customNumber !== undefined) {
        return customNumber === '' ? `${label}.` : `${label} ${customNumber}.`;
      }
      if (NUMBERED_TYPES.has(envType) && number) {
        return `${label} ${number}.`;
      }
      return `${label}.`;
    }

    return [
      // Migration: inject an empty theoremTitle into any theoremEnv that
      // doesn't have one (legacy saved theorems). Runs whenever the doc
      // contains envs missing titles — handles setContent() loads that
      // happen after the editor mounts.
      new Plugin({
        key: new PluginKey('theoremTitleMigration'),
        view() {
          let pending = false;
          return {
            update(view) {
              if (pending) return;

              const titleType = view.state.schema.nodes.theoremTitle;
              if (!titleType) return;

              // Quick scan
              const positions: number[] = [];
              view.state.doc.descendants((node, pos) => {
                if (node.type.name === 'theoremEnv') {
                  const firstChild = node.firstChild;
                  if (!firstChild || firstChild.type.name !== 'theoremTitle') {
                    positions.push(pos);
                  }
                  return false;
                }
                return undefined;
              });

              if (positions.length === 0) return;

              pending = true;
              setTimeout(() => {
                pending = false;

                // Re-scan against current state (it may have changed)
                const { state } = view;
                const positions2: number[] = [];
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'theoremEnv') {
                    const firstChild = node.firstChild;
                    if (!firstChild || firstChild.type.name !== 'theoremTitle') {
                      positions2.push(pos);
                    }
                    return false;
                  }
                  return undefined;
                });
                if (positions2.length === 0) return;

                let tr = state.tr;
                for (let i = positions2.length - 1; i >= 0; i--) {
                  tr = tr.insert(positions2[i] + 1, titleType.create());
                }
                tr.setMeta('addToHistory', false);
                view.dispatch(tr);
              }, 0);
            },
          };
        },
      }),

      // Auto-numbering plugin — keeps env.number and child theoremTitle.envPrefix in sync
      new Plugin({
        key: theoremNumberingKey,
        view() {
          let pendingUpdate = false;

          return {
            update(view) {
              if (pendingUpdate) return;

              // First pass: detect if anything needs to change
              let counter = 0;
              let needsUpdate = false;

              view.state.doc.descendants((node) => {
                if (node.type.name === 'theoremEnv') {
                  const envType = node.attrs.envType || 'theorem';
                  let expectedNum: string | null = null;
                  if (NUMBERED_TYPES.has(envType)) {
                    if (node.attrs.customNumber === null || node.attrs.customNumber === undefined) {
                      counter++;
                      expectedNum = String(counter);
                      if (node.attrs.number !== expectedNum) needsUpdate = true;
                    }
                  }
                  const expectedPrefix = computePrefix(
                    envType,
                    expectedNum ?? node.attrs.number,
                    node.attrs.customNumber,
                  );
                  const firstChild = node.firstChild;
                  if (
                    firstChild &&
                    firstChild.type.name === 'theoremTitle' &&
                    firstChild.attrs.envPrefix !== expectedPrefix
                  ) {
                    needsUpdate = true;
                  }
                  return false;
                }
              });

              if (!needsUpdate) return;

              pendingUpdate = true;
              setTimeout(() => {
                pendingUpdate = false;

                const { state } = view;
                let tr = state.tr;
                let changed = false;

                let c = 0;
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'theoremEnv') {
                    const envType = node.attrs.envType || 'theorem';

                    let expectedNum: string | null = null;
                    if (NUMBERED_TYPES.has(envType)) {
                      if (node.attrs.customNumber === null || node.attrs.customNumber === undefined) {
                        c++;
                        expectedNum = String(c);
                        if (node.attrs.number !== expectedNum) {
                          tr = tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            number: expectedNum,
                          });
                          changed = true;
                        }
                      }
                    }

                    // Sync the child title's prefix attribute
                    const expectedPrefix = computePrefix(
                      envType,
                      expectedNum ?? node.attrs.number,
                      node.attrs.customNumber,
                    );
                    const firstChild = node.firstChild;
                    if (
                      firstChild &&
                      firstChild.type.name === 'theoremTitle' &&
                      firstChild.attrs.envPrefix !== expectedPrefix
                    ) {
                      // Title is at pos + 1 (after the env's opening token)
                      const titlePos = pos + 1;
                      tr = tr.setNodeMarkup(titlePos, undefined, {
                        ...firstChild.attrs,
                        envPrefix: expectedPrefix,
                      });
                      changed = true;
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

      // Double-click handler for editing theorem numbers + label
      new Plugin({
        key: new PluginKey('theoremNumberEditor'),
        props: {
          handleDOMEvents: {
            dblclick: (view, event) => {
              const target = event.target as HTMLElement;
              if (!target.closest) return false;
              const prefixEl = target.closest('.theorem-title-prefix') as HTMLElement | null;
              if (!prefixEl) return false;

              const theoremEl = prefixEl.closest('.theorem-env') as HTMLElement | null;
              if (!theoremEl) return false;

              const envType = theoremEl.getAttribute('data-env-type') || 'theorem';
              if (!NUMBERED_TYPES.has(envType)) return false;

              try {
                const innerPos = view.posAtDOM(theoremEl, 0);
                const resolved = view.state.doc.resolve(innerPos);

                for (let depth = resolved.depth; depth >= 0; depth--) {
                  if (resolved.node(depth).type.name === 'theoremEnv') {
                    const nodePos = resolved.before(depth);
                    event.preventDefault();
                    event.stopPropagation();
                    showNumberEditor(view, nodePos, prefixEl);
                    return true;
                  }
                }
              } catch { /* ignore position errors */ }

              return false;
            },
          },
        },
      }),

      // Click handler for the env delete button (× in top-right corner)
      new Plugin({
        key: new PluginKey('theoremEnvDeleteBtn'),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              if (!target.closest) return false;
              const btn = target.closest('.theorem-env-delete') as HTMLElement | null;
              if (!btn) return false;

              const envEl = btn.closest('.theorem-env') as HTMLElement | null;
              if (!envEl) return false;

              try {
                const innerPos = view.posAtDOM(envEl, 0);
                const resolved = view.state.doc.resolve(innerPos);
                for (let depth = resolved.depth; depth >= 0; depth--) {
                  if (resolved.node(depth).type.name === 'theoremEnv') {
                    const nodePos = resolved.before(depth);
                    const node = resolved.node(depth);
                    event.preventDefault();
                    event.stopPropagation();
                    view.dispatch(view.state.tr.delete(nodePos, nodePos + node.nodeSize));
                    view.focus();
                    return true;
                  }
                }
              } catch { /* ignore */ }
              return false;
            },
          },
        },
      }),
    ];
  },
});
