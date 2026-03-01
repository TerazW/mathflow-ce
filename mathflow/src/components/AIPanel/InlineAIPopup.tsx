import { useState, useRef, useEffect, useCallback } from 'react';
import katex from 'katex';
import { loadAISettings } from '../../lib/ai-settings';
import './InlineAIPopup.css';

interface InlineAIPopupProps {
  position: { top: number; left: number };
  onInsert: (latex: string) => void;
  onClose: () => void;
  context?: string;
}

type PopupState = 'input' | 'loading' | 'preview' | 'error';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function InlineAIPopup({ position, onInsert, onClose, context }: InlineAIPopupProps) {
  const [state, setState] = useState<PopupState>('input');
  const [description, setDescription] = useState('');
  const [latexCode, setLatexCode] = useState('');
  const [renderedHTML, setRenderedHTML] = useState('');
  const [error, setError] = useState('');
  const [editingSource, setEditingSource] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!latexCode) {
      setRenderedHTML('');
      return;
    }
    try {
      const html = katex.renderToString(latexCode, {
        throwOnError: false,
        displayMode: latexCode.includes('\\begin'),
      });
      setRenderedHTML(html);
    } catch {
      setRenderedHTML('<span style="color:#e03131">Render error</span>');
    }
  }, [latexCode]);

  const generateLatex = useCallback(async () => {
    if (!description.trim()) return;

    setState('loading');
    setError('');

    try {
      const settings = loadAISettings();
      if (!settings?.apiKey) {
        throw new Error('Please configure your API Key in settings first (click the gear icon)');
      }

      const response = await fetch(`${API_BASE}/api/ai/generate-latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: description,
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          context,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setLatexCode(data.latex);
      setState('preview');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  }, [description, context]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (state === 'input') {
          generateLatex();
        } else if (state === 'preview') {
          onInsert(latexCode);
          onClose();
        } else if (state === 'error') {
          setState('input');
        }
      }
      if (e.key === 'Tab' && state === 'preview') {
        e.preventDefault();
        setEditingSource(true);
        setTimeout(() => sourceRef.current?.focus(), 0);
      }
    },
    [state, latexCode, generateLatex, onInsert, onClose]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="ai-popup"
      style={{
        position: 'fixed',
        top: Math.min(position.top + 28, window.innerHeight - 300),
        left: Math.min(position.left, window.innerWidth - 420),
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="ai-popup-header">
        <span className="ai-popup-icon">AI</span>
        <span className="ai-popup-title">LaTeX Assistant</span>
        <button className="ai-popup-close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="ai-popup-input">
        <input
          ref={inputRef}
          type="text"
          placeholder="Describe the math you want..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={state === 'loading'}
        />
      </div>

      {state === 'loading' && (
        <div className="ai-popup-loading">
          <div className="ai-popup-spinner" />
          Generating...
        </div>
      )}

      {state === 'error' && (
        <div className="ai-popup-error">
          {error}
          <br />
          <small>Press Enter to retry, Esc to cancel</small>
        </div>
      )}

      {state === 'preview' && (
        <>
          <div className="ai-popup-source">
            {editingSource ? (
              <textarea
                ref={sourceRef}
                value={latexCode}
                onChange={(e) => setLatexCode(e.target.value)}
                rows={3}
              />
            ) : (
              <code onClick={() => setEditingSource(true)}>{latexCode}</code>
            )}
          </div>

          <div
            className="ai-popup-preview"
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />

          <div className="ai-popup-actions">
            <small>Enter to insert &middot; Esc to cancel &middot; Tab to edit source</small>
          </div>
        </>
      )}
    </div>
  );
}
