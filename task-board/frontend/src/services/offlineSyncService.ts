// Frontend Offline Sync & IndexedDB Service

export interface PendingOperation {
  id: string;
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'MOVE_TASK' | 'DELETE_TASK' | 'ARCHIVE_TASK';
  payload: any;
  timestamp: number;
  attempts: number;
}

const DB_NAME = 'TaskBoardOfflineDB';
const DB_VERSION = 1;
const STORE_CACHE = 'cacheStore';
const STORE_QUEUE = 'queueStore';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setCacheItem(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    tx.objectStore(STORE_CACHE).put(value, key);
  } catch (err) {
    console.warn('IndexedDB setCacheItem error:', err);
  }
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readonly');
    const req = tx.objectStore(STORE_CACHE).get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function queuePendingOperation(type: PendingOperation['type'], payload: any): Promise<PendingOperation> {
  const op: PendingOperation = {
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put(op);
  } catch (err) {
    console.warn('Failed to queue offline operation:', err);
  }

  return op;
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removePendingOperation(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
  } catch (err) {
    console.warn('Failed to remove pending operation:', err);
  }
}

export async function clearPendingOperations(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).clear();
  } catch (err) {
    console.warn('Failed to clear pending operations:', err);
  }
}
