/**
 * PDF Export — sends editor HTML to server-side Puppeteer for high-quality PDF generation.
 * Falls back to browser print dialog if the server is unavailable.
 */
import { exportApi } from '../lib/api';

/**
 * Prepare editor HTML for PDF export by cleaning up editing artifacts.
 */
function prepareHTML(editorElement: HTMLElement): string {
  const clone = editorElement.cloneNode(true) as HTMLElement;

  // Remove editing UI artifacts
  clone.querySelectorAll('.ProseMirror-focused').forEach((el) => {
    el.classList.remove('ProseMirror-focused');
  });

  // Remove explain buttons, number buttons, editing overlays
  clone.querySelectorAll(
    '.math-explain-btn, .math-explain-btn-inline, .math-number-btn, ' +
    '.math-inline-editor, .math-display-editor-wrapper, .math-display-preview, ' +
    '.math-edit-overlay, .math-placeholder, .eq-number-popup, .theorem-number-popup, ' +
    '.tikz-graphics-header, .tikz-graphics-editor-wrapper, .tikz-graphics-actions, ' +
    '.tikz-graphics-placeholder, .tikz-graphics-loading, .tikz-graphics-error, ' +
    '.tikz-ai-input-wrapper, .save-indicator, .collab-presence-bar, ' +
    '.collaboration-cursor__caret, .collaboration-cursor__label, ' +
    '.editor-loading-overlay, .ProseMirror-gapcursor'
  ).forEach((el) => el.remove());

  // Ensure inline math renders are visible (not hidden by editing state)
  clone.querySelectorAll('.math-inline-render').forEach((el) => {
    (el as HTMLElement).style.display = 'inline';
  });

  // Ensure display math renders are visible
  clone.querySelectorAll('.math-display-render').forEach((el) => {
    (el as HTMLElement).style.display = '';
  });

  // Remove editing class from math nodes
  clone.querySelectorAll('.math-inline-node.editing, .math-display-node.editing').forEach((el) => {
    el.classList.remove('editing');
  });

  return clone.innerHTML;
}

/**
 * Export editor content to PDF via server-side Puppeteer rendering.
 * Falls back to browser print dialog if server is unavailable.
 */
export async function exportToPDF(
  editorElement: HTMLElement,
  title = 'MathFlow Notes'
): Promise<void> {
  const html = prepareHTML(editorElement);

  try {
    const blob = await exportApi.pdf(html, title);

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'MathFlow Notes'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    // If server is unavailable, fall back to browser print
    console.warn('Server PDF export failed, falling back to browser print:', err.message);
    fallbackBrowserPrint(editorElement, title);
  }
}

/**
 * Fallback: open a print-optimized window using the browser's built-in print dialog.
 * Used when the server-side Puppeteer endpoint is unavailable.
 */
function fallbackBrowserPrint(editorElement: HTMLElement, title: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF.');
    return;
  }

  // Collect all stylesheets from the current page (includes KaTeX CSS)
  const stylesheets: string[] = [];
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.href) {
        stylesheets.push(`<link rel="stylesheet" href="${sheet.href}" />`);
      } else if (sheet.cssRules) {
        let css = '';
        for (const rule of sheet.cssRules) {
          css += rule.cssText + '\n';
        }
        stylesheets.push(`<style>${css}</style>`);
      }
    } catch {
      if (sheet.href) {
        stylesheets.push(`<link rel="stylesheet" href="${sheet.href}" />`);
      }
    }
  }

  const contentClone = editorElement.cloneNode(true) as HTMLElement;
  contentClone.querySelectorAll('.ProseMirror-focused').forEach((el) => {
    el.classList.remove('ProseMirror-focused');
  });

  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapedTitle}</title>
  ${stylesheets.join('\n  ')}
  <style>
    @media print {
      @page { margin: 1in; size: letter; }
    }
    body {
      font-family: 'Computer Modern', 'Latin Modern', 'Georgia', 'Times New Roman', serif;
      font-size: 12pt; line-height: 1.6; color: #000; background: #fff;
      max-width: 7in; margin: 0 auto; padding: 40px;
    }
    .ProseMirror { outline: none !important; border: none !important; padding: 0 !important; min-height: auto !important; }
    .ProseMirror p.is-editor-empty::before { display: none !important; }
    .math-node { cursor: default !important; }
    .math-node .math-editor, .math-node textarea, .math-node .math-edit-overlay { display: none !important; }
    .math-node .math-render { display: inline !important; }
    .theorem-env { margin: 1em 0; padding: 0.5em 0; break-inside: avoid; }
    .theorem-env-header { font-weight: bold; font-style: italic; }
    h1 { font-size: 24pt; margin-top: 1.5em; margin-bottom: 0.5em; }
    h2 { font-size: 18pt; margin-top: 1.2em; margin-bottom: 0.4em; }
    h3 { font-size: 14pt; margin-top: 1em; margin-bottom: 0.3em; }
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    li { margin-bottom: 0.25em; }
    blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #333; }
    code { font-family: 'Courier New', monospace; font-size: 0.9em; background: #f5f5f5; padding: 1px 4px; border-radius: 2px; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
    .toolbar, .sidebar, .snippet-panel, .settings-overlay,
    .ai-popup, .header-btn, .main-header,
    .math-explain-btn, .math-explain-btn-inline,
    .math-number-btn { display: none !important; }
    .katex-display { text-align: center; margin: 1em 0; }
  </style>
</head>
<body>
  ${contentClone.innerHTML}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
