/**
 * Security Utilities for Innova Ecosystem
 * Provides input sanitization, cryptographic signatures, and secure storage
 */

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitizes username input by:
 * - Removing special characters and spaces
 * - Converting to lowercase
 * - Ensuring only alphanumeric characters, dots, and underscores are allowed
 * - Returns the sanitized username for display and submission
 */
export const sanitizeUsername = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove leading @ if present (we'll add it back for display)
  let sanitized = input.trim().replace(/^@/, '');
  
  // Remove all characters except alphanumeric, dots, underscores, and hyphens
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();
  
  // Remove consecutive dots, underscores, or hyphens
  sanitized = sanitized.replace(/[._-]{2,}/g, '.');
  
  // Remove leading/trailing dots, underscores, or hyphens
  sanitized = sanitized.replace(/^[._-]+|[._-]+$/g, '');
  
  return sanitized;
};

/**
 * Formats a sanitized username for display with @ prefix
 */
export const formatUsernameDisplay = (username: string): string => {
  const sanitized = sanitizeUsername(username);
  if (!sanitized) return '';
  return sanitized.startsWith('@') ? sanitized : `@${sanitized}`;
};

/**
 * Validates a username format
 */
export const isValidUsernameFormat = (username: string): boolean => {
  const sanitized = sanitizeUsername(username);
  if (!sanitized || sanitized.length < 3 || sanitized.length > 32) return false;
  
  // Must start with a letter or number
  if (!/^[a-z0-9]/.test(sanitized)) return false;
  
  // Check for valid pattern (alphanumeric with dots, underscores, hyphens)
  return /^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/.test(sanitized);
};

// ============================================
// CRYPTOGRAPHIC DEVICE SIGNATURES
// ============================================

/**
 * Generates a cryptographic signature for device authentication
 * Uses Web Crypto API to create a secure hash of timestamp + device fingerprint
 */
export const generateCryptoSignature = async (): Promise<{
  signature: string;
  timestamp: number;
  challenge: string;
}> => {
  const timestamp = Date.now();
  
  // Create a device fingerprint from multiple sources
  const deviceFingerprint = await generateDeviceFingerprint();
  
  // Create a challenge string combining timestamp and fingerprint
  const challengeData = `${timestamp}-${deviceFingerprint}-${getSecureRandomBytes(16)}`;
  
  // Generate SHA-256 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(challengeData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    signature,
    timestamp,
    challenge: challengeData
  };
};

/**
 * Generates a device fingerprint from multiple entropy sources
 */
const generateDeviceFingerprint = async (): Promise<string> => {
  const components: string[] = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    `${screen.width}x${screen.height}`,
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset().toString()
  ];
  
  // Add canvas fingerprinting for additional entropy
  try {
    const canvasFingerprint = await getCanvasFingerprint();
    components.push(canvasFingerprint);
  } catch (e) {
    // Canvas fingerprinting not available
  }
  
  const fingerprintData = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

/**
 * Gets canvas-based fingerprint for additional device entropy
 */
const getCanvasFingerprint = async (): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve('no-canvas');
        return;
      }
      
      // Draw some text with specific styling
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('Innova Device ID', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Innova Device ID', 4, 17);
      
      // Get the data URL and extract a hash
      const dataURL = canvas.toDataURL();
      resolve(dataURL.substring(0, 100));
    } catch (e) {
      resolve('canvas-error');
    }
  });
};

/**
 * Generates cryptographically secure random bytes as hex string
 */
const getSecureRandomBytes = (length: number): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ============================================
// SECURE STORAGE (AES-GCM Encryption)
// ============================================

/**
 * AES-GCM encryption/decryption for secure localStorage storage
 * Uses Web Crypto API for cryptographic operations
 */

const STORAGE_KEYS = {
  ENCRYPTION_KEY: 'innova-encryption-key',
  KEY_IV: 'innova-key-iv'
};

/**
 * Generates an AES-GCM encryption key
 */
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Exports a CryptoKey to a storable format
 */
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  const byteArray = new Uint8Array(exported);
  return Array.from(byteArray).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Imports a key from stored format
 */
