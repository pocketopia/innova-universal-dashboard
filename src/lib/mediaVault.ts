// Real Cloud Media Uploader + First-Frame Video Thumbnail Extractor + Global Progress Telemetry

const SUBMISSIONS_KEY = 'innova-global-media-submissions-v1';

export interface UploadProgressPayload {
  active: boolean;
  tenant: string;
  fileName: string;
  percent: number;
  uploadedMB: string;
  totalMB: string;
  stage: string;
}

const emitUploadProgress = (payload: UploadProgressPayload) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('innova-live-upload-progress', { detail: payload }));
  }
};

const getMasterBrainApiBase = (): string => {
  const rawApi = (import.meta as any).env?.VITE_API_URL || 'https://innova-master-brain-api.onrender.com/api';
  const trimmed = String(rawApi).replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const resolveMediaVaultUrl = async (urlOrVaultId?: string): Promise<string> => {
  if (!urlOrVaultId) return '';
  if (urlOrVaultId.startsWith('vault://')) return '';
  return urlOrVaultId;
};

export const extractFirstFrameFromVideo = (
  videoFile: File
): Promise<{ file: File; dataUrl: string; durationLabel: string } | null> => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !videoFile) {
      resolve(null);
      return;
    }
    const objectUrl = URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let settled = false;
    const finish = (res: { file: File; dataUrl: string; durationLabel: string } | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
      resolve(res);
    };

    const timeout = setTimeout(() => finish(null), 9000);

    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const seekTo = dur > 0.25 ? 0.12 : 0;
      try {
        video.currentTime = seekTo;
      } catch {
        clearTimeout(timeout);
        finish(null);
      }
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const rawW = video.videoWidth || 1280;
        const rawH = video.videoHeight || 720;
        const scale = Math.min(1, 1280 / rawW);
        const w = Math.max(320, Math.round(rawW * scale));
        const h = Math.max(180, Math.round(rawH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);

        const durSec = Math.max(1, Math.round(video.duration || 0));
        const mins = Math.floor(durSec / 60);
        const secs = durSec % 60;
        const durationLabel = `${mins}:${String(secs).padStart(2, '0')}`;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              finish(null);
              return;
            }
            const baseName = videoFile.name.replace(/\.[a-zA-Z0-9]+$/, '');
            const thumbFile = new File([blob], `${baseName}_frame1.jpg`, { type: 'image/jpeg' });
            finish({ file: thumbFile, dataUrl, durationLabel });
          },
          'image/jpeg',
          0.86
        );
      } catch {
        finish(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };
  });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
};

const putWithXhrProgress = (
  uploadUrl: string,
  file: File,
  onProgress: (loadedBytes: number, totalBytes: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) onProgress(evt.loaded, evt.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Cloud PUT failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during direct cloud upload'));
    xhr.send(file);
  });
};

