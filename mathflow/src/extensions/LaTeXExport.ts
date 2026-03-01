import { JSONContent } from '@tiptap/core';

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
      return `${cmd}{${getTextContent(node)}}\n\n`;
    }

    case 'mathDisplay':
      return `\\[\n${node.attrs?.latex || ''}\n\\]\n\n`;

    case 'tikzGraphics': {
      const tikzCode = node.attrs?.tikzCode || '';
      if (!tikzCode.trim()) return '';
      return `${tikzCode}\n\n`;
    }

    case 'theoremEnv': {
      const envType = node.attrs?.envType || 'theorem';
      const envName = THEOREM_ENV_MAP[envType] || 'theorem';
      let content = '';
      if (node.content) {
        content = node.content.map((child) => renderNode(child)).join('');
      }
      return `\\begin{${envName}}\n${content}\\end{${envName}}\n\n`;
    }

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

    case 'mathInline':
      return `$${node.attrs?.latex || ''}$`;

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
