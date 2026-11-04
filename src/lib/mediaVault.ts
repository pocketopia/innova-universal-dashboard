// Persistent Media Vault (IndexedDB + LocalStorage Registry) for Real Creator Uploads & @TICKER Approval

const DB_NAME = 'InnovaSovereignMediaVault';
const STORE_NAME = 'mediaBlobs';
const SUBMISSIONS_KEY = 'innova-global-media-submissions-v1';

const openMediaDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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
};

export const storeMediaFileInVault = async (file: File, customId?: string): Promise<string> => {
  const blobId = customId || `vault://${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, blobId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB fallback to object URL:', err);
    return URL.createObjectURL(file);
  }
  return blobId;
};

export const resolveMediaVaultUrl = async (urlOrVaultId?: string): Promise<string> => {
  if (!urlOrVaultId) return '';
  if (!urlOrVaultId.startsWith('vault://')) return urlOrVaultId;
  try {
    const db = await openMediaDB();
    const blob: Blob | undefined = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(urlOrVaultId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (blob) {
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Failed resolving vault media:', err);
  }
  return '';
};

export interface GlobalMediaItem {
  id: string;
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare';
  type: 'video' | 'game' | 'project';
  title: string;
  creator: string;
  genre?: string;
  synopsis?: string;
  status: string;
  submittedAt: string;
  thumbnail?: string;
  posterUrl?: string;
  videoUrl?: string;
  extra?: Record<string, any>;
}

export const getStoredGlobalSubmissions = (): GlobalMediaItem[] => {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveGlobalSubmission = (item: GlobalMediaItem): GlobalMediaItem[] => {
  const existing = getStoredGlobalSubmissions().filter(x => x.id !== item.id);
  const updated = [item, ...existing];
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('innova-submissions-updated'));
  return updated;
};

export const updateGlobalSubmissionStatus = (id: string, newStatus: string): GlobalMediaItem[] => {
  const list = getStoredGlobalSubmissions().map(item => {
    if (item.id === id) {
      return { ...item, status: newStatus };
    }
    return item;
  });
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('innova-submissions-updated'));
  return list;
};
