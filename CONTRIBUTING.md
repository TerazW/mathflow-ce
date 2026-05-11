# Contributing to MathFlow

Thank you for your interest in contributing to MathFlow! This guide will help you get started.

## Contributor License Agreement (CLA)

Before your first contribution can be merged, you must sign our CLA. This is required so that we can offer commercial licenses to organizations that want to embed MathFlow in proprietary products.

When you open your first PR, the CLA bot will automatically ask you to sign. It's a one-time process. You can read the full CLA text in [CLA.md](CLA.md).

## What to Contribute

### Great First Contributions

- **Snippets** — Add domain-specific LaTeX snippets (e.g., chemistry, economics, music notation). See `mathflow/src/snippets/` for examples.
- **Bug fixes** — Check the issue tracker for bugs labeled `good first issue`.
- **Documentation** — Improve the user guide or add examples.

### Snippet Contributions

The easiest way to contribute. Create a new snippet file or add to an existing category:

```typescript
// mathflow/src/snippets/your-category.ts
import { Snippet } from './index';

export const yourSnippets: Snippet[] = [
  {
    trigger: 'your-trigger',
    replacement: '\\your-latex',
    mode: 'math',
    description: 'Description of what it does',
    category: 'Your Category',
    priority: 50,
  },
];
```

### Larger Contributions

For significant features or architectural changes, please open an issue first to discuss the approach. This prevents wasted effort and ensures alignment with the project direction.

## Development Setup

```bash
# Frontend (port 5173)
cd mathflow && npm install && npm run dev

# Backend (port 3001)
cd mathflow/server && npm install && npm run dev
```

## Code Style

- TypeScript strict mode
- No unnecessary comments or docstrings on self-explanatory code
- Keep changes minimal and focused
- Run `npm run lint` before submitting

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run `npm run lint` and fix any issues
5. Ensure the build succeeds (`npm run build`)
6. Open a PR with a clear description (use the PR template)
7. Sign the CLA when prompted
8. Wait for CI to pass and a maintainer to review

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.
