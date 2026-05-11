import { Node, mergeAttributes, NodeViewRendererProps } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import katex from 'katex';
import { processAutoSnippetTextarea, processTabSnippetTextarea } from './mathSnippets';
import { processSymPyTextarea } from './SymPyComputation';
import {
  attachRefAutocomplete,
  makeTextareaAdapter,
  resolveRefs,
} from './RefAutocomplete';

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
      eqNumber: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-eq-number') || null,
        renderHTML: (attributes) => ({
          'data-eq-number': attributes.eqNumber ?? undefined,
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

      const renderRow = document.createElement('div');
      renderRow.classList.add('math-display-render-row');

      const render = document.createElement('div');
      render.classList.add('math-display-render');

      const eqNumber = document.createElement('div');
      eqNumber.classList.add('math-display-eq-number');
      eqNumber.style.display = 'none';

      renderRow.appendChild(render);
      renderRow.appendChild(eqNumber);

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

      // Number button — opens popup to set equation number
      const numberBtn = document.createElement('button');
      numberBtn.classList.add('math-number-btn');
      numberBtn.textContent = '#';
      numberBtn.title = 'Set equation number';
      numberBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showEqNumberEditor(props, numberBtn);
      });

      dom.appendChild(renderRow);
      dom.appendChild(explainBtn);
      dom.appendChild(numberBtn);
      dom.appendChild(editorWrapper);

      let isEditing = false;
      let currentLatex = props.node.attrs.latex || '';
      let currentEqNumber: string | null = props.node.attrs.eqNumber ?? null;

      function updateNumberDisplay() {
        if (currentEqNumber && !isEditing) {
          eqNumber.style.display = 'flex';
          dom.classList.add('numbered');
          eqNumber.textContent = `(${currentEqNumber})`;
        } else {
          eqNumber.style.display = 'none';
          dom.classList.remove('numbered');
        }
        numberBtn.classList.toggle('active', !!currentEqNumber);
      }

      function renderKatex(tex: string, target: HTMLElement, displayMode = true) {
        if (!tex.trim()) {
          target.innerHTML = '<span class="math-placeholder">$$</span>';
          return;
        }
        try {
          const resolved = resolveRefs(tex, props.editor);
          target.innerHTML = katex.renderToString(resolved, {
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

      let detachAutocomplete: (() => void) | null = null;

      function startEditing() {
        if (isEditing) return;
        isEditing = true;
        dom.classList.add('editing');
        editorWrapper.style.display = 'block';
        editorTextarea.value = currentLatex;
        editorTextarea.focus();
        renderRow.style.display = 'none';
        eqNumber.style.display = 'none';
        renderKatex(editorTextarea.value, previewInline);

        const adapter = makeTextareaAdapter(editorTextarea, () => {
          renderKatex(editorTextarea.value, previewInline);
        });
        detachAutocomplete = attachRefAutocomplete(adapter, editorTextarea, props.editor);
      }

      function stopEditing() {
        if (!isEditing) return;
        isEditing = false;
        dom.classList.remove('editing');
        editorWrapper.style.display = 'none';
        renderRow.style.display = '';

        if (detachAutocomplete) {
          detachAutocomplete();
          detachAutocomplete = null;
        }

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
        updateNumberDisplay();
      }

      // Click on equation number to edit it
      eqNumber.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showEqNumberEditor(props, eqNumber);
      });

      renderKatex(currentLatex, render);
      updateNumberDisplay();

      // Auto-start editing when created with empty content (e.g. via 'dm' snippet)
      if (!currentLatex) {
        setTimeout(() => startEditing(), 20);
      }

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startEditing();
      });

      editorTextarea.addEventListener('blur', () => {
        stopEditing();
      });

      editorTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
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
          // No snippet matched — Tab exits display math and places cursor
          // immediately after the math node so user can keep typing inline.
          e.preventDefault();
          stopEditing();
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
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          stopEditing();
          // Move cursor after the math node so Esc behaves consistently with Tab
          const pos = props.getPos();
          if (typeof pos === 'number') {
            const afterPos = pos + props.node.nodeSize;
            const resolvedPos = props.editor.view.state.doc.resolve(afterPos);
            props.editor.view.dispatch(
              props.editor.view.state.tr.setSelection(
                Selection.near(resolvedPos)
              )
            );
          }
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
          currentEqNumber = updatedNode.attrs.eqNumber ?? null;
          if (!isEditing) {
            renderKatex(currentLatex, render);
            updateNumberDisplay();
          }
          return true;
        },
        destroy: () => {},
      };
    };
  },
});

/**
 * Shows a popup to set or edit the equation number.
 * - Type a number and press Enter → sets that number
 * - Click "Remove" → removes the number
 * - Press Escape or click outside → closes without changes
 */
function showEqNumberEditor(
  props: NodeViewRendererProps,
  anchorEl: HTMLElement
) {
  document.querySelector('.eq-number-popup')?.remove();

  const pos = props.getPos();
  if (typeof pos !== 'number') return;
  const node = props.editor.view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'mathDisplay') return;

  const popup = document.createElement('div');
  popup.className = 'eq-number-popup';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'eq-number-input';
  input.placeholder = 'e.g. 1, 2.1, A3...';
  input.value = node.attrs.eqNumber ?? '';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'eq-number-action-btn eq-number-remove-btn';
  removeBtn.textContent = 'Remove';
  // Only show remove if there's already a number
  if (!node.attrs.eqNumber) {
    removeBtn.style.display = 'none';
  }

  popup.appendChild(input);
  popup.appendChild(removeBtn);

  // Position below the anchor element
  const rect = anchorEl.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = `${rect.bottom + 4}px`;
  popup.style.left = `${rect.left}px`;
  popup.style.zIndex = '1000';

  document.body.appendChild(popup);

  // Ensure popup stays within viewport
  requestAnimationFrame(() => {
    const popupRect = popup.getBoundingClientRect();
    if (popupRect.right > window.innerWidth - 10) {
      popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
    }
  });

  input.focus();
  input.select();

  function applyAndClose(eqNumber: string | null) {
    popup.remove();
    document.removeEventListener('mousedown', onOutsideClick);
    const currentPos = props.getPos();
    if (typeof currentPos !== 'number') return;
    const currentNode = props.editor.view.state.doc.nodeAt(currentPos);
    if (!currentNode) return;
    props.editor.view.dispatch(
      props.editor.view.state.tr.setNodeMarkup(currentPos, undefined, {
        ...currentNode.attrs,
        eqNumber,
      })
    );
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      applyAndClose(val || null);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      popup.remove();
      document.removeEventListener('mousedown', onOutsideClick);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyAndClose(null);
  });

  // Close on outside click
  function onOutsideClick(e: MouseEvent) {
    if (!popup.contains(e.target as HTMLElement)) {
      popup.remove();
      document.removeEventListener('mousedown', onOutsideClick);
    }
  }
  setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 0);
}
