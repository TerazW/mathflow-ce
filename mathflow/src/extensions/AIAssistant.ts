import { Extension } from '@tiptap/core';

export interface AIPopupEvent {
  position: { top: number; left: number };
  context: string;
}

declare module '@tiptap/core' {
  interface EditorEvents {
    openAIPopup: AIPopupEvent;
  }

  interface Commands<ReturnType> {
    aiAssistant: {
      openAIPopup: () => ReturnType;
    };
  }
}

export const AIAssistant = Extension.create({
  name: 'aiAssistant',

  addCommands() {
    return {
      openAIPopup:
        () =>
        ({ editor }) => {
          const { view } = editor;
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);

          const doc = view.state.doc;
          const start = Math.max(0, from - 500);
          const end = Math.min(doc.content.size, from + 500);
          const context = doc.textBetween(start, end);

          editor.emit('openAIPopup', {
            position: { top: coords.top, left: coords.left },
            context,
          });

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        return this.editor.commands.openAIPopup();
      },
    };
  },
});
