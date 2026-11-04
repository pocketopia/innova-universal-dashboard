// Hardware-Bound Ring Comm Node Registry & Passwordless Multi-Device Invite Engine

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

interface NodeBondEntry {
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
  let deviceName = 'Unknown Hardware Unit';
  let deviceType: BoundDeviceRecord['type'] = 'unknown';

  if (/AFT|FireTV|Bravia|SmartTV|Tizen|Web0S/i.test(ua)) {
    deviceName = 'Smart TV Receiver';
    deviceType = 'tv';
  } else if (/Macintosh/i.test(ua)) {
    const macMatch = ua.match(/Macintosh;\s*Intel\s*Mac\s*OS\s*X?\s*([0-9_.]+)/i);
    deviceName = macMatch ? `MacBook (${macMatch[1].replace(/_/g, '.')})` : 'Mac Workstation';
    deviceType = 'desktop';
  } else if (/iPhone/i.test(ua)) {
    deviceName = 'iPhone Unit';
    deviceType = 'mobile';
  } else if (/iPad/i.test(ua)) {
    deviceName = 'iPad Unit';
    deviceType = 'tablet';
  } else if (/Android/i.test(ua)) {
    const isMobile = /Mobile/i.test(ua);
    deviceName = isMobile ? 'Android Mobile Unit' : 'Android Tablet / TV';
    deviceType = isMobile ? 'mobile' : 'tablet';
  } else if (/Windows/i.test(ua)) {
    deviceName = 'Windows Workstation';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    deviceName = 'Linux Node';
    deviceType = 'desktop';
  }

  let browser = 'System Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  let os = 'System OS';
  if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { name: deviceName, type: deviceType, browser, os };
};

export const computeHardwareFingerprint = (): string => {
  if (typeof window === 'undefined') return '00000000';
  const storedOverride = localStorage.getItem('innova-simulated-device-fp');
  if (storedOverride) return storedOverride;

  const ua = window.navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = window.navigator.language;
  const cores = String(window.navigator.hardwareConcurrency || 4);
  const raw = `${ua}|${screen}|${timezone}|${lang}|${cores}`;

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
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

// deterministic invite code derivation from handle so cross-device invite codes work even without a central database!
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

export const generateDeviceInviteForNode = (handle: string): { code: string; inviteUrl: string; expiresAt: number } => {
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

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://innova-universal-dashboard.vercel.app';
  const inviteUrl = `${origin}/?node=${encodeURIComponent(clean)}&invite=${encodeURIComponent(code)}`;
  return { code, inviteUrl, expiresAt };
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

  // Protect @TICKER or any already-registered handle if accessed from a non-matching fingerprint
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
      return { allowed: true, entry: existing };
    }
    return {
      allowed: false,
      requiresInvite: true,
      message: `Node @${clean} is already claimed and hardware-locked to another Ring Comm device (Primary FP: ${existing.primaryFingerprint}). Enter a Ring Comm Device Invite Code from your primary device to authorize this hardware (${currentFp}).`,
    };
  }

  // First time claiming this node on this browser OR already authorized fingerprint
  const entry: NodeBondEntry = existing || {
    handle: clean,
    primaryFingerprint: currentFp,
    authorizedFingerprints: [currentFp],
    devices: [],
  };

  if (!entry.authorizedFingerprints.includes(currentFp)) {
    entry.authorizedFingerprints.push(currentFp);
  }

  const idx = entry.devices.findIndex(d => d.fingerprint === currentFp);
  entry.devices.forEach(d => (d.isCurrent = false));
  if (idx >= 0) {
    entry.devices[idx] = { ...entry.devices[idx], lastActive: now, isCurrent: true };
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
  return { allowed: true, entry };
};
