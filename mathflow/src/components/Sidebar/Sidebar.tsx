import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Notebook,
  Note,
  getNotebooks,
  createNotebook as localCreateNotebook,
  deleteNotebook as localDeleteNotebook,
  renameNotebook as localRenameNotebook,
  getNotesForNotebook as localGetNotesForNotebook,
  createNote as localCreateNote,
  deleteNote as localDeleteNote,
  renameNote as localRenameNote,
  getNotes as localGetAllNotes,
} from '../../lib/storage';
import { notebooks as notebooksApi, notes as notesApi } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import './Sidebar.css';

interface SidebarProps {
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  collapsed: boolean;
  onToggle: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  snippet?: string;
}

export function Sidebar({ selectedNoteId, onSelectNote, collapsed, onToggle }: SidebarProps) {
  const { isAuthenticated } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notebooks
  const refreshNotebooks = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const data = await notebooksApi.list();
        setNotebooks(data);
      } catch {
        // Fallback to local
        setNotebooks(getNotebooks());
      }
    } else {
      setNotebooks(getNotebooks());
    }
  }, [isAuthenticated]);

  // Load notes for a notebook
  const refreshNotes = useCallback(async () => {
    if (!expandedNotebook) return;
    if (isAuthenticated) {
      try {
        const data = await notesApi.list(expandedNotebook);
        setNotes(data);
      } catch {
        setNotes(localGetNotesForNotebook(expandedNotebook));
      }
    } else {
      setNotes(localGetNotesForNotebook(expandedNotebook));
    }
  }, [expandedNotebook, isAuthenticated]);

  useEffect(() => {
    refreshNotebooks();
  }, [refreshNotebooks]);

  useEffect(() => {
    if (expandedNotebook) {
      refreshNotes();
    }
  }, [expandedNotebook, refreshNotes]);

  // Search with debounce
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      if (isAuthenticated) {
        try {
          const results = await notesApi.search(query);
          setSearchResults(
            results.map((r: any) => ({
              id: r.id,
              title: r.title || 'Untitled',
              snippet: r.snippet || undefined,
            }))
          );
        } catch {
          // Fallback to local search
          performLocalSearch(query);
        }
      } else {
        performLocalSearch(query);
      }
      setSearching(false);
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery, isAuthenticated]);

  const performLocalSearch = (query: string) => {
    const allNotes = localGetAllNotes();
    const lowerQuery = query.toLowerCase();
    const filtered = allNotes
      .filter((n) => n.title.toLowerCase().includes(lowerQuery))
      .map((n) => ({
        id: n.id,
        title: n.title,
      }));
    setSearchResults(filtered);
  };

  const handleNewNotebook = async () => {
    if (isAuthenticated) {
      try {
        const nb = await notebooksApi.create('New Notebook');
        await refreshNotebooks();
        setExpandedNotebook(nb.id);
        setEditingId(nb.id);
        setEditingValue(nb.title || 'New Notebook');
        return;
      } catch {
        // Fallback to local
      }
    }
    const nb = localCreateNotebook('New Notebook');
    refreshNotebooks();
    setExpandedNotebook(nb.id);
    setEditingId(nb.id);
    setEditingValue(nb.title);
  };

  const handleNewNote = async () => {
    if (!expandedNotebook) return;
    if (isAuthenticated) {
      try {
        const note = await notesApi.create(expandedNotebook, 'New Note');
        await refreshNotes();
        onSelectNote(note.id);
        setEditingId(note.id);
        setEditingValue(note.title || 'New Note');
        return;
      } catch {
        // Fallback to local
      }
    }
    const note = localCreateNote(expandedNotebook, 'New Note');
    refreshNotes();
    onSelectNote(note.id);
    setEditingId(note.id);
    setEditingValue(note.title);
  };

  const handleRenameSubmit = async (type: 'notebook' | 'note') => {
    if (!editingId || !editingValue.trim()) return;
    if (isAuthenticated) {
      try {
        if (type === 'notebook') {
          await notebooksApi.rename(editingId, editingValue.trim());
        } else {
          await notesApi.update(editingId, { title: editingValue.trim() });
        }
        setEditingId(null);
        if (type === 'notebook') {
          await refreshNotebooks();
        } else {
          await refreshNotes();
        }
        return;
      } catch {
        // Fallback to local
      }
    }
    if (type === 'notebook') {
      localRenameNotebook(editingId, editingValue.trim());
      refreshNotebooks();
    } else {
      localRenameNote(editingId, editingValue.trim());
      refreshNotes();
    }
    setEditingId(null);
  };

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this notebook and all its notes?')) return;

    if (isAuthenticated) {
      try {
        await notebooksApi.delete(id);
        await refreshNotebooks();
        if (expandedNotebook === id) {
          setExpandedNotebook(null);
          setNotes([]);
          onSelectNote(null);
        }
        return;
      } catch {
        // Fallback to local
      }
    }
    localDeleteNotebook(id);
    refreshNotebooks();
    if (expandedNotebook === id) {
      setExpandedNotebook(null);
      setNotes([]);
      onSelectNote(null);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this note?')) return;

    if (isAuthenticated) {
      try {
        await notesApi.delete(id);
        await refreshNotes();
        if (selectedNoteId === id) {
          onSelectNote(null);
        }
        return;
      } catch {
        // Fallback to local
      }
    }
    localDeleteNote(id);
    refreshNotes();
    if (selectedNoteId === id) {
      onSelectNote(null);
    }
  };

  const handleSearchSelect = (noteId: string) => {
    onSelectNote(noteId);
    setSearchQuery('');
    setSearchResults([]);
  };

  const isSearchActive = searchQuery.trim().length > 0;

  if (collapsed) {
    return (
      <div className="sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggle} title="Expand sidebar">
          &#9776;
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">
          <span className="logo-math">Math</span>
          <span className="logo-flow">Flow</span>
        </h1>
        <button className="sidebar-toggle" onClick={onToggle} title="Collapse sidebar">
          &lsaquo;
        </button>
      </div>

      <div className="sidebar-search">
        <input
          className="sidebar-search-input"
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="sidebar-search-clear"
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
            title="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {isSearchActive ? (
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Search Results</span>
          </div>
          <div className="sidebar-list">
            {searching ? (
              <div className="sidebar-empty">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="sidebar-empty">No results found</div>
            ) : (
              searchResults.map((result) => (
                <div
                  key={result.id}
                  className={`sidebar-item note-item ${selectedNoteId === result.id ? 'selected' : ''}`}
                  onClick={() => handleSearchSelect(result.id)}
                >
                  <span className="sidebar-item-icon note-icon">{'\u25AB'}</span>
                  <div className="sidebar-search-result-content">
                    <span className="sidebar-item-text">{result.title}</span>
                    {result.snippet && (
                      <span className="sidebar-search-snippet">{result.snippet}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Notebooks</span>
            <button className="sidebar-add-btn" onClick={handleNewNotebook} title="New notebook">
              +
            </button>
          </div>
          <div className="sidebar-list">
            {notebooks.length === 0 && (
              <div className="sidebar-empty">No notebooks yet. Create one to get started!</div>
            )}
            {notebooks.map((nb) => (
              <div key={nb.id}>
                <div
                  className={`sidebar-item notebook-item ${expandedNotebook === nb.id ? 'expanded' : ''}`}
                  onClick={() => {
                    setExpandedNotebook(expandedNotebook === nb.id ? null : nb.id);
                  }}
                >
                  <span className="sidebar-item-icon">
                    {expandedNotebook === nb.id ? '\u25BC' : '\u25B6'}
                  </span>
                  {editingId === nb.id ? (
                    <input
                      className="sidebar-rename-input"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleRenameSubmit('notebook')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit('notebook');
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="sidebar-item-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(nb.id);
                        setEditingValue(nb.title);
                      }}
                    >
                      {nb.title}
                    </span>
                  )}
                  <button
                    className="sidebar-rename-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(nb.id);
                      setEditingValue(nb.title);
                    }}
                    title="Rename notebook"
                  >
                    {'\u270E'}
                  </button>
                  <button
                    className="sidebar-delete-btn"
                    onClick={(e) => handleDeleteNotebook(nb.id, e)}
                    title="Delete notebook"
                  >
                    &times;
                  </button>
                </div>

                {expandedNotebook === nb.id && (
                  <div className="sidebar-notes">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`sidebar-item note-item ${selectedNoteId === note.id ? 'selected' : ''}`}
                        onClick={() => onSelectNote(note.id)}
                      >
                        <span className="sidebar-item-icon note-icon">{'\u25AB'}</span>
                        {editingId === note.id ? (
                          <input
                            className="sidebar-rename-input"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleRenameSubmit('note')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit('note');
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="sidebar-item-text"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingId(note.id);
                              setEditingValue(note.title);
                            }}
                          >
                            {note.title}
                          </span>
                        )}
                        <button
                          className="sidebar-rename-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(note.id);
                            setEditingValue(note.title);
                          }}
                          title="Rename note"
                        >
                          {'\u270E'}
                        </button>
                        <button
                          className="sidebar-delete-btn"
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          title="Delete note"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button className="sidebar-new-note-btn" onClick={handleNewNote}>
                      + New Note
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-shortcuts-hint">
          <strong>Shortcuts:</strong>
          <div>$ &mdash; inline math</div>
          <div>$$ &mdash; display math</div>
          <div>Ctrl+K &mdash; AI assist</div>
          <div>Tab &mdash; expand snippet</div>
        </div>
      </div>
    </div>
  );
}
