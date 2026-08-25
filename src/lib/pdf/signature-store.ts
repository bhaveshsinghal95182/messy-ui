/**
 * The saved signature library.
 *
 * IndexedDB rather than localStorage because these are image blobs, and
 * base64 in localStorage would both bloat the 5 MB quota and cost a
 * synchronous main-thread encode on every read.
 *
 * This is the one thing the editor persists between visits, and it stays on the
 * device: nothing here is ever transmitted. A cryptographic certificate is
 * deliberately *not* stored — see `sign/` — because a private key sitting in
 * browser storage is a materially different risk from a picture of a signature.
 */

const DB_NAME = 'messy-pdf';
const DB_VERSION = 1;
const STORE = 'signatures';

export interface StoredSignature {
  id: string;
  /** PNG bytes with a transparent background. */
  bytes: Uint8Array;
  width: number;
  height: number;
  variant: 'signature' | 'initials';
  sourceKind: 'draw' | 'type' | 'upload';
  createdAt: number;
}

/** Resolves null when IndexedDB is unavailable (private mode, blocked storage). */
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    // Storage being unavailable is a reason to work without a library, never a
    // reason to fail: signing still works, it just doesn't remember.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

const transact = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> => {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    } catch {
      db.close();
      resolve(null);
    }
  });
};

export const listSignatures = async (): Promise<StoredSignature[]> => {
  const all = await transact<StoredSignature[]>('readonly', (store) =>
    store.getAll()
  );
  return (all ?? []).sort((a, b) => b.createdAt - a.createdAt);
};

export const saveSignature = (signature: StoredSignature) =>
  transact('readwrite', (store) => store.put(signature));

export const deleteSignature = (id: string) =>
  transact('readwrite', (store) => store.delete(id));
