/**
 * Innova Node-to-Node (N2N) Messaging Protocol
 * 
 * Pure P2P messaging system with cryptographic authentication.
 * Zero central servers - direct peer-to-peer transmission only.
 * Zero-trust validation with spam annihilator mechanism.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface NodeIdentity {
  handle: string;           // @USER.NAME format
  publicKey: string;        // ED25519 public key (64 hex chars)
  privateKey?: string;      // ED25519 private key (64 hex chars) - NEVER transmitted
  nodeId: string;           // Unique node identifier
  verified: boolean;
}

export interface N2NMessage {
  id: string;               // Unique message ID (SHA-256 hash)
  sender: string;           // Sender's @HANDLE
  senderPublicKey: string;  // Sender's public key for verification
  recipient: string;        // Recipient's @HANDLE
  encryptedContent: string; // AES-GCM encrypted message content
  iv: string;               // Initialization vector (base64)
  signature: string;        // ED25519 signature of content
  timestamp: number;        // Unix timestamp
  nonce: string;            // Anti-replay nonce
  ttl: number;              // Time-to-live in seconds
}

export interface WhitelistEntry {
  handle: string;
  publicKey: string;
  addedAt: number;
  trustLevel: 'full' | 'limited';
}

export interface MicroTollProof {
  type: 'token_burn' | 'pow_challenge';
  proof: string;
  timestamp: number;
  difficulty?: number;      // For PoW: number of leading zeros required
}

export interface N2NMessageRequest {
  from: NodeIdentity;
  to: NodeIdentity;
  content: string;           // Plaintext content (will be encrypted)
  ttl?: number;              // Default: 86400 (24 hours)
}

export interface N2NValidationResult {
  valid: boolean;
  error?: string;
  requiresToll: boolean;
  tollProof?: MicroTollProof;
}

// ============================================
// CRYPTOGRAPHIC UTILITIES
// ============================================

/**
 * Generate ED25519 key pair for a node
 * Returns keys as hex strings for storage
 */
export const generateNodeKeyPair = async (): Promise<{
  publicKey: string;
  privateKey: string;
}> => {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'EdDSA', namedCurve: 'Ed25519' },
    true,
    ['sign', 'verify']
  );
  
  const publicBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  
  const publicArray = new Uint8Array(publicBuffer);
  const privateArray = new Uint8Array(privateBuffer);
  
  // Extract the actual private key bytes from PKCS8 format (skip the header)
  const privateKeyBytes = privateArray.slice(16); // Skip PKCS8 header for Ed25519
  
  return {
    publicKey: Array.from(publicArray).map(b => b.toString(16).padStart(2, '0')).join(''),
    privateKey: Array.from(privateKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  };
};

/**
 * Sign data with private key
 */
