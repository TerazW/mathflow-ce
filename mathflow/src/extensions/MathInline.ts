import { Node, mergeAttributes, NodeViewRendererProps } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import katex from 'katex';
import {
  processAutoSnippetContentEditable,
  processTabSnippetContentEditable,
} from './mathSnippets';
import { processSymPyContentEditable } from './SymPyComputation';

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
          render.innerHTML = katex.renderToString(tex, {
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

      function startEditing() {
        if (isEditing) return;
        isEditing = true;
        dom.classList.add('editing');
        editor.style.display = 'inline-block';
        render.style.display = 'none';
        editor.textContent = currentLatex;
        editor.focus();

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

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startEditing();
      });

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
            renderKatex(currentLatex);
          }
          return true;
        },
        destroy: () => {},
      };
    };
  },

  addInputRules() {
    return [];
  },
});
