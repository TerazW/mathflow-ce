// SPDX-License-Identifier: AGPL-3.0-only
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MathInline } from '../../extensions/MathInline';
import { MathDisplay } from '../../extensions/MathDisplay';
import { SnippetEngine } from '../../extensions/SnippetEngine';
import { TheoremEnv } from '../../extensions/TheoremEnv';
import { AIAssistant } from '../../extensions/AIAssistant';
import type { AIPopupEvent } from '../../extensions/AIAssistant';
import { TikZGraphics } from '../../extensions/TikZGraphics';
import { SymPyComputation } from '../../extensions/SymPyComputation';
import { downloadLaTeX } from '../../extensions/LaTeXExport';
import { exportToPDF } from '../../extensions/PDFExport';
import { updateNoteContent, getNote } from '../../lib/storage';
import { notes as notesApi } from '../../lib/api';
import { loadCustomPreamble } from '../../lib/ai-settings';
import { useAuth } from '../../lib/auth-context';
import {
  saveNoteOffline,
  getNoteOffline,
  queueSyncOp,
  isOnline,
} from '../../lib/offline-storage';
import { Toolbar } from '../Toolbar/Toolbar';
import { InlineAIPopup } from '../AIPanel/InlineAIPopup';
import { FormulaExplain } from '../FormulaExplain/FormulaExplain';
import { JSONContent } from '@tiptap/core';
import type { Extension } from '@tiptap/core';
import 'katex/dist/katex.min.css';

interface EditorProps {
  noteId: string | null;
  onContentChange?: (content: JSONContent) => void;
}

/** Load note content from localStorage, falling back to IndexedDB */
function loadFromLocalOrOffline(editor: any, noteId: string, noteIdRef?: React.RefObject<string | null>) {
  const note = getNote(noteId);
  if (note?.content) {
    editor.commands.setContent(note.content);
  } else {
    getNoteOffline(noteId).then((offlineNote: any) => {
      if (!noteIdRef || noteIdRef.current === noteId) {
        if (offlineNote?.content) {
          editor.commands.setContent(offlineNote.content);
        } else {
          editor.commands.setContent('');
        }
      }
    }).catch(() => {
      if (!noteIdRef || noteIdRef.current === noteId) {
        editor.commands.setContent('');
      }
    });
  }
}