export const uploadFileToCloudWithProgress = async (
  file: File,
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare',
  onProgress?: (percent: number, uploadedMB: string, totalMB: string) => void
): Promise<string> => {
  const apiBase = getMasterBrainApiBase();
  const totalBytes = Math.max(1, file.size);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const CHUNK_SIZE = 650 * 1024;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));

  const report = (loaded: number, stage: string) => {
    const pct = Math.min(100, Math.max(1, Math.round((loaded / totalBytes) * 100)));
    const upMB = (Math.min(loaded, totalBytes) / (1024 * 1024)).toFixed(2);
    if (onProgress) onProgress(pct, upMB, totalMB);
    emitUploadProgress({
      active: true,
      tenant,
      fileName: file.name,
      percent: pct,
      uploadedMB: upMB,
      totalMB,
      stage,
    });
  };

  report(0, 'Initializing secure cloud stream...');

  try {
    const initRes = await fetch(`${apiBase}/media/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'video/mp4',
        totalBytes,
        totalChunks,
        tenant,
      }),
    });

    if (!initRes.ok) {
      const errBody = await initRes.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `Upload init failed (${initRes.status})`);
    }

    const initData = await initRes.json();

    if (initData.mode === 'gcs_signed' && initData.uploadUrl) {
      await putWithXhrProgress(initData.uploadUrl, file, (loaded) => {
        report(loaded, `Uploading ${file.name} to Cloud Storage...`);
      });
      report(totalBytes, 'Upload complete');
      setTimeout(() => emitUploadProgress({ active: false, tenant, fileName: file.name, percent: 100, uploadedMB: totalMB, totalMB, stage: 'Done' }), 600);
      return initData.publicUrl;
    }

    const assetId = initData.assetId;
    for (let idx = 0; idx < totalChunks; idx++) {
      const start = idx * CHUNK_SIZE;
      const end = Math.min(totalBytes, start + CHUNK_SIZE);
      const sliceBuf = await file.slice(start, end).arrayBuffer();
      const dataB64 = arrayBufferToBase64(sliceBuf);
      const isFinal = idx === totalChunks - 1;

      const chunkRes = await fetch(`${apiBase}/media/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
        body: JSON.stringify({
          assetId,
          chunkIndex: idx,
          dataB64,
          isFinal,
        }),
      });

      if (!chunkRes.ok) {
        const cErr = await chunkRes.json().catch(() => ({}));
        throw new Error(cErr.message || cErr.error || `Chunk ${idx + 1}/${totalChunks} failed`);
      }

      report(end, `Streaming chunk ${idx + 1} of ${totalChunks} to Cloud Node...`);
    }

    setTimeout(() => emitUploadProgress({ active: false, tenant, fileName: file.name, percent: 100, uploadedMB: totalMB, totalMB, stage: 'Done' }), 600);
    return initData.publicUrl;
  } catch (err) {
    emitUploadProgress({ active: false, tenant, fileName: file.name, percent: 0, uploadedMB: '0.00', totalMB, stage: 'Failed' });
    throw err;
  }
};

export const uploadFileToCloudOrDataUrl = async (
  file: File,
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare',
  onProgress?: (percent: number, uploadedMB: string, totalMB: string) => void
): Promise<string> => {
  return uploadFileToCloudWithProgress(file, tenant, onProgress);
};

export const uploadOrResolveProductionMedia = async (
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare',
  directHttpsUrl?: string,
  file?: File | null,
  onProgress?: (percent: number, uploadedMB: string, totalMB: string) => void
): Promise<string> => {
  const trimmedUrl = String(directHttpsUrl || '').trim();
  if (trimmedUrl) {
    if (/test-streams\.mux\.dev|ForBiggerBlazes|TearsOfSteel|BigBuckBunny/i.test(trimmedUrl)) {
      throw new Error('Sample/mock test video URLs are blocked in production.');
    }
    if (trimmedUrl.startsWith('vault://') || trimmedUrl.startsWith('blob:')) {
      throw new Error('Local browser vault/blob URLs cannot be published.');
    }
    return trimmedUrl;
  }
  if (file) {
    return await uploadFileToCloudWithProgress(file, tenant, onProgress);
  }
  return '';
};

export const uploadVideoAndEnsureFirstFrameThumbnail = async (
  tenant: 'MVN' | 'ArcHaven' | 'HekticTV' | 'Kreation' | 'StreamShare',
  directHttpsUrl?: string,
  videoFile?: File | null,
  existingThumbnailUrlOrData?: string,
  onProgress?: (percent: number, uploadedMB: string, totalMB: string) => void
): Promise<{ videoUrl: string; thumbnailUrl: string; durationLabel: string }> => {
  let thumbnailUrl = String(existingThumbnailUrlOrData || '').trim();
  if (thumbnailUrl.startsWith('data:image/svg+xml')) {
    thumbnailUrl = '';
  }

  let durationLabel = '';
  if (videoFile && (videoFile.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(videoFile.name))) {
    const extracted = await extractFirstFrameFromVideo(videoFile);
    if (extracted) {
      durationLabel = extracted.durationLabel;
      if (!thumbnailUrl || thumbnailUrl.startsWith('blob:') || thumbnailUrl.startsWith('data:')) {
        thumbnailUrl = await uploadFileToCloudWithProgress(extracted.file, tenant);
      }
    }
  }

  const videoUrl = await uploadOrResolveProductionMedia(tenant, directHttpsUrl, videoFile, onProgress);
  return { videoUrl, thumbnailUrl, durationLabel };
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
    const parsed: GlobalMediaItem[] = raw ? JSON.parse(raw) : [];
    return parsed.filter((x) => !String(x.videoUrl || '').startsWith('vault://'));
  } catch {
    return [];
  }
};

