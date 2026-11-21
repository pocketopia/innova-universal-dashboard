import { generateCryptoSignature } from './securityUtils';
import { computeHardwareFingerprint } from './deviceBondRegistry';

const getApiUrl = () => {
  const raw = (import.meta as any).env?.VITE_API_URL || 'https://innova-master-brain-api.onrender.com/api';
  const trimmed = String(raw).replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_BASE_URL = getApiUrl();

let cachedCryptoSignature: {
  signature: string;
  timestamp: number;
  deviceFingerprint: string;
} | null = null;

const SIGNATURE_VALIDITY_MS = 5 * 60 * 1000;

export const getRingCommSignature = async (): Promise<{
  signature: string;
  timestamp: number;
  deviceFingerprint: string;
}> => {
  if (cachedCryptoSignature && (Date.now() - cachedCryptoSignature.timestamp) < SIGNATURE_VALIDITY_MS) {
    return cachedCryptoSignature;
  }
  try {
    const cryptoResult = await generateCryptoSignature();
    cachedCryptoSignature = {
      signature: cryptoResult.signature,
      timestamp: cryptoResult.timestamp,
      deviceFingerprint: cryptoResult.challenge.substring(0, 64)
    };
    return cachedCryptoSignature;
  } catch {
    const fp = computeHardwareFingerprint();
    return {
      signature: `${fp}${'a'.repeat(56)}`,
      timestamp: Date.now(),
      deviceFingerprint: fp
    };
  }
};

export const invalidateSignatureCache = (): void => {
  cachedCryptoSignature = null;
};

export interface IdentityVerificationResponse {
  success?: boolean;
  verified?: boolean;
  customToken: string;
  identity: {
    userId: string;
    userName: string;
    walletAddress: string;
    tenantId: string;
    verified: boolean;
    createdAt: string;
    lastVerifiedAt: string;
    publicKey?: string;
    tier?: string;
  };
}

export interface IdentityRegistrationResponse {
  success?: boolean;
  customToken: string;
  identity: {
    userId: string;
    userName: string;
    walletAddress: string;
    tenantId: string;
    verified: boolean;
    createdAt: string;
    publicKey: string;
    tier: string;
  };
}

const formatAtHandle = (raw?: string): string => {
  const clean = String(raw || '').trim().replace(/^@+/, '').toUpperCase();
  return clean ? `@${clean}` : '@ANONYMOUS';
};

const deriveDeterministicWallet = async (cleanHandle: string): Promise<string> => {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(`INNOVA_EVM_VAULT::${cleanHandle}`));
      const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      return `0x${hex.slice(0, 40)}`;
    }
  } catch {}
  let h = 2166136261;
  for (let i = 0; i < cleanHandle.length; i++) {
    h ^= cleanHandle.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `0x${Math.abs(h).toString(16).padStart(8, '0').repeat(5).slice(0, 40)}`;
};

export const hasValidSession = (): boolean => {
  return !!localStorage.getItem('innova-username');
};

export const getStoredUserSession = () => {
  return {
    userName: localStorage.getItem('innova-username') || '',
    walletAddress: localStorage.getItem('innova-wallet-address') || '',
    tenantId: localStorage.getItem('innova-tenant') || 'StreamShare',
    customToken: localStorage.getItem('innova-custom-token') || '',
    hardwareSignature: localStorage.getItem('innova-hardware-sig') || '',
  };
};

export const clearIdentityData = (): void => {
  localStorage.removeItem('innova-username');
  localStorage.removeItem('innova-hardware-sig');
  localStorage.removeItem('innova-wallet-address');
  localStorage.removeItem('innova-tenant');
  localStorage.removeItem('innova-custom-token');
  localStorage.removeItem('innova-session-active');
};

export const generateHardwareSignature = (): string => {
  const chars = '0123456789abcdef';
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(64);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let signature = '';
  for (let i = 0; i < 128; i++) {
    signature += chars[Math.floor(Math.random() * chars.length)];
  }
  return signature;
};

