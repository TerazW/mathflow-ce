import { useState, useRef, useEffect, useCallback } from 'react';
import { loadAISettings } from '../../lib/ai-settings';
import './FormulaExplain.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface FormulaExplainProps {
  latex: string;
  position: { top: number; left: number };
  onClose: () => void;
}

type ExplainState = 'idle' | 'loading' | 'done' | 'error';

export function FormulaExplain({ latex, position, onClose }: FormulaExplainProps) {
  const [state, setState] = useState<ExplainState>('idle');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const explain = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const settings = loadAISettings();
      if (!settings?.apiKey) {
        throw new Error('Configure your API key in Settings first.');
      }
      const response = await fetch(`${API_BASE}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: latex,
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Explanation failed');
      }
      setExplanation(data.explanation || 'No explanation generated.');
      setState('done');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  }, [latex]);

  // Auto-explain on mount
  useEffect(() => {
    explain();
  }, [explain]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="formula-explain"
      style={{
        position: 'fixed',
        top: Math.min(position.top + 8, window.innerHeight - 200),
        left: Math.min(position.left, window.innerWidth - 340),
      }}
    >
      <div className="formula-explain-header">
        <span className="formula-explain-icon">?</span>
        <span className="formula-explain-title">Formula Explanation</span>
        <button className="formula-explain-close" onClick={onClose}>&times;</button>
      </div>
      <div className="formula-explain-latex">
        <code>{latex}</code>
      </div>
      <div className="formula-explain-body">
        {state === 'loading' && (
          <div className="formula-explain-loading">
            <div className="formula-explain-spinner" />
            Explaining...
          </div>
        )}
        {state === 'done' && (
          <div className="formula-explain-text">{explanation}</div>
        )}
        {state === 'error' && (
          <div className="formula-explain-error">
            {error}
            <button className="formula-explain-retry" onClick={explain}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}
