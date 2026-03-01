/**
 * Snippet processing for math node editors (textarea and contentEditable).
 * These are separate from the ProseMirror snippet engine because math nodes
 * use native DOM elements for editing, not ProseMirror content.
 */
import { allSnippets } from '../snippets';
import type { Snippet } from '../snippets';

// Mode-switching snippets should NOT fire inside math editors (already in math mode)
const MODE_SWITCH_TRIGGERS = new Set(['mk', '$', 'dm', '$$']);

/**
 * Find the matching opening parenthesis for a closing paren at the end of text.
 */
function findMatchingParen(text: string): number {
  if (!text.endsWith(')')) return -1;
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Check if cursor position is inside a \text{}-like command where
 * snippet expansion should be suppressed.
 * Covers \text{}, \textbf{}, \textit{}, \textrm{}, \texttt{}, \textsf{}, etc.
 */
function isInsideTextCommand(textBefore: string): boolean {
  const textCmdPattern = /\\text\w*\{/g;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = textCmdPattern.exec(textBefore)) !== null) {
    lastMatch = m;
  }
  if (!lastMatch) return false;
  // Check if the brace opened by the command is still unclosed
  const afterCmd = textBefore.substring(lastMatch.index + lastMatch[0].length);
  let depth = 1;
  for (const ch of afterCmd) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) return false;
  }
  return true;
}

// Filter: only math-mode auto-expand snippets, excluding mode switches
const mathAutoSnippets: Snippet[] = allSnippets.filter(
  (s) =>
    s.options.triggerKind === 'auto' &&
    (s.options.mode === 'math' || s.options.mode === 'both') &&
    !(typeof s.trigger === 'string' && MODE_SWITCH_TRIGGERS.has(s.trigger))
);

// Filter: only math-mode tab-expand snippets
const mathTabSnippets: Snippet[] = allSnippets
  .filter(
    (s) =>
      s.options.triggerKind === 'tab' &&
      (s.options.mode === 'math' || s.options.mode === 'both')
  )
  .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

function getReplacement(snippet: Snippet, match: string[]): string {
  const raw =
    typeof snippet.replacement === 'function'
      ? snippet.replacement(match)
      : snippet.replacement;
  // Remove tab stop markers — place cursor at first $1 position
  const firstTabIdx = raw.indexOf('$1');
  if (firstTabIdx >= 0) {
    // Return replacement with cursor marker
    const cleaned = raw.replace(/\$\d+/g, '');
    return cleaned;
  }
  return raw.replace(/\$\d+/g, '');
}

function getCursorOffset(snippet: Snippet, match: string[]): number {
  const raw =
    typeof snippet.replacement === 'function'
      ? snippet.replacement(match)
      : snippet.replacement;
  // Find position of first $1 in the raw replacement
  const idx = raw.indexOf('$1');
  if (idx >= 0) {
    // Count characters before $1, excluding other $N markers before it
    const before = raw.substring(0, idx).replace(/\$\d+/g, '');
    return before.length;
  }
  // No tab stops — cursor at end
  return -1;
}

/**
 * Process auto-expand snippets in a textarea.
 * Call from the textarea 'input' event handler.
 * Returns true if a snippet was expanded.
 */
