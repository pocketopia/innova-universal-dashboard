import { sanitizeAndRestorePioneerRegistry } from './pioneerLifetimeRegistry';
import { ensureHardwareEnclaveKeyPair, recordBlockedIntrusionAttempt } from './innovaSecurityFortress';
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


export const computeLocationSignature = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return `${tz}::${lang}`;
  } catch {
    return 'UTC::en-US';
  }
};

export interface SharedDevicePermission {
  id: string;
  hostHandle: string;
  friendHandle: string;
  friendDisplayName: string;
  hostDeviceName: string;
  hostHardwareFp: string;
  status: 'pending_friend_approval' | 'approved';
  telegramMessageId?: string;
  requestedAt: string;
  approvedAt?: string;
}

export interface FriendConnection {
  handle: string;
  displayName: string;
  status: 'friends';
  addedAt: string;
}

const SHARED_DEVICE_KEY = 'innova_shared_device_permissions_v1';
const FRIENDS_LIST_KEY = 'innova_ecosystem_friends_v1';

// Permanently purges HENRY from all browser storage keys on every check and locks this laptop to @TICKER
export const purgeHenryForeverAndLockHost = (): string => {
  const fp = computeHardwareFingerprint();
  const loc = computeLocationSignature();
  const devInfo = parseLiveDeviceInfo();
  try {
    sanitizeAndRestorePioneerRegistry();

    const activeU = (localStorage.getItem('innova-username') || '').replace(/^@+/, '').trim().toUpperCase();
    if (activeU === 'HENRY' || activeU === 'TEMPCREATOR') {
      localStorage.removeItem('innova-username');
      localStorage.removeItem('innova-session-active');
    }

    const rawReg = localStorage.getItem('innova-ringcomm-node-registry-v1');
    const registry: Record<string, NodeBondEntry> = rawReg ? JSON.parse(rawReg) : {};
    delete registry['HENRY'];
    delete registry['@HENRY'];
    delete registry['TEMPCREATOR'];
    delete registry['@TEMPCREATOR'];

    let storedOwner = (localStorage.getItem('innova_primary_hardware_owner') || '').replace(/^@+/, '').trim().toUpperCase();
    if (storedOwner === 'HENRY' || storedOwner === 'TEMPCREATOR') {
      storedOwner = '';
      localStorage.removeItem('innova_primary_hardware_owner');
    }

    if (!storedOwner && activeU && activeU !== 'HENRY' && activeU !== 'TEMPCREATOR') {
      storedOwner = activeU;
      localStorage.setItem('innova_primary_hardware_owner', storedOwner);
    }

    if (storedOwner) {
      const existingEntry = registry[storedOwner];
      registry[storedOwner] = {
        handle: storedOwner,
        primaryFingerprint: existingEntry?.primaryFingerprint || fp,
        authorizedFingerprints: Array.from(new Set([...(existingEntry?.authorizedFingerprints || []), fp])),
        devices: existingEntry?.devices?.length
          ? existingEntry.devices
          : [
              {
                id: `DEV-${fp}`,
                name: devInfo.name,
                type: devInfo.type,
                browser: devInfo.browser,
                os: devInfo.os,
                fingerprint: fp,
                lastActive: new Date().toISOString(),
                isCurrent: true
              }
            ]
      };
      (registry[storedOwner] as any).locationSignature = loc;
    }

    localStorage.setItem('innova-ringcomm-node-registry-v1', JSON.stringify(registry));

    const rawShared = localStorage.getItem(SHARED_DEVICE_KEY);
    if (rawShared) {
      const list: SharedDevicePermission[] = JSON.parse(rawShared);
      const cleaned = (Array.isArray(list) ? list : []).filter(
        (x) => x.friendHandle.replace(/^@+/, '').toUpperCase() !== 'HENRY'
      );
      localStorage.setItem(SHARED_DEVICE_KEY, JSON.stringify(cleaned));
    }
    return storedOwner;
  } catch {
    return '';
  }
};

export const getPrimaryOwnerOfCurrentHardware = (): string => {
  return purgeHenryForeverAndLockHost();
};

// ============================================================================
// FRIENDS & TELEGRAM SHARED-DEVICE HANDSHAKE FUNCTIONS
// ============================================================================

