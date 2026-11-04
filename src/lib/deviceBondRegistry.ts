// Hardware-Bound Ring Comm Node Registry + Loop-Free Cross-Device Sync Engine

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

export const parseLiveDeviceInfo = (): { name: string; type: BoundDeviceRecord['type']; browser: string; os: string } => {
  const ua = typeof window !== 'undefined' ? window.navigator.userAgent : '';
  let deviceName = 'Unknown Device';
  let deviceType: BoundDeviceRecord['type'] = 'unknown';

  if (/AFT|FireTV|Bravia|SmartTV|Tizen|Web0S/i.test(ua)) {
    deviceName = 'Smart TV Receiver';
    deviceType = 'tv';
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
  } else if (/Macintosh/i.test(ua)) {
    const macMatch = ua.match(/Macintosh;\s*Intel\s*Mac\s*OS\s*X?\s*([0-9_.]+)/i);
    deviceName = macMatch ? `MacBook Pro (macOS ${macMatch[1].replace(/_/g, '.')})` : 'MacBook Pro';
    deviceType = 'desktop';
  } else if (/Windows/i.test(ua)) {
    deviceName = 'Windows PC';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    deviceName = 'Linux Desktop';
    deviceType = 'desktop';
  }

  let browser = 'Browser';
  if (/CriOS/i.test(ua)) browser = 'Chrome iOS';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    const m = ua.match(/Chrome\/([0-9.]+)/);
    browser = m ? `Chrome ${m[1]}` : 'Chrome';
  } else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  let os = 'OS';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS ([0-9_]+)/);
    os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Mac OS X/i.test(ua)) {
    const m = ua.match(/Mac OS X ([0-9_.]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS';
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
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
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
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
  const code = computeDeterministicInviteCode(clean).replace(/[^A-Z0-9]/g, '');
  return `innova_ringcomm_v2_${clean}_${code}`;
};

export const persistMergedDevicesForHandle = (
  handle: string,
  incoming: Partial<NodeBondEntry>,
  emitEvent: boolean = false
): BoundDeviceRecord[] => {
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
  const currentFp = computeHardwareFingerprint();
  const reg = loadRegistry();

  const existing: NodeBondEntry = reg[clean] || {
    handle: clean,
    primaryFingerprint: incoming.primaryFingerprint || currentFp,
    authorizedFingerprints: [currentFp],
    devices: []
  };

  if (incoming.primaryFingerprint && !existing.primaryFingerprint) {
    existing.primaryFingerprint = incoming.primaryFingerprint;
  }

  const fpSet = new Set<string>([
    currentFp,
    ...(existing.authorizedFingerprints || []),
    ...(incoming.authorizedFingerprints || [])
  ]);

  const mapByFp = new Map<string, BoundDeviceRecord>();

  for (const d of (existing.devices || [])) {
    if (d && d.fingerprint) {
      fpSet.add(d.fingerprint);
      mapByFp.set(d.fingerprint, { ...d, isCurrent: d.fingerprint === currentFp });
    }
  }

  try {
    const rawLocal = JSON.parse(localStorage.getItem('innova-recognized-devices') || '[]');
    if (Array.isArray(rawLocal)) {
      for (const d of rawLocal) {
        if (d && d.fingerprint) {
          fpSet.add(d.fingerprint);
          mapByFp.set(d.fingerprint, { ...d, isCurrent: d.fingerprint === currentFp });
        }
      }
    }
  } catch {}

  const myInfo = parseLiveDeviceInfo();
  const prevMe = mapByFp.get(currentFp);
  mapByFp.set(currentFp, {
    id: `DEVICE-${currentFp}`,
    name: myInfo.name,
    type: myInfo.type,
    browser: myInfo.browser,
    os: myInfo.os,
    fingerprint: currentFp,
    lastActive: prevMe?.lastActive || new Date().toISOString(),
    isCurrent: true
  });

  for (const inc of (incoming.devices || [])) {
    if (!inc || !inc.fingerprint) continue;
    fpSet.add(inc.fingerprint);
    mapByFp.set(inc.fingerprint, {
      ...mapByFp.get(inc.fingerprint),
      ...inc,
      id: `DEVICE-${inc.fingerprint}`,
      name: inc.name || 'Linked Ring Comm Device',
      type: inc.type || 'mobile',
      browser: inc.browser || 'Browser',
      os: inc.os || 'OS',
      lastActive: inc.lastActive || new Date().toISOString(),
      isCurrent: inc.fingerprint === currentFp
    });
  }

  const mergedList = Array.from(mapByFp.values()).sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));
  existing.authorizedFingerprints = Array.from(fpSet);
  existing.devices = mergedList;
  reg[clean] = existing;

  saveRegistry(reg);
  localStorage.setItem('innova-recognized-devices', JSON.stringify(mergedList));
  localStorage.setItem(`innova-devices-${clean}`, JSON.stringify(mergedList));

  if (emitEvent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('innova-devices-synced', { detail: mergedList }));
  }
  return mergedList;
};

export const broadcastDeviceBondSync = async (handle: string, entry?: NodeBondEntry): Promise<void> => {
  if (typeof window === 'undefined') return;
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
  const reg = loadRegistry();
  const target = entry || reg[clean];
  if (!target) return;

  const topic = getSyncTopic(clean);
  const payload = JSON.stringify({
    type: 'RINGCOMM_DEVICE_SYNC',
    handle: clean,
    primaryFingerprint: target.primaryFingerprint,
    authorizedFingerprints: target.authorizedFingerprints,
    devices: target.devices,
    ts: Date.now()
  });

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Cache-Control': 'no-cache'
      },
      body: payload,
      keepalive: true
    });
  } catch {}
};

