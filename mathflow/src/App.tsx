// SPDX-License-Identifier: AGPL-3.0-only
import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { loadTheme, applyTheme } from './lib/ai-settings';
import { AuthPage } from './components/Auth/AuthPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { SnippetPanel } from './components/SnippetPanel/SnippetPanel';
import { AISettingsPanel } from './components/Settings/AISettings';
import { updateNoteContent } from './lib/storage';
import { notes as notesApi, notebooks as notebooksApi } from './lib/api';
import { processSyncQueue, onOnlineStatusChange } from './lib/offline-storage';
import './styles/app.css';
import './styles/editor.css';
import './styles/math.css';

function AppContent() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [snippetPanelVisible, setSnippetPanelVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [skippedAuth, setSkippedAuth] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Process offline sync queue when coming back online
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = onOnlineStatusChange((online) => {
      if (online) {
        processSyncQueue({
          updateNote: (id, data) => notesApi.update(id, data),
          createNote: (notebookId, title) => notesApi.create(notebookId, title),
          deleteNote: (id) => notesApi.delete(id),
          createNotebook: (title) => notebooksApi.create(title),
          deleteNotebook: (id) => notebooksApi.delete(id),
          renameNotebook: (id, title) => notebooksApi.rename(id, title),
        }).then((count) => {
          if (count > 0) {
            console.log(`Synced ${count} offline operations`);
          }
        }).catch((err) => {
          console.warn('Sync queue processing failed:', err);
        });
      }
    });
    return cleanup;
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-content">
          <h2><span className="logo-math">Math</span><span className="logo-flow">Flow</span></h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated and hasn't skipped
  if (!isAuthenticated && !skippedAuth) {
    return <AuthPage onSuccess={() => setSkippedAuth(true)} />;
  }

  return (
    <div className="app">
      <Sidebar
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="main-area">
        <div className="main-header">
          <div className="main-header-left">
            {selectedNoteId ? (
              <span className="current-note-label">Editing note</span>
            ) : (
              <span className="welcome-label">Select or create a note to begin</span>
            )}
          </div>
          <div className="main-header-right">
            <button
              className={`header-btn ${snippetPanelVisible ? 'active' : ''}`}
              onClick={() => setSnippetPanelVisible(!snippetPanelVisible)}
              title="Toggle snippet reference"
            >
              Snippets
            </button>
            <button
              className="header-btn header-btn-settings"
              onClick={() => setSettingsVisible(true)}
              title="Settings"
            >
              Settings
            </button>
            {isAuthenticated && (
              <button
                className="header-btn"
                onClick={logout}
                title="Sign out"
              >
                Sign Out
              </button>
            )}
            {!isAuthenticated && (
              <button
                className="header-btn"
                onClick={() => setSkippedAuth(false)}
                title="Sign in for cloud sync"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="main-content">
          <div className="editor-area">
            {selectedNoteId ? (
              <Editor key={editorKey} noteId={selectedNoteId} />
            ) : (
              <div className="editor-placeholder">
                <div className="editor-placeholder-content">
                  <h2>
                    <span className="logo-math">Math</span>
                    <span className="logo-flow">Flow</span>
                  </h2>
                  <p>Fast, WYSIWYG math notes with LaTeX export</p>
                  <div className="quick-start">
                    <h3>Quick Start</h3>
                    <ul>
                      <li>Create a <strong>notebook</strong> in the sidebar</li>
                      <li>Add a <strong>note</strong> to your notebook</li>
                      <li>
                        Type <code>$</code> to enter <strong>inline math mode</strong>
                      </li>
                      <li>
                        Use <strong>snippets</strong> for fast input: <code>//</code> for fractions,{' '}
                        <code>sr</code> for squared, <code>{'->'}</code> for arrows
                      </li>
                      <li>
                        Press <code>Ctrl+K</code> for <strong>AI assistance</strong>
                      </li>
                      <li>
                        Click <strong>Export .tex</strong> or <strong>Export PDF</strong> to download
                      </li>
                    </ul>
                    {!isAuthenticated && (
                      <p className="cloud-hint">
                        <strong>Sign in</strong> to sync your notes across devices
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <SnippetPanel
            visible={snippetPanelVisible}
            onClose={() => setSnippetPanelVisible(false)}
          />
        </div>
      </div>

      {settingsVisible && <AISettingsPanel onClose={() => setSettingsVisible(false)} />}
    </div>
  );
}

function App() {
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
