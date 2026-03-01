import { Node, mergeAttributes, NodeViewRendererProps } from '@tiptap/core';
import { renderTikZ } from '../lib/tikz-renderer';
import { loadAISettings } from '../lib/ai-settings';

export interface TikZGraphicsOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tikzGraphics: {
      insertTikZGraphics: (code?: string) => ReturnType;
    };
  }
}

const DEFAULT_TIKZ = `\\begin{tikzpicture}
  \\draw[->] (0,0) -- (2,0) node[right] {$x$};
  \\draw[->] (0,0) -- (0,2) node[above] {$y$};
\\end{tikzpicture}`;

export const TikZGraphics = Node.create<TikZGraphicsOptions>({
  name: 'tikzGraphics',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tikzCode: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-tikz-code') || '',
        renderHTML: (attributes) => ({
          'data-tikz-code': attributes.tikzCode,
        }),
      },
      svgCache: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-svg-cache') || '',
        renderHTML: (attributes) => ({
          'data-svg-cache': attributes.svgCache,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'tikz-graphics' },
      { tag: 'div[data-type="tikz-graphics"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['tikz-graphics', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      insertTikZGraphics:
        (code = DEFAULT_TIKZ) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { tikzCode: code },
          });
        },
    };
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('div');
      dom.classList.add('tikz-graphics-node');
      dom.setAttribute('data-type', 'tikz-graphics');

      // Header bar
      const header = document.createElement('div');
      header.classList.add('tikz-graphics-header');
      header.innerHTML = '<span class="tikz-graphics-badge">TikZ</span><span class="tikz-graphics-hint">Click to edit</span>';

      // Render area (shows SVG or placeholder)
      const renderArea = document.createElement('div');
      renderArea.classList.add('tikz-graphics-render');

      // Editor wrapper (hidden when not editing)
      const editorWrapper = document.createElement('div');
      editorWrapper.classList.add('tikz-graphics-editor-wrapper');
      editorWrapper.style.display = 'none';

      const editorTextarea = document.createElement('textarea');
      editorTextarea.classList.add('tikz-graphics-editor');
      editorTextarea.rows = 8;
      editorTextarea.spellcheck = false;
      editorTextarea.placeholder = '\\begin{tikzpicture}\n  % Your TikZ code here\n\\end{tikzpicture}';

      const editorActions = document.createElement('div');
      editorActions.classList.add('tikz-graphics-actions');

      const renderBtn = document.createElement('button');
      renderBtn.classList.add('tikz-graphics-btn', 'tikz-graphics-btn-render');
      renderBtn.textContent = 'Render';
      renderBtn.title = 'Render TikZ diagram';

      const aiGenerateBtn = document.createElement('button');
      aiGenerateBtn.classList.add('tikz-graphics-btn', 'tikz-graphics-btn-ai');
      aiGenerateBtn.textContent = 'AI Generate';
      aiGenerateBtn.title = 'Generate TikZ code from a description using AI';

      const doneBtn = document.createElement('button');
      doneBtn.classList.add('tikz-graphics-btn', 'tikz-graphics-btn-done');
      doneBtn.textContent = 'Done';
      doneBtn.title = 'Close editor (Esc)';

      // AI description input (hidden by default)
      const aiInputWrapper = document.createElement('div');
      aiInputWrapper.classList.add('tikz-ai-input-wrapper');
      aiInputWrapper.style.display = 'none';

      const aiInput = document.createElement('input');
      aiInput.type = 'text';
      aiInput.classList.add('tikz-ai-input');
      aiInput.placeholder = 'Describe the diagram you want (e.g. "commutative diagram for exact sequence")...';

      const aiSubmitBtn = document.createElement('button');
      aiSubmitBtn.classList.add('tikz-graphics-btn', 'tikz-graphics-btn-render');
      aiSubmitBtn.textContent = 'Generate';

      const aiCancelBtn = document.createElement('button');
      aiCancelBtn.classList.add('tikz-graphics-btn', 'tikz-graphics-btn-done');
      aiCancelBtn.textContent = 'Cancel';

      aiInputWrapper.appendChild(aiInput);
      aiInputWrapper.appendChild(aiSubmitBtn);
      aiInputWrapper.appendChild(aiCancelBtn);

      editorActions.appendChild(renderBtn);
      editorActions.appendChild(aiGenerateBtn);
      editorActions.appendChild(doneBtn);

      editorWrapper.appendChild(editorTextarea);
      editorWrapper.appendChild(aiInputWrapper);
      editorWrapper.appendChild(editorActions);

      dom.appendChild(header);
      dom.appendChild(renderArea);
      dom.appendChild(editorWrapper);

      let isEditing = false;
      let currentCode = props.node.attrs.tikzCode || '';
      let currentSvg = props.node.attrs.svgCache || '';
      let isRendering = false;

      /** Safely insert SVG by parsing and only allowing <svg> elements */
      function safeSvgInsert(container: HTMLElement, svgString: string) {
        container.innerHTML = '';
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgString, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            // Remove any <script> elements from the parsed SVG
            svgEl.querySelectorAll('script').forEach((s) => s.remove());
            // Remove event handler attributes
            const allEls = svgEl.querySelectorAll('*');
            allEls.forEach((el) => {
              Array.from(el.attributes).forEach((attr) => {
                if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
              });
            });
            container.appendChild(document.importNode(svgEl, true));
          } else {
            container.textContent = 'Invalid SVG output';
          }
        } catch {
          container.textContent = 'Failed to parse SVG';
        }
      }

      function showRender() {
        renderArea.innerHTML = '';
        if (currentSvg) {
          safeSvgInsert(renderArea, currentSvg);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'tikz-graphics-placeholder';
          placeholder.textContent = currentCode.trim()
            ? 'Click "Render" to preview TikZ diagram'
            : 'Click to add TikZ diagram';
          renderArea.appendChild(placeholder);
        }
      }

      function saveToNode() {
        const pos = props.getPos();
        if (typeof pos === 'number') {
          props.editor.view.dispatch(
            props.editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...props.node.attrs,
              tikzCode: currentCode,
              svgCache: currentSvg,
            })
          );
        }
      }

      async function doRender() {
        if (isRendering || !currentCode.trim()) return;
        isRendering = true;
        renderBtn.disabled = true;
        renderBtn.textContent = 'Rendering...';
        renderArea.innerHTML = '';
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'tikz-graphics-loading';
        const spinner = document.createElement('div');
        spinner.className = 'tikz-graphics-spinner';
        loadingDiv.appendChild(spinner);
        loadingDiv.appendChild(document.createTextNode('Compiling TikZ...'));
        renderArea.appendChild(loadingDiv);

        try {
          const svg = await renderTikZ(currentCode);
          currentSvg = svg;
          safeSvgInsert(renderArea, svg);
          saveToNode();
        } catch (err: any) {
          currentSvg = '';
          const errDiv = document.createElement('div');
          errDiv.className = 'tikz-graphics-error';
          errDiv.textContent = `Render failed: ${err.message}`;
          renderArea.innerHTML = '';
          renderArea.appendChild(errDiv);
        } finally {
          isRendering = false;
          renderBtn.disabled = false;
          renderBtn.textContent = 'Render';
        }
      }

      function startEditing() {
        if (isEditing) return;
        isEditing = true;
        dom.classList.add('editing');
        editorWrapper.style.display = 'block';
        editorTextarea.value = currentCode;
        editorTextarea.focus();
        header.querySelector('.tikz-graphics-hint')!.textContent = 'Esc to close';
      }

      function stopEditing() {
        if (!isEditing) return;
        isEditing = false;
        dom.classList.remove('editing');
        editorWrapper.style.display = 'none';
        header.querySelector('.tikz-graphics-hint')!.textContent = 'Click to edit';

        const newCode = editorTextarea.value;
        if (newCode !== currentCode) {
          currentCode = newCode;
          // Invalidate cached SVG if code changed
          if (currentSvg) {
            currentSvg = '';
          }
          saveToNode();
          showRender();
        }
      }

      // Initial render
      showRender();

      // Event handlers
      dom.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.tikz-graphics-editor-wrapper')) return;
        if ((e.target as HTMLElement).closest('.tikz-graphics-btn')) return;
        e.preventDefault();
        e.stopPropagation();
        startEditing();
      });

      renderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentCode = editorTextarea.value;
        doRender();
      });

      doneBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopEditing();
      });

      // AI Generate handlers
      aiGenerateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        aiInputWrapper.style.display = aiInputWrapper.style.display === 'none' ? 'flex' : 'none';
        if (aiInputWrapper.style.display === 'flex') {
          aiInput.focus();
        }
      });

      aiCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        aiInputWrapper.style.display = 'none';
        aiInput.value = '';
      });

      async function doAIGenerate() {
        const description = aiInput.value.trim();
        if (!description) return;

        const settings = loadAISettings();
        if (!settings?.apiKey) {
          alert('Please configure your AI API key in Settings first.');
          return;
        }

        aiSubmitBtn.disabled = true;
        aiSubmitBtn.textContent = 'Generating...';

        const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
          ? import.meta.env.VITE_API_URL
          : '';

        try {
          const response = await fetch(`${API_BASE}/api/ai/generate-tikz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description,
              provider: settings.provider,
              apiKey: settings.apiKey,
              model: settings.model,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'TikZ generation failed');
          }

          editorTextarea.value = data.tikzCode;
          currentCode = data.tikzCode;
          aiInput.value = '';
          aiInputWrapper.style.display = 'none';

          // Auto-render after generation
          doRender();
        } catch (err: any) {
          alert(`AI TikZ generation failed: ${err.message}`);
        } finally {
          aiSubmitBtn.disabled = false;
          aiSubmitBtn.textContent = 'Generate';
        }
      }

      aiSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        doAIGenerate();
      });

      aiInput.addEventListener('keydown', (e) => {
        e.stopPropagation(); // Prevent editor from capturing keys
        if (e.key === 'Enter') {
          e.preventDefault();
          doAIGenerate();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          aiInputWrapper.style.display = 'none';
          aiInput.value = '';
        }
      });

      editorTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          stopEditing();
          props.editor.view.focus();
        }
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          currentCode = editorTextarea.value;
          doRender();
        }
        // Allow Tab for indentation in textarea
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const start = editorTextarea.selectionStart;
          const end = editorTextarea.selectionEnd;
          editorTextarea.value =
            editorTextarea.value.substring(0, start) +
            '  ' +
            editorTextarea.value.substring(end);
          editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
        }
      });

      // Auto-resize textarea
      editorTextarea.addEventListener('input', () => {
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
          currentCode = updatedNode.attrs.tikzCode || '';
          currentSvg = updatedNode.attrs.svgCache || '';
          if (!isEditing) {
            showRender();
          }
          return true;
        },
        destroy: () => {},
      };
    };
  },
});
