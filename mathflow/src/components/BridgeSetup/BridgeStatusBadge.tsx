/**
 * Small header-mounted pill showing the live bridge readiness. Click → open
 * the BridgeSetup modal. Three states (matching `bridgeReadiness`):
 *
 *   - offline     — bridge process isn't reachable
 *   - no-engines  — bridge is up but no LaTeX engine is installed locally
 *   - ready       — at least one engine detected; PDF export will work
 */

import { useEffect, useState } from 'react';
import {
  BridgeStatus,
  bridgeReadiness,
  detectBridge,
  subscribeBridgeStatus,
} from '../../lib/bridge';

interface Props {
  onClick: () => void;
}

const LABEL: Record<ReturnType<typeof bridgeReadiness>, string> = {
  offline: 'LaTeX offline',
  'no-engines': 'LaTeX setup',
  ready: 'LaTeX',
};

const TITLE: Record<ReturnType<typeof bridgeReadiness>, (v?: string) => string> = {
  offline: () =>
    'MathFlow Bridge offline. Click to set up local LaTeX for high-quality PDF export.',
  'no-engines': () =>
    'Bridge is running but no LaTeX engine (pdflatex / xelatex / lualatex) was found on PATH. Click to see install instructions.',
  ready: (v) =>
    `MathFlow Bridge v${v || '?'} — local LaTeX ready. Click for details.`,
};

export function BridgeStatusBadge({ onClick }: Props) {
  const [status, setStatus] = useState<BridgeStatus>({ online: false });

  useEffect(() => {
    const unsub = subscribeBridgeStatus(setStatus);
    detectBridge(true);
    return unsub;
  }, []);

  const state = bridgeReadiness(status);

  return (
    <button
      type="button"
      className={`bridge-header-badge bridge-header-badge-${state}`}
      onClick={onClick}
      title={TITLE[state](status.version)}
    >
      <span className="bridge-header-badge-dot" />
      {LABEL[state]}
    </button>
  );
}