export const importKey = async (keyData: string): Promise<CryptoKey> => {
  const byteArray = new Uint8Array(
    keyData.match(/[\da-f]{2}/gi)?.map(h => parseInt(h, 16)) || []
  );
  
  return await crypto.subtle.importKey(
    'raw',
    byteArray,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts sensitive data using AES-GCM
 * Returns JSON string with iv and ciphertext
 */
export const encryptSensitiveData = async (plaintext: string): Promise<string> => {
  try {
    // Get or create encryption key
    let key: CryptoKey;
    const storedKey = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);
    
    if (storedKey) {
      key = await importKey(storedKey);
    } else {
      key = await generateEncryptionKey();
      localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, await exportKey(key));
    }
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    
    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[SECURITY] Encryption failed:', error);
    // Fallback: return plaintext with warning (should not happen in production)
    return `UNENCRYPTED:${plaintext}`;
  }
};

/**
 * Decrypts sensitive data
 */
export const decryptSensitiveData = async (encryptedData: string): Promise<string> => {
  try {
    // Check for unencrypted fallback
    if (encryptedData.startsWith('UNENCRYPTED:')) {
      return encryptedData.substring(12);
    }
    
    const storedKey = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);
    if (!storedKey) {
      throw new Error('No encryption key found');
    }
    
    const key = await importKey(storedKey);
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[SECURITY] Decryption failed:', error);
    return '';
  }
};

/**
 * Securely stores sensitive data in localStorage
 */
export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    const encrypted = await encryptSensitiveData(value);
    localStorage.setItem(`secure:${key}`, encrypted);
  },
  
  getItem: async (key: string): Promise<string | null> => {
    const encrypted = localStorage.getItem(`secure:${key}`);
    if (!encrypted) return null;
    return await decryptSensitiveData(encrypted);
  },
  
  removeItem: (key: string): void => {
    localStorage.removeItem(`secure:${key}`);
  },
  
  clear: (): void => {
    // Remove all secure items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('secure:')) {
        localStorage.removeItem(key);
      }
    });
  }
};

/**
 * Clears all sensitive data from localStorage
 * Both encrypted and plain storage
 */
export const clearAllSensitiveData = (): void => {
  // Clear secure storage
  secureStorage.clear();
  
  // Clear standard sensitive keys
  const sensitiveKeys = [
    'innova-username',
    'innova-wallet-address',
    'innova-tenant',
    'innova-custom-token',
    'innova-hardware-sig',
    'innova-legal-accepted',
    'innova-recognized-devices',
    'innova-seed-phrase',
    'innova-private-key'
  ];
  
  sensitiveKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear encryption keys
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEY);
  localStorage.removeItem(STORAGE_KEYS.KEY_IV);
};

/**
 * Validates that no sensitive data is stored in plain text
 */
export const auditStorageSecurity = (): { violations: string[]; secure: boolean } => {
  const violations: string[] = [];
  const sensitivePatterns = [
    /seed/i,
    /phrase/i,
    /private[_-]?key/i,
    /mnemonic/i,
    /secret/i,
    /password/i
  ];
  
  const sensitiveKeys = [
    'innova-seed-phrase',
    'innova-private-key',
    'innova-mnemonic',
    'innova-secret'
  ];
  
  Object.keys(localStorage).forEach(key => {
    // Check for sensitive key names
    if (sensitiveKeys.includes(key)) {
      violations.push(`Sensitive key found: ${key}`);
    }
    
    // Check for sensitive patterns in key names
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(key)) {
        violations.push(`Potentially sensitive key: ${key}`);
      }
    });
    
    // Check for values that look like seed phrases (12-24 words)
    const value = localStorage.getItem(key);
    if (value && !key.startsWith('secure:')) {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount >= 12 && wordCount <= 24 && /^[a-z\s]+$/.test(value.toLowerCase())) {
        violations.push(`Potential seed phrase in key: ${key}`);
      }
    }
  });
  
  return {
    violations,
    secure: violations.length === 0
  };
};