/**
 * Browser-side LaTeX → PDF, via the local **MathFlow Bridge** (BYOL pattern).
 *
 * Pipeline:
 *   editor JSON  →  exportToLaTeX()  →  .tex source
 *                                     ↓
 *                          POST http://127.0.0.1:5555/compile
 *                          (compiled on the user's machine with their
 *                           local TeX Live — pdflatex / xelatex / lualatex
 *                           via latexmk for cross-refs, TOC, bib)
 *                                     ↓
 *                                  PDF bytes  →  download
 *
 * Why this shape:
 *   - We previously tried SwiftLaTeX WASM. The whole upstream stack (engine
 *     CDN, package server) decayed and turned out to be unusable in practice.
 *     See Session 12 in CLAUDE.md.
 *   - Real `pdflatex` matches Overleaf output exactly and costs MathFlow $0
 *     per compile: the user's CPU does the work.
 *   - Friction is acceptable because the target audience (math PhD students)
 *     overwhelmingly already has TeX Live installed.
 *
 * Failure modes are surfaced through dedicated error classes so the caller
 * can distinguish "bridge isn't running" (→ show setup modal) from "bridge
 * ran but pdflatex hit a LaTeX error" (→ show compile log).
 */

import type { JSONContent } from '@tiptap/core';
import { exportToLaTeX } from './LaTeXExport';
import {
  BridgeCompileError,
  BridgeNoEngineError,
  BridgeOfflineError,
  BridgeEngine,
  compileViaBridge,
} from '../lib/bridge';

export type ProgressCallback = (stage: string, detail?: string) => void;

/**
 * Compile + trigger a browser download. The caller-visible API is unchanged
 * from the previous SwiftLaTeX implementation so `Editor.tsx` doesn't have
 * to care which backend is wired up.
 */
export async function exportToLatexPDF(
  doc: JSONContent,
  filename: string,
  customPreamble: string,
  onProgress?: ProgressCallback,
  engine: BridgeEngine = 'pdflatex',
): Promise<void> {
  onProgress?.('preparing', 'Generating LaTeX source…');
  const tex = exportToLaTeX(doc, customPreamble);

  onProgress?.('compiling', `Compiling with local ${engine}…`);
  const pdf = await compileViaBridge(tex, engine);

  onProgress?.('done', 'Ready');

  // Copy bytes into a fresh Uint8Array so Blob accepts it across all current
  // TS lib variants without SharedArrayBuffer-union confusion.
  const copy = new Uint8Array(pdf.byteLength);
  copy.set(pdf);
  const blob = new Blob([copy as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Re-export for callers that want to catch errors and discriminate. Keeping
// `LaTeXCompileError` as an alias of `BridgeCompileError` preserves the
// old import name in Editor.tsx without churn.
export { BridgeOfflineError, BridgeNoEngineError, BridgeCompileError };
export const LaTeXCompileError = BridgeCompileError;
export type LaTeXCompileError = BridgeCompileError;
