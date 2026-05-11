import { Node, mergeAttributes } from '@tiptap/core';
import type { TikzFigure } from '../figure-editor/model/TikzAST';
import { createDefaultFigure, TIKZ_COLORS } from '../figure-editor/model/TikzAST';
import { CoordinateSystem } from '../figure-editor/canvas/CoordinateSystem';
import { Renderer } from '../figure-editor/canvas/Renderer';
import { updateLabelOverlays, type LabelOverlay } from '../figure-editor/canvas/LatexLabelRenderer';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureNode: {
      insertFigure: (data?: TikzFigure) => ReturnType;
    };
  }
}

export const FigureNode = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      figureId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-figure-id'),
        renderHTML: (attrs) => ({ 'data-figure-id': attrs.figureId }),
      },
      tikzData: {
        default: null,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-tikz-data');
          if (raw) try { return JSON.parse(raw); } catch { return null; }
          return null;
        },
        renderHTML: (attrs) => ({
          'data-tikz-data': attrs.tikzData ? JSON.stringify(attrs.tikzData) : '',
        }),
      },
      caption: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-caption') || '',
        renderHTML: (attrs) => ({ 'data-caption': attrs.caption }),
      },
      previewWidth: {
        default: 400,
        parseHTML: (el) => parseInt(el.getAttribute('data-preview-width') || '400', 10),
        renderHTML: (attrs) => ({ 'data-preview-width': String(attrs.previewWidth) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-figure-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'figure-node' }), 0];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // Mutable reference to the current node — updated in update()
      let currentNode = node;

      const dom = document.createElement('div');
      dom.className = 'figure-node-wrapper';
      dom.contentEditable = 'false';

      // Render preview canvas
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'figure-preview-container';
      canvasContainer.style.position = 'relative';
      dom.appendChild(canvasContainer);

      const canvas = document.createElement('canvas');
      canvas.className = 'figure-preview-canvas';
      canvasContainer.appendChild(canvas);

      const collectLabels = (data: TikzFigure): LabelOverlay[] => {
        const labels: LabelOverlay[] = [];
        for (const el of data.elements) {
          if (el.type === 'node' && el.label) {
            labels.push({
              at: el.at,
              label: el.label,
              color: TIKZ_COLORS[el.options.color || 'black'] || '#000',
              anchor: el.nodeOptions.anchor || '',
              elementId: el.id,
            });
          }
          if (el.type === 'edge' && el.label) {
            const midX = (el.fromPos[0] + el.toPos[0]) / 2;
            const midY = (el.fromPos[1] + el.toPos[1]) / 2;
            labels.push({
              at: [midX, midY],
              label: el.label,
              color: TIKZ_COLORS[el.options.color || 'black'] || '#000',
              anchor: el.labelPosition === 'auto' ? 'above' : el.labelPosition,
              elementId: el.id + '-label',
            });
          }
          if (el.type === 'matrix') {
            for (let r = 0; r < el.rows; r++) {
              for (let c = 0; c < el.cols; c++) {
                const cellLabel = el.cells[r]?.[c];
                if (!cellLabel) continue;
                const cellX = el.at[0] + (c - (el.cols - 1) / 2) * el.colSep;
                const cellY = el.at[1] - (r - (el.rows - 1) / 2) * el.rowSep;
                labels.push({
                  at: [cellX, cellY],
                  label: cellLabel,
                  color: TIKZ_COLORS[el.options.color || 'black'] || '#000',
                  anchor: '',
                  elementId: el.id + `-cell-${r}-${c}`,
                });
              }
            }
          }
        }
        return labels;
      };

      const renderPreview = () => {
        const width = currentNode.attrs.previewWidth || 400;
        const height = Math.round(width * 0.6);
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // Size the container to match the canvas so label overlays
        // (position: absolute) align with canvas coordinates.
        // Without this, flex centering offsets the canvas from the container
        // origin, causing labels to drift when the wrapper is wider.
        canvasContainer.style.width = `${width}px`;

        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        const data: TikzFigure = currentNode.attrs.tikzData || createDefaultFigure();
        const coords = new CoordinateSystem(data.viewport, width, height);
        const renderer = new Renderer(ctx, coords);
        renderer.skipLabelText = true;
        renderer.render(data, new Set(), null);

        const labels = collectLabels(data);
        updateLabelOverlays(canvasContainer, labels, (x, y) => coords.toCanvas(x, y));
      };

      renderPreview();

      // Re-render when browser zoom changes (DPR change causes canvas blur)
      const observer = new ResizeObserver(() => renderPreview());
      observer.observe(canvasContainer);

      // Resize handle (bottom-right corner)
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'figure-resize-handle';
      canvasContainer.appendChild(resizeHandle);

      let resizing = false;
      let startX = 0;
      let startW = 0;

      const onResizeMove = (e: MouseEvent) => {
        if (!resizing) return;
        const newW = Math.max(150, Math.min(800, startW + (e.clientX - startX)));
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos != null) {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              previewWidth: newW,
            }),
          );
        }
      };

      const onResizeUp = () => {
        resizing = false;
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeUp);
      };

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startW = currentNode.attrs.previewWidth || 400;
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
      });

      // Caption
      const captionEl = document.createElement('div');
      captionEl.className = 'figure-caption';
      captionEl.textContent = currentNode.attrs.caption || 'Figure (double-click to edit)';
      dom.appendChild(captionEl);

      // Double-click to open editor (but not on resize handle)
      dom.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).classList.contains('figure-resize-handle')) return;
        const data: TikzFigure = currentNode.attrs.tikzData || createDefaultFigure();
        const event = new CustomEvent('mathflow:open-figure-editor', {
          detail: {
            figureData: JSON.parse(JSON.stringify(data)),
            pos: typeof getPos === 'function' ? getPos() : 0,
          },
          bubbles: true,
        });
        dom.dispatchEvent(event);
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          renderPreview();
          captionEl.textContent = updatedNode.attrs.caption || 'Figure (double-click to edit)';
          return true;
        },
        destroy: () => {
          observer.disconnect();
          document.removeEventListener('mousemove', onResizeMove);
          document.removeEventListener('mouseup', onResizeUp);
        },
      };
    };
  },

  addCommands() {
    return {
      insertFigure: (data?: TikzFigure) => ({ commands }) => {
        const figureData = data || createDefaultFigure();
        return commands.insertContent({
          type: 'figure',
          attrs: {
            figureId: figureData.id || crypto.randomUUID(),
            tikzData: figureData,
            caption: '',
          },
        });
      },
    };
  },
});
