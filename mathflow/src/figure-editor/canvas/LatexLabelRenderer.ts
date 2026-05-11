import katex from 'katex';

/**
 * Manages KaTeX-rendered label overlays positioned on top of the canvas.
 * Labels are DOM elements absolutely positioned within a container div.
 */

export interface LabelOverlay {
  /** Math position [x, y] */
  at: [number, number];
  /** Raw label text (may include $ delimiters) */
  label: string;
  /** Color name */
  color: string;
  /** Anchor direction (affects offset) */
  anchor: string;
  /** Element ID this label belongs to */
  elementId: string;
}

/**
 * Update label overlay DOM elements within the container.
 * Call this after each canvas render.
 *
 * @param container The parent div that wraps the canvas (position: relative)
 * @param labels Array of labels to render
 * @param toCanvas Function to convert math coords → pixel coords
 */
export function updateLabelOverlays(
  container: HTMLDivElement,
  labels: LabelOverlay[],
  toCanvas: (x: number, y: number) => [number, number],
) {
  // Get or create the overlay container
  let overlayDiv = container.querySelector('.tikz-label-overlays') as HTMLDivElement | null;
  if (!overlayDiv) {
    overlayDiv = document.createElement('div');
    overlayDiv.className = 'tikz-label-overlays';
    overlayDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    container.appendChild(overlayDiv);
  }

  // Build a map of existing label elements by ID for reuse
  const existingMap = new Map<string, HTMLDivElement>();
  const existingChildren = overlayDiv.querySelectorAll<HTMLDivElement>('[data-label-id]');
  for (const child of existingChildren) {
    existingMap.set(child.getAttribute('data-label-id')!, child);
  }

  const usedIds = new Set<string>();

  for (const labelInfo of labels) {
    const { at, label, color, anchor, elementId } = labelInfo;
    usedIds.add(elementId);

    const [px, py] = toCanvas(at[0], at[1]);

    // Strip $ delimiters for KaTeX
    let cleanLatex = label;
    if (cleanLatex.startsWith('$') && cleanLatex.endsWith('$')) {
      cleanLatex = cleanLatex.slice(1, -1);
    }

    // Normalize common text shortcuts to LaTeX commands
    // (the label input has no snippet engine, so users may type these literally)
    cleanLatex = normalizeMathShortcuts(cleanLatex);

    // Reuse or create element
    let el = existingMap.get(elementId);
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('data-label-id', elementId);
      el.style.cssText = 'position:absolute;white-space:nowrap;pointer-events:none;';
      overlayDiv.appendChild(el);
    }

    // Check if content changed
    const prevLatex = el.getAttribute('data-latex');
    const prevColor = el.getAttribute('data-color');
    if (prevLatex !== cleanLatex || prevColor !== color) {
      try {
        katex.render(cleanLatex, el, {
          throwOnError: false,
          displayMode: false,
          output: 'html',
        });
      } catch {
        el.textContent = cleanLatex;
      }
      el.setAttribute('data-latex', cleanLatex);
      el.setAttribute('data-color', color);
      el.style.color = color;
    }

    // Position — compute offset based on anchor
    let offsetX = 0, offsetY = 0;
    const w = el.offsetWidth || 0;
    const h = el.offsetHeight || 0;

    if (anchor.includes('above')) {
      offsetY = -(h + 4);
    } else if (anchor.includes('below')) {
      offsetY = 4;
    } else {
      offsetY = -h / 2;
    }

    if (anchor.includes('left')) {
      offsetX = -(w + 4);
    } else if (anchor.includes('right')) {
      offsetX = 4;
    } else {
      offsetX = -w / 2;
    }

    el.style.left = `${px + offsetX}px`;
    el.style.top = `${py + offsetY}px`;
    el.style.fontSize = '14px';
  }

  // Remove stale labels
  for (const [id, el] of existingMap) {
    if (!usedIds.has(id)) {
      el.remove();
    }
  }
}

/**
 * Normalize common text shortcuts to LaTeX commands.
 * Users may type >=, <=, != etc. in the label input which has no snippet engine.
 * These need to be converted to proper LaTeX commands for KaTeX to render correctly.
 */
function normalizeMathShortcuts(latex: string): string {
  // Only replace outside of existing LaTeX commands (don't touch \geq, \leq, etc.)
  // Use negative lookbehind to avoid replacing inside existing commands
  return latex
    .replace(/(?<!\\[a-zA-Z]*)>=/g, '\\geq ')
    .replace(/(?<!\\[a-zA-Z]*)<=/g, '\\leq ')
    .replace(/(?<!\\[a-zA-Z]*)!=/g, '\\neq ')
    .replace(/(?<!\\[a-zA-Z]*):=/g, '\\coloneqq ')
    .replace(/(?<!\\[a-zA-Z]*)~=/g, '\\approx ')
    .replace(/(?<!\\[a-zA-Z]*)<<(?!=)/g, '\\ll ')
    .replace(/(?<!\\[a-zA-Z]*)>>(?!=)/g, '\\gg ')
    .replace(/(?<!\\[a-zA-Z]*)<->/g, '\\leftrightarrow ')
    .replace(/(?<!\\[a-zA-Z]*)-->/g, '\\longrightarrow ')
    .replace(/(?<!\\[a-zA-Z]*)->/g, '\\to ')
    .replace(/(?<!\\[a-zA-Z]*)<-(?!>)/g, '\\leftarrow ');
}

/** Remove all label overlays from the container */
export function clearLabelOverlays(container: HTMLDivElement) {
  const overlayDiv = container.querySelector('.tikz-label-overlays');
  if (overlayDiv) overlayDiv.remove();
}