export const saveGlobalSubmission = (item: GlobalMediaItem): GlobalMediaItem[] => {
  const existing = getStoredGlobalSubmissions().filter((x) => x.id !== item.id);
  const updated = [item, ...existing];
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('innova-submissions-updated'));
  return updated;
};

export const updateGlobalSubmissionStatus = (id: string, newStatus: string): GlobalMediaItem[] => {
  const list = getStoredGlobalSubmissions().map((item) =>
    item.id === id ? { ...item, status: newStatus } : item
  );
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
    return { valid: false, error: `REJECTED (${name}): Unsupported format.` };
  }
  if (tenant !== 'Kreation' && typeof fileOrUrl !== 'string') {
    const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'application/x-mpegURL', 'application/vnd.apple.mpegurl'];
    if (mime && !allowedVideoMimes.includes(mime) && !/\.(mp4|webm|m3u8|mov)$/i.test(name)) {
      return { valid: false, error: `REJECTED (${name}): Only MP4, MOV, WebM, and HLS (.m3u8) are accepted.` };
    }
  }
  if (artworkFileOrUrl) {
    const artName = typeof artworkFileOrUrl === 'string' ? artworkFileOrUrl : artworkFileOrUrl.name;
    if (/\.(bmp|tiff|psd|exe|dmg|pdf)$/i.test(artName)) {
      return { valid: false, error: `REJECTED (${artName}): Cover artwork must be PNG, JPG, or WEBP.` };
    }
  }
  return { valid: true };
};

export const broadcastApprovedContentLive = (items: any[]) => {
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items));
    const bc = new BroadcastChannel('innova_content_sync');
    bc.postMessage({ type: 'INNOVA_CONTENT_UPDATED', submissions: items });
    bc.close();
  } catch {}
};

export const isTickerAdminAccount = (handleOrCreator?: string): boolean => {
  if (!handleOrCreator) return false;
  const clean = String(handleOrCreator).trim().toUpperCase().replace(/^@/, '');
  return clean === 'TICKER' || clean === 'TICKERTWIZTED';
};

export const submitProjectWithFormatAndAdminGatekeeper = (
  item: Omit<GlobalMediaItem, 'status'> & { status?: 'pending' | 'approved' | 'rejected'; fileOrUrl?: File | string; artworkFileOrUrl?: File | string }
): { accepted: boolean; autoPublishedByAdmin: boolean; error?: string; item?: GlobalMediaItem } => {
  const targetMedia = item.fileOrUrl || item.videoUrl || '';
  const formatCheck = validateSubmissionFormat(item.tenant, targetMedia, item.artworkFileOrUrl || item.posterUrl);
  if (!formatCheck.valid) return { accepted: false, autoPublishedByAdmin: false, error: formatCheck.error };
  const activeUser = localStorage.getItem('innova-username') || item.creator || '';
  const isAdmin = isTickerAdminAccount(activeUser) || isTickerAdminAccount(item.creator);
  const finalStatus: 'approved' | 'pending' = isAdmin ? 'approved' : 'pending';
  const savedItem: GlobalMediaItem = { ...item, status: finalStatus, submittedAt: item.submittedAt || new Date().toLocaleString() };
  const existing = getStoredGlobalSubmissions().filter((x) => x.id !== savedItem.id);
  const updated = [savedItem, ...existing];
  broadcastApprovedContentLive(updated);
  return { accepted: true, autoPublishedByAdmin: isAdmin, item: savedItem };
};
