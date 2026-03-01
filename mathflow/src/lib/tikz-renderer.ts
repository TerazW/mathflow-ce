/**
 * TikZ rendering helper using tikzjax loaded in an iframe.
 * Lazy-loads tikzjax from CDN on first use.
 * Uses iframe isolation to handle tikzjax's DOMContentLoaded-based processing.
 */

// SVG cache keyed by TikZ source code (LRU eviction, max 50 entries)
const MAX_CACHE_SIZE = 50;
const svgCache = new Map<string, string>();

function cacheSet(key: string, value: string): void {
  if (svgCache.has(key)) svgCache.delete(key);
  svgCache.set(key, value);
  if (svgCache.size > MAX_CACHE_SIZE) {
    const oldest = svgCache.keys().next().value;
    if (oldest !== undefined) svgCache.delete(oldest);
  }
}

let fontsLoaded = false;

function ensureFontsLoaded(): void {
  if (fontsLoaded) return;
  fontsLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = 'https://tikzjax.com/v1/fonts.css';
  document.head.appendChild(link);
}

/**
 * Render TikZ code to SVG string.
 * Returns cached result if available.
 * Uses an iframe with tikzjax to render.
 */
export async function renderTikZ(tikzCode: string): Promise<string> {
  const trimmed = tikzCode.trim();
  if (!trimmed) throw new Error('Empty TikZ code');

  // Check cache
  const cached = svgCache.get(trimmed);
  if (cached) return cached;

  // Ensure fonts are loaded in the parent document for display
  ensureFontsLoaded();

  return new Promise<string>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;height:600px;border:none;';
    // allow-same-origin is needed to read iframe.contentDocument for SVG output.
    // Combined with allow-scripts this provides limited isolation, but the SVG output
    // is sanitized via DOMParser in TikZGraphics.ts before insertion into the document.
    iframe.sandbox.add('allow-scripts', 'allow-same-origin');
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      iframe.remove();
      reject(new Error('TikZ rendering timed out (30s). Check your TikZ code for errors.'));
    }, 30000);

    // Escape script closing tags in tikz code
    const escapedCode = trimmed.replace(/<\/script/gi, '<\\/script');

    const html = `<!DOCTYPE html>
<html><head>
<link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
<script src="https://tikzjax.com/v1/tikzjax.js"><\/script>
</head><body>
<script type="text/tikz">${escapedCode}<\/script>
</body></html>`;

    // Poll for SVG output (tikzjax replaces the script element with SVG)
    const checkInterval = setInterval(() => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc) return;
        const svg = iframeDoc.querySelector('svg');
        if (svg) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          const svgHTML = svg.outerHTML;
          cacheSet(trimmed, svgHTML);
          iframe.remove();
          resolve(svgHTML);
        }
      } catch {
        // May get cross-origin errors in some cases
      }
    }, 300);

    iframe.srcdoc = html;
  });
}

/**
 * Clear the SVG cache (e.g., when memory needs to be freed).
 */
export function clearTikZCache(): void {
  svgCache.clear();
}

/**
 * Check if a TikZ code string has a cached render.
 */
export function hasCachedRender(tikzCode: string): boolean {
  return svgCache.has(tikzCode.trim());
}