export function processAutoSnippetTextarea(textarea: HTMLTextAreaElement): boolean {
  const cursorPos = textarea.selectionStart;
  if (cursorPos === null || cursorPos === undefined) return false;
  const text = textarea.value;
  const textBefore = text.substring(0, cursorPos);
  const textAfter = text.substring(cursorPos);

  // Suppress all snippet expansion inside \text{}-like commands
  if (isInsideTextCommand(textBefore)) return false;

  // Smart parenthesized fraction: (expr)/ → \frac{expr}{}
  if (textBefore.endsWith('/')) {
    const beforeSlash = textBefore.slice(0, -1);
    if (beforeSlash.endsWith(')')) {
      const matchIdx = findMatchingParen(beforeSlash);
      if (matchIdx >= 0) {
        const inner = beforeSlash.substring(matchIdx + 1, beforeSlash.length - 1);
        const replacement = `\\frac{${inner}}{}`;
        textarea.value = beforeSlash.substring(0, matchIdx) + replacement + textAfter;
        const newCursor = beforeSlash.substring(0, matchIdx).length + replacement.length - 1;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
        return true;
      }
    }
  }

  for (const snippet of mathAutoSnippets) {
    if (typeof snippet.trigger === 'string') {
      if (!textBefore.endsWith(snippet.trigger)) continue;
      if (snippet.options.wordBoundary) {
        const charBefore = textBefore[textBefore.length - snippet.trigger.length - 1];
        if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
      }
      const replacement = getReplacement(snippet, [textBefore]);
      const cursorOff = getCursorOffset(snippet, [textBefore]);
      const deleteFrom = cursorPos - snippet.trigger.length;
      textarea.value = text.substring(0, deleteFrom) + replacement + textAfter;
      const newCursor =
        cursorOff >= 0 ? deleteFrom + cursorOff : deleteFrom + replacement.length;
      textarea.selectionStart = textarea.selectionEnd = newCursor;
      return true;
    } else if (snippet.trigger instanceof RegExp) {
      const match = textBefore.match(snippet.trigger);
      if (!match || match.index === undefined) continue;
      if (snippet.options.wordBoundary) {
        const charBefore = textBefore[match.index - 1];
        if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
      }
      const replacement = getReplacement(snippet, match);
      const cursorOff = getCursorOffset(snippet, match);
      const matchStart = match.index;
      textarea.value = textBefore.substring(0, matchStart) + replacement + textAfter;
      const newCursor =
        cursorOff >= 0 ? matchStart + cursorOff : matchStart + replacement.length;
      textarea.selectionStart = textarea.selectionEnd = newCursor;
      return true;
    }
  }
  return false;
}

/**
 * Process tab-expand snippets in a textarea.
 * Call from the textarea 'keydown' handler when Tab is pressed.
 * Returns true if a snippet was expanded.
 */
export function processTabSnippetTextarea(textarea: HTMLTextAreaElement): boolean {
  const cursorPos = textarea.selectionStart;
  if (cursorPos === null || cursorPos === undefined) return false;
  const text = textarea.value;
  const textBefore = text.substring(0, cursorPos);
  const textAfter = text.substring(cursorPos);

  // Suppress all snippet expansion inside \text{}-like commands
  if (isInsideTextCommand(textBefore)) return false;

  for (const snippet of mathTabSnippets) {
    if (typeof snippet.trigger !== 'string') continue;
    if (!textBefore.endsWith(snippet.trigger)) continue;
    if (snippet.options.wordBoundary) {
      const charBefore = textBefore[textBefore.length - snippet.trigger.length - 1];
      if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
    }
    const replacement = getReplacement(snippet, [textBefore]);
    const cursorOff = getCursorOffset(snippet, [textBefore]);
    const deleteFrom = cursorPos - snippet.trigger.length;
    textarea.value = text.substring(0, deleteFrom) + replacement + textAfter;
    const newCursor =
      cursorOff >= 0 ? deleteFrom + cursorOff : deleteFrom + replacement.length;
    textarea.selectionStart = textarea.selectionEnd = newCursor;
    return true;
  }
  return false;
}

/**
 * Process auto-expand snippets in a contentEditable element (for inline math).
 * Returns true if a snippet was expanded.
 */