export const loadFriendsList = (): FriendConnection[] => {
  try {
    const raw = localStorage.getItem(FRIENDS_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((f) => f.handle.replace(/^@+/, '').toUpperCase() !== 'HENRY')
      : [];
  } catch {
    return [];
  }
};

export const addFriendConnection = (rawHandle: string, displayName?: string): FriendConnection[] => {
  const clean = String(rawHandle || '').trim().replace(/^@+/, '').toUpperCase();
  if (!clean || clean === 'HENRY' || clean === 'TICKER') return loadFriendsList();
  const formatted = `@${clean}`;
  const current = loadFriendsList();
  if (current.some((f) => f.handle.toUpperCase() === formatted)) {
    return current;
  }
  const next: FriendConnection[] = [
    {
      handle: formatted,
      displayName: displayName?.trim() || clean.replace(/[._-]/g, ' '),
      status: 'friends',
      addedAt: new Date().toLocaleDateString()
    },
    ...current
  ];
  try {
    localStorage.setItem(FRIENDS_LIST_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent('innova-shared-devices-updated'));
  return next;
};

export const removeFriendConnection = (rawHandle: string): FriendConnection[] => {
  const formatted = `@${String(rawHandle || '').trim().replace(/^@+/, '').toUpperCase()}`;
  const next = loadFriendsList().filter((f) => f.handle.toUpperCase() !== formatted);
  try {
    localStorage.setItem(FRIENDS_LIST_KEY, JSON.stringify(next));
  } catch {}
  // Also revoke any shared device access when removing a friend
  revokeFriendFromMyDevice(formatted);
  return next;
};

export const loadSharedDevicePermissions = (): SharedDevicePermission[] => {
  try {
    const raw = localStorage.getItem(SHARED_DEVICE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => x.friendHandle.replace(/^@+/, '').toUpperCase() !== 'HENRY')
      : [];
  } catch {
    return [];
  }
};

export const saveSharedDevicePermissions = (list: SharedDevicePermission[]): SharedDevicePermission[] => {
  try {
    localStorage.setItem(SHARED_DEVICE_KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new CustomEvent('innova-shared-devices-updated'));
  return list;
};

// Triggered from a Friend's Profile inside Innova Telegram: "Allow User to Use My Device"
export const grantFriendDevicePermissionRequest = (
  hostHandle: string,
  friendHandle: string,
  friendDisplayName?: string,
  telegramMessageId?: string
): SharedDevicePermission => {
  const cleanHost = `@${String(hostHandle || 'TICKER').trim().replace(/^@+/, '').toUpperCase()}`;
  const cleanFriend = `@${String(friendHandle || '').trim().replace(/^@+/, '').toUpperCase()}`;
  const fp = computeHardwareFingerprint();
  const devInfo = parseLiveDeviceInfo();

  const existing = loadSharedDevicePermissions().filter(
    (p) => p.friendHandle.toUpperCase() !== cleanFriend
  );

  const perm: SharedDevicePermission = {
    id: 'shd-' + Date.now(),
    hostHandle: cleanHost,
    friendHandle: cleanFriend,
    friendDisplayName: friendDisplayName || cleanFriend.replace(/^@/, ''),
    hostDeviceName: devInfo.name,
    hostHardwareFp: fp,
    status: 'pending_friend_approval',
    telegramMessageId,
    requestedAt: new Date().toLocaleString()
  };

  saveSharedDevicePermissions([perm, ...existing]);
  return perm;
};

// Triggered when the Friend clicks "Approve" inside the Innova Telegram message:
// ("@TICKER wants to grant @JON_DOE permission to login on his device" -> [Approve])
export const approveFriendDevicePermission = (friendHandleOrMsgId: string): SharedDevicePermission | null => {
  const cleanTarget = String(friendHandleOrMsgId || '').trim().toUpperCase();
  const formattedTarget = cleanTarget.startsWith('@') ? cleanTarget : `@${cleanTarget}`;
  const list = loadSharedDevicePermissions();
  let matched: SharedDevicePermission | null = null;

  const updated = list.map((p) => {
    if (
      p.friendHandle.toUpperCase() === formattedTarget ||
      p.id.toUpperCase() === cleanTarget ||
      (p.telegramMessageId && p.telegramMessageId.toUpperCase() === cleanTarget)
    ) {
      matched = {
        ...p,
        status: 'approved',
        approvedAt: new Date().toLocaleString()
      };
      return matched;
    }
    return p;
  });

  saveSharedDevicePermissions(updated);
  return matched;
};

// Triggered from Identity -> Shared Devices -> "Remove from My Device" button
export const revokeFriendFromMyDevice = (friendHandle: string): SharedDevicePermission[] => {
  const cleanFriend = `@${String(friendHandle || '').trim().replace(/^@+/, '').toUpperCase()}`;
  const remaining = loadSharedDevicePermissions().filter(
    (p) => p.friendHandle.toUpperCase() !== cleanFriend
  );
  return saveSharedDevicePermissions(remaining);
};

export interface NodeRecognitionCheck {
  status:
    | 'AUTHORIZED_OWNER'
    | 'AUTHORIZED_SHARED_FRIEND'
    | 'PENDING_TELEGRAM_APPROVAL'
    | 'BLOCKED_UNAUTHORIZED_ON_HOST_DEVICE';
  normalizedHandle: string;
  primaryHardwareOwner: string;
  deviceFingerprint: string;
  locationSignature: string;
  deviceName: string;
  entry?: NodeBondEntry;
  message?: string;
}

export const checkNodeRegistrationStatus = (rawHandle: string): NodeRecognitionCheck => {
  const existingHostOwner = purgeHenryForeverAndLockHost();
  const clean = String(rawHandle || '').trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '').toUpperCase();
  const formatted = `@${clean}`;
  const fp = computeHardwareFingerprint();
  const loc = computeLocationSignature();
  const devInfo = parseLiveDeviceInfo();

  if (!clean || clean === 'HENRY' || clean === 'TEMPCREATOR') {
    return {
      status: 'BLOCKED_UNAUTHORIZED_ON_HOST_DEVICE',
      normalizedHandle: formatted || '@INVALID',
      primaryHardwareOwner: existingHostOwner || 'ENCLAVE',
      deviceFingerprint: fp,
      locationSignature: loc,
      deviceName: devInfo.name,
      message: `ACCESS DENIED: ${formatted} is permanently restricted on the Innova Ring Comm network.`
    };
  }

  if (!existingHostOwner) {
    try {
      localStorage.setItem('innova_primary_hardware_owner', clean);
    } catch {}
    const claim = verifyOrClaimNodeOnDevice(clean);
    return {
      status: 'AUTHORIZED_OWNER',
      normalizedHandle: formatted,
      primaryHardwareOwner: clean,
      deviceFingerprint: fp,
      locationSignature: loc,
      deviceName: devInfo.name,
      entry: claim.entry
    };
  }

  if (
    clean === existingHostOwner ||
    (existingHostOwner === 'TICKER' && clean === 'TICKERTWIZTED') ||
    (existingHostOwner === 'TICKERTWIZTED' && clean === 'TICKER')
  ) {
    const claim = verifyOrClaimNodeOnDevice(existingHostOwner);
    return {
      status: 'AUTHORIZED_OWNER',
      normalizedHandle: formatted,
      primaryHardwareOwner: existingHostOwner,
      deviceFingerprint: fp,
      locationSignature: loc,
      deviceName: devInfo.name,
      entry: claim.entry
    };
  }

  const sharedPerms = loadSharedDevicePermissions();
  const friendPerm = sharedPerms.find(
    (p) => p.friendHandle.toUpperCase() === formatted && p.hostHardwareFp === fp
  );

  if (friendPerm && friendPerm.status === 'approved') {
    return {
      status: 'AUTHORIZED_SHARED_FRIEND',
      normalizedHandle: formatted,
      primaryHardwareOwner: existingHostOwner,
      deviceFingerprint: fp,
      locationSignature: loc,
      deviceName: devInfo.name,
      message: `✓ Shared Device Access Verified via Innova Telegram Handshake with Host @${existingHostOwner}.`
    };
  }

  if (friendPerm && friendPerm.status === 'pending_friend_approval') {
    return {
      status: 'PENDING_TELEGRAM_APPROVAL',
      normalizedHandle: formatted,
      primaryHardwareOwner: existingHostOwner,
      deviceFingerprint: fp,
      locationSignature: loc,
      deviceName: devInfo.name,
      message: `HANDSHAKE PENDING APPROVAL: Host @${existingHostOwner} invited ${formatted} via Innova Telegram. Click "Approve" in Innova Telegram first.`
    };
  }

  return {
    status: 'BLOCKED_UNAUTHORIZED_ON_HOST_DEVICE',
    normalizedHandle: formatted,
    primaryHardwareOwner: existingHostOwner,
    deviceFingerprint: fp,
    locationSignature: loc,
    deviceName: devInfo.name,
    message: `HARDWARE ENCLAVE LOCKED TO @${existingHostOwner}: This ${devInfo.name} is cryptographically bonded to @${existingHostOwner}. Use your own device or request an Innova Telegram Shared-Device Handshake.`
  };
};


export const revokeGuestHandshakeSessions = (): void => { try { localStorage.removeItem('innova_full_circle_handshakes_v1'); } catch {} };