export const subscribeToCrossDeviceBondSync = (
  handle: string,
  onDevicesUpdated?: (devices: BoundDeviceRecord[]) => void
): (() => void) => {
  if (typeof window === 'undefined' || !handle) return () => {};
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
  const topic = getSyncTopic(clean);

  const handleIncomingPayload = (data: any) => {
    if (!data || !Array.isArray(data.devices) || data.devices.length === 0) return;
    const updated = persistMergedDevicesForHandle(clean, data, false);
    if (onDevicesUpdated) onDevicesUpdated(updated);
  };

  const pollRelay = async () => {
    try {
      const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=24h&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        for (const line of text.split('\n')) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.message) {
              const parsed = JSON.parse(evt.message);
              if (parsed && parsed.type === 'RINGCOMM_DEVICE_SYNC') {
                handleIncomingPayload(parsed);
              }
            }
          } catch {}
        }
      }
    } catch {}
  };

  pollRelay();
  const pollTimer = window.setInterval(pollRelay, 3000);

  let es: EventSource | null = null;
  try {
    es = new EventSource(`https://ntfy.sh/${topic}/sse`);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        if (evt.message) {
          const parsed = JSON.parse(evt.message);
          if (parsed && parsed.type === 'RINGCOMM_DEVICE_SYNC') {
            handleIncomingPayload(parsed);
          }
        }
      } catch {}
    };
  } catch {}

  return () => {
    window.clearInterval(pollTimer);
    if (es) es.close();
  };
};

// PURE FUNCTION: Safe to call inside useMemo or render without triggering any state updates or event loops!
export const generateDeviceInviteForNode = (handle: string): { code: string; inviteUrl: string; qrImageUrl: string; expiresAt: number } => {
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
  const code = computeDeterministicInviteCode(clean);
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const currentFp = computeHardwareFingerprint();
  const myInfo = parseLiveDeviceInfo();

  const prodOrigin = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
    ? window.location.origin
    : 'https://innova-universal-dashboard.vercel.app';

  const params = new URLSearchParams({
    node: clean,
    invite: code,
    pfp: currentFp,
    pname: myInfo.name,
    ptype: myInfo.type,
    pbrowser: myInfo.browser,
    pos: myInfo.os
  });
  const inviteUrl = `${prodOrigin}/?${params.toString()}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&color=0a0a0f&bgcolor=ffffff&data=${encodeURIComponent(inviteUrl)}`;
  return { code, inviteUrl, qrImageUrl, expiresAt };
};

export const verifyOrClaimNodeOnDevice = (
  handle: string,
  providedInviteCode?: string
): { allowed: boolean; requiresInvite?: boolean; message?: string; entry?: NodeBondEntry } => {
  const clean = (handle || 'NODE').replace(/^@/, '').trim().toUpperCase() || 'NODE';
  const currentFp = computeHardwareFingerprint();
  const now = new Date().toISOString();
  const reg = loadRegistry();

  const seedDevices: BoundDeviceRecord[] = [];
  let urlPrimaryFp = '';
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const pfp = params.get('pfp');
    const pname = params.get('pname');
    if (pfp && pname) {
      urlPrimaryFp = pfp;
      seedDevices.push({
        id: `DEVICE-${pfp}`,
        name: pname,
        type: (params.get('ptype') as any) || 'desktop',
        browser: params.get('pbrowser') || 'Browser',
        os: params.get('pos') || 'macOS',
        fingerprint: pfp,
        lastActive: now,
        isCurrent: pfp === currentFp
      });
    }
  }

  const existing = reg[clean];
  const expectedInvite = computeDeterministicInviteCode(clean);
  const cleanInvite = (providedInviteCode || '').trim().toUpperCase();

  if (existing && !existing.authorizedFingerprints.includes(currentFp)) {
    if (cleanInvite && (cleanInvite === existing.activeInviteCode || cleanInvite === expectedInvite)) {
      persistMergedDevicesForHandle(clean, {
        handle: clean,
        primaryFingerprint: existing.primaryFingerprint,
        authorizedFingerprints: [...existing.authorizedFingerprints, currentFp],
        devices: [...existing.devices, ...seedDevices]
      }, false);
      const updatedEntry = loadRegistry()[clean];
      if (updatedEntry) {
        broadcastDeviceBondSync(clean, updatedEntry);
      }
      return { allowed: true, entry: updatedEntry };
    }
    return {
      allowed: false,
      requiresInvite: true,
      message: `Node @${clean} is already claimed and hardware-locked to another Ring Comm device (Primary FP: ${existing.primaryFingerprint}). Enter a Ring Comm Device Invite Code from your primary device to authorize this hardware (${currentFp}).`,
    };
  }

  persistMergedDevicesForHandle(clean, {
    handle: clean,
    primaryFingerprint: existing?.primaryFingerprint || urlPrimaryFp || currentFp,
    devices: seedDevices
  }, false);

  const finalEntry = loadRegistry()[clean];
  if (finalEntry) {
    broadcastDeviceBondSync(clean, finalEntry);
  }
  return { allowed: true, entry: finalEntry };
};
