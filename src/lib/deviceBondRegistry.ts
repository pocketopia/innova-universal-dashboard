// Hardware-Bound Ring Comm Node Registry + Real-Time Cross-Device P2P Sync Engine

export interface BoundDeviceRecord {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'unknown';
  browser: string;
  os: string;
  fingerprint: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface NodeBondEntry {
  handle: string;
  primaryFingerprint: string;
  authorizedFingerprints: string[];
  devices: BoundDeviceRecord[];
  activeInviteCode?: string;
  inviteExpiresAt?: number;
}

const REGISTRY_KEY = 'innova-ringcomm-node-registry-v1';

// Lightweight WebSocket P2P pub/sub over public ntfy.sh / wss relay so MacBook & Phone sync devices in real time across networks!
const activeListeners = new Map<string, EventSource>();

export const parseLiveDeviceInfo = (): { name: string; type: BoundDeviceRecord['type']; browser: string; os: string } => {
  const ua = typeof window !== 'undefined' ? window.navigator.userAgent : '';
  let deviceName = 'Unknown Hardware Unit';
  let deviceType: BoundDeviceRecord['type'] = 'unknown';

  if (/AFT|FireTV|Bravia|SmartTV|Tizen|Web0S/i.test(ua)) {
    deviceName = 'Smart TV Receiver';
    deviceType = 'tv';
  } else if (/Macintosh/i.test(ua)) {
    const macMatch = ua.match(/Macintosh;\s*Intel\s*Mac\s*OS\s*X?\s*([0-9_.]+)/i);
    deviceName = macMatch ? `MacBook Pro (macOS ${macMatch[1].replace(/_/g, '.')})` : 'MacBook Pro';
    deviceType = 'desktop';
  } else if (/iPhone/i.test(ua)) {
    deviceName = 'iPhone';
    deviceType = 'mobile';
  } else if (/iPad/i.test(ua)) {
    deviceName = 'iPad';
    deviceType = 'tablet';
  } else if (/Android/i.test(ua)) {
    const isMobile = /Mobile/i.test(ua);
    deviceName = isMobile ? 'Android Phone' : 'Android Tablet';
    deviceType = isMobile ? 'mobile' : 'tablet';
  } else if (/Windows/i.test(ua)) {
    deviceName = 'Windows PC';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    deviceName = 'Linux Desktop';
    deviceType = 'desktop';
  }

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    const m = ua.match(/Chrome\/([0-9.]+)/);
    browser = m ? `Chrome ${m[1]}` : 'Chrome';
  } else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  let os = 'OS';
  if (/Mac OS X/i.test(ua)) {
    const m = ua.match(/Mac OS X ([0-9_.]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS ([0-9_]+)/);
    os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Android/i.test(ua)) {
    const m = ua.match(/Android ([0-9.]+)/);
    os = m ? `Android ${m[1]}` : 'Android';
  } else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { name: deviceName, type: deviceType, browser, os };
};

export const computeHardwareFingerprint = (): string => {
  if (typeof window === 'undefined') return '00000000';
  const ua = window.navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = window.navigator.language;
  const fingerprintData = `${ua}-${screen}-${timezone}-${lang}`;
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
};

const loadRegistry = (): Record<string, NodeBondEntry> => {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveRegistry = (reg: Record<string, NodeBondEntry>) => {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  } catch {}
};

export const computeDeterministicInviteCode = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim().toUpperCase();
  let h = 2166136261;
  const secret = `RINGCOMM_BOND_2026::${clean}`;
  for (let i = 0; i < secret.length; i++) {
    h ^= secret.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const num = Math.abs(h) % 900000 + 100000;
  const s = String(num);
  return `RC-${s.slice(0, 3)}-${s.slice(3, 6)}`;
};

const getSyncTopic = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim().toUpperCase();
  const code = computeDeterministicInviteCode(clean).replace(/[^A-Z0-9]/g, '');
  return `innova_ringcomm_mesh_${clean}_${code}`;
};

