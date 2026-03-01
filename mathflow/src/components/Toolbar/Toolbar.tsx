import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/core';
import './Toolbar.css';

interface ToolbarProps {
  editor: Editor;
  onExportLatex: () => void;
  onExportPdf: () => void;
}

export function Toolbar({ editor, onExportLatex, onExportPdf }: ToolbarProps) {
  // Force re-render when editor state changes (selection, formatting, etc.)
  const [, setUpdateCounter] = useState(0);
  useEffect(() => {
    const handler = () => setUpdateCounter((n) => n + 1);
    editor.on('transaction', handler);
    return () => {
      editor.off('transaction', handler);
    };
  }, [editor]);
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <select
          className="toolbar-select"
          value={
            editor.isActive('heading', { level: 1 })
              ? '1'
              : editor.isActive('heading', { level: 2 })
                ? '2'
                : editor.isActive('heading', { level: 3 })
                  ? '3'
                  : '0'
          }
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            }
          }}
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().insertMathInline('').run()}
          title="Insert inline math ($)"
        >
          <span className="toolbar-icon">∑</span>
          <span className="toolbar-label">Inline</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().insertMathDisplay('').run()}
          title="Insert display math ($$)"
        >
          <span className="toolbar-icon">∫</span>
          <span className="toolbar-label">Display</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          &#8226; List
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          1. List
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          &ldquo; Quote
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <select
          className="toolbar-select"
          value=""
          onChange={(e) => {
            const envType = e.target.value;
            if (envType) {
              editor.chain().focus().insertTheoremEnv(envType).run();
            }
            e.target.value = '';
          }}
        >
          <option value="">+ Environment</option>
          <option value="theorem">Theorem</option>
          <option value="lemma">Lemma</option>
          <option value="proposition">Proposition</option>
          <option value="corollary">Corollary</option>
          <option value="definition">Definition</option>
          <option value="proof">Proof</option>
          <option value="remark">Remark</option>
          <option value="example">Example</option>
        </select>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn toolbar-btn-tikz"
          onClick={() => editor.chain().focus().insertTikZGraphics().run()}
          title="Insert TikZ diagram"
        >
          <span className="toolbar-icon">&#9651;</span>
          <span className="toolbar-label">TikZ</span>
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn toolbar-btn-ai"
          onClick={() => {
            editor.commands.openAIPopup();
          }}
          title="AI Assistant (Ctrl+K)"
        >
          AI
        </button>
        <button
          className="toolbar-btn toolbar-btn-export"
          onClick={onExportLatex}
          title="Export as LaTeX"
        >
          Export .tex
        </button>
        <button
          className="toolbar-btn toolbar-btn-export"
          onClick={onExportPdf}
          title="Export as PDF"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
