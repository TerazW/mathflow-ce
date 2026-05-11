import type { ToolType } from '../model/TikzAST';

export interface KeyboardActions {
  setTool: (tool: ToolType) => void;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  toggleSnap: () => void;
  cycleLineStyle: () => void;
  setColor: (color: string) => void;
  close: () => void;
}

const TOOL_KEYS: Record<string, ToolType> = {
  'v': 'select',
  'l': 'line',
  'a': 'arrow',
  'q': 'rect',
  'c': 'circle',
  'e': 'ellipse',
  'r': 'arc',
  'b': 'bezier',
  'f': 'plot',
  'h': 'fill',
  't': 'label',
  'p': 'path',
  'j': 'edge',
  'm': 'matrix',
};

const COLOR_KEYS: Record<string, string> = {
  '1': 'black',
  '2': 'blue',
  '3': 'red',
  '4': 'green!60!black',
  '5': 'purple',
};

export function handleKeyDown(e: KeyboardEvent, actions: KeyboardActions): boolean {
  // Ignore if focused in input/textarea
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false;
  }

  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  if (ctrl && key === 'z' && !e.shiftKey) {
    e.preventDefault();
    actions.undo();
    return true;
  }
  if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
    e.preventDefault();
    actions.redo();
    return true;
  }
  if (ctrl && key === 'd') {
    e.preventDefault();
    actions.duplicateSelected();
    return true;
  }

  // Delete
  if (key === 'delete' || key === 'backspace') {
    e.preventDefault();
    actions.deleteSelected();
    return true;
  }

  // Escape
  if (key === 'escape') {
    actions.close();
    return true;
  }

  // Tool shortcuts
  if (!ctrl && TOOL_KEYS[key]) {
    actions.setTool(TOOL_KEYS[key]);
    return true;
  }

  // Toggles
  if (key === 'g') { actions.toggleGrid(); return true; }
  if (key === 'x') { actions.toggleAxes(); return true; }
  if (key === 's' && !ctrl) { actions.toggleSnap(); return true; }
  if (key === 'd' && !ctrl) { actions.cycleLineStyle(); return true; }

  // Color keys
  if (COLOR_KEYS[key]) {
    actions.setColor(COLOR_KEYS[key]);
    return true;
  }

  return false;
}
