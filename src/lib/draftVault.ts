// Per-Platform Draft Vault: Saves platform-specific metadata (localStorage) + heavy File handles (IndexedDB)
// Supports StreamShare, MVN, HekticTV, Kreation (.zip/.wasm games + trailers), and ArcHaven (AI Series & Feature Films)

export type InnovaDraftTenant = 'StreamShare' | 'MVN' | 'HekticTV' | 'Kreation' | 'ArcHaven';

const DB_NAME = 'innova_creator_draft_files_v1';
const STORE_NAME = 'draft_files';

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraftBinaryFiles(
  tenant: InnovaDraftTenant,
  filesMap: Record<string, File | null | undefined>
): Promise<void> {
  try {
    const db = await openDraftDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const cleanEntries: Record<string, File> = {};
    for (const [k, f] of Object.entries(filesMap)) {
      if (f instanceof File) cleanEntries[k] = f;
    }
    store.put(cleanEntries, tenant);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {}
}

export async function loadDraftBinaryFiles(
  tenant: InnovaDraftTenant
): Promise<Record<string, File>> {
  try {
    const db = await openDraftDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(tenant);
    const result = await new Promise<any>((res, rej) => {
      req.onsuccess = () => res(req.result || {});
      req.onerror = () => rej(req.error);
    });
    db.close();
    return result || {};
  } catch {
    return {};
  }
}

export function savePlatformDraftMeta<T extends Record<string, any>>(
  tenant: InnovaDraftTenant,
  meta: T
): void {
  try {
    localStorage.setItem(
      `innova_draft_meta_${tenant}_v1`,
      JSON.stringify({ ...meta, _savedAt: new Date().toISOString() })
    );
  } catch {}
}

export function loadPlatformDraftMeta<T = Record<string, any>>(
  tenant: InnovaDraftTenant
): (T & { _savedAt?: string }) | null {
  try {
    const raw = localStorage.getItem(`innova_draft_meta_${tenant}_v1`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearPlatformDraft(tenant: InnovaDraftTenant): Promise<void> {
  try {
    localStorage.removeItem(`innova_draft_meta_${tenant}_v1`);
    const db = await openDraftDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(tenant);
    await new Promise<void>((res) => {
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
    db.close();
  } catch {}
}
