#!/usr/bin/env node
/**
 * MathFlow Bridge — a small local HTTP server that compiles LaTeX with the
 * TeX Live install already on the user's machine and hands the resulting PDF
 * back to MathFlow in the browser.
 *
 * Why:
 *   - Real `pdflatex`/`xelatex`/`lualatex` ≡ Overleaf-quality output.
 *   - Zero infrastructure cost for the MathFlow service (the user's CPU
 *     does the work).
 *   - Browsers allow https://www.mathflow.studio to fetch from
 *     http://127.0.0.1:<port> because localhost is treated as a secure
 *     context (Mixed Content allowance for "potentially trustworthy"
 *     origins).
 *
 * Endpoints:
 *   GET  /ping        → { name, version, engines: { pdflatex, xelatex, lualatex } }
 *   POST /compile     ← { tex: string, engine?: 'pdflatex'|'xelatex'|'lualatex', passes?: 1|2 }
 *                     → PDF (application/pdf), or 4xx/5xx JSON { error, log? }
 *
 * Design notes:
 *   - Each compile gets its own tmpdir so concurrent compiles don't collide.
 *   - latexmk is preferred (handles passes + bib/biber/index automatically).
 *     If unavailable we fall back to running the engine twice for refs/TOC.
 *   - 60-second per-compile timeout; engine is killed if exceeded.
 *   - CORS is restricted to the MathFlow domains + localhost dev origins.
 *     Override with MATHFLOW_BRIDGE_ALLOW_ORIGIN env var (comma-separated).
 *   - Port defaults to 5555. Override with MATHFLOW_BRIDGE_PORT.
 *   - Only binds 127.0.0.1, never 0.0.0.0 — never network-accessible.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { randomBytes } = require('crypto');

const VERSION = '1.0.0';
const PORT = parseInt(process.env.MATHFLOW_BRIDGE_PORT || '5555', 10);
// Compile timeout. Has to be generous on first run with MiKTeX, which can
// take several minutes downloading dozens of packages on demand. Override
// with MATHFLOW_BRIDGE_COMPILE_TIMEOUT_MS=<ms> for unusually heavy docs.
const COMPILE_TIMEOUT_MS = parseInt(
  process.env.MATHFLOW_BRIDGE_COMPILE_TIMEOUT_MS || '300000', // 5 min default
  10,
);
const MAX_TEX_BYTES = 10 * 1024 * 1024; // 10 MB cap on inbound .tex

const DEFAULT_ORIGINS = [
  'https://www.mathflow.studio',
  'https://mathflow.studio',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const ALLOWED_ORIGINS = new Set(
  (process.env.MATHFLOW_BRIDGE_ALLOW_ORIGIN
    ? process.env.MATHFLOW_BRIDGE_ALLOW_ORIGIN.split(',').map((s) => s.trim())
    : DEFAULT_ORIGINS
  ).filter(Boolean),
);

const SUPPORTED_ENGINES = ['pdflatex', 'xelatex', 'lualatex'];

/** Probe whether an executable exists on PATH. Returns its --version string or null. */
function probeBinary(name) {
  try {
    const out = execFileSync(name, ['--version'], {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n')[0].trim();
  } catch {
    return null;
  }
}

const ENGINE_INFO = (() => {
  const info = {};
  for (const eng of SUPPORTED_ENGINES) info[eng] = probeBinary(eng);
  info.latexmk = probeBinary('latexmk');
  return info;
})();

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_TEX_BYTES) {
        req.destroy();
        reject(new Error(`Request body exceeds ${MAX_TEX_BYTES} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function makeWorkDir() {
  const dir = path.join(
    os.tmpdir(),
    `mathflow-bridge-${randomBytes(6).toString('hex')}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rmrf(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

/**
 * Run a compile with timeout. Resolves on exit (regardless of status),
 * rejects only on spawn errors / timeout. Caller inspects `code` + log.
 * On timeout we attach the captured stdout/stderr to the error so the
 * caller can surface whatever pdflatex managed to print before we killed
 * it (e.g. MiKTeX's "downloading package X" lines).
 */
function runCompile(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, TEXINPUTS: cwd + path.delimiter } });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill('SIGKILL'); } catch {}
    }, COMPILE_TIMEOUT_MS);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(Object.assign(err, { stdout, stderr }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        const seconds = Math.round(COMPILE_TIMEOUT_MS / 1000);
        reject(
          Object.assign(
            new Error(
              `Compile timed out after ${seconds}s. On Windows with MiKTeX, ` +
              `first run can be slow if many packages are downloading on demand — ` +
              `enable "Always install missing packages" in MiKTeX Console > Settings ` +
              `so it stops prompting, then try again.`,
            ),
            { stdout, stderr, timedOut: true },
          ),
        );
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

async function compileTex(tex, engine, passes) {
  if (!SUPPORTED_ENGINES.includes(engine)) {
    throw Object.assign(new Error(`Unsupported engine: ${engine}`), { status: 400 });
  }
  if (!ENGINE_INFO[engine]) {
    throw Object.assign(
      new Error(
        `${engine} not found on PATH. Install TeX Live and ensure ${engine} is available, or pick a different engine.`,
      ),
      { status: 412 },
    );
  }

  const cwd = makeWorkDir();
  try {
    const mainTex = path.join(cwd, 'main.tex');
    fs.writeFileSync(mainTex, tex, 'utf8');

    let lastResult;
    try {
      // Prefer latexmk — handles cross-refs/bib/index without us having to
      // figure out how many passes are needed.
      if (ENGINE_INFO.latexmk) {
        const flag =
          engine === 'pdflatex' ? '-pdf' :
          engine === 'xelatex'  ? '-xelatex' :
          '-lualatex';
        lastResult = await runCompile(
          'latexmk',
          [flag, '-interaction=nonstopmode', '-halt-on-error', '-file-line-error', 'main.tex'],
          cwd,
        );
      } else {
        const n = passes === 1 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          lastResult = await runCompile(
            engine,
            ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', 'main.tex'],
            cwd,
          );
          if (lastResult.code !== 0) break;
        }
      }
    } catch (err) {
      // Timeout / spawn error — attach whatever we captured so the UI has
      // something useful to show. Prefer the .log file if pdflatex got far
      // enough to write one, otherwise fall back to captured stdout/stderr.
      const log =
        readLog(cwd) ||
        [err.stdout, err.stderr].filter(Boolean).join('\n').trim() ||
        '(no output captured)';
      throw Object.assign(err, { status: err.timedOut ? 504 : 500, log });
    }

    const pdfPath = path.join(cwd, 'main.pdf');
    if (fs.existsSync(pdfPath)) {
      const pdf = fs.readFileSync(pdfPath);
      const log = readLog(cwd);
      return { pdf, log, status: lastResult.code };
    }

    const log =
      readLog(cwd) ||
      [lastResult && lastResult.stdout, lastResult && lastResult.stderr]
        .filter(Boolean)
        .join('\n')
        .trim() ||
      '(no output captured)';
    throw Object.assign(
      new Error('Compilation produced no PDF. See log for details.'),
      { status: 422, log },
    );
  } finally {
    rmrf(cwd);
  }
}

function readLog(cwd) {
  try {
    return fs.readFileSync(path.join(cwd, 'main.log'), 'utf8');
  } catch {
    return '';
  }
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/ping') {
    sendJson(res, 200, {
      name: 'mathflow-bridge',
      version: VERSION,
      engines: {
        pdflatex: ENGINE_INFO.pdflatex,
        xelatex: ENGINE_INFO.xelatex,
        lualatex: ENGINE_INFO.lualatex,
        latexmk: ENGINE_INFO.latexmk,
      },
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/compile') {
    try {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (!ct.includes('application/json')) {
        sendJson(res, 415, { error: 'Content-Type must be application/json' });
        return;
      }
      const body = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(body.toString('utf8'));
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const tex = typeof parsed.tex === 'string' ? parsed.tex : '';
      const engine = typeof parsed.engine === 'string' ? parsed.engine : 'pdflatex';
      const passes = parsed.passes === 1 ? 1 : 2;
      if (!tex) {
        sendJson(res, 400, { error: 'Missing required field: tex' });
        return;
      }
      try {
        const { pdf } = await compileTex(tex, engine, passes);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': pdf.length,
          'Cache-Control': 'no-store',
        });
        res.end(pdf);
      } catch (err) {
        const status = err.status || 500;
        sendJson(res, status, {
          error: err.message || 'Compile failed',
          log: err.log || undefined,
        });
      }
    } catch (err) {
      sendJson(res, 500, { error: err.message || 'Internal error' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[mathflow-bridge] Port ${PORT} is already in use.`);
    console.error('   Another mathflow-bridge instance may already be running,');
    console.error('   or set MATHFLOW_BRIDGE_PORT=<port> to use a different port.');
    process.exit(1);
  }
  console.error('[mathflow-bridge] Server error:', err);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const banner = [
    '',
    '╭─────────────────────────────────────────────────────────╮',
    '│                                                         │',
    '│   MathFlow Bridge  v' + VERSION.padEnd(36) + '│',
    '│   Listening on http://127.0.0.1:' + String(PORT).padEnd(22) + '   │',
    '│                                                         │',
    '╰─────────────────────────────────────────────────────────╯',
    '',
    'Detected LaTeX engines:',
  ];
  for (const eng of SUPPORTED_ENGINES) {
    banner.push(`  ${ENGINE_INFO[eng] ? 'OK ' : '-- '} ${eng.padEnd(10)} ${ENGINE_INFO[eng] || '(not found on PATH)'}`);
  }
  banner.push(`  ${ENGINE_INFO.latexmk ? 'OK ' : '-- '} latexmk    ${ENGINE_INFO.latexmk || '(not found — falling back to engine 2-pass)'}`);
  banner.push('');
  if (!ENGINE_INFO.pdflatex && !ENGINE_INFO.xelatex && !ENGINE_INFO.lualatex) {
    banner.push('WARNING: No LaTeX engine found. Install TeX Live:');
    banner.push('   - macOS:    brew install --cask mactex-no-gui');
    banner.push('   - Ubuntu:   sudo apt-get install texlive-full');
    banner.push('   - Windows:  https://miktex.org/download');
    banner.push('');
  }
  banner.push('Open MathFlow in your browser; the bridge will be detected automatically.');
  banner.push('Press Ctrl+C to stop.');
  banner.push('');
  console.log(banner.join('\n'));
});

function shutdown() {
  console.log('\n[mathflow-bridge] Shutting down…');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
