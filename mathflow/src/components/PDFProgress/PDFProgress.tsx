import './PDFProgress.css';

export type PDFProgressState =
  | { kind: 'progress'; stage: string; detail?: string }
  | { kind: 'error'; message: string; log?: string }
  | { kind: 'bridge-offline' }
  | { kind: 'bridge-no-engine'; engine: string }
  | { kind: 'done' };

interface Props {
  state: PDFProgressState | null;
  onClose: () => void;
  onFallback?: () => void;
  /** Opens the BridgeSetup modal. Shown in the bridge-offline error branch. */
  onOpenBridgeSetup?: () => void;
}

export function PDFProgress({ state, onClose, onFallback, onOpenBridgeSetup }: Props) {
  if (!state) return null;

  return (
    <div className="pdf-progress-overlay" onClick={state.kind === 'progress' ? undefined : onClose}>
      <div className="pdf-progress-modal" onClick={(e) => e.stopPropagation()}>
        {state.kind === 'progress' && (
          <>
            <h3>Exporting to PDF</h3>
            <div className="pdf-progress-spinner" />
            <div className="pdf-progress-stage">{state.detail || state.stage}</div>
            <p className="pdf-progress-hint">
              Compiled on your own machine via local TeX Live. Typical math notes ~5–10&nbsp;s
              (same as Overleaf for the same doc). First compile on Windows with MiKTeX can
              take a few minutes while it downloads missing packages on demand.
            </p>
          </>
        )}

        {state.kind === 'bridge-offline' && (
          <>
            <h3>Local LaTeX not running</h3>
            <p className="pdf-progress-error-msg">
              MathFlow couldn't reach the <strong>MathFlow Bridge</strong> at
              <code> http://127.0.0.1:5555</code>.
              The bridge compiles PDFs with the LaTeX install on your own machine.
            </p>
            <ul className="pdf-progress-bullets">
              <li>If you haven't set it up yet — takes about a minute.</li>
              <li>If you have it set up, make sure the terminal window is still open.</li>
            </ul>
            <div className="pdf-progress-buttons">
              {onFallback && (
                <button className="pdf-progress-btn" onClick={onFallback}>
                  Use simple PDF instead
                </button>
              )}
              {onOpenBridgeSetup && (
                <button className="pdf-progress-btn pdf-progress-btn-primary" onClick={onOpenBridgeSetup}>
                  Set up Local LaTeX
                </button>
              )}
            </div>
          </>
        )}

        {state.kind === 'bridge-no-engine' && (
          <>
            <h3>LaTeX not installed</h3>
            <p className="pdf-progress-error-msg">
              The bridge is running, but <code>{state.engine}</code> isn't on this machine's
              <code> PATH</code>. We need a working TeX Live (macOS / Linux) or MiKTeX
              (Windows) install before we can compile PDFs locally.
            </p>
            <div className="pdf-progress-buttons">
              {onFallback && (
                <button className="pdf-progress-btn" onClick={onFallback}>
                  Use simple PDF instead
                </button>
              )}
              {onOpenBridgeSetup && (
                <button className="pdf-progress-btn pdf-progress-btn-primary" onClick={onOpenBridgeSetup}>
                  Show install instructions
                </button>
              )}
            </div>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <h3 className="pdf-progress-error-title">Export failed</h3>
            <p className="pdf-progress-error-msg">{state.message}</p>
            {state.log && (
              <details className="pdf-progress-log">
                <summary>Compile log</summary>
                <pre>{state.log}</pre>
              </details>
            )}
            <div className="pdf-progress-buttons">
              {onFallback && (
                <button className="pdf-progress-btn" onClick={onFallback}>
                  Use simple PDF instead
                </button>
              )}
              <button className="pdf-progress-btn pdf-progress-btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
