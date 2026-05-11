import { JSONContent } from '@tiptap/core';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: JSONContent | null;
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_KEY = 'mathflow-projects';
const NOTEBOOKS_KEY = 'mathflow-notebooks';
const NOTES_KEY = 'mathflow-notes';

// Projects
export function getProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function createProject(title: string): Project {
  const project: Project = {
    id: uuidv4(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
  return project;
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  saveProjects(projects);
  // Unassign notebooks that belonged to this project (don't delete them)
  const notebooks = getNotebooks();
  let mutated = false;
  for (const nb of notebooks) {
    if (nb.projectId === id) {
      nb.projectId = null;
      mutated = true;
    }
  }
  if (mutated) saveNotebooks(notebooks);
}

export function renameProject(id: string, title: string): void {
  const projects = getProjects();
  const p = projects.find((x) => x.id === id);
  if (p) {
    p.title = title;
    p.updatedAt = new Date().toISOString();
    saveProjects(projects);
  }
}

// Notebooks
export function getNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveNotebooks(notebooks: Notebook[]): void {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

export function createNotebook(title: string, projectId: string | null = null): Notebook {
  const notebook: Notebook = {
    id: uuidv4(),
    title,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const notebooks = getNotebooks();
  notebooks.push(notebook);
  saveNotebooks(notebooks);
  return notebook;
}

export function deleteNotebook(id: string): void {
  const notebooks = getNotebooks().filter((n) => n.id !== id);
  saveNotebooks(notebooks);
  // Also delete all notes in this notebook
  const notes = getNotes().filter((n) => n.notebookId !== id);
  saveNotes(notes);
}

export function renameNotebook(id: string, title: string): void {
  const notebooks = getNotebooks();
  const nb = notebooks.find((n) => n.id === id);
  if (nb) {
    nb.title = title;
    nb.updatedAt = new Date().toISOString();
    saveNotebooks(notebooks);
  }
}

export function moveNotebook(id: string, newProjectId: string | null): void {
  const notebooks = getNotebooks();
  const nb = notebooks.find((n) => n.id === id);
  if (nb) {
    nb.projectId = newProjectId;
    nb.updatedAt = new Date().toISOString();
    saveNotebooks(notebooks);
  }
}

// Notes
export function getNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function getNotesForNotebook(notebookId: string): Note[] {
  return getNotes().filter((n) => n.notebookId === notebookId);
}

export function createNote(notebookId: string, title: string): Note {
  const note: Note = {
    id: uuidv4(),
    notebookId,
    title,
    content: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const notes = getNotes();
  notes.push(note);
  saveNotes(notes);
  return note;
}

export function updateNoteContent(id: string, content: JSONContent): void {
  const notes = getNotes();
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.content = content;
    note.updatedAt = new Date().toISOString();
  } else {
    // Note not in localStorage (cloud-only note) — create a local cache entry
    // so content is reliably persisted via synchronous localStorage writes.
    // The sidebar uses cloud API to list notes when authenticated, so the
    // empty notebookId/title here won't cause display issues.
    notes.push({
      id,
      notebookId: '',
      title: '',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  saveNotes(notes);
}

export function deleteNote(id: string): void {
  const notes = getNotes().filter((n) => n.id !== id);
  saveNotes(notes);
}

export function renameNote(id: string, title: string): void {
  const notes = getNotes();
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.title = title;
    note.updatedAt = new Date().toISOString();
    saveNotes(notes);
  }
}

export function moveNote(id: string, newNotebookId: string): void {
  const notes = getNotes();
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.notebookId = newNotebookId;
    note.updatedAt = new Date().toISOString();
    saveNotes(notes);
  }
}

export function getNote(id: string): Note | undefined {
  return getNotes().find((n) => n.id === id);
}
