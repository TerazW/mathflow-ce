/**
 * BridgeSetup — onboarding modal for installing and running mathflow-bridge.
 *
 * Shows:
 *   - Why this exists (real LaTeX quality, zero cost, runs locally)
 *   - Per-OS install instructions (Mac / Linux / Windows) with copy-buttons
 *   - Live status badge that polls the bridge in the background
 *   - Once detected: shows the engine list and a "Done — try Export PDF" CTA
 *
 * Reachable both as the dialog on a failed export and from Settings → Local
 * LaTeX so the user can set it up before they ever click Export.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BRIDGE_BASE_URL,
  BridgeStatus,
  bridgeReadiness,
  detectBridge,
  subscribeBridgeStatus,
} from '../../lib/bridge';
import './BridgeSetup.css';

type OS = 'macos' | 'linux' | 'windows';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when the bridge transitions to online while the modal is open. */
  onConnected?: () => void;
}

function detectInitialOS(): OS {
  if (typeof navigator === 'undefined') return 'macos';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  return 'linux';
}

/**
 * Shared MiKTeX-on-Windows tip — appears in three places so the user sees it
 * before, during, and after setup. Calls out the two ways to open MiKTeX
 * Console because users discover it via the tray icon as often as the Start
 * menu, and the tray icon's "Restore" step is non-obvious.
 */