// Broadcasts the updated device list across devices (Phone <-> MacBook) using ntfy.sh JSON stream relay
export const broadcastDeviceBondSync = async (handle: string, entry: NodeBondEntry) => {
  if (typeof window === 'undefined') return;
  const topic = getSyncTopic(handle);
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'RINGCOMM_DEVICE_SYNC',
        handle: entry.handle,
        primaryFingerprint: entry.primaryFingerprint,
        authorizedFingerprints: entry.authorizedFingerprints,
        devices: entry.devices,
        ts: Date.now()
      })
    });
  } catch {}
};

// Subscribes the current browser (e.g., MacBook) to real-time device bond updates from Phone/TV (including cached history with since=24h)
export const subscribeToCrossDeviceBondSync = (
  handle: string,
  onDevicesUpdated?: (devices: BoundDeviceRecord[]) => void
): (() => void) => {
  if (typeof window === 'undefined' || !handle) return () => {};
  const clean = handle.replace(/^@/, '').trim().toUpperCase();
  const topic = getSyncTopic(clean);
  const currentFp = computeHardwareFingerprint();

  const mergeIncoming = (payload: any) => {
    if (!payload || payload.type !== 'RINGCOMM_DEVICE_SYNC' || !Array.isArray(payload.devices)) return;
    const reg = loadRegistry();
    const existing: NodeBondEntry = reg[clean] || {
      handle: clean,
      primaryFingerprint: payload.primaryFingerprint || currentFp,
      authorizedFingerprints: [currentFp],
      devices: []
    };

    // Merge authorized fingerprints
    const fpSet = new Set<string>([
      ...(existing.authorizedFingerprints || []),
      ...(payload.authorizedFingerprints || [])
    ]);
    existing.authorizedFingerprints = Array.from(fpSet);

    // Merge devices by fingerprint and mark only THIS physical device as isCurrent
    const mapByFp = new Map<string, BoundDeviceRecord>();
    for (const d of existing.devices) {
      mapByFp.set(d.fingerprint, { ...d, isCurrent: d.fingerprint === currentFp });
    }
    for (const inc of payload.devices) {
      if (!inc || !inc.fingerprint) continue;
      const prev = mapByFp.get(inc.fingerprint);
      if (!prev || new Date(inc.lastActive).getTime() >= new Date(prev.lastActive).getTime()) {
        mapByFp.set(inc.fingerprint, {
          ...inc,
          isCurrent: inc.fingerprint === currentFp
        });
      }
    }

    existing.devices = Array.from(mapByFp.values());
    reg[clean] = existing;
    saveRegistry(reg);
    localStorage.setItem('innova-recognized-devices', JSON.stringify(existing.devices));
    window.dispatchEvent(new CustomEvent('innova-devices-synced', { detail: existing.devices }));
    if (onDevicesUpdated) onDevicesUpdated(existing.devices);
  };

  // 1. Fetch last 24h of device bond messages immediately so even if Phone paired before modal opened, MacBook gets it right away
  fetch(`https://ntfy.sh/${topic}/json?poll=1&since=24h`)
    .then(r => r.text())
    .then(text => {
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.message) {
            mergeIncoming(JSON.parse(evt.message));
          }
        } catch {}
      }
    })
    .catch(() => {});

  // 2. Open live SSE stream for instant real-time updates when Phone scans QR or logs in
  let es: EventSource | null = null;
  try {
    es = new EventSource(`https://ntfy.sh/${topic}/sse`);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        if (evt.message) {
          mergeIncoming(JSON.parse(evt.message));
        }
      } catch {}
    };
  } catch {}

  return () => {
    if (es) es.close();
  };
};

