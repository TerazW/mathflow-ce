# MathFlow Bridge

A small Node script that lets [MathFlow](https://www.mathflow.studio) compile
notes to PDF using the **LaTeX install on your own machine** — same quality as
running `pdflatex` yourself, zero server cost for MathFlow.

## What it does

1. Starts an HTTP server on `http://127.0.0.1:5555` (bound to localhost only —
   never network-accessible).
2. MathFlow in your browser detects it automatically and sends your note's
   `.tex` source to it when you click **Export PDF**.
3. The bridge runs `pdflatex`/`xelatex`/`lualatex` (whichever you pick) via
   `latexmk` against your local TeX Live, then returns the resulting PDF.

If the bridge isn't running, MathFlow falls back to a "Simple PDF" produced
from the browser's print dialog.

## Prerequisites

- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- **A working LaTeX install** with `pdflatex` on your `PATH`:
  - **macOS:** `brew install --cask mactex-no-gui` (≈4 GB) or full MacTeX
  - **Ubuntu/Debian:** `sudo apt-get install texlive-full`
  - **Arch:** `sudo pacman -S texlive-most`
  - **Windows:** [MiKTeX](https://miktex.org/download) (auto-installs missing packages on demand)

Verify with:

```
pdflatex --version
```

## Run it

> **Important:** if you just installed TeX Live, **close any terminals you
> already had open** and start a brand-new one. Existing terminals have a
> stale `PATH` and won't find `pdflatex` even though it's now on disk.

In the new terminal, first sanity-check that LaTeX is reachable:

```
pdflatex --version
```

You should see something like `pdfTeX 3.x (TeX Live 2024)` or
`MiKTeX-pdfTeX 4.23 (MiKTeX 25.x)`. If you get `command not found` /
`is not recognized as an internal or external command`, see **Troubleshooting**
below.

Then start the bridge:

```
node bridge.js
```

You should see a banner like:

```
╭─────────────────────────────────────────────────────────╮
│   MathFlow Bridge  v1.0.0                               │
│   Listening on http://127.0.0.1:5555                    │
╰─────────────────────────────────────────────────────────╯

Detected LaTeX engines:
  OK  pdflatex   pdfTeX 3.141592653-2.6-1.40.25 (TeX Live 2023)
  OK  xelatex    XeTeX 3.141592653-2.6-0.999995 (TeX Live 2023)
  OK  lualatex   This is LuaHBTeX, Version 1.17.0 (TeX Live 2023)
  OK  latexmk    Latexmk, John Collins, ... version 4.83
```

Leave it running. Switch to MathFlow → click **Export PDF**.

## Config (env vars)

| Variable | Default | Notes |
|---|---|---|
| `MATHFLOW_BRIDGE_PORT` | `5555` | Bind a different port if 5555 is taken |
| `MATHFLOW_BRIDGE_ALLOW_ORIGIN` | (built-in list) | Comma-separated CORS allowlist. Default already includes `https://www.mathflow.studio`, `https://mathflow.studio`, and `http://localhost:5173` for local dev. |

Example: run on port 6000 and also allow a self-hosted MathFlow instance:

```
MATHFLOW_BRIDGE_PORT=6000 \
MATHFLOW_BRIDGE_ALLOW_ORIGIN=https://www.mathflow.studio,https://notes.example.com \
node bridge.js
```

## Security

- Server **only binds 127.0.0.1**. Nothing on your network can reach it.
- CORS is restricted to MathFlow's domains by default.
- Each compile runs in its own throwaway temp directory and is killed after
  60 seconds.
- 10 MB cap on inbound `.tex` size.

## API (for the curious)

- `GET /ping` → JSON listing detected engines.
- `POST /compile` ← `{ "tex": "...", "engine": "pdflatex" }` → `application/pdf`.

## Troubleshooting

**Banner shows `(not found on PATH)` for pdflatex** — TeX Live isn't on this
shell's `PATH`. In the same terminal run `pdflatex --version`:
- If that also fails → install TeX Live per the prerequisites above.
- If `pdflatex --version` works but the bridge banner still says "not found",
  the bridge was started **before** the TeX Live install. Close the terminal
  window completely, open a new one, then re-run `node bridge.js` there.

**`pdflatex --version` works in a new terminal but bridge still can't find it** —
Some installers (older MiKTeX, some Linux package managers) only update `PATH`
for shells launched after a full re-login. Log out and back in to your OS,
then start a brand-new terminal and re-run the bridge there.

**MiKTeX keeps popping up "Install missing package?" dialogs** — Open the
**MiKTeX Console** window. Two ways:

- Start menu → type `MiKTeX Console` → Enter, **or**
- Right-click the MiKTeX tray icon (bottom-right of the taskbar, the `TeX`
  logo) → **Restore**. ("Restore" just means "show the window again" — MiKTeX
  runs in the background and the tray icon is its launcher. There's no
  "Settings" item directly in the tray menu, you have to open the Console
  first.)

In the Console window: **Settings** in the left sidebar → find
*"You can choose whether missing packages are to be installed automatically"*
→ set to **"Always"** (or **"Yes"**, depending on MiKTeX version). The first
compile after that still takes 1–3 min while packages download silently, but
subsequent compiles run ~5–10 s for typical math notes (same speed as Overleaf
for the same document — same pdflatex doing the same work).

**First compile times out** — On Windows with MiKTeX the very first compile
needs 10–30 packages and a couple of minutes on a slow connection. The bridge
has a 5-minute default. Bump it with
`MATHFLOW_BRIDGE_COMPILE_TIMEOUT_MS=600000 node bridge.js` (10 min). After
the first compile, packages are cached and subsequent runs are fast.

**MathFlow says "Bridge offline" even though it's running** — Open
`http://127.0.0.1:5555/ping` directly in the browser. JSON in response means
the bridge is up; reload MathFlow with Ctrl/Cmd+Shift+R to clear any stuck
state. Refusal to connect means the bridge actually isn't running; check
the terminal you launched it in.

**`security risk: running with elevated privileges`** appears in pdflatex output —
You opened the terminal as Administrator / via `sudo`. Works but isn't ideal.
Close it, open a normal (non-admin) terminal, re-run the bridge.

**Compile fails on a specific note** — Click "Compile log" in MathFlow's
error dialog; that's the literal output from `pdflatex`. Most issues are
missing packages (install via `tlmgr install <name>` on TeX Live, or via
MiKTeX Console on MiKTeX) or LaTeX syntax in the document.

## License

MIT