export const syncIdentityAndWalletWithMasterBrain = async (
  userName: string,
  walletAddress?: string,
  hardwareSignature?: string
): Promise<IdentityVerificationResponse> => {
  const cleanHandle = userName.replace(/^@+/, '').trim().toUpperCase();
  const formattedHandle = `@${cleanHandle}`;
  const hwSig = hardwareSignature || localStorage.getItem('innova-hardware-sig') || generateHardwareSignature();
  const hwFp = computeHardwareFingerprint();
  const inviteParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('invite') || '' : '';
  const candidateWallet = walletAddress || localStorage.getItem('innova-wallet-address') || '';

  try {
    const response = await fetch(`${API_BASE_URL}/identity/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: formattedHandle,
        walletAddress: candidateWallet,
        hardwareFingerprint: hwFp,
        inviteCode: inviteParam,
        publicKey: hwSig.slice(0, 64),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Hardware enclave verification failed');
    }

    const resolvedWallet = data.identity?.walletAddress || candidateWallet || await deriveDeterministicWallet(cleanHandle);
    localStorage.setItem('innova-username', cleanHandle);
    localStorage.setItem('innova-wallet-address', resolvedWallet);
    localStorage.setItem('innova-hardware-sig', hwSig);
    localStorage.setItem('innova-tenant', 'StreamShare');
    localStorage.setItem('innova-custom-token', `innova_session_${Date.now()}`);
    window.dispatchEvent(new CustomEvent('innova-wallet-updated', { detail: { walletAddress: resolvedWallet, handle: cleanHandle } }));

    return {
      success: true,
      verified: true,
      customToken: `innova_session_${Date.now()}`,
      identity: {
        userId: data.identity?.userId || cleanHandle,
        userName: cleanHandle,
        walletAddress: resolvedWallet,
        tenantId: 'StreamShare',
        publicKey: data.identity?.publicKey || hwSig.slice(0, 64),
        verified: true,
        tier: data.identity?.tier || 'Creator',
        createdAt: data.identity?.createdAt || new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      }
    };
  } catch (err: any) {
    if (String(err?.message || '').includes('hardware-locked')) {
      throw err;
    }
    const fallbackWallet = candidateWallet || await deriveDeterministicWallet(cleanHandle);
    localStorage.setItem('innova-username', cleanHandle);
    localStorage.setItem('innova-wallet-address', fallbackWallet);
    localStorage.setItem('innova-hardware-sig', hwSig);
    localStorage.setItem('innova-tenant', 'StreamShare');
    localStorage.setItem('innova-custom-token', `innova_session_${Date.now()}`);
    return {
      success: true,
      verified: true,
      customToken: `innova_session_${Date.now()}`,
      identity: {
        userId: cleanHandle,
        userName: cleanHandle,
        walletAddress: fallbackWallet,
        tenantId: 'StreamShare',
        publicKey: hwSig.slice(0, 64),
        verified: true,
        tier: 'Creator',
        createdAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      }
    };
  }
};

export const verifyIdentity = async (
  userName: string,
  hardwareSignature: string
): Promise<IdentityVerificationResponse> => {
  return syncIdentityAndWalletWithMasterBrain(userName, undefined, hardwareSignature);
};

export const registerIdentity = async (
  userName: string,
  walletAddress: string,
  publicKey: string,
  hardwareSignature: string,
  tenantId: string = 'StreamShare'
): Promise<IdentityRegistrationResponse> => {
  const res = await syncIdentityAndWalletWithMasterBrain(userName, walletAddress, hardwareSignature || publicKey);
  return {
    success: true,
    customToken: res.customToken,
    identity: {
      userId: res.identity.userId,
      userName: res.identity.userName,
      walletAddress: res.identity.walletAddress,
      tenantId,
      publicKey: res.identity.publicKey || publicKey.slice(0, 64),
      verified: true,
      tier: res.identity.tier || 'Creator',
      createdAt: res.identity.createdAt,
    }
  };
};

const resolveValidTenant = (raw?: string): string => {
  const map: Record<string, string> = {
    mvn: 'MVN',
    streamshare: 'StreamShare',
    archaven: 'ArcHaven',
    hektic: 'HekticTV',
    hektictv: 'HekticTV',
    kreation: 'Kreation',
  };
  return map[String(raw || '').trim().toLowerCase()] || 'StreamShare';
};

export const fetchEcosystemContent = async (explicitTenant?: string) => {
  const tenant = resolveValidTenant(explicitTenant || localStorage.getItem('innova-tenant') || 'StreamShare');
  const url = explicitTenant ? `${API_BASE_URL}/content` : `${API_BASE_URL}/content?all=true`;
  const response = await fetch(url, {
    headers: { 'x-tenant-id': tenant },
  });
  if (!response.ok) {
    throw new Error(`Failed fetching ecosystem content (${response.status})`);
  }
  return response.json();
};

export const submitContent = async (payload: any) => {
  let tenant = resolveValidTenant(payload?.tenantId || payload?.tenant);
  if (payload?.id?.startsWith('HEK-') || payload?.tenant === 'HekticTV') tenant = 'HekticTV';
  else if (payload?.id?.startsWith('KR-') || payload?.tenant === 'Kreation') tenant = 'Kreation';
  else if (payload?.id?.startsWith('MVN-') || payload?.id?.startsWith('mvn-') || payload?.tenant === 'MVN' || payload?.songTitle) tenant = 'MVN';
  else if (payload?.id?.startsWith('ARCH-') || payload?.tenant === 'ArcHaven') tenant = 'ArcHaven';
  else if (payload?.id?.startsWith('SS-') || payload?.tenant === 'StreamShare' || payload?.handshakeCode || payload?.clientCompany) tenant = 'StreamShare';

  const session = getStoredUserSession();
  const formattedUser = formatAtHandle(session.userName || payload?.creator);
  const hwSig = session.hardwareSignature || generateHardwareSignature();
  const wallet = /^0x[a-fA-F0-9]{40}$/.test(session.walletAddress)
    ? session.walletAddress
    : await deriveDeterministicWallet(formattedUser.slice(1));

  if (!session.walletAddress) localStorage.setItem('innova-wallet-address', wallet);
  if (!session.hardwareSignature) localStorage.setItem('innova-hardware-sig', hwSig);

  const response = await fetch(`${API_BASE_URL}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenant,
      'x-user-name': formattedUser,
      'x-hardware-signature': hwSig,
      'x-wallet-address': wallet,
    },
    body: JSON.stringify({ ...payload, tenant, tenantId: tenant })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to submit content to Master Brain');
  }
  return data;
};

