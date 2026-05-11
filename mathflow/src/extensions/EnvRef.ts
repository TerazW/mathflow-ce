import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

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

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    envRef: {
      insertEnvRef: (label: string) => ReturnType;
    };
  }
}

/**
 * Build a snapshot map of all labeled theorem envs in the document.
 * Returns: label -> { type, number, customNumber, pos }
 */
export function buildLabelIndex(doc: import('@tiptap/pm/model').Node): Map<string, {
  envType: string;
  number: string | null;
  customNumber: string | null;
  pos: number;
}> {
  const index = new Map();
  doc.descendants((node, pos) => {
    if (node.type.name === 'theoremEnv' && node.attrs.label) {
      index.set(node.attrs.label, {
        envType: node.attrs.envType || 'theorem',
        number: node.attrs.number ?? null,
        customNumber: node.attrs.customNumber ?? null,
        pos,
      });
      return false;
    }
    return undefined;
  });
  return index;
}

function formatRefText(entry: {
  envType: string;
  number: string | null;
  customNumber: string | null;
}): string {
  const typeName = ENV_LABELS[entry.envType] || entry.envType;
  let num: string;
  if (entry.customNumber !== null && entry.customNumber !== undefined) {
    num = entry.customNumber;
  } else {
    num = entry.number || '?';
  }
  return num ? `${typeName} ${num}` : typeName;
}

/**
 * Scrolls to and briefly highlights the env with the given label.
 * Public helper that other components (TOC panel, ref click) can call.
 */
export function jumpToLabel(view: EditorView, label: string): boolean {
  const index = buildLabelIndex(view.state.doc);
  const entry = index.get(label);
  if (!entry) return false;

  const dom = view.nodeDOM(entry.pos) as HTMLElement | null;
  if (!dom) return false;

  dom.scrollIntoView({ behavior: 'smooth', block: 'center' });

  dom.classList.remove('env-jump-flash');
  // Force reflow so the animation restarts when jumped to repeatedly
  void dom.offsetWidth;
  dom.classList.add('env-jump-flash');
  setTimeout(() => {
    dom.classList.remove('env-jump-flash');
  }, 1600);

  return true;
}

const envRefSyncKey = new PluginKey('envRefSync');

export const EnvRef = Node.create({
  name: 'envRef',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: true,

  draggable: false,

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-label') || '',
        renderHTML: (attrs) => ({ 'data-label': attrs.label }),
      },
      displayText: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-display') || '',
        renderHTML: (attrs) => ({ 'data-display': attrs.displayText || '' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="env-ref"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const text = node.attrs.displayText || `?? ${node.attrs.label}`;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'env-ref',
        class: 'env-ref',
        title: `Jump to ${node.attrs.label}`,
      }),
      text,
    ];
  },

  addCommands() {
    return {
      insertEnvRef:
        (label: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { label, displayText: '' },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      // Sync displayText on each envRef to match the current label index
      new Plugin({
        key: envRefSyncKey,
        view() {
          let pending = false;
          return {
            update(view) {
              if (pending) return;

              const index = buildLabelIndex(view.state.doc);
              const updates: Array<{ pos: number; text: string; attrs: Record<string, unknown> }> = [];

              view.state.doc.descendants((node, pos) => {
                if (node.type.name === 'envRef') {
                  const label = node.attrs.label;
                  const entry = index.get(label);
                  const expected = entry ? formatRefText(entry) : `?? ${label}`;
                  if (node.attrs.displayText !== expected) {
                    updates.push({ pos, text: expected, attrs: node.attrs });
                  }
                }
              });

              if (updates.length === 0) return;

              pending = true;
              setTimeout(() => {
                pending = false;
                const { state } = view;
                let tr = state.tr;
                let changed = false;
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'envRef') {
                    const label = node.attrs.label;
                    const entry = buildLabelIndex(state.doc).get(label);
                    const expected = entry ? formatRefText(entry) : `?? ${label}`;
                    if (node.attrs.displayText !== expected) {
                      tr = tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        displayText: expected,
                      });
                      changed = true;
                    }
                  }
                });
                if (changed) {
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(envRefSyncKey, true);
                  view.dispatch(tr);
                }
              }, 0);
            },
          };
        },
      }),

      // Click handler — clicking an env-ref jumps to the target
      new Plugin({
        key: new PluginKey('envRefClick'),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              if (!target.closest) return false;
              const refEl = target.closest('.env-ref') as HTMLElement | null;
              if (!refEl) return false;
              const label = refEl.getAttribute('data-label');
              if (!label) return false;
              event.preventDefault();
              event.stopPropagation();
              jumpToLabel(view, label);
              return true;
            },
          },
        },
      }),
    ];
  },
});
