/**
 * IndexedDB-based offline storage for MathFlow notes.
 * Works alongside localStorage — provides larger capacity and offline resilience.
 */

const DB_NAME = 'mathflow-offline';
const DB_VERSION = 1;
const STORES = {
  notes: 'notes',
  notebooks: 'notebooks',
  pendingSync: 'pendingSync',
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.notes)) {
        db.createObjectStore(STORES.notes, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.notebooks)) {
        db.createObjectStore(STORES.notebooks, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.pendingSync)) {
        const store = db.createObjectStore(STORES.pendingSync, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// Generic CRUD
export async function idbPut(storeName: string, data: any): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Pending sync queue — operations queued while offline
export interface PendingSyncOp {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'notebook' | 'note';
  entityId: string;
  data?: any;
  timestamp: number;
}

export async function queueSyncOp(op: Omit<PendingSyncOp, 'id' | 'timestamp'>): Promise<void> {
  await idbPut(STORES.pendingSync, { ...op, timestamp: Date.now() });
}

export async function getPendingSyncOps(): Promise<PendingSyncOp[]> {
  return idbGetAll<PendingSyncOp>(STORES.pendingSync);
}

export async function clearPendingSyncOps(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.pendingSync, 'readwrite');
  const store = tx.objectStore(STORES.pendingSync);
  store.clear();
}

export async function removeSyncOp(id: number): Promise<void> {
  await idbDelete(STORES.pendingSync, String(id));
}

/**
 * Process all pending sync operations by replaying them against the cloud API.
 * Should be called when the app comes back online.
 * Returns the number of successfully processed operations.
 */
export async function processSyncQueue(
  apiClient: {
    updateNote: (id: string, data: any) => Promise<any>;
    createNote: (notebookId: string, title?: string) => Promise<any>;
    deleteNote: (id: string) => Promise<any>;
    createNotebook: (title?: string) => Promise<any>;
    deleteNotebook: (id: string) => Promise<any>;
    renameNotebook: (id: string, title: string) => Promise<any>;
  }
): Promise<number> {
  const ops = await getPendingSyncOps();
  if (ops.length === 0) return 0;

  // Sort by timestamp to process in order
  ops.sort((a, b) => a.timestamp - b.timestamp);

  let processed = 0;

  for (const op of ops) {
    try {
      if (op.entity === 'note') {
        switch (op.type) {
          case 'update':
            await apiClient.updateNote(op.entityId, op.data);
            break;
          case 'create':
            await apiClient.createNote(op.data?.notebookId, op.data?.title);
            break;
          case 'delete':
            await apiClient.deleteNote(op.entityId);
            break;
        }
      } else if (op.entity === 'notebook') {
        switch (op.type) {
          case 'create':
            await apiClient.createNotebook(op.data?.title);
            break;
          case 'delete':
            await apiClient.deleteNotebook(op.entityId);
            break;
          case 'update':
            await apiClient.renameNotebook(op.entityId, op.data?.title);
            break;
        }
      }
      processed++;
    } catch (err) {
      console.warn(`Sync operation failed (${op.type} ${op.entity} ${op.entityId}):`, err);
      // Continue with other operations rather than failing entirely
    }
  }

  // Clear all processed ops
  if (processed > 0) {
    await clearPendingSyncOps();
  }

  return processed;
}

// Convenience methods for notes/notebooks
export async function saveNoteOffline(note: any): Promise<void> {
  await idbPut(STORES.notes, note);
}

export async function getNoteOffline(id: string): Promise<any> {
  return idbGet(STORES.notes, id);
}

export async function getAllNotesOffline(): Promise<any[]> {
  return idbGetAll(STORES.notes);
}

export async function deleteNoteOffline(id: string): Promise<void> {
  await idbDelete(STORES.notes, id);
}

export async function saveNotebookOffline(notebook: any): Promise<void> {
  await idbPut(STORES.notebooks, notebook);
}

export async function getNotebookOffline(id: string): Promise<any> {
  return idbGet(STORES.notebooks, id);
}

export async function getAllNotebooksOffline(): Promise<any[]> {
  return idbGetAll(STORES.notebooks);
}

export async function deleteNotebookOffline(id: string): Promise<void> {
  await idbDelete(STORES.notebooks, id);
}

// Online status helper
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
