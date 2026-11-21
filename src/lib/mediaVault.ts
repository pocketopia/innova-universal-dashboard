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


export const validateSubmissionFormat = (
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare',
  fileOrUrl: File | string,
  artworkFileOrUrl?: File | string
): { valid: boolean; error?: string } => {
  const name = typeof fileOrUrl === 'string' ? fileOrUrl : fileOrUrl.name;
  const mime = typeof fileOrUrl === 'string' ? '' : fileOrUrl.type;

  if (/\.(exe|dmg|pkg|msi|iso|avi|wmv|flv|mkv)$/i.test(name)) {
    return {
      valid: false,
      error: `REJECTED (${name}): Unsupported format. ${tenant === 'Kreation' ? 'Kreation requires a pre-mounted HTML5/WebGL2/WASM Cloud Shard.' : 'Streaming platforms require MP4 (H.264), WebM, or HLS (.m3u8).'}`
    };
  }

  if (tenant !== 'Kreation' && typeof fileOrUrl !== 'string') {
    const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'application/x-mpegURL', 'application/vnd.apple.mpegurl'];
    if (mime && !allowedVideoMimes.includes(mime) && !/\.(mp4|webm|m3u8|mov)$/i.test(name)) {
      return {
        valid: false,
        error: `REJECTED (${name}): Invalid video codec/container (${mime}). Only MP4, WebM, and HLS (.m3u8) are accepted.`
      };
    }
  }

  if (artworkFileOrUrl) {
    const artName = typeof artworkFileOrUrl === 'string' ? artworkFileOrUrl : artworkFileOrUrl.name;
    if (/\.(bmp|tiff|psd|exe|dmg|pdf)$/i.test(artName)) {
      return {
        valid: false,
        error: `REJECTED (${artName}): Cover artwork must be PNG, JPG, or WEBP.`
      };
    }
  }

  return { valid: true };
};

export const broadcastApprovedContentLive = (items: any[]) => {
  try {
    localStorage.setItem('innova-global-media-submissions-v1', JSON.stringify(items));
    const bc = new BroadcastChannel('innova_content_sync');
    bc.postMessage({ type: 'INNOVA_CONTENT_UPDATED', submissions: items });
    bc.close();
  } catch (e) {}
};


export const isTickerAdminAccount = (handleOrCreator?: string): boolean => {
  if (!handleOrCreator) return false;
  const clean = String(handleOrCreator).trim().toUpperCase().replace(/^@/, '');
  return clean === 'TICKER' || clean === 'TICKERTWIZTED';
};

export const submitProjectWithFormatAndAdminGatekeeper = (
  item: Omit<GlobalMediaItem, 'status'> & { status?: 'pending' | 'approved' | 'rejected'; fileOrUrl?: File | string; artworkFileOrUrl?: File | string }
): { accepted: boolean; autoPublishedByAdmin: boolean; error?: string; item?: GlobalMediaItem } => {
  // 1. Always enforce strict format validation first (even for @TICKER!)
  const targetMedia = item.fileOrUrl || item.videoUrl || '';
  const formatCheck = validateSubmissionFormat(item.tenant, targetMedia, item.artworkFileOrUrl || item.posterUrl);
  if (!formatCheck.valid) {
    return {
      accepted: false,
      autoPublishedByAdmin: false,
      error: formatCheck.error
    };
  }

  // 2. Check if uploader is @TICKER Admin -> Auto-Approve & Push Live Immediately! Otherwise -> Pending Review
  const activeUser = localStorage.getItem('innova-username') || item.creator || '';
  const isAdmin = isTickerAdminAccount(activeUser) || isTickerAdminAccount(item.creator);
  const finalStatus: 'approved' | 'pending' = isAdmin ? 'approved' : 'pending';

  const savedItem: GlobalMediaItem = {
    ...item,
    status: finalStatus,
    submittedAt: item.submittedAt || new Date().toLocaleString()
  };

  const existing = getStoredGlobalSubmissions().filter((x) => x.id !== savedItem.id);
  const updated = [savedItem, ...existing];
  broadcastApprovedContentLive(updated);

  return {
    accepted: true,
    autoPublishedByAdmin: isAdmin,
    item: savedItem
  };
};


export const uploadFileToCloudOrDataUrl = async (
  file: File,
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare'
): Promise<string> => {
  const rawApi = (import.meta as any).env?.VITE_API_URL || 'https://innova-master-brain-api.onrender.com/api';
  const apiBase = String(rawApi).replace(/\/+$/, '').endsWith('/api')
    ? String(rawApi).replace(/\/+$/, '')
    : `${String(rawApi).replace(/\/+$/, '')}/api`;

  try {
    const signRes = await fetch(`${apiBase}/device/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        tenant
      })
    });
    if (signRes.ok) {
      const { uploadUrl, publicUrl, signedReadUrl } = await signRes.json();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (putRes.ok) {
        return signedReadUrl || publicUrl;
      }
    }
  } catch {}

  if (file.type.startsWith('image/') && file.size <= 750 * 1024) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed reading image file'));
      reader.readAsDataURL(file);
    });
  }

  return await storeMediaFileInVault(file);
};

export const uploadOrResolveProductionMedia = async (
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare',
  directHttpsUrl?: string,
  file?: File | null
): Promise<string> => {
  const trimmedUrl = String(directHttpsUrl || '').trim();
  if (trimmedUrl) {
    if (/test-streams\.mux\.dev|ForBiggerBlazes|TearsOfSteel|BigBuckBunny/i.test(trimmedUrl)) {
      throw new Error('Sample/mock test video URLs are blocked in production. Please enter your real HTTPS media stream URL.');
    }
    return trimmedUrl;
  }
  if (file) {
    return await uploadFileToCloudOrDataUrl(file, tenant);
  }
  return '';
};
