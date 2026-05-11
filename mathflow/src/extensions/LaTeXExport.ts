import { JSONContent } from '@tiptap/core';
import { serializeTikzFigure } from '../figure-editor/model/TikzSerializer';

const THEOREM_ENV_MAP: Record<string, string> = {
  theorem: 'theorem',
  lemma: 'lemma',
  proposition: 'proposition',
  corollary: 'corollary',
  definition: 'definition',
  example: 'example',
  remark: 'remark',
  proof: 'proof',
};

const HEADING_CMDS = [
  '\\section',
  '\\subsection',
  '\\subsubsection',
  '\\paragraph',
  '\\subparagraph',
];

const HEADING_TOC_TYPES = [
  'section',
  'subsection',
  'subsubsection',
  'paragraph',
  'subparagraph',
];

export function exportToLaTeX(doc: JSONContent, customPreamble = ''): string {
  let output = '';

  // Preamble
  output += '\\documentclass[12pt]{article}\n';
  output += '\\usepackage[utf8]{inputenc}\n';
  output += '\\usepackage[T1]{fontenc}\n';
  output += '\\usepackage{amsmath, amssymb, amsthm}\n';
  output += '\\usepackage{mathtools}\n';
  output += '\\usepackage{enumerate}\n';
  output += '\\usepackage{hyperref}\n';
  output += '\\hypersetup{colorlinks=true,linkcolor=red,citecolor=blue,urlcolor=blue}\n';
  output += '\\usepackage{geometry}\n';
  output += '\\usepackage{tikz}\n';
  output += '\\usetikzlibrary{arrows.meta,calc,positioning,decorations.markings,cd}\n';
  output += '\\geometry{margin=1in}\n\n';

  // Theorem-like environments
  output += '\\newtheorem{theorem}{Theorem}[section]\n';
  output += '\\newtheorem{lemma}[theorem]{Lemma}\n';
  output += '\\newtheorem{proposition}[theorem]{Proposition}\n';
  output += '\\newtheorem{corollary}[theorem]{Corollary}\n';
  output += '\\theoremstyle{definition}\n';
  output += '\\newtheorem{definition}[theorem]{Definition}\n';
  output += '\\newtheorem{example}[theorem]{Example}\n';
  output += '\\theoremstyle{remark}\n';
  output += '\\newtheorem{remark}[theorem]{Remark}\n\n';

  if (customPreamble.trim()) {
    output += '% Custom preamble\n';
    output += customPreamble + '\n\n';
  }

  output += '\\begin{document}\n\n';

  if (doc.content) {
    for (const node of doc.content) {
      output += renderNode(node);
    }
  }

  output += '\n\\end{document}\n';
  return output;
}

