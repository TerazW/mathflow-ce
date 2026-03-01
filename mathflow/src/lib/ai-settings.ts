export interface AISettings {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
}

const STORAGE_KEY = 'mathflow-ai-settings';

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function loadAISettings(): AISettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAISettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster & Cheaper)' },
    { value: 'gpt-4.1', label: 'GPT-4.1 (Most Powerful)' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Recommended)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Most Powerful)' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended, Free Quota)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (More Powerful)' },
  ],
};

export const API_KEY_LINKS: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/apikey',
};

// Custom LaTeX preamble storage
const PREAMBLE_KEY = 'mathflow-custom-preamble';

export function saveCustomPreamble(preamble: string): void {
  localStorage.setItem(PREAMBLE_KEY, preamble);
}

export function loadCustomPreamble(): string {
  return localStorage.getItem(PREAMBLE_KEY) || '';
}

// Custom user snippets storage
const CUSTOM_SNIPPETS_KEY = 'mathflow-custom-snippets';

export interface CustomSnippetDef {
  id: string;
  trigger: string;
  replacement: string;
  mode: 'math' | 'text' | 'both';
  triggerKind: 'auto' | 'tab';
  description: string;
}

export function saveCustomSnippets(snippets: CustomSnippetDef[]): void {
  localStorage.setItem(CUSTOM_SNIPPETS_KEY, JSON.stringify(snippets));
}

export function loadCustomSnippets(): CustomSnippetDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SNIPPETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Theme storage
const THEME_KEY = 'mathflow-theme';

export type ThemeId = 'light' | 'dark' | 'sepia' | 'nord';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
}

export const THEMES: ThemeDef[] = [
  { id: 'light', name: 'Light', description: 'Default light theme' },
  { id: 'dark', name: 'Dark', description: 'Dark background, easy on the eyes' },
  { id: 'sepia', name: 'Sepia', description: 'Warm, paper-like tones' },
  { id: 'nord', name: 'Nord', description: 'Cool arctic color palette' },
];

export function saveTheme(themeId: ThemeId): void {
  localStorage.setItem(THEME_KEY, themeId);
  applyTheme(themeId);
}

export function loadTheme(): ThemeId {
  return (localStorage.getItem(THEME_KEY) as ThemeId) || 'light';
}

export function applyTheme(themeId: ThemeId): void {
  document.documentElement.setAttribute('data-theme', themeId);
}
