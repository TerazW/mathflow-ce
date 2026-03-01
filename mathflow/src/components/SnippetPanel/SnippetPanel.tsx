import { useState, useMemo } from 'react';
import { getSnippetsByCategory, Snippet } from '../../snippets';
import './SnippetPanel.css';

interface SnippetPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function SnippetPanel({ visible, onClose }: SnippetPanelProps) {
  const [search, setSearch] = useState('');
  const categories = useMemo(() => getSnippetsByCategory(), []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    const result: Record<string, Snippet[]> = {};
    for (const [cat, snippets] of Object.entries(categories)) {
      const filtered = snippets.filter(
        (s) =>
          (s.description?.toLowerCase().includes(q)) ||
          (typeof s.trigger === 'string' && s.trigger.toLowerCase().includes(q)) ||
          (typeof s.replacement === 'string' && s.replacement.toLowerCase().includes(q))
      );
      if (filtered.length > 0) {
        result[cat] = filtered;
      }
    }
    return result;
  }, [categories, search]);

  if (!visible) return null;

  return (
    <div className="snippet-panel">
      <div className="snippet-panel-header">
        <h3>Snippet Reference</h3>
        <button className="snippet-panel-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="snippet-panel-search">
        <input
          type="text"
          placeholder="Search snippets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="snippet-panel-body">
        {Object.entries(filteredCategories).map(([category, snippets]) => (
          <div key={category} className="snippet-category">
            <h4>{category}</h4>
            <table>
              <thead>
                <tr>
                  <th>Trigger</th>
                  <th>Result</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {snippets.map((snippet, i) => (
                  <tr key={i}>
                    <td>
                      <code>
                        {snippet.trigger instanceof RegExp
                          ? snippet.trigger.source
                          : snippet.trigger}
                      </code>
                    </td>
                    <td>
                      <code>
                        {typeof snippet.replacement === 'string'
                          ? snippet.replacement
                          : '(dynamic)'}
                      </code>
                    </td>
                    <td>
                      <span className={`snippet-badge ${snippet.options.triggerKind}`}>
                        {snippet.options.triggerKind}
                      </span>
                      <span className={`snippet-badge mode-${snippet.options.mode}`}>
                        {snippet.options.mode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
