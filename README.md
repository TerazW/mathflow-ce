# MathFlow — WYSIWYG Math Notes at Lecture Speed

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/TerazW/mathflow-ce/actions/workflows/ci.yml/badge.svg)](https://github.com/TerazW/mathflow-ce/actions/workflows/ci.yml)

MathFlow is an open-source, browser-based math note-taking editor designed for pure mathematics PhD students and researchers. It combines the speed of Gilles Castel's Vim+UltiSnips workflow with real-time KaTeX rendering, AI assistance, and zero-configuration browser access.

## Key Features

- **200+ LaTeX snippets** — type `sr` for `^2`, `//` for `\frac{}{}`, `->` for `\to`, and much more. Auto-expand, tab-expand, and regex triggers
- **WYSIWYG math editing** — inline (`$...$`) and display (`$$...$$`) math with live KaTeX rendering
- **Theorem environments** — theorem, lemma, proof, definition, corollary, proposition, remark, example with auto-numbering
- **TikZ graphics** — render TikZ/tikz-cd diagrams directly in the browser via tikzjax
- **AI assistance (BYOK)** — Ctrl+K for AI-powered LaTeX generation using your own API keys (OpenAI, Anthropic, Google)
- **SymPy computation** — `sympy integrate(x**2, x) sympy` + Tab for symbolic math
- **LaTeX + PDF export** — full `.tex` file export with custom preamble support
- **4 themes** — Light, Dark, Sepia, Nord
- **Offline support** — Service Worker + IndexedDB for offline use
- **Self-hosted backend** — PostgreSQL database, JWT auth, full CRUD API

## Feature Comparison

| Feature | Community (Self-hosted) | Pro ($8/mo) | Team ($15/user/mo) |
|---------|:-:|:-:|:-:|
| WYSIWYG math editor (KaTeX) | Yes | Yes | Yes |
| 200+ snippets (Castel-speed) | Yes | Yes | Yes |
| Theorem environments | Yes | Yes | Yes |
| TikZ graphics rendering | Yes | Yes | Yes |
| LaTeX + PDF export | Yes | Yes | Yes |
| AI assistance (BYOK) | Yes | Yes | Yes |
| SymPy computation | Yes | Yes | Yes |
| 4 themes | Yes | Yes | Yes |
| Offline support | Yes | Yes | Yes |
| Self-hosted backend | Yes | Yes | Yes |
| Notebooks / Notes | **Unlimited** | Unlimited | Unlimited |
| Cloud sync | - | Yes | Yes |
| Version history | - | Yes | Yes |
| Public sharing | - | Yes | Yes |
| Interactive learning system | - | Yes | Yes |
| OAuth SSO (Google/GitHub) | - | Yes | Yes |
| Full-text search | - | Yes | Yes |
| Real-time collaboration | - | - | Yes |
| Team workspaces | - | - | Yes |

The Community Edition is a **fully functional** math note-taking editor with no artificial limits. Pro/Team features are available at [mathflow.studio](https://mathflow.studio).

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/TerazW/mathflow-ce.git
cd mathflow-ce
cp mathflow/.env.example mathflow/.env
# Edit .env to set DATABASE_URL and JWT_SECRET
docker-compose up
```

Open http://localhost:5173

### Option 2: Manual Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+

# Clone
git clone https://github.com/TerazW/mathflow-ce.git
cd mathflow-ce

# Set up database
psql -f mathflow/server/db/schema.sql your_database

# Configure environment
cp mathflow/.env.example mathflow/.env
# Edit .env: set DATABASE_URL, JWT_SECRET

# Frontend (port 5173)
cd mathflow && npm install && npm run dev

# Backend (port 3001) — in a separate terminal
cd mathflow/server && npm install && npm run dev
```

## Environment Variables

Copy `mathflow/.env.example` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random 32+ character string for token signing |
| `PORT` | No | Backend port (default: 3001) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: localhost) |

AI features use BYOK (Bring Your Own Key) — configure your API key in the app's Settings panel. No server-side API keys needed.

## Architecture

```
mathflow/
├── src/
│   ├── components/          # React UI components
│   ├── extensions/          # TipTap editor extensions
│   │   ├── SnippetEngine.ts # Core snippet engine (auto/tab/regex)
│   │   ├── MathInline.ts    # Inline math node ($...$)
│   │   ├── MathDisplay.ts   # Display math node ($$...$$)
│   │   ├── TheoremEnv.ts    # Theorem environments
│   │   ├── TikZGraphics.ts  # TikZ diagram rendering
│   │   └── ...
│   ├── snippets/            # 200+ snippet definitions
│   ├── lib/                 # Utilities (storage, API, offline)
│   └── styles/              # CSS with theme variables
├── server/
│   ├── routes/              # Express API routes
│   ├── services/            # AI provider adapters
│   ├── db/                  # PostgreSQL schema + connection
│   └── middleware/          # JWT auth middleware
└── public/                  # Static assets + Service Worker
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Editor | TipTap (ProseMirror) |
| Math Rendering | KaTeX |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL |
| AI Providers | OpenAI, Anthropic, Google Gemini (BYOK) |
| Offline | Service Worker + IndexedDB |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Snippet contributions are the easiest way to get started — no deep codebase knowledge required.

## Privacy

MathFlow CE has **zero telemetry**. When self-hosted, all data stays on your server. AI features use your own API keys — requests go directly to the provider. See [PRIVACY.md](PRIVACY.md).

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

For commercial licensing inquiries (embedding MathFlow in proprietary products), contact: license@mathflow.studio

## Trademark

"MathFlow" is a trademark. Forks must be renamed. See [TRADEMARKS.md](TRADEMARKS.md).