export const submitGame = async (payload: any) => {
  return submitContent({ ...payload, tenant: 'Kreation', tenantId: 'Kreation', type: 'game' });
};

export const updateContentStatus = async (id: string, newStatus: string, collection: string = '') => {
  let tenant = 'StreamShare';
  if (id.startsWith('KR-') || collection === 'game' || collection === 'kreation') tenant = 'Kreation';
  else if (id.startsWith('MVN-') || id.startsWith('mvn-') || collection === 'mvn' || collection === 'music') tenant = 'MVN';
  else if (id.startsWith('HEK-') || collection === 'broadcast' || collection === 'hektic') tenant = 'HekticTV';
  else if (id.startsWith('ARCH-') || collection === 'archaven') tenant = 'ArcHaven';
  else if (id.startsWith('SS-') || collection === 'project' || collection === 'streamshare') tenant = 'StreamShare';

  const normalizedStatus =
    newStatus.toLowerCase() === 'approved' || newStatus.toLowerCase() === 'success' || newStatus.toLowerCase() === 'syndicated' || newStatus.toLowerCase() === 'live'
      ? 'approved'
      : newStatus.toLowerCase() === 'denied' || newStatus.toLowerCase() === 'issue' || newStatus.toLowerCase() === 'terminated'
        ? 'rejected'
        : newStatus.toLowerCase();

  const response = await fetch(`${API_BASE_URL}/content/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenant,
    },
    body: JSON.stringify({ status: normalizedStatus })
  });

  if (!response.ok) throw new Error(`Failed updating status (${response.status})`);
  return response.json();
};

export async function fetchWalletBalance(walletAddress: string): Promise<number> {
  if (!walletAddress) return 0;
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/balance/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'StreamShare'
      }
    });
    if (!response.ok) return 0;
    const data = await response.json();
    return Number(data.balance || 0);
  } catch {
    return 0;
  }
}

export async function processEcosystemTransaction(
  walletAddress: string,
  amount: number,
  txType: 'subscription' | 'game_purchase' | 'creator_boost' | 'tip',
  details: string,
  recipient?: string
): Promise<{ success: boolean; newBalance?: number; receipt?: string; error?: string }> {
  try {
    const session = getStoredUserSession();
    const formattedUser = formatAtHandle(session.userName);
    const response = await fetch(`${API_BASE_URL}/wallet/spend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'StreamShare',
        'x-user-name': formattedUser,
        'x-hardware-signature': session.hardwareSignature || generateHardwareSignature(),
        'x-wallet-address': session.walletAddress || walletAddress
      },
      body: JSON.stringify({ amount, walletAddress, txType, recipient, details })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Transaction failed');
    return { success: true, newBalance: data.newBalance, receipt: data.receipt };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
