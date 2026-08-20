/**
 * Cryptographic Utility Module
 * Handles hashing, encryption, and secure random generation
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class CryptoUtils {
  constructor() {
    this.bcryptRounds = 12;
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password) {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a SHA-256 hash of a token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random string
   */
  generateSecureRandom(length = 32, encoding = 'hex') {
    return crypto.randomBytes(length).toString(encoding);
  }

  /**
   * Generate a 6-digit alphanumeric code (for TV pairing)
   * Excludes similar-looking characters (0/O, 1/I/L)
   */
  generatePairingCode(length = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Excludes I, L, O
    let code = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
    
    return code;
  }

  /**
   * Generate a user code for device authorization (format: XXXX-XXXX)
   */
  generateUserCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    
    for (let i = 0; i < 4; i++) {
      code += chars[crypto.randomBytes(1)[0] % chars.length];
    }
    
    code += '-';
    
    for (let i = 0; i < 4; i++) {
      code += chars[crypto.randomBytes(1)[0] % chars.length];
    }
    
    return code;
  }

  /**
   * Generate a device code (longer, for internal use)
   */
  generateDeviceCode() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create HMAC signature
   */
  createHMAC(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data, signature, secret) {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Generate device fingerprint from various inputs
   */
  generateDeviceFingerprint(inputs = {}) {
    const data = JSON.stringify({
      ...inputs,
      timestamp: Date.now()
    });
    return this.hashToken(data);
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  timingSafeEqual(a, b) {
    if (typeof a === 'string') a = Buffer.from(a);
    if (typeof b === 'string') b = Buffer.from(b);
    
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Generate API key
   */
  generateAPIKey(prefix = 'innova') {
    const randomPart = this.generateSecureRandom(32, 'base64url');
    return `${prefix}_${randomPart}`;
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars) return '***';
    return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
  }
}

module.exports = new CryptoUtils();