export function processAutoSnippetContentEditable(element: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const text = element.textContent || '';
  const range = sel.getRangeAt(0);
  // Calculate cursor position within the element
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const cursorPos = preRange.toString().length;

  const textBefore = text.substring(0, cursorPos);
  const textAfter = text.substring(cursorPos);

  // Suppress all snippet expansion inside \text{}-like commands
  if (isInsideTextCommand(textBefore)) return false;

  // Smart parenthesized fraction: (expr)/ → \frac{expr}{}
  if (textBefore.endsWith('/')) {
    const beforeSlash = textBefore.slice(0, -1);
    if (beforeSlash.endsWith(')')) {
      const matchIdx = findMatchingParen(beforeSlash);
      if (matchIdx >= 0) {
        const inner = beforeSlash.substring(matchIdx + 1, beforeSlash.length - 1);
        const replacement = `\\frac{${inner}}{}`;
        const newText = beforeSlash.substring(0, matchIdx) + replacement + textAfter;
        element.textContent = newText;
        const newCursor = beforeSlash.substring(0, matchIdx).length + replacement.length - 1;
        setCursorInElement(element, newCursor);
        return true;
      }
    }
  }

  for (const snippet of mathAutoSnippets) {
    if (typeof snippet.trigger === 'string') {
      if (!textBefore.endsWith(snippet.trigger)) continue;
      if (snippet.options.wordBoundary) {
        const charBefore = textBefore[textBefore.length - snippet.trigger.length - 1];
        if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
      }
      const replacement = getReplacement(snippet, [textBefore]);
      const cursorOff = getCursorOffset(snippet, [textBefore]);
      const deleteFrom = cursorPos - snippet.trigger.length;
      const newText = text.substring(0, deleteFrom) + replacement + textAfter;
      element.textContent = newText;
      // Set cursor
      const newCursor =
        cursorOff >= 0 ? deleteFrom + cursorOff : deleteFrom + replacement.length;
      setCursorInElement(element, newCursor);
      return true;
    } else if (snippet.trigger instanceof RegExp) {
      const match = textBefore.match(snippet.trigger);
      if (!match || match.index === undefined) continue;
      if (snippet.options.wordBoundary) {
        const charBefore = textBefore[match.index - 1];
        if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
      }
      const replacement = getReplacement(snippet, match);
      const cursorOff = getCursorOffset(snippet, match);
      const matchStart = match.index;
      const newText = textBefore.substring(0, matchStart) + replacement + textAfter;
      element.textContent = newText;
      const newCursor =
        cursorOff >= 0 ? matchStart + cursorOff : matchStart + replacement.length;
      setCursorInElement(element, newCursor);
      return true;
    }
  }
  return false;
}

/**
 * Process tab-expand snippets in a contentEditable element.
 * Returns true if a snippet was expanded.
 */
export function processTabSnippetContentEditable(element: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const text = element.textContent || '';
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const cursorPos = preRange.toString().length;

  const textBefore = text.substring(0, cursorPos);
  const textAfter = text.substring(cursorPos);

  // Suppress all snippet expansion inside \text{}-like commands
  if (isInsideTextCommand(textBefore)) return false;

  for (const snippet of mathTabSnippets) {
    if (typeof snippet.trigger !== 'string') continue;
    if (!textBefore.endsWith(snippet.trigger)) continue;
    if (snippet.options.wordBoundary) {
      const charBefore = textBefore[textBefore.length - snippet.trigger.length - 1];
      if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
    }
    const replacement = getReplacement(snippet, [textBefore]);
    const cursorOff = getCursorOffset(snippet, [textBefore]);
    const deleteFrom = cursorPos - snippet.trigger.length;
    const newText = text.substring(0, deleteFrom) + replacement + textAfter;
    element.textContent = newText;
    const newCursor =
      cursorOff >= 0 ? deleteFrom + cursorOff : deleteFrom + replacement.length;
    setCursorInElement(element, newCursor);
    return true;
  }
  return false;
}

function setCursorInElement(element: HTMLElement, pos: number) {
  const textNode = element.firstChild;
  if (!textNode) return;
  const newRange = document.createRange();
  const newSel = window.getSelection();
  const safePos = Math.min(pos, textNode.textContent?.length || 0);
  newRange.setStart(textNode, safePos);
  newRange.collapse(true);
  newSel?.removeAllRanges();
  newSel?.addRange(newRange);
}
