import type { TikzFigure } from '../model/TikzAST';

interface HistoryEntry {
  snapshot: string;
  description: string;
}

const MAX_STACK = 50;

export class UndoManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  pushUndo(figure: TikzFigure, description: string) {
    this.undoStack.push({
      snapshot: JSON.stringify(figure),
      description,
    });
    if (this.undoStack.length > MAX_STACK) {
      this.undoStack.shift();
    }
    // Clear redo on new action
    this.redoStack = [];
  }

  undo(currentFigure: TikzFigure): TikzFigure | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    this.redoStack.push({
      snapshot: JSON.stringify(currentFigure),
      description: entry.description,
    });

    return JSON.parse(entry.snapshot);
  }

  redo(currentFigure: TikzFigure): TikzFigure | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    this.undoStack.push({
      snapshot: JSON.stringify(currentFigure),
      description: entry.description,
    });

    return JSON.parse(entry.snapshot);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
