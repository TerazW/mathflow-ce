/**
 * Client for the local MathFlow Bridge (see `mathflow-bridge/`).
 *
 * The bridge is a tiny Node script the user runs on their own machine. It
 * exposes `http://127.0.0.1:5555` and compiles `.tex` with the user's
 * local TeX Live install. Browsers allow https://… pages to fetch from
 * http://localhost because localhost counts as a "potentially trustworthy"
 * origin under the Mixed Content rules.
 *
 * - `detectBridge()` polls `/ping`. Cached for 5 s so repeated calls are cheap.
 * - `compileViaBridge()` POSTs the source and returns the PDF bytes.
 * - `subscribeBridgeStatus()` lets the UI react to status flips without each
 *   component having to schedule its own poll.
 */

const BRIDGE_URL = 'http://127.0.0.1:5555';
const PING_TIMEOUT_MS = 1500;
const STATUS_CACHE_TTL_MS = 5_000;
const STATUS_POLL_INTERVAL_MS = 5_000;

export interface BridgeEngines {
  pdflatex: string | null;
  xelatex: string | null;
  lualatex: string | null;
  latexmk: string | null;
}

export interface BridgeStatus {
  online: boolean;
  version?: string;
  engines?: BridgeEngines;
  /** What we tried last — useful for showing helpful errors in the UI. */
  lastError?: string;
}

export type BridgeEngine = 'pdflatex' | 'xelatex' | 'lualatex';

let cachedStatus: BridgeStatus = { online: false };
let cachedAt = 0;
let inflight: Promise<BridgeStatus> | null = null;
const listeners = new Set<(s: BridgeStatus) => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

function notify() {
  for (const fn of listeners) fn(cachedStatus);
}

function setStatus(next: BridgeStatus) {
  const changed =
    cachedStatus.online !== next.online ||
    cachedStatus.version !== next.version ||
    JSON.stringify(cachedStatus.engines) !== JSON.stringify(next.engines);
  cachedStatus = next;
  cachedAt = Date.now();
  if (changed) notify();
}

/**
 * Probe the bridge and update cached status. Reuses an in-flight probe if
 * one is already running, and short-circuits when the cached value is fresh.
 */
export function detectBridge(force = false): Promise<BridgeStatus> {
  if (!force && Date.now() - cachedAt < STATUS_CACHE_TTL_MS && cachedStatus.online) {
    return Promise.resolve(cachedStatus);
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    try {
      const res = await fetch(`${BRIDGE_URL}/ping`, {
        method: 'GET',
        signal: controller.signal,
        // No credentials — bridge doesn't use cookies and we don't want
        // to fail CORS preflight unnecessarily.
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!res.ok) {
        setStatus({ online: false, lastError: `Bridge returned HTTP ${res.status}` });
        return cachedStatus;
      }
      const data = await res.json();
      setStatus({
        online: true,
        version: data.version,
        engines: data.engines,
      });
      return cachedStatus;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({
        online: false,
        lastError: msg.includes('aborted') ? 'Bridge did not respond within 1.5s' : msg,
      });
      return cachedStatus;
    } finally {
      clearTimeout(timer);
      inflight = null;
    }
  })();

  return inflight;
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function subscribeBridgeStatus(
  listener: (s: BridgeStatus) => void,
): () => void {
  listeners.add(listener);
  // Fire immediately with current state.
  listener(cachedStatus);
  // Start background polling lazily on first subscriber.
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      // Force a refresh, even if cached `online: true` — we want to catch
      // the bridge being shut down.
      detectBridge(true);
    }, STATUS_POLL_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

/** Synchronous snapshot of the last known status. */
export function getCachedBridgeStatus(): BridgeStatus {
  return cachedStatus;
}

/** True iff the bridge is online AND at least one LaTeX engine is installed. */
export function isBridgeReady(s: BridgeStatus): boolean {
  if (!s.online || !s.engines) return false;
  return !!(s.engines.pdflatex || s.engines.xelatex || s.engines.lualatex);
}

/** Discriminate the three meaningful states for the UI. */
export type BridgeReadiness = 'offline' | 'no-engines' | 'ready';
export function bridgeReadiness(s: BridgeStatus): BridgeReadiness {
  if (!s.online) return 'offline';
  return isBridgeReady(s) ? 'ready' : 'no-engines';
}

export class BridgeCompileError extends Error {
  log?: string;
  status: number;
  constructor(message: string, opts: { log?: string; status: number }) {
    super(message);
    this.name = 'BridgeCompileError';
    this.log = opts.log;
    this.status = opts.status;
  }
}

export class BridgeOfflineError extends Error {
  constructor() {
    super('MathFlow Bridge is not running. Start it and try again.');
    this.name = 'BridgeOfflineError';
  }
}

/** Bridge is up but no LaTeX engine (pdflatex etc.) is installed on the host. */
export class BridgeNoEngineError extends Error {
  engine: BridgeEngine;
  constructor(engine: BridgeEngine) {
    super(
      `${engine} is not installed on this machine. Install TeX Live (or MiKTeX on Windows) and restart the bridge.`,
    );
    this.name = 'BridgeNoEngineError';
    this.engine = engine;
  }
}

/**
 * Send `.tex` to the local bridge, get a PDF back as `Uint8Array`.
 * Throws `BridgeOfflineError` if the bridge isn't reachable; throws
 * `BridgeCompileError` (with `log`) when the compile fails.
 */
export async function compileViaBridge(
  tex: string,
  engine: BridgeEngine = 'pdflatex',
): Promise<Uint8Array> {
  // Fast pre-check so we surface a clean "bridge offline" error instead of
  // a generic network failure when the user clicks Export.
  const status = await detectBridge(true);
  if (!status.online) {
    throw new BridgeOfflineError();
  }
  if (status.engines && !status.engines[engine]) {
    throw new BridgeNoEngineError(engine);
  }

  const res = await fetch(`${BRIDGE_URL}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex, engine }),
    credentials: 'omit',
    cache: 'no-store',
  });

  if (res.ok) {
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  // Error path: the bridge returns JSON { error, log? }
  let payload: { error?: string; log?: string } = {};
  try {
    payload = await res.json();
  } catch {
    payload = { error: `HTTP ${res.status}` };
  }
  throw new BridgeCompileError(payload.error || `Compile failed (HTTP ${res.status})`, {
    log: payload.log,
    status: res.status,
  });
}

/** URL of the bridge — exposed so the setup UI can offer a "test it yourself" link. */
export const BRIDGE_BASE_URL = BRIDGE_URL;