function renderNode(node: JSONContent): string {
  switch (node.type) {
    case 'paragraph':
      return renderParagraph(node) + '\n\n';

    case 'heading': {
      const level = Math.min((node.attrs?.level || 1) - 1, HEADING_CMDS.length - 1);
      const cmd = HEADING_CMDS[level];
      const tocType = HEADING_TOC_TYPES[level];
      const title = getTextContent(node);
      // Starred section (no auto-numbering, since user may type their own number)
      // + phantomsection + addcontentsline so hyperref creates a clickable TOC entry
      return `\\phantomsection\n\\addcontentsline{toc}{${tocType}}{${title}}\n${cmd}*{${title}}\n\n`;
    }

    case 'tableOfContents':
      return '\\tableofcontents\n\\bigskip\n\n';

    case 'mathDisplay': {
      // Strip leading/trailing whitespace and collapse internal blank lines.
      // A blank line inside `\[ ... \]` is a fatal error in pdfTeX ("Missing $
      // inserted") because TeX treats the empty line as an implicit \par which
      // closes the current group. Users often hit Enter at the end of the
      // formula in the textarea, leaving a trailing \n in the stored latex.
      const raw = (node.attrs?.latex || '').replace(/\n[ \t]*\n+/g, '\n').trim();
      if (!raw) return '';
      const eqNumber = node.attrs?.eqNumber;
      if (eqNumber) {
        return `\\begin{equation*}\n${raw} \\tag{${eqNumber}}\n\\end{equation*}\n\n`;
      }
      return `\\[\n${raw}\n\\]\n\n`;
    }

    case 'tikzGraphics': {
      const tikzCode = node.attrs?.tikzCode || '';
      if (!tikzCode.trim()) return '';
      return `${tikzCode}\n\n`;
    }

    case 'figure': {
      const tikzData = node.attrs?.tikzData;
      if (!tikzData) return '';
      const code = serializeTikzFigure(tikzData);
      const caption = node.attrs?.caption;
      if (caption) {
        return `\\begin{figure}[h]\n\\centering\n${code}\n\\caption{${escapeLatex(caption)}}\n\\end{figure}\n\n`;
      }
      return `${code}\n\n`;
    }

    case 'theoremEnv': {
      const envType = node.attrs?.envType || 'theorem';
      const envName = THEOREM_ENV_MAP[envType] || 'theorem';
      const label = node.attrs?.label;

      let titleArg = '';
      let bodyContent = '';
      if (node.content) {
        const children = node.content;
        const first = children[0];
        const rest = first?.type === 'theoremTitle' ? children.slice(1) : children;
        if (first?.type === 'theoremTitle') {
          const titleInline = renderParagraph({ ...first, type: 'paragraph' });
          if (titleInline.trim()) {
            titleArg = `[${titleInline}]`;
          }
        }
        bodyContent = rest.map((child) => renderNode(child)).join('');
      }

      const labelLine = label ? `\\label{${label}}\n` : '';
      return `\\begin{${envName}}${titleArg}\n${labelLine}${bodyContent}\\end{${envName}}\n\n`;
    }

    case 'theoremTitle':
      // When encountered as a standalone child (shouldn't happen — handled above
      // when its parent theoremEnv processes content). Render inline content if so.
      return renderParagraph({ ...node, type: 'paragraph' });

    case 'bulletList':
      return `\\begin{itemize}\n${renderChildren(node)}\\end{itemize}\n\n`;

    case 'orderedList':
      return `\\begin{enumerate}\n${renderChildren(node)}\\end{enumerate}\n\n`;

    case 'listItem':
      return `\\item ${renderChildren(node).trim()}\n`;

    case 'blockquote':
      return `\\begin{quote}\n${renderChildren(node)}\\end{quote}\n\n`;

    case 'codeBlock': {
      const content = getTextContent(node);
      return `\\begin{verbatim}\n${content}\n\\end{verbatim}\n\n`;
    }

    case 'horizontalRule':
      return '\\noindent\\rule{\\textwidth}{0.4pt}\n\n';

    default:
      if (node.content) {
        return renderChildren(node);
      }
      return '';
  }
}

function renderParagraph(node: JSONContent): string {
  if (!node.content) return '';
  return node.content.map((child) => renderInline(child)).join('');
}

function renderInline(node: JSONContent): string {
  switch (node.type) {
    case 'text': {
      let text = escapeLatex(node.text || '');

      // Apply marks
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              text = `\\textbf{${text}}`;
              break;
            case 'italic':
              text = `\\textit{${text}}`;
              break;
            case 'underline':
              text = `\\underline{${text}}`;
              break;
            case 'code':
              text = `\\texttt{${text}}`;
              break;
          }
        }
      }

      return text;
    }

    case 'mathInline': {
      // Same trim — also kills `$ ... $` artifacts like `$x_1 $` (extra space
      // inside math closes via spurious \n in stored latex on some keystrokes).
      const raw = (node.attrs?.latex || '').replace(/\s+/g, ' ').trim();
      if (!raw) return '';
      return `$${raw}$`;
    }

    case 'envRef': {
      const label = node.attrs?.label;
      if (!label) return '';
      return `\\ref{${label}}`;
    }

    default:
      return node.text || '';
  }
}

function renderChildren(node: JSONContent): string {
  if (!node.content) return '';
  return node.content.map((child) => renderNode(child)).join('');
}

function getTextContent(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map((child) => getTextContent(child)).join('');
}

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (ch) => `\\${ch}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export function downloadLaTeX(doc: JSONContent, filename = 'notes.tex', customPreamble = '') {
  const latex = exportToLaTeX(doc, customPreamble);
  const blob = new Blob([latex], { type: 'application/x-tex' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