function MiktexAutoInstallTip({ compact }: { compact?: boolean } = {}) {
  return (
    <div className="bridge-miktex-tip" style={compact ? { marginTop: 12 } : undefined}>
      <strong>MiKTeX users — do this now, save yourself 50 clicks later:</strong>
      <p>
        By default MiKTeX pops up an <em>"Install missing package?"</em> dialog every time
        pdflatex hits a missing package. Your first compile will need ~10–20 packages and
        60&nbsp;s+ of clicking.
      </p>
      <ol>
        <li>
          Open the <strong>MiKTeX Console</strong> window. Two ways:
          <ul>
            <li>
              <strong>Start menu</strong> → type <code>MiKTeX Console</code> → Enter
            </li>
            <li>
              Or: right-click the <strong>MiKTeX tray icon</strong> (bottom-right of taskbar,
              looks like <code>TeX</code>) → click <strong>Restore</strong>. <em>"Restore"
              just means "show the window again"</em> — MiKTeX runs in the background and the
              tray icon is its launcher. There's no "Settings" item directly in the tray menu.
            </li>
          </ul>
        </li>
        <li>In the Console window, click <strong>Settings</strong> in the left sidebar.</li>
        <li>
          Find the dropdown labelled{' '}
          <em>"You can choose whether missing packages are to be installed automatically"</em>.
        </li>
        <li>
          Set it to <strong>"Always"</strong> (or <strong>"Yes"</strong>, depending on MiKTeX
          version).
        </li>
        <li>Close the Console window — MiKTeX keeps running in the tray.</li>
      </ol>
      <p className="bridge-step-hint" style={{ marginTop: 8 }}>
        After this, the first compile still takes 1–3&nbsp;min while packages download in the
        background, but no dialogs. Subsequent compiles of typical math notes
        run ~5–10&nbsp;s (same speed as Overleaf for the same document).
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="bridge-copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      title="Copy to clipboard"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ command }: { command: string }) {
  return (
    <div className="bridge-code">
      <pre>{command}</pre>
      <CopyButton text={command} />
    </div>
  );
}

const BRIDGE_SCRIPT_URL = '/bridge.js';

const INSTALL_TEXLIVE: Record<OS, { label: string; lines: string[] }> = {
  macos: {
    label: 'macOS',
    lines: [
      '# Install TeX Live (one-time, ~4 GB):',
      'brew install --cask mactex-no-gui',
      '',
      '# Verify:',
      'pdflatex --version',
    ],
  },
  linux: {
    label: 'Linux',
    lines: [
      '# Debian / Ubuntu:',
      'sudo apt-get install texlive-latex-recommended texlive-fonts-recommended texlive-latex-extra latexmk',
      '',
      '# Arch:',
      'sudo pacman -S texlive-most',
      '',
      '# Verify:',
      'pdflatex --version',
    ],
  },
  windows: {
    label: 'Windows',
    lines: [
      '# Install MiKTeX (recommended — auto-installs missing packages):',
      '# Download from  https://miktex.org/download  and run the installer.',
      '',
      '# Verify in PowerShell or cmd:',
      'pdflatex --version',
    ],
  },
};

const DOWNLOAD_AND_RUN: Record<OS, string> = {
  macos:
    `curl -fsSL ${typeof location !== 'undefined' ? location.origin : 'https://www.mathflow.studio'}${BRIDGE_SCRIPT_URL} -o mathflow-bridge.js\nnode mathflow-bridge.js`,
  linux:
    `curl -fsSL ${typeof location !== 'undefined' ? location.origin : 'https://www.mathflow.studio'}${BRIDGE_SCRIPT_URL} -o mathflow-bridge.js\nnode mathflow-bridge.js`,
  windows:
    `Invoke-WebRequest -Uri "${typeof location !== 'undefined' ? location.origin : 'https://www.mathflow.studio'}${BRIDGE_SCRIPT_URL}" -OutFile mathflow-bridge.js\nnode mathflow-bridge.js`,
};

export function BridgeSetup({ open, onClose, onConnected }: Props) {
  const [os, setOS] = useState<OS>(detectInitialOS);
  const [status, setStatus] = useState<BridgeStatus>({ online: false });
  const [checking, setChecking] = useState(false);
  const wasOnline = useMemo(() => ({ value: false }), []);

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeBridgeStatus((s) => {
      setStatus(s);
      if (s.online && !wasOnline.value) {
        wasOnline.value = true;
        onConnected?.();
      }
    });
    // Trigger a fresh probe when the modal opens.
    detectBridge(true);
    return unsub;
  }, [open, onConnected, wasOnline]);

  if (!open) return null;

  const enginesAvailable = status.engines
    ? Object.entries(status.engines).filter(([, v]) => !!v).map(([k]) => k)
    : [];
  const readiness = bridgeReadiness(status);
  const badgeLabel =
    readiness === 'ready' ? `Bridge ready (v${status.version})` :
    readiness === 'no-engines' ? `Bridge online — no LaTeX engine found` :
    'Bridge offline';
  const badgeClass =
    readiness === 'ready' ? 'online' :
    readiness === 'no-engines' ? 'warning' :
    'offline';

  return (
    <div className="bridge-setup-overlay" onClick={onClose}>
      <div className="bridge-setup-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bridge-setup-close" onClick={onClose} aria-label="Close">×</button>

        <div className="bridge-setup-header">
          <h2>Set up Local LaTeX</h2>
          <span className={`bridge-status-badge bridge-status-${badgeClass}`}>
            <span className="bridge-status-dot" />
            {badgeLabel}
          </span>
        </div>

        <p className="bridge-setup-intro">
          MathFlow can compile PDFs with the same LaTeX install you already use on your machine —
          identical quality to <em>Overleaf</em>, ~5–10&nbsp;s per compile, costs nothing.
          You just need to run a small bridge program in a terminal once.
        </p>

        {readiness === 'ready' && (
          <ConnectedView engines={enginesAvailable} onClose={onClose} />
        )}
        {readiness === 'no-engines' && (
          <NoEnginesView
            os={os}
            setOS={setOS}
            onRecheck={async () => {
              setChecking(true);
              try { await detectBridge(true); } finally { setTimeout(() => setChecking(false), 400); }
            }}
            checking={checking}
          />
        )}
        {readiness === 'offline' && (
          <SetupSteps
            os={os}
            setOS={setOS}
            checking={checking}
            onRecheck={async () => {
              setChecking(true);
              try { await detectBridge(true); } finally { setTimeout(() => setChecking(false), 400); }
            }}
            lastError={status.lastError}
          />
        )}

        <div className="bridge-setup-footer">
          <a
            className="bridge-link"
            href="https://github.com/TerazW/MathFlow/tree/main/mathflow-bridge#readme"
            target="_blank"
            rel="noreferrer"
          >
            Bridge source &amp; docs ↗
          </a>
          <button className="bridge-btn-secondary" onClick={onClose}>
            {readiness === 'ready' ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupSteps({
  os,
  setOS,
  onRecheck,
  checking,
  lastError,
}: {
  os: OS;
  setOS: (o: OS) => void;
  onRecheck: () => void;
  checking: boolean;
  lastError?: string;
}) {
  return (
    <>
      <ol className="bridge-steps">
        <li>
          <div className="bridge-step-title">Install Node.js (if you don't have it)</div>
          <div className="bridge-step-body">
            Node 18+ from <a href="https://nodejs.org" target="_blank" rel="noreferrer">nodejs.org</a>.
            Check with: <code>node --version</code>
          </div>
        </li>

        <li>
          <div className="bridge-step-title">Install TeX Live</div>
          <div className="bridge-step-body">
            <div className="bridge-os-tabs">
              {(Object.keys(INSTALL_TEXLIVE) as OS[]).map((key) => (
                <button
                  key={key}
                  className={`bridge-os-tab ${os === key ? 'active' : ''}`}
                  onClick={() => setOS(key)}
                >
                  {INSTALL_TEXLIVE[key].label}
                </button>
              ))}
            </div>
            <CodeBlock command={INSTALL_TEXLIVE[os].lines.join('\n')} />
            <p className="bridge-step-hint">
              Already have TeX Live / MiKTeX? Skip to the next step.
            </p>
            <p className="bridge-step-hint">
              <strong>Important:</strong> after the install finishes, <strong>close any
              terminals you had open before</strong> — they have a stale <code>PATH</code> and
              won't see the new install. Always start fresh terminals from here on.
            </p>
            {os === 'windows' && (
              <div className="bridge-miktex-tip" style={{ marginTop: 12 }}>
                <strong>MiKTeX users — do this now, save yourself 50 clicks later:</strong>
                <p>
                  By default MiKTeX pops up an <em>"Install missing package?"</em> dialog every
                  time pdflatex hits a missing package. Your first compile will need ~10–20
                  packages and 60s+ of clicking.
                </p>
                <ol>
                  <li>Open <strong>MiKTeX Console</strong> from the Start menu</li>
                  <li>Click <strong>Settings</strong> in the left sidebar</li>
                  <li>Find <em>"You can choose whether missing packages are to be installed automatically"</em></li>
                  <li>Set to <strong>"Always"</strong> (or <strong>"Yes"</strong>)</li>
                </ol>
              </div>
            )}
          </div>
        </li>

        <li>
          <div className="bridge-step-title">Download &amp; run the bridge in a <em>new</em> terminal</div>
          <div className="bridge-step-body">
            <p>
              Open a brand-new terminal — <strong>not</strong> one you had open before installing
              TeX Live, otherwise the bridge can't find <code>pdflatex</code>.
            </p>
            <ul className="bridge-substeps">
              {os === 'windows' && (
                <li>Start menu → type <strong>"PowerShell"</strong> → click <strong>Windows PowerShell</strong> (the regular one, <strong>not</strong> "Run as administrator").</li>
              )}
              {os === 'macos' && (
                <li>Spotlight (<kbd>⌘</kbd>+<kbd>Space</kbd>) → type <strong>Terminal</strong> → Enter.</li>
              )}
              {os === 'linux' && (
                <li>Open your usual terminal emulator (gnome-terminal / konsole / etc.).</li>
              )}
            </ul>
            <p className="bridge-step-hint">
              <strong>First verify</strong> TeX Live is reachable in this shell:
            </p>
            <CodeBlock command={'pdflatex --version'} />
            <p className="bridge-step-hint">
              Should print version info. Got <code>command not found</code>{os === 'windows' && <> or <code>not recognized…</code></>}? See Troubleshooting below.
            </p>
            <p className="bridge-step-hint">
              Then paste this into the same terminal. The bridge stays running until you stop
              it with <kbd>Ctrl</kbd>+<kbd>C</kbd> — <strong>leave the terminal window
              open</strong> while you use MathFlow.
            </p>
            <CodeBlock command={DOWNLOAD_AND_RUN[os]} />
            <p className="bridge-step-hint">
              Or download <a href={BRIDGE_SCRIPT_URL} download>bridge.js</a> manually and run{' '}
              <code>node bridge.js</code>.
            </p>
          </div>
        </li>

        <li>
          <div className="bridge-step-title">MathFlow auto-detects it</div>
          <div className="bridge-step-body">
            <p>
              We probe <code>{BRIDGE_BASE_URL}</code> every few seconds. The badge above
              flips to <strong>online</strong> as soon as it sees the bridge.
            </p>
            <button className="bridge-btn-primary" onClick={onRecheck} disabled={checking}>
              {checking ? 'Checking…' : 'Check now'}
            </button>
            {lastError && (
              <p className="bridge-step-error">
                Last probe error: <code>{lastError}</code>
              </p>
            )}
          </div>
        </li>
      </ol>

      <details className="bridge-troubleshoot">
        <summary>Troubleshooting</summary>
        <dl>
          <dt><code>EADDRINUSE</code> / "Port 5555 is already in use"</dt>
          <dd>
            Another bridge instance is running, or some other app grabbed the port. Either
            stop the other instance, or run with a different port:{' '}
            <code>MATHFLOW_BRIDGE_PORT=6000 node mathflow-bridge.js</code> (then MathFlow
            won't auto-detect — you'd need to use the default port for now).
          </dd>

          <dt>Bridge banner says <code>(not found on PATH)</code> for pdflatex / etc.</dt>
          <dd>
            TeX Live isn't on this shell's <code>PATH</code>. Verify in the same terminal:{' '}
            <code>pdflatex --version</code>. If that also fails, install TeX Live per the
            steps above. If <code>pdflatex --version</code> works but bridge still says
            "not found" — bridge was started <em>before</em> the install. Close that terminal
            window completely, open a brand-new one, then re-run <code>node mathflow-bridge.js</code>
            there.
          </dd>

          <dt>
            <code>pdflatex --version</code> works in a new terminal but bridge still can't find it
          </dt>
          <dd>
            Some installers (older MiKTeX, some Linux package managers) only update <code>PATH</code>
            for shells started <em>after</em> a full re-login. Log out and back in to your OS,
            then start a brand-new terminal and re-run the bridge there.
          </dd>

          <dt>MiKTeX keeps popping up "Install missing package?" dialogs</dt>
          <dd>
            Open the <strong>MiKTeX Console</strong> window — Start menu →{' '}
            <code>MiKTeX Console</code> → Enter, or right-click the MiKTeX tray icon →{' '}
            <strong>Restore</strong> (Restore = show the window; the tray icon doesn't have
            a Settings shortcut). Then <strong>Settings</strong> in the left sidebar → find{' '}
            <em>"You can choose whether missing packages are to be installed automatically"</em>
            {' '}→ set to <strong>"Always"</strong>. The first compile after that still takes
            1–3&nbsp;min (silent background downloads); subsequent compiles ~5–10&nbsp;s.
          </dd>

          <dt>First compile takes forever / "Compile timed out"</dt>
          <dd>
            On Windows with MiKTeX, the first compile typically needs 10–30 packages and can
            take a couple of minutes if your connection isn't fast. The bridge has a 5-min
            default. If you legitimately need longer (e.g. installing on a slow
            connection from scratch), restart with{' '}
            <code>MATHFLOW_BRIDGE_COMPILE_TIMEOUT_MS=600000 node mathflow-bridge.js</code>{' '}
            (10&nbsp;min). After the first compile, packages are cached locally and subsequent
            runs are fast.
          </dd>

          <dt>Badge stays offline even though the bridge is running</dt>
          <dd>
            Open <a href={`${BRIDGE_BASE_URL}/ping`} target="_blank" rel="noreferrer"><code>{BRIDGE_BASE_URL}/ping</code></a>{' '}
            directly. JSON = bridge alive; the issue is browser side (try a hard reload,
            Ctrl/Cmd&nbsp;+&nbsp;Shift&nbsp;+&nbsp;R).
            Refusal to connect = bridge isn't actually running; check the terminal.
          </dd>

          <dt>"security risk: running with elevated privileges" warning at top of pdflatex output</dt>
          <dd>
            You opened the terminal as Administrator / with <code>sudo</code>. Works but
            isn't ideal. Close it, open a normal (non-admin) terminal, re-run the bridge.
          </dd>

          <dt>Specific document fails to compile</dt>
          <dd>
            Click <em>Compile log</em> in the error dialog — that's the raw <code>pdflatex</code>
            output. Most failures are missing TeX Live packages (install via{' '}
            <code>tlmgr install &lt;name&gt;</code> on TeX Live, or via MiKTeX Console on
            MiKTeX) or LaTeX syntax in the document itself.
          </dd>
        </dl>
      </details>
    </>
  );
}

function NoEnginesView({
  os,
  setOS,
  onRecheck,
  checking,
}: {
  os: OS;
  setOS: (o: OS) => void;
  onRecheck: () => void;
  checking: boolean;
}) {
  return (
    <>
      <div className="bridge-warning-card">
        <strong>Bridge is running, but no LaTeX engine was found.</strong>
        <p>
          We probed for <code>pdflatex</code>, <code>xelatex</code>, and <code>lualatex</code>
          on your <code>PATH</code> and didn't find any of them. You need to install
          TeX Live (or MiKTeX on Windows) before MathFlow can compile PDFs locally.
        </p>
      </div>

      <ol className="bridge-steps">
        <li>
          <div className="bridge-step-title">Install TeX Live</div>
          <div className="bridge-step-body">
            <div className="bridge-os-tabs">
              {(Object.keys(INSTALL_TEXLIVE) as OS[]).map((key) => (
                <button
                  key={key}
                  className={`bridge-os-tab ${os === key ? 'active' : ''}`}
                  onClick={() => setOS(key)}
                >
                  {INSTALL_TEXLIVE[key].label}
                </button>
              ))}
            </div>
            <CodeBlock command={INSTALL_TEXLIVE[os].lines.join('\n')} />
            <p className="bridge-step-hint">
              <strong>macOS / Linux:</strong> after the install finishes, run{' '}
              <code>which pdflatex</code> in a new terminal to confirm it's on your <code>PATH</code>.<br />
              <strong>Windows:</strong> MiKTeX adds itself to <code>PATH</code> automatically; you may need to
              open a new PowerShell / cmd window.
            </p>
            {os === 'windows' && <MiktexAutoInstallTip />}
          </div>
        </li>

        <li>
          <div className="bridge-step-title">Restart the bridge in a <em>fresh</em> terminal</div>
          <div className="bridge-step-body">
            <p>
              The bridge inherits whatever <code>PATH</code> was set when its terminal launched.
              A terminal that was open <strong>before</strong> you installed TeX Live still has
              the old <code>PATH</code> — so the bridge can't find <code>pdflatex</code> even
              though it's now on disk. You need to fully restart the bridge in a brand-new
              shell.
            </p>
            <ol className="bridge-substeps">
              <li>
                Switch to the terminal where the bridge is currently running (the one printing
                the banner with <code>WARNING: No LaTeX engine found</code>). Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop it.
              </li>
              <li>
                <strong>Close that terminal window entirely.</strong> Don't just stop the bridge —
                close the window. Otherwise the new node process still inherits the old <code>PATH</code>.
              </li>
              <li>
                Open a brand-new terminal:
                {os === 'windows' && (
                  <ul>
                    <li>Start menu → type <strong>"PowerShell"</strong> → click <strong>Windows PowerShell</strong> (the normal one, <strong>not</strong> "Run as administrator")</li>
                  </ul>
                )}
                {os === 'macos' && (
                  <ul>
                    <li>Spotlight (<kbd>⌘</kbd>+<kbd>Space</kbd>) → type <strong>Terminal</strong> → Enter</li>
                  </ul>
                )}
                {os === 'linux' && (
                  <ul>
                    <li>Open your usual terminal emulator (gnome-terminal, konsole, alacritty…)</li>
                  </ul>
                )}
              </li>
              <li>
                <strong>Verify LaTeX is reachable from this new shell</strong> before re-running
                the bridge:
                <CodeBlock command={'pdflatex --version'} />
                <p className="bridge-step-hint">
                  Should print something like <code>pdfTeX 3.x / MiKTeX 25.x</code>. If you get{' '}
                  {os === 'windows'
                    ? <code>'pdflatex' is not recognized…</code>
                    : <code>command not found</code>}
                  , <code>PATH</code> isn't updated — see Troubleshooting.
                </p>
              </li>
              <li>
                In the <em>same</em> new shell, run the bridge again. If you still have
                <code> mathflow-bridge.js</code> in the current folder:
                <CodeBlock command={'node mathflow-bridge.js'} />
                If you lost it, re-download (same as Step 3 of first setup):
                <CodeBlock command={DOWNLOAD_AND_RUN[os]} />
              </li>
              <li>
                The banner should now read <code>OK&nbsp;&nbsp;pdflatex&nbsp;&nbsp;pdfTeX 3.x (…)</code>{' '}
                instead of <code>(not found on PATH)</code>.
              </li>
            </ol>
          </div>
        </li>

        <li>
          <div className="bridge-step-title">Re-check from MathFlow</div>
          <div className="bridge-step-body">
            <p className="bridge-step-hint">
              MathFlow will detect the engines within ~5s automatically, or click below to
              probe immediately. The badge at the top of this dialog should flip to green.
            </p>
            <button className="bridge-btn-primary" onClick={onRecheck} disabled={checking}>
              {checking ? 'Checking…' : 'Check now'}
            </button>
          </div>
        </li>
      </ol>
    </>
  );
}

function ConnectedView({ engines, onClose }: { engines: string[]; onClose: () => void }) {
  const isWindows = typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent);
  return (
    <div className="bridge-connected">
      <div className="bridge-connected-icon">✓</div>
      <h3>You're all set</h3>
      <p>The bridge is running. Engines detected on your machine:</p>
      <ul className="bridge-engine-list">
        {engines.map((e) => <li key={e}><code>{e}</code></li>)}
      </ul>
      <p className="bridge-step-hint">
        From now on, <strong>Export PDF</strong> in MathFlow goes straight through your local
        LaTeX. Close this dialog and try it.
      </p>
      {isWindows && <MiktexAutoInstallTip />}
      <button className="bridge-btn-primary" onClick={onClose}>Got it</button>
    </div>
  );
}
