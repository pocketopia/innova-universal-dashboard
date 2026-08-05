const getApiUrl = () => {
  // Use the Vercel/Production environment variable if it exists
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  // Fallback for local development
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3005/api`;
  }
  return 'http://localhost:3005/api';
};

export const API_BASE_URL = getApiUrl();

// Identity verification response from backend
export interface IdentityVerificationResponse {
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

// Identity registration response
export interface IdentityRegistrationResponse {
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

export const hasValidSession = (): boolean => {
  return !!localStorage.getItem('innova-username');
};

export const getStoredUserSession = () => {
  return {
    userName: localStorage.getItem('innova-username') || '',
    walletAddress: localStorage.getItem('innova-wallet-address') || '',
    tenantId: localStorage.getItem('innova-tenant') || '',
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
};

export const generateMockHardwareSignature = (): string => {
  const chars = '0123456789abcdef';
  let signature = '';
  for (let i = 0; i < 128; i++) {
    signature += chars[Math.floor(Math.random() * chars.length)];
  }
  return signature;
};

export const verifyIdentity = async (
  userName: string,
  hardwareSignature: string
): Promise<IdentityVerificationResponse> => {
  const response = await fetch(`${API_BASE_URL}/identity/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': userName,
      'x-hardware-signature': hardwareSignature,
    },
    body: JSON.stringify({ userName, hardwareSignature }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error', message: `Request failed with status ${response.status}` }));
    throw new Error(errorData.message || `Verification failed with status ${response.status}`);
  }

  return response.json();
};

export const registerIdentity = async (
  userName: string,
  walletAddress: string,
  publicKey: string,
  signature: string
): Promise<IdentityRegistrationResponse> => {
  const response = await fetch(`${API_BASE_URL}/identity/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': userName,
      'x-hardware-signature': signature,
    },
    body: JSON.stringify({ userName, walletAddress, publicKey, signature }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error', message: `Request failed with status ${response.status}` }));
    throw new Error(errorData.message || `Registration failed with status ${response.status}`);
  }

  return response.json();
};

export const fetchEcosystemContent = async () => {
  const tenant = localStorage.getItem('innova-tenant') || 'ArcHaven';
  const session = getStoredUserSession();
  
  // If we have a username, we MUST send all three headers to pass the backend middleware
  const headers: Record<string, string> = {
    'x-tenant-id': tenant,
  };
  
  if (session.userName) {
    headers['x-user-name'] = session.userName;
    headers['x-hardware-signature'] = session.hardwareSignature || 'ringcomm_demo_signature_123';
    headers['x-wallet-address'] = session.walletAddress || '0x7cde882b3a99e15ce89f302b1c41257dfbb39fd1';
  }
  
  const response = await fetch(`${API_BASE_URL}/content`, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed fetching ecosystem content for ${tenant}`);
  }
  
  return response.json();
};

export const submitContent = async (payload: any) => {
  // Intelligent tenant routing based on ID prefix
  let tenant = 'ArcHaven';
  if (payload.id?.startsWith('HEK-')) {
    tenant = 'HekticTV';
  } else if (payload.id?.startsWith('KR-')) {
    tenant = 'Kreation';
  } else if (payload.id?.startsWith('ARCH-')) {
    tenant = 'ArcHaven';
  } else if (payload.id?.startsWith('SS-')) {
    tenant = 'StreamShare';
  } else {
    tenant = localStorage.getItem('innova-tenant') || 'ArcHaven';
  }
  const session = getStoredUserSession();
  const username = session.userName || '@anonymous';
  
  const response = await fetch(`${API_BASE_URL}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenant,
      'x-user-name': username,
      'x-hardware-signature': session.hardwareSignature || 'ringcomm_demo_signature_123',
      'x-wallet-address': session.walletAddress || '0x7cde882b3a99e15ce89f302b1c41257dfbb39fd1'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit content');
  }
  
  return response.json();
};

export const submitGame = async (payload: any) => {
  const session = getStoredUserSession();
  const username = session.userName || '@anonymous';
  
  const response = await fetch(`${API_BASE_URL}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'Kreation',
      'x-user-name': username,
      'x-hardware-signature': session.hardwareSignature || 'ringcomm_demo_signature_123',
      'x-wallet-address': session.walletAddress || '0x7cde882b3a99e15ce89f302b1c41257dfbb39fd1'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit game');
  }
  
  return response.json();
};

export const updateContentStatus = async (id: string, newStatus: string, collection: string) => {
  // Map collection type and ID prefix to tenant ID
  let tenant = 'ArcHaven';
  if (id.startsWith('KR-') || collection === 'game') {
    tenant = 'Kreation';
  } else if (id.startsWith('HEK-') || collection === 'broadcast') {
    tenant = 'HekticTV';
  } else if (id.startsWith('ARCH-')) {
    tenant = 'ArcHaven';
  } else if (id.startsWith('SS-') || collection === 'project') {
    tenant = 'StreamShare';
  } else if (localStorage.getItem('innova-tenant')) {
    tenant = localStorage.getItem('innova-tenant') || 'ArcHaven';
  }
  
  const session = getStoredUserSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': tenant };
  
  if (session.userName) {
    headers['x-user-name'] = session.userName;
    headers['x-hardware-signature'] = session.hardwareSignature || 'ringcomm_demo_signature_123';
    headers['x-wallet-address'] = session.walletAddress || '0x7cde882b3a99e15ce89f302b1c41257dfbb39fd1';
  }
  
  const response = await fetch(`${API_BASE_URL}/content/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: newStatus })
  });
  
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
};

// Wallet balance fetch from Master Brain
export async function fetchWalletBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/balance/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'InnovaHub'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch balance');
    const data = await response.json();
    return data.balance || 0;
  } catch (error) {
    console.error('[WALLET API] Error fetching balance:', error);
    return 0;
  }
}

export async function processEcosystemTransaction(
  walletAddress: string, 
  amount: number, 
  txType: 'subscription' | 'game_purchase' | 'creator_boost' | 'tip',
  details: string,
  recipient?: string
): Promise<{success: boolean, newBalance?: number, receipt?: string, error?: string}> {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/spend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'InnovaHub'
      },
      body: JSON.stringify({ amount, walletAddress, txType, recipient, details })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Transaction failed');
    
    return { success: true, newBalance: data.newBalance, receipt: data.receipt };
  } catch (error: any) {
    console.error('[WALLET API] Transaction error:', error);
    return { success: false, error: error.message };
  }
}