export const generateDeviceInviteForNode = (handle: string): { code: string; inviteUrl: string; qrImageUrl: string; expiresAt: number } => {
  const clean = handle.replace(/^@/, '').trim().toUpperCase();
  const reg = loadRegistry();
  const code = computeDeterministicInviteCode(clean);
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const currentFp = computeHardwareFingerprint();

  if (!reg[clean]) {
    reg[clean] = {
      handle: clean,
      primaryFingerprint: currentFp,
      authorizedFingerprints: [currentFp],
      devices: [],
      activeInviteCode: code,
      inviteExpiresAt: expiresAt,
    };
  } else {
    reg[clean].activeInviteCode = code;
    reg[clean].inviteExpiresAt = expiresAt;
  }
  saveRegistry(reg);
  broadcastDeviceBondSync(clean, reg[clean]);

  // Always point QR code to the public production URL so phones on cellular/Wi-Fi can open it!
  const prodOrigin = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
    ? window.location.origin
    : 'https://innova-universal-dashboard.vercel.app';
  const inviteUrl = `${prodOrigin}/?node=${encodeURIComponent(clean)}&invite=${encodeURIComponent(code)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&color=0a0a0f&bgcolor=ffffff&data=${encodeURIComponent(inviteUrl)}`;
  return { code, inviteUrl, qrImageUrl, expiresAt };
};

export const verifyOrClaimNodeOnDevice = (
  handle: string,
  providedInviteCode?: string
): { allowed: boolean; requiresInvite?: boolean; message?: string; entry?: NodeBondEntry } => {
  const clean = handle.replace(/^@/, '').trim().toUpperCase();
  const currentFp = computeHardwareFingerprint();
  const info = parseLiveDeviceInfo();
  const now = new Date().toISOString();
  const reg = loadRegistry();

  const existing = reg[clean];
  const expectedInvite = computeDeterministicInviteCode(clean);
  const cleanInvite = (providedInviteCode || '').trim().toUpperCase();

  if (existing && !existing.authorizedFingerprints.includes(currentFp)) {
    if (cleanInvite && (cleanInvite === existing.activeInviteCode || cleanInvite === expectedInvite)) {
      existing.authorizedFingerprints.push(currentFp);
      existing.devices.forEach(d => (d.isCurrent = false));
      existing.devices.push({
        id: `DEVICE-${currentFp}`,
        name: info.name,
        type: info.type,
        browser: info.browser,
        os: info.os,
        fingerprint: currentFp,
        lastActive: now,
        isCurrent: true,
      });
      saveRegistry(reg);
      localStorage.setItem('innova-recognized-devices', JSON.stringify(existing.devices));
      broadcastDeviceBondSync(clean, existing);
      return { allowed: true, entry: existing };
    }
    return {
      allowed: false,
      requiresInvite: true,
      message: `Node @${clean} is already claimed and hardware-locked to another Ring Comm device (Primary FP: ${existing.primaryFingerprint}). Enter a Ring Comm Device Invite Code from your primary device to authorize this hardware (${currentFp}).`,
    };
  }

  const entry: NodeBondEntry = existing || {
    handle: clean,
    primaryFingerprint: currentFp,
    authorizedFingerprints: [currentFp],
    devices: [],
  };

  if (!entry.authorizedFingerprints.includes(currentFp)) {
    entry.authorizedFingerprints.push(currentFp);
  }

  // Also merge any existing localStorage recognized devices so nothing is lost
  try {
    const localDevs = JSON.parse(localStorage.getItem('innova-recognized-devices') || '[]');
    for (const ld of localDevs) {
      if (ld && ld.fingerprint && !entry.devices.some(ed => ed.fingerprint === ld.fingerprint)) {
        entry.devices.push({ ...ld, isCurrent: ld.fingerprint === currentFp });
      }
    }
  } catch {}

  const idx = entry.devices.findIndex(d => d.fingerprint === currentFp);
  entry.devices.forEach(d => (d.isCurrent = d.fingerprint === currentFp));
  if (idx >= 0) {
    entry.devices[idx] = { ...entry.devices[idx], name: info.name, type: info.type, browser: info.browser, os: info.os, lastActive: now, isCurrent: true };
  } else {
    entry.devices.push({
      id: `DEVICE-${currentFp}`,
      name: info.name,
      type: info.type,
      browser: info.browser,
      os: info.os,
      fingerprint: currentFp,
      lastActive: now,
      isCurrent: true,
    });
  }

  reg[clean] = entry;
  saveRegistry(reg);
  localStorage.setItem('innova-recognized-devices', JSON.stringify(entry.devices));
  broadcastDeviceBondSync(clean, entry);
  return { allowed: true, entry };
};
