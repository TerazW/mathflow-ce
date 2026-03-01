import { Node, mergeAttributes, NodeViewRendererProps } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import katex from 'katex';
import { processAutoSnippetTextarea, processTabSnippetTextarea } from './mathSnippets';
import { processSymPyTextarea } from './SymPyComputation';

export interface MathDisplayOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathDisplay: {
      insertMathDisplay: (latex?: string) => ReturnType;
    };
  }
}

export const MathDisplay = Node.create<MathDisplayOptions>({
  name: 'mathDisplay',

  group: 'block',

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
      { tag: 'math-display' },
      { tag: 'div[data-type="math-display"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['math-display', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      insertMathDisplay:
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
      const dom = document.createElement('div');
      dom.classList.add('math-display-node');
      dom.setAttribute('data-type', 'math-display');

      const render = document.createElement('div');
      render.classList.add('math-display-render');

      const editorWrapper = document.createElement('div');
      editorWrapper.classList.add('math-display-editor-wrapper');
      editorWrapper.style.display = 'none';

      const editorTextarea = document.createElement('textarea');
      editorTextarea.classList.add('math-display-editor');
      editorTextarea.rows = 3;
      editorTextarea.spellcheck = false;

      const previewInline = document.createElement('div');
      previewInline.classList.add('math-display-preview');

      editorWrapper.appendChild(editorTextarea);
      editorWrapper.appendChild(previewInline);

      // Explain button (AI)
      const explainBtn = document.createElement('button');
      explainBtn.classList.add('math-explain-btn');
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

      dom.appendChild(render);
      dom.appendChild(explainBtn);
      dom.appendChild(editorWrapper);

      let isEditing = false;
      let currentLatex = props.node.attrs.latex || '';

      function renderKatex(tex: string, target: HTMLElement, displayMode = true) {
        if (!tex.trim()) {
          target.innerHTML = '<span class="math-placeholder">$$</span>';
          return;
        }
        try {
          target.innerHTML = katex.renderToString(tex, {
            throwOnError: false,
            displayMode,
          });
        } catch {
          const errSpan = document.createElement('span');
          errSpan.className = 'math-error';
          errSpan.textContent = tex;
          target.innerHTML = '';
          target.appendChild(errSpan);
        }
      }

      function startEditing() {
        if (isEditing) return;
        isEditing = true;
        dom.classList.add('editing');
        editorWrapper.style.display = 'block';
        editorTextarea.value = currentLatex;
        editorTextarea.focus();
        render.style.display = 'none';
        renderKatex(editorTextarea.value, previewInline);
      }

      function stopEditing() {
        if (!isEditing) return;
        isEditing = false;
        dom.classList.remove('editing');
        editorWrapper.style.display = 'none';
        render.style.display = 'block';

        const newLatex = editorTextarea.value;
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
        renderKatex(newLatex, render);
      }

      renderKatex(currentLatex, render);

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startEditing();
      });

      editorTextarea.addEventListener('blur', () => {
        stopEditing();
      });

      editorTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
          // Check for SymPy computation first
          const sympyTriggered = processSymPyTextarea(editorTextarea, () => {
            renderKatex(editorTextarea.value, previewInline);
          });
          if (sympyTriggered) {
            e.preventDefault();
            return;
          }
          const expanded = processTabSnippetTextarea(editorTextarea);
          if (expanded) {
            e.preventDefault();
            renderKatex(editorTextarea.value, previewInline);
            return;
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          stopEditing();
          props.editor.view.focus();
        }
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          stopEditing();
          // Move cursor after display math
          const pos = props.getPos();
          if (typeof pos === 'number') {
            const afterPos = pos + props.node.nodeSize;
            const resolvedPos = props.editor.view.state.doc.resolve(afterPos);
            props.editor.view.dispatch(
              props.editor.view.state.tr.setSelection(
                Selection.near(resolvedPos)
              )
            );
            props.editor.view.focus();
          }
        }
      });

      let snippetProcessing = false;
      editorTextarea.addEventListener('input', () => {
        if (!snippetProcessing) {
          snippetProcessing = true;
          const expanded = processAutoSnippetTextarea(editorTextarea);
          snippetProcessing = false;
          if (expanded) {
            // Snippet modified the value, re-render preview
            renderKatex(editorTextarea.value, previewInline);
            editorTextarea.style.height = 'auto';
            editorTextarea.style.height = editorTextarea.scrollHeight + 'px';
            return;
          }
        }
        renderKatex(editorTextarea.value, previewInline);
        // Auto-resize textarea
        editorTextarea.style.height = 'auto';
        editorTextarea.style.height = editorTextarea.scrollHeight + 'px';
      });

      return {
        dom,
        stopEvent: (event: Event) => {
          if (isEditing) return true;
          if (event.type === 'mousedown' || event.type === 'click') return true;
          return false;
        },
        ignoreMutation: () => true,
        update: (updatedNode) => {
          if (updatedNode.type !== props.node.type) return false;
          currentLatex = updatedNode.attrs.latex || '';
          if (!isEditing) {
            renderKatex(currentLatex, render);
          }
          return true;
        },
        destroy: () => {},
      };
    };
  },
});
