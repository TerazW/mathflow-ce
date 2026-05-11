import { Node, mergeAttributes, NodeViewRendererProps } from '@tiptap/core';
import { Selection, TextSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import katex from 'katex';
import {
  processAutoSnippetContentEditable,
  processTabSnippetContentEditable,
} from './mathSnippets';
import { processSymPyContentEditable } from './SymPyComputation';
import {
  attachRefAutocomplete,
  makeContentEditableAdapter,
  resolveRefs,
} from './RefAutocomplete';

export interface MathInlineOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: (latex?: string) => ReturnType;
    };
  }
}

export const MathInline = Node.create<MathInlineOptions>({
  name: 'mathInline',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || element.textContent || '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'math-inline',
      },
      {
        tag: 'span[data-type="math-inline"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['math-inline', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      insertMathInline:
        (latex = '') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('span');
      dom.classList.add('math-inline-node');
      dom.setAttribute('data-type', 'math-inline');

      const content = document.createElement('span');
      content.classList.add('math-inline-content');

      const editor = document.createElement('span');
      editor.classList.add('math-inline-editor');
      editor.contentEditable = 'true';
      editor.style.display = 'none';

      const render = document.createElement('span');
      render.classList.add('math-inline-render');

      // Explain button (AI)
      const explainBtn = document.createElement('button');
      explainBtn.classList.add('math-explain-btn', 'math-explain-btn-inline');
      explainBtn.textContent = '?';
      explainBtn.title = 'Explain this formula (AI)';
      explainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = dom.getBoundingClientRect();
        if (currentLatex.trim()) {
          dom.dispatchEvent(new CustomEvent('mathflow:explain', {
            detail: { latex: currentLatex, top: rect.bottom, left: rect.left },
            bubbles: true,
          }));
        }
      });

      dom.appendChild(content);
      content.appendChild(render);
      content.appendChild(editor);
      dom.appendChild(explainBtn);

      let isEditing = false;
      let currentLatex = props.node.attrs.latex || '';

      function renderKatex(tex: string) {
        if (!tex.trim()) {
          render.innerHTML = '<span class="math-placeholder">$</span>';
          return;
        }
        try {
          const resolved = resolveRefs(tex, props.editor);
          render.innerHTML = katex.renderToString(resolved, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          const errSpan = document.createElement('span');
          errSpan.className = 'math-error';
          errSpan.textContent = tex;
          render.innerHTML = '';
          render.appendChild(errSpan);
        }
      }

      let detachAutocomplete: (() => void) | null = null;

      function startEditing() {
        if (isEditing) return;
        isEditing = true;
        dom.classList.add('editing');
        editor.style.display = 'inline-block';
        render.style.display = 'none';
        editor.textContent = currentLatex;
        editor.focus();

        // Attach \ref{ autocomplete
        const adapter = makeContentEditableAdapter(editor, () => {
          const tex = editor.textContent || '';
          renderKatex(tex);
        });
        detachAutocomplete = attachRefAutocomplete(adapter, editor, props.editor);

        const range = document.createRange();
        const sel = window.getSelection();
        if (editor.childNodes.length > 0) {
          range.selectNodeContents(editor);
          range.collapse(false);
        } else {
          // Empty editor — place cursor at start
          range.setStart(editor, 0);
          range.collapse(true);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      function stopEditing() {
        if (!isEditing) return;
        isEditing = false;
        dom.classList.remove('editing');
        editor.style.display = 'none';
        render.style.display = 'inline';
        render.style.opacity = '1';

        if (detachAutocomplete) {
          detachAutocomplete();
          detachAutocomplete = null;
        }

        const newLatex = editor.textContent || '';
        currentLatex = newLatex;
        if (newLatex !== props.node.attrs.latex) {
          const pos = props.getPos();
          if (typeof pos === 'number') {
            props.editor.view.dispatch(
              props.editor.view.state.tr.setNodeMarkup(pos, undefined, {
                ...props.node.attrs,
                latex: newLatex,
              })
            );
          }
        }
        renderKatex(newLatex);
      }

      renderKatex(currentLatex);

      // Auto-start editing when created with empty content
      if (!currentLatex) {
        setTimeout(() => startEditing(), 20);
      }

      // Use ProseMirror's selectNode/deselectNode instead of click handlers.
      // This lets ProseMirror handle all click positioning natively:
      // - Click ON the math node → NodeSelection → selectNode → enter editing
      // - Click AFTER the math node → TextSelection → cursor placed correctly
      // Previously, a click handler with stopPropagation prevented cursor
      // placement after the last inline math in a paragraph.

      editor.addEventListener('blur', () => {
        stopEditing();
      });

      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
          // Check for SymPy computation first
          const sympyTriggered = processSymPyContentEditable(editor, () => {
            const tex = editor.textContent || '';
            renderKatex(tex);
          });
          if (sympyTriggered) {
            e.preventDefault();
            return;
          }
          const expanded = processTabSnippetContentEditable(editor);
          if (expanded) {
            e.preventDefault();
            const tex = editor.textContent || '';
            renderKatex(tex);
            return;
          }
        }
        if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
          e.preventDefault();
          stopEditing();
          // Move cursor after the math node
          const pos = props.getPos();
          if (typeof pos === 'number') {
            const resolvedPos = props.editor.view.state.doc.resolve(pos + props.node.nodeSize);
            props.editor.view.dispatch(
              props.editor.view.state.tr.setSelection(
                Selection.near(resolvedPos)
              )
            );
            props.editor.view.focus();
          }
        }
        if (e.key === 'Backspace' && editor.textContent === '') {
          e.preventDefault();
          stopEditing();
          const pos = props.getPos();
          if (typeof pos === 'number') {
            props.editor.view.dispatch(
              props.editor.view.state.tr.delete(pos, pos + props.node.nodeSize)
            );
            props.editor.view.focus();
          }
        }
      });

      let snippetProcessing = false;
      editor.addEventListener('input', () => {
        if (!snippetProcessing) {
          snippetProcessing = true;
          const expanded = processAutoSnippetContentEditable(editor);
          snippetProcessing = false;
          if (expanded) {
            const tex = editor.textContent || '';
            renderKatex(tex);
            return;
          }
        }
        const tex = editor.textContent || '';
        renderKatex(tex);
      });

      return {
        dom,
        stopEvent: () => {
          // Only intercept events when actively editing the math content.
          // Otherwise, let ProseMirror handle clicks for cursor positioning.
          if (isEditing) return true;
          return false;
        },
        ignoreMutation: () => true,
        selectNode: () => {
          // ProseMirror selected this atom node (user clicked on it)
          dom.classList.add('ProseMirror-selectednode');
          startEditing();
        },
        deselectNode: () => {
          // ProseMirror deselected this node (user clicked elsewhere)
          dom.classList.remove('ProseMirror-selectednode');
          if (isEditing) stopEditing();
        },
        update: (updatedNode) => {
          if (updatedNode.type !== props.node.type) return false;
          currentLatex = updatedNode.attrs.latex || '';
          if (!isEditing) {
            renderKatex(currentLatex);
          }
          return true;
        },
        destroy: () => {},
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mathInlineClick'),
        props: {
          // When clicking on an inline math atom node, check if the click is
          // on the right half. If so, place a TextSelection after the node
          // instead of a NodeSelection on it. This lets users place the cursor
          // after an inline math node at the end of a paragraph.
          handleClickOn(view, _pos, node, nodePos, event, direct) {
            if (!direct) return false;
            if (node.type.name !== 'mathInline') return false;

            // Find the DOM element for this node
            const domNode = view.nodeDOM(nodePos);
            if (!domNode || !(domNode instanceof HTMLElement)) return false;

            const rect = domNode.getBoundingClientRect();
            const clickX = event.clientX;

            // If click is on the right third of the node, place cursor after it
            if (clickX > rect.left + rect.width * 0.67) {
              const afterPos = nodePos + node.nodeSize;
              const $after = view.state.doc.resolve(afterPos);
              // Only do this if there's a valid text position after the node
              if ($after.parent.inlineContent) {
                const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, afterPos));
                view.dispatch(tr);
                view.focus();
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },

  addInputRules() {
    return [];
  },
});