export function Editor({ noteId, onContentChange }: EditorProps) {
  const { user, isAuthenticated } = useAuth();

  const [aiPopup, setAiPopup] = useState<{
    position: { top: number; left: number };
    context: string;
  } | null>(null);

  const [explainPopup, setExplainPopup] = useState<{
    latex: string;
    position: { top: number; left: number };
  } | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const noteIdRef = useRef<string | null>(noteId);
  const saveContentRef = useRef<(id: string, json: JSONContent) => void>(() => {});

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  const extensions = useMemo(() => {
    const baseExtensions: Extension[] = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }) as Extension,
      Underline as Extension,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading...';
          }
          return 'Start typing, or press $ for math mode...';
        },
      }) as Extension,
      MathInline as Extension,
      MathDisplay as Extension,
      SnippetEngine as Extension,
      TheoremEnv as Extension,
      AIAssistant as Extension,
      TikZGraphics as Extension,
      SymPyComputation as Extension,
    ];

    return baseExtensions;
  }, []);

  const saveContent = useCallback((id: string, json: JSONContent) => {
    updateNoteContent(id, json);
    saveNoteOffline({ id, content: json, updatedAt: Date.now() }).catch(() => {});

    if (isAuthenticated) {
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
      }
      cloudSaveTimerRef.current = setTimeout(() => {
        if (isOnline()) {
          notesApi.update(id, { content: json }).catch((err) => {
            console.warn('Cloud save failed, queuing for sync:', err);
            queueSyncOp({ type: 'update', entity: 'note', entityId: id, data: { content: json } }).catch(() => {});
          });
        } else {
          queueSyncOp({ type: 'update', entity: 'note', entityId: id, data: { content: json } }).catch(() => {});
        }
      }, 3000);
    }
  }, [isAuthenticated]);

  saveContentRef.current = saveContent;

  const editor = useEditor({
    extensions,
    content: '',
    onTransaction: ({ transaction, editor }) => {
      if (!transaction.docChanged) return;

      const json = editor.getJSON();
      onContentChange?.(json);

      const currentNoteId = noteIdRef.current;
      if (currentNoteId) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        setSaveStatus('saving');
        saveTimerRef.current = setTimeout(() => {
          saveContentRef.current(currentNoteId, json);
          setSaveStatus('saved');
          if (saveStatusTimerRef.current) {
            clearTimeout(saveStatusTimerRef.current);
          }
          saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
        }, 2000);
      }
    },
    editorProps: {
      attributes: {
        class: 'mathflow-editor-content',
        spellcheck: 'false',
      },
    },
  }, [extensions]);

  // Load note content when noteId changes
  const prevNoteIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (editor && noteId) {
      const prevId = prevNoteIdRef.current;
      if (prevId && prevId !== noteId && saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
        if (cloudSaveTimerRef.current) {
          clearTimeout(cloudSaveTimerRef.current);
          cloudSaveTimerRef.current = undefined;
        }
        const json = editor.getJSON();
        updateNoteContent(prevId, json);
        saveNoteOffline({ id: prevId, content: json, updatedAt: Date.now() }).catch(() => {});
        if (isAuthenticated && isOnline()) {
          notesApi.update(prevId, { content: json }).catch((err) => {
            console.warn('Cloud flush save failed, queuing:', err.message);
            queueSyncOp({ type: 'update', entity: 'note', entityId: prevId, data: { content: json } }).catch(() => {});
          });
        }
      }
      prevNoteIdRef.current = noteId;

      setSaveStatus('idle');
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = undefined;
      }

      editor.commands.setContent('');

      // Load from cloud first, then localStorage
      if (isAuthenticated && isOnline()) {
        notesApi.get(noteId)
          .then((cloudNote) => {
            if (noteIdRef.current !== noteId) return;
            if (cloudNote?.content) {
              editor.commands.setContent(cloudNote.content);
              updateNoteContent(noteId, cloudNote.content);
              saveNoteOffline({ id: noteId, content: cloudNote.content, updatedAt: Date.now() }).catch(() => {});
            } else {
              loadFromLocalOrOffline(editor, noteId, noteIdRef);
            }
          })
          .catch(() => {
            loadFromLocalOrOffline(editor, noteId, noteIdRef);
          });
      } else {
        loadFromLocalOrOffline(editor, noteId, noteIdRef);
      }
    } else if (editor && !noteId) {
      const prevId = prevNoteIdRef.current;
      if (prevId && saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
        if (cloudSaveTimerRef.current) {
          clearTimeout(cloudSaveTimerRef.current);
          cloudSaveTimerRef.current = undefined;
        }
        const json = editor.getJSON();
        updateNoteContent(prevId, json);
        saveNoteOffline({ id: prevId, content: json, updatedAt: Date.now() }).catch(() => {});
        if (isAuthenticated && isOnline()) {
          notesApi.update(prevId, { content: json }).catch((err) => {
            console.warn('Cloud flush save failed, queuing:', err.message);
            queueSyncOp({ type: 'update', entity: 'note', entityId: prevId, data: { content: json } }).catch(() => {});
          });
        }
      }
      prevNoteIdRef.current = null;
      editor.commands.setContent('');
    }
  }, [editor, noteId, isAuthenticated]);

  // Save before unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
        cloudSaveTimerRef.current = undefined;
      }
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = undefined;
      }
      if (noteIdRef.current && editor && !editor.isDestroyed) {
        saveContentRef.current(noteIdRef.current, editor.getJSON());
      }
    };
  }, [editor]);

  // Listen for AI popup events
  useEffect(() => {
    if (!editor) return;
    const handler = (data: AIPopupEvent) => {
      setAiPopup(data);
    };
    editor.on('openAIPopup', handler);
    return () => {
      editor.off('openAIPopup', handler);
    };
  }, [editor]);

  const handleInsertLatex = useCallback(
    (latex: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mathInline',
          attrs: { latex },
        })
        .run();
    },
    [editor]
  );

  // Listen for formula explain events from math nodes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.latex) {
        setExplainPopup({
          latex: detail.latex,
          position: { top: detail.top, left: detail.left },
        });
      }
    };
    document.addEventListener('mathflow:explain', handler);
    return () => document.removeEventListener('mathflow:explain', handler);
  }, []);

  const handleExportLatex = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
    const note = noteId ? getNote(noteId) : null;
    const customPreamble = loadCustomPreamble();
    downloadLaTeX(json, note?.title ? `${note.title}.tex` : 'notes.tex', customPreamble);
  }, [editor, noteId]);

  const editorScrollRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(() => {
    if (!editorScrollRef.current) return;
    const editorEl = editorScrollRef.current.querySelector('.ProseMirror') as HTMLElement;
    if (!editorEl) return;
    const note = noteId ? getNote(noteId) : null;
    exportToPDF(editorEl, note?.title || 'MathFlow Notes');
  }, [noteId]);

  if (!editor) return null;

  return (
    <div className="editor-container">
      <Toolbar editor={editor} onExportLatex={handleExportLatex} onExportPdf={handleExportPdf} />
      {saveStatus !== 'idle' && (
        <div className={`save-indicator ${saveStatus}`}>
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </div>
      )}
      <div className="editor-scroll-area" ref={editorScrollRef}>
        <EditorContent editor={editor} />
      </div>
      {aiPopup && (
        <InlineAIPopup
          position={aiPopup.position}
          context={aiPopup.context}
          onInsert={handleInsertLatex}
          onClose={() => setAiPopup(null)}
        />
      )}
      {explainPopup && (
        <FormulaExplain
          latex={explainPopup.latex}
          position={explainPopup.position}
          onClose={() => setExplainPopup(null)}
        />
      )}
    </div>
  );
}
