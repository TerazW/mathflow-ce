import { useState, useEffect } from 'react';
import {
  AISettings as AISettingsType,
  saveAISettings,
  loadAISettings,
  MODEL_OPTIONS,
  API_KEY_LINKS,
  saveCustomPreamble,
  loadCustomPreamble,
  CustomSnippetDef,
  saveCustomSnippets,
  loadCustomSnippets,
  ThemeId,
  THEMES,
  saveTheme,
  loadTheme,
} from '../../lib/ai-settings';
import { v4 as uuidv4 } from 'uuid';
import './AISettings.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

type SettingsTab = 'ai' | 'latex' | 'snippets' | 'theme';

interface AISettingsProps {
  onClose: () => void;
}

export function AISettingsPanel({ onClose }: AISettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  // AI settings state
  const [provider, setProvider] = useState<AISettingsType['provider']>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // LaTeX preamble state
  const [preamble, setPreamble] = useState('');
  const [preambleSaved, setPreambleSaved] = useState(false);

  // Custom snippets state
  const [customSnippets, setCustomSnippets] = useState<CustomSnippetDef[]>([]);
  const [editingSnippet, setEditingSnippet] = useState<CustomSnippetDef | null>(null);
  const [snippetsSaved, setSnippetsSaved] = useState(false);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('light');

  useEffect(() => {
    const settings = loadAISettings();
    if (settings) {
      setProvider(settings.provider);
      setApiKey(settings.apiKey);
      setModel(settings.model);
    }
    setPreamble(loadCustomPreamble());
    setCustomSnippets(loadCustomSnippets());
    setCurrentTheme(loadTheme());
  }, []);

  useEffect(() => {
    const models = MODEL_OPTIONS[provider];
    if (models?.length && !models.find((m) => m.value === model)) {
      setModel(models[0].value);
    }
  }, [provider, model]);

  const handleSaveAI = () => {
    saveAISettings({ provider, apiKey, model });
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${API_BASE}/api/ai/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model }),
      });
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success ? 'Connection successful!' : data.error,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network error: ${err.message}`,
      });
    }
    setTesting(false);
  };

  const handleSavePreamble = () => {
    saveCustomPreamble(preamble);
    setPreambleSaved(true);
    setTimeout(() => setPreambleSaved(false), 2000);
  };

  const handleAddSnippet = () => {
    setEditingSnippet({
      id: uuidv4(),
      trigger: '',
      replacement: '',
      mode: 'math',
      triggerKind: 'auto',
      description: '',
    });
  };

  const handleSaveSnippet = () => {
    if (!editingSnippet || !editingSnippet.trigger || !editingSnippet.replacement) return;
    const existing = customSnippets.findIndex((s) => s.id === editingSnippet.id);
    let updated: CustomSnippetDef[];
    if (existing >= 0) {
      updated = [...customSnippets];
      updated[existing] = editingSnippet;
    } else {
      updated = [...customSnippets, editingSnippet];
    }
    setCustomSnippets(updated);
    saveCustomSnippets(updated);
    setEditingSnippet(null);
    setSnippetsSaved(true);
    setTimeout(() => setSnippetsSaved(false), 2000);
  };

  const handleDeleteSnippet = (id: string) => {
    const updated = customSnippets.filter((s) => s.id !== id);
    setCustomSnippets(updated);
    saveCustomSnippets(updated);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel settings-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Provider
          </button>
          <button
            className={`settings-tab ${activeTab === 'latex' ? 'active' : ''}`}
            onClick={() => setActiveTab('latex')}
          >
            LaTeX Preamble
          </button>
          <button
            className={`settings-tab ${activeTab === 'snippets' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippets')}
          >
            Custom Snippets
          </button>
          <button
            className={`settings-tab ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            Theme
          </button>
        </div>

        {activeTab === 'ai' && (
          <>
            <div className="settings-body">
              <div className="settings-field">
                <label>AI Provider</label>
                <div className="provider-buttons">
                  {(['openai', 'anthropic', 'gemini'] as const).map((p) => (
                    <button
                      key={p}
                      className={`provider-btn ${provider === p ? 'active' : ''}`}
                      onClick={() => setProvider(p)}
                    >
                      {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Google Gemini'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-field">
                <label>
                  API Key{' '}
                  <a href={API_KEY_LINKS[provider]} target="_blank" rel="noopener noreferrer">
                    (Get key)
                  </a>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider} API key...`}
                />
                <small className="settings-hint">
                  Your key is stored locally in your browser and never saved on our servers.
                </small>
              </div>

              <div className="settings-field">
                <label>Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  {(MODEL_OPTIONS[provider] || []).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <button
                  className="test-btn"
                  onClick={handleTest}
                  disabled={testing || !apiKey}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult && (
                  <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleSaveAI}>Save Settings</button>
            </div>
          </>
        )}

        {activeTab === 'latex' && (
          <>
            <div className="settings-body">
              <div className="settings-field">
                <label>Custom LaTeX Preamble</label>
                <small className="settings-hint" style={{ marginBottom: 8 }}>
                  Add custom LaTeX packages, macros, or commands. These will be included when exporting .tex files.
                </small>
                <textarea
                  className="preamble-textarea"
                  value={preamble}
                  onChange={(e) => setPreamble(e.target.value)}
                  placeholder={'% Example:\n\\usepackage{tikz-cd}\n\\newcommand{\\norm}[1]{\\left\\|#1\\right\\|}\n\\DeclareMathOperator{\\Hom}{Hom}'}
                  rows={10}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleSavePreamble}>
                {preambleSaved ? 'Saved!' : 'Save Preamble'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'theme' && (
          <>
            <div className="settings-body">
              <div className="settings-field">
                <label>Editor Theme</label>
                <small className="settings-hint" style={{ marginBottom: 12, display: 'block' }}>
                  Choose a theme for the editor. The sidebar always uses a dark theme for contrast.
                </small>
              </div>
              <div className="theme-grid">
                {THEMES.map((theme) => (
                  <div
                    key={theme.id}
                    className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentTheme(theme.id);
                      saveTheme(theme.id);
                    }}
                  >
                    <div className="theme-card-preview">
                      {theme.id === 'light' && (
                        <>
                          <span style={{ background: '#f8f9fa' }} />
                          <span style={{ background: '#ffffff' }} />
                          <span style={{ background: '#3b5bdb' }} />
                          <span style={{ background: '#212529' }} />
                        </>
                      )}
                      {theme.id === 'dark' && (
                        <>
                          <span style={{ background: '#1a1b26' }} />
                          <span style={{ background: '#24283b' }} />
                          <span style={{ background: '#7aa2f7' }} />
                          <span style={{ background: '#c0caf5' }} />
                        </>
                      )}
                      {theme.id === 'sepia' && (
                        <>
                          <span style={{ background: '#f4ecd8' }} />
                          <span style={{ background: '#faf6eb' }} />
                          <span style={{ background: '#8b5e3c' }} />
                          <span style={{ background: '#5b4636' }} />
                        </>
                      )}
                      {theme.id === 'nord' && (
                        <>
                          <span style={{ background: '#2e3440' }} />
                          <span style={{ background: '#3b4252' }} />
                          <span style={{ background: '#88c0d0' }} />
                          <span style={{ background: '#d8dee9' }} />
                        </>
                      )}
                    </div>
                    <span className="theme-card-name">{theme.name}</span>
                    <span className="theme-card-desc">{theme.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn-cancel" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {activeTab === 'snippets' && (
          <>
            <div className="settings-body">
              <div className="settings-field">
                <label>Custom Snippets</label>
                <small className="settings-hint" style={{ marginBottom: 8 }}>
                  Define your own snippets. Use <code>$1</code>, <code>$2</code> for tab stop placeholders.
                </small>
              </div>

              {customSnippets.length > 0 && (
                <table className="custom-snippets-table">
                  <thead>
                    <tr>
                      <th>Trigger</th>
                      <th>Replacement</th>
                      <th>Mode</th>
                      <th>Type</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customSnippets.map((s) => (
                      <tr key={s.id}>
                        <td><code>{s.trigger}</code></td>
                        <td><code>{s.replacement}</code></td>
                        <td>{s.mode}</td>
                        <td>{s.triggerKind}</td>
                        <td>
                          <button
                            className="snippet-action-btn"
                            onClick={() => setEditingSnippet({ ...s })}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            className="snippet-action-btn snippet-delete-btn"
                            onClick={() => handleDeleteSnippet(s.id)}
                            title="Delete"
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {customSnippets.length === 0 && !editingSnippet && (
                <div className="no-snippets">
                  No custom snippets yet. Click "Add Snippet" to create one.
                </div>
              )}

              {editingSnippet && (
                <div className="snippet-editor">
                  <div className="snippet-editor-row">
                    <div className="snippet-editor-field">
                      <label>Trigger</label>
                      <input
                        type="text"
                        value={editingSnippet.trigger}
                        onChange={(e) =>
                          setEditingSnippet({ ...editingSnippet, trigger: e.target.value })
                        }
                        placeholder="e.g., hom"
                      />
                    </div>
                    <div className="snippet-editor-field">
                      <label>Replacement</label>
                      <input
                        type="text"
                        value={editingSnippet.replacement}
                        onChange={(e) =>
                          setEditingSnippet({ ...editingSnippet, replacement: e.target.value })
                        }
                        placeholder="e.g., \operatorname{Hom}($1, $2)"
                      />
                    </div>
                  </div>
                  <div className="snippet-editor-row">
                    <div className="snippet-editor-field">
                      <label>Mode</label>
                      <select
                        value={editingSnippet.mode}
                        onChange={(e) =>
                          setEditingSnippet({
                            ...editingSnippet,
                            mode: e.target.value as 'math' | 'text' | 'both',
                          })
                        }
                      >
                        <option value="math">Math</option>
                        <option value="text">Text</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div className="snippet-editor-field">
                      <label>Trigger Kind</label>
                      <select
                        value={editingSnippet.triggerKind}
                        onChange={(e) =>
                          setEditingSnippet({
                            ...editingSnippet,
                            triggerKind: e.target.value as 'auto' | 'tab',
                          })
                        }
                      >
                        <option value="auto">Auto (instant)</option>
                        <option value="tab">Tab (press Tab)</option>
                      </select>
                    </div>
                    <div className="snippet-editor-field">
                      <label>Description</label>
                      <input
                        type="text"
                        value={editingSnippet.description}
                        onChange={(e) =>
                          setEditingSnippet({ ...editingSnippet, description: e.target.value })
                        }
                        placeholder="e.g., Hom functor"
                      />
                    </div>
                  </div>
                  <div className="snippet-editor-actions">
                    <button className="btn-cancel" onClick={() => setEditingSnippet(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn-save"
                      onClick={handleSaveSnippet}
                      disabled={!editingSnippet.trigger || !editingSnippet.replacement}
                    >
                      Save Snippet
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-footer">
              {snippetsSaved && <span className="save-indicator">Saved!</span>}
              <button className="btn-cancel" onClick={onClose}>Close</button>
              <button className="btn-save" onClick={handleAddSnippet}>
                + Add Snippet
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