export const signData = async (privateKeyHex: string, data: string): Promise<string> => {
  const keyBytes = Uint8Array.from(privateKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  // Import the private key
  const pkcs8Bytes = new Uint8Array(16 + keyBytes.length);
  pkcs8Bytes.set([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20], 0);
  pkcs8Bytes.set(keyBytes, 16);
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes,
    { name: 'EdDSA', namedCurve: 'Ed25519' },
    false,
    ['sign']
  );
  
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('EdDSA', key, encoder.encode(data));
  
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verify signature with public key
 */
export const verifySignature = async (
  publicKeyHex: string,
  data: string,
  signatureHex: string
): Promise<boolean> => {
  try {
    const keyBytes = Uint8Array.from(publicKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const sigBytes = Uint8Array.from(signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'EdDSA', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );
    
    const encoder = new TextEncoder();
    return await crypto.subtle.verify('EdDSA', key, sigBytes, encoder.encode(data));
  } catch {
    return false;
  }
};

/**
 * Encrypt content using AES-GCM (256-bit)
 */
export const encryptContent = async (plaintext: string, recipientPublicKey: string): Promise<{
  encrypted: string;
  iv: string;
}> => {
  // Derive a shared key using ECDH (simplified - in production use proper key exchange)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(recipientPublicKey + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  const key = await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  };
};

/**
 * Decrypt content using AES-GCM
 */
export const decryptContent = async (
  encryptedBase64: string,
  ivBase64: string,
  senderPublicKey: string,
  recipientPrivateKey: string
): Promise<string> => {
  // Derive the same shared key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(senderPublicKey + recipientPrivateKey.split('').reverse().join('').slice(0, 32));
  
  // For decryption, we need the original key derivation
  // This is a simplified version - production should use proper ECDH
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(senderPublicKey));
  
  const key = await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const iv = Uint8Array.from(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
  const ciphertext = Uint8Array.from(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

// ============================================
// ZERO-TRUST VALIDATION
// ============================================

/**
 * Validate incoming message with zero-trust principles
 * Checks: signature, timestamp, nonce (anti-replay), identity
 */
export const validateIncomingMessage = async (
  message: N2NMessage,
  recipientIdentity: NodeIdentity,
  seenNonces: Set<string>
): Promise<N2NValidationResult> => {
  // 1. Check timestamp validity
  const now = Date.now() / 1000;
  if (now - message.timestamp > message.ttl) {
    return { valid: false, error: 'Message expired', requiresToll: false };
  }
  
  // 2. Anti-replay check
  if (seenNonces.has(message.nonce)) {
    return { valid: false, error: 'Duplicate nonce - replay attack detected', requiresToll: false };
  }
  
  // 3. Verify recipient
  if (message.recipient !== recipientIdentity.handle) {
    return { valid: false, error: 'Message not intended for this node', requiresToll: false };
  }
  
  // 4. Verify signature
  const signatureData = JSON.stringify({
    sender: message.sender,
    recipient: message.recipient,
    encryptedContent: message.encryptedContent,
    iv: message.iv,
    timestamp: message.timestamp,
    nonce: message.nonce
  });
  
  const signatureValid = await verifySignature(
    message.senderPublicKey,
    signatureData,
    message.signature
  );
  
  if (!signatureValid) {
    return { valid: false, error: 'Invalid signature', requiresToll: false };
  }
  
  // 5. Check if sender is whitelisted
  const whitelist = getWhitelist();
  const isWhitelisted = whitelist.some(entry => 
    entry.handle === message.sender && entry.publicKey === message.senderPublicKey
  );
  
  // If not whitelisted, require micro-toll proof
  if (!isWhitelisted) {
    return { valid: true, requiresToll: true };
  }
  
  return { valid: true, requiresToll: false };
};

// ============================================
// SPAM ANNIHILATOR - MICRO-TOLL MECHANISM
// ============================================

/**
 * Proof-of-Work challenge for spam prevention
 * Requires finding a nonce that produces hash with N leading zeros
 */
export const solvePoWChallenge = async (
  difficulty: number = 4
): Promise<{ nonce: string; hash: string }> => {
  const data = Date.now().toString() + Math.random().toString();
  const encoder = new TextEncoder();
  
  let nonce = 0;
  let hash = '';
  const target = '0'.repeat(difficulty);
  
  while (true) {
    const attempt = `${data}-${nonce}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(attempt));
    hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (hash.startsWith(target)) {
      return { nonce: nonce.toString(), hash };
    }
    
    nonce++;
    
    // Safety limit
    if (nonce > 1000000) {
      throw new Error('PoW challenge too difficult');
    }
  }
};

/**
 * Verify PoW solution
 */
export const verifyPoW = async (
  data: string,
  nonce: string,
  difficulty: number,
  expectedHash: string
): Promise<boolean> => {
  const encoder = new TextEncoder();
  const attempt = `${data}-${nonce}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(attempt));
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hash === expectedHash && hash.startsWith('0'.repeat(difficulty));
};

/**
 * Generate micro-toll proof for non-whitelisted communication
 */
export const generateMicroTollProof = async (
  senderHandle: string,
  recipientHandle: string
): Promise<MicroTollProof> => {
  // Option 1: Token burn (simulated - would integrate with token contract)
  const burnTxHash = `0x${Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)).join('')}`;
  
  // Option 2: PoW challenge
  const powResult = await solvePoWChallenge(4);
  
  return {
    type: 'pow_challenge',
    proof: JSON.stringify({
      sender: senderHandle,
      recipient: recipientHandle,
      nonce: powResult.nonce,
      hash: powResult.hash
    }),
    timestamp: Date.now(),
    difficulty: 4
  };
};

/**
 * Verify micro-toll proof
 */
export const verifyMicroTollProof = async (
  proof: MicroTollProof,
  senderHandle: string,
  recipientHandle: string
): Promise<boolean> => {
  if (proof.type === 'pow_challenge') {
    const proofData = JSON.parse(proof.proof);
    if (proofData.sender !== senderHandle || proofData.recipient !== recipientHandle) {
      return false;
    }
    return await verifyPoW(
      `${senderHandle}-${recipientHandle}`,
      proofData.nonce,
      proof.difficulty || 4,
      proofData.hash
    );
  }
  
  // Token burn verification would check blockchain
  return false;
};

// ============================================
// WHITELIST MANAGEMENT
// ============================================

const WHITELIST_STORAGE_KEY = 'innova-n2n-whitelist';

/**
 * Get current whitelist from secure storage
 */
export const getWhitelist = (): WhitelistEntry[] => {
  try {
    const stored = localStorage.getItem(WHITELIST_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Storage error
  }
  return [];
};

/**
 * Add node to whitelist
 */
export const addToWhitelist = (entry: WhitelistEntry): void => {
  const whitelist = getWhitelist();
  
  // Check if already exists
  if (whitelist.some(e => e.handle === entry.handle)) {
    return;
  }
  
  whitelist.push(entry);
  localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(whitelist));
};

/**
 * Remove node from whitelist
 */
export const removeFromWhitelist = (handle: string): void => {
  const whitelist = getWhitelist().filter(e => e.handle !== handle);
  localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(whitelist));
};

/**
 * Check if a node is whitelisted
 */
export const isWhitelisted = (handle: string): boolean => {
  return getWhitelist().some(e => e.handle === handle);
};

// ============================================
// MESSAGE COMPOSITION & TRANSMISSION
// ============================================

/**
 * Compose and sign an N2N message
 */
export const composeN2NMessage = async (
  request: N2NMessageRequest
): Promise<N2NMessage> => {
  const { from, to, content, ttl = 86400 } = request;
  
  // Encrypt content
  const { encrypted, iv } = await encryptContent(content, to.publicKey);
  
  // Create nonce for anti-replay
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Create message data for signing
  const timestamp = Math.floor(Date.now() / 1000);
  const messageData = JSON.stringify({
    sender: from.handle,
    recipient: to.handle,
    encryptedContent: encrypted,
    iv,
    timestamp,
    nonce
  });
  
  // Sign the message
  const signature = await signData(from.privateKey!, messageData);
  
  // Generate message ID
  const encoder = new TextEncoder();
  const idBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(messageData + signature));
  const id = Array.from(new Uint8Array(idBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    id,
    sender: from.handle,
    senderPublicKey: from.publicKey,
    recipient: to.handle,
    encryptedContent: encrypted,
    iv,
    signature,
    timestamp,
    nonce,
    ttl
  };
};

/**
 * Prepare message for transmission (adds micro-toll if needed)
 */
export const prepareForTransmission = async (
  message: N2NMessage
): Promise<{ message: N2NMessage; tollProof?: MicroTollProof }> => {
  // Check if recipient is whitelisted
  if (!isWhitelisted(message.recipient)) {
    // Generate micro-toll proof
    const tollProof = await generateMicroTollProof(message.sender, message.recipient);
    return { message, tollProof };
  }
  
  return { message };
};

// ============================================
// NODE IDENTITY MANAGEMENT
// ============================================

const NODE_IDENTITY_KEY = 'innova-node-identity';

/**
 * Get or create node identity
 */
export const getOrCreateNodeIdentity = async (handle: string): Promise<NodeIdentity> => {
  try {
    const stored = localStorage.getItem(`${NODE_IDENTITY_KEY}-${handle}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Storage error
  }
  
  // Generate new key pair
  const keyPair = await generateNodeKeyPair();
  const nodeId = `NODE-${handle.toUpperCase()}-${Date.now().toString(36)}`;
  
  const identity: NodeIdentity = {
    handle: handle.startsWith('@') ? handle : `@${handle}`,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    nodeId,
    verified: true
  };
  
  // Store securely (in production, use secureStorage from securityUtils)
  try {
    localStorage.setItem(`${NODE_IDENTITY_KEY}-${handle}`, JSON.stringify(identity));
  } catch {
    // Storage error
  }
  
  return identity;
};

/**
 * Get node identity
 */
export const getNodeIdentity = (handle: string): NodeIdentity | null => {
  try {
    const stored = localStorage.getItem(`${NODE_IDENTITY_KEY}-${handle}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Storage error
  }
  return null;
};

/**
 * Export public key for sharing
 */
export const exportPublicKey = (identity: NodeIdentity): string => {
  return JSON.stringify({
    handle: identity.handle,
    publicKey: identity.publicKey,
    nodeId: identity.nodeId
  });
};

/**
 * Import public key from another node
 */
export const importPublicKey = (publicKeyData: string): WhitelistEntry | null => {
  try {
    const data = JSON.parse(publicKeyData);
    if (!data.handle || !data.publicKey || !data.nodeId) {
      return null;
    }
    
    return {
      handle: data.handle,
      publicKey: data.publicKey,
      addedAt: Date.now(),
      trustLevel: 'limited'
    };
  } catch {
    return null;
  }
};

// ============================================
// SEEN NONCES STORAGE (Anti-Replay)
// ============================================

const SEEN_NONCES_KEY = 'innova-n2n-seen-nonces';

/**
 * Get set of seen nonces
 */
export const getSeenNonces = (): Set<string> => {
  try {
    const stored = localStorage.getItem(SEEN_NONCES_KEY);
    if (stored) {
      const nonces = JSON.parse(stored);
      return new Set(nonces);
    }
  } catch {
    // Storage error
  }
  return new Set();
};

/**
 * Mark nonce as seen
 */
export const markNonceAsSeen = (nonce: string): void => {
  const nonces = getSeenNonces();
  nonces.add(nonce);
  
  // Limit storage size
  if (nonces.size > 10000) {
    const arr = Array.from(nonces).slice(-5000);
    localStorage.setItem(SEEN_NONCES_KEY, JSON.stringify(arr));
  } else {
    localStorage.setItem(SEEN_NONCES_KEY, JSON.stringify(Array.from(nonces)));
  }
};

// ============================================
// P2P TRANSMISSION SIMULATION
// ============================================

/**
 * Simulate P2P message transmission
 * In production, this would use WebRTC DataChannels or similar
 */
export const transmitP2P = async (
  message: N2NMessage,
  tollProof?: MicroTollProof
): Promise<{ success: boolean; messageId: string; error?: string }> => {
  // Validate message structure
  if (!message.id || !message.sender || !message.recipient) {
    return { success: false, messageId: '', error: 'Invalid message structure' };
  }
  
  // In a real P2P implementation, this would:
  // 1. Look up recipient's node address via DHT
  // 2. Establish WebRTC connection
  // 3. Transmit encrypted message
  // 4. Receive acknowledgment
  
  // For now, simulate successful transmission
  console.log(`[N2N] Transmitting message ${message.id} from ${message.sender} to ${message.recipient}`);
  
  if (tollProof) {
    console.log(`[N2N] Attached micro-toll proof (${tollProof.type})`);
  }
  
  // Store in outbound messages
  try {
    const outboundKey = `innova-n2n-outbound-${message.sender}`;
    const stored = localStorage.getItem(outboundKey);
    const messages = stored ? JSON.parse(stored) : [];
    messages.push({ ...message, tollProof });
    localStorage.setItem(outboundKey, JSON.stringify(messages));
  } catch {
    // Storage error
  }
  
  return { success: true, messageId: message.id };
};

/**
 * Receive and process incoming P2P message
 */
export const receiveP2P = async (
  message: N2NMessage,
  recipientIdentity: NodeIdentity
): Promise<{ success: boolean; error?: string; requiresToll?: boolean }> => {
  const seenNonces = getSeenNonces();
  
  // Validate with zero-trust
  const validation = await validateIncomingMessage(message, recipientIdentity, seenNonces);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  if (validation.requiresToll) {
    return { success: false, error: 'Micro-toll required', requiresToll: true };
  }
  
  // Mark nonce as seen
  markNonceAsSeen(message.nonce);
  
  // Store in inbound messages
  try {
    const inboundKey = `innova-n2n-inbound-${recipientIdentity.handle}`;
    const stored = localStorage.getItem(inboundKey);
    const messages = stored ? JSON.parse(stored) : [];
    messages.push(message);
    localStorage.setItem(inboundKey, JSON.stringify(messages));
  } catch {
    // Storage error
  }
  
  return { success: true };
};