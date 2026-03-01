/**
 * PDF Export — renders editor content in a print-optimized window.
 * Uses the browser's built-in print dialog (Save as PDF option).
 */
export function exportToPDF(editorElement: HTMLElement, title = 'MathFlow Notes') {
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
      // Cross-origin stylesheet, skip
      if (sheet.href) {
        stylesheets.push(`<link rel="stylesheet" href="${sheet.href}" />`);
      }
    }
  }

  // Clone editor content
  const contentClone = editorElement.cloneNode(true) as HTMLElement;

  // Remove any editing UI artifacts (cursors, selections, etc.)
  contentClone.querySelectorAll('.ProseMirror-focused').forEach((el) => {
    el.classList.remove('ProseMirror-focused');
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</title>
  ${stylesheets.join('\n  ')}
  <style>
    @media print {
      @page {
        margin: 1in;
        size: letter;
      }
    }

    body {
      font-family: 'Computer Modern', 'Latin Modern', 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
      max-width: 7in;
      margin: 0 auto;
      padding: 40px;
    }

    /* Clean up editor-specific styles for print */
    .ProseMirror {
      outline: none !important;
      border: none !important;
      padding: 0 !important;
      min-height: auto !important;
    }

    .ProseMirror p.is-editor-empty::before {
      display: none !important;
    }

    /* Math nodes — show rendered, hide editor UI */
    .math-node {
      cursor: default !important;
    }

    .math-node .math-editor,
    .math-node textarea,
    .math-node .math-edit-overlay {
      display: none !important;
    }

    .math-node .math-render {
      display: inline !important;
    }

    /* Theorem environments */
    .theorem-env {
      margin: 1em 0;
      padding: 0.5em 0;
      break-inside: avoid;
    }

    .theorem-env-header {
      font-weight: bold;
      font-style: italic;
    }

    /* Headings */
    h1 { font-size: 24pt; margin-top: 1.5em; margin-bottom: 0.5em; }
    h2 { font-size: 18pt; margin-top: 1.2em; margin-bottom: 0.4em; }
    h3 { font-size: 14pt; margin-top: 1em; margin-bottom: 0.3em; }

    /* Lists */
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    li { margin-bottom: 0.25em; }

    /* Blockquotes */
    blockquote {
      margin: 1em 0;
      padding-left: 1em;
      border-left: 3px solid #333;
    }

    /* Code */
    code {
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      background: #f5f5f5;
      padding: 1px 4px;
      border-radius: 2px;
    }

    pre {
      background: #f5f5f5;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
    }

    /* Hide non-print elements */
    .toolbar, .sidebar, .snippet-panel, .settings-overlay,
    .ai-popup, .header-btn, .main-header {
      display: none !important;
    }

    /* KaTeX display math centering */
    .katex-display {
      text-align: center;
      margin: 1em 0;
    }
  </style>
</head>
<body>
  ${contentClone.innerHTML}
  <script>
    // Auto-trigger print dialog after content loads
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
