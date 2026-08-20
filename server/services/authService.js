/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

const db = require('../database');
const jwtManager = require('../utils/jwt');
const crypto = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Register a new user
   */
  async registerUser(userData) {
    const {
      handle,
      email,
      password,
      walletAddress,
      tenantId = 'innova',
      displayName,
      avatarUrl,
      bio,
      publicKey
    } = userData;

    // Hash password first (outside transaction since it's async)
    const passwordHash = password ? await crypto.hashPassword(password) : null;

    return db.transaction(() => {
      // Check if handle already exists
      const existingUser = db.get('SELECT id FROM users WHERE handle = ?', [handle]);
      if (existingUser) {
        throw new Error('Handle already taken');
      }

      // Check if email already exists
      if (email) {
        const existingEmail = db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail) {
          throw new Error('Email already registered');
        }
      }

      const userId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      // Insert user
      db.run(`
        INSERT INTO users (id, handle, email, password_hash, wallet_address, tenant_id, tier, 
                          display_name, avatar_url, bio, public_key, verified, 
                          created_at, updated_at, subscription_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, handle, email, passwordHash, walletAddress, tenantId, 'basic',
        displayName || handle, avatarUrl, bio, publicKey, 0,
        now, now, 'inactive'
      ]);

      // Log audit event
      this.logAuditEvent(userId, 'user_registered', 'user', userId, {
        handle, email, tenantId
      });

      // Generate token pair
      const tokens = jwtManager.generateTokenPair(userId);

      // Store refresh token
      const refreshTokenHash = crypto.hashToken(tokens.refreshToken);
      const refreshTokenId = uuidv4();
      const refreshExpiresAt = now + (30 * 24 * 60 * 60); // 30 days

      db.run(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [refreshTokenId, userId, refreshTokenHash, refreshExpiresAt, now]);

      return {
        user: {
          id: userId,
          handle,
          email,
          walletAddress,
          tenantId,
          displayName: displayName || handle,
          avatarUrl,
          bio,
          verified: false,
          subscriptionStatus: 'inactive'
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType
        }
      };
    })();
  }

  /**
   * Authenticate user with credentials
   */
  async authenticateUser(identifier, password, options = {}) {
    const {
      deviceId = null,
      deviceName = null,
      deviceType = 'web',
      deviceIdentifier = null,
      ipAddress = null
    } = options;

    // Find user by handle or email
    const user = db.get(`
      SELECT * FROM users 
      WHERE (handle = ? OR email = ?) AND password_hash IS NOT NULL
    `, [identifier, identifier]);

    if (!user) {
      // Check if user exists but has no password (e.g., wallet-only auth)
      const walletUser = db.get(`
        SELECT * FROM users WHERE handle = ? OR email = ?
      `, [identifier, identifier]);
      
      if (walletUser) {
        throw new Error('No password set. Please use wallet authentication.');
      }
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordValid = await crypto.verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    return this.createSession(user, {
      deviceId,
      deviceName,
      deviceType,
      deviceIdentifier,
      ipAddress
    });
  }

  /**
   * Authenticate user with wallet signature (passwordless)
   */
  authenticateWithWallet(handle, walletAddress, options = {}) {
    const user = db.get(`
      SELECT * FROM users 
      WHERE handle = ? AND wallet_address = ?
    `, [handle, walletAddress]);

    if (!user) {
      throw new Error('User not found or wallet mismatch');
    }

    return this.createSession(user, options);
  }

  /**
   * Create session and tokens for authenticated user
   */
  createSession(user, options = {}) {
    const {
      deviceId = null,
      deviceName = null,
      deviceType = 'web',
      deviceIdentifier = null,
      ipAddress = null
    } = options;

    return db.transaction(() => {
      // Generate tokens
      const tokens = jwtManager.generateTokenPair(user.id, deviceId);

      // Store refresh token
      const refreshTokenHash = crypto.hashToken(tokens.refreshToken);
      const refreshTokenId = uuidv4();
      const now = Math.floor(Date.now() / 1000);
      const refreshExpiresAt = now + (30 * 24 * 60 * 60); // 30 days

      db.run(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, device_name, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [refreshTokenId, user.id, refreshTokenHash, deviceId, deviceName, refreshExpiresAt, now]);

      // Register trusted device if identifier provided
      if (deviceIdentifier) {
        this.registerTrustedDevice(user.id, {
          deviceIdentifier,
          deviceName: deviceName || 'Unknown Device',
          deviceType,
          ipAddress
        });
      }

      // Log audit event
      this.logAuditEvent(user.id, 'user_login', 'user', user.id, {
        deviceType, deviceName, ipAddress
      });

      return {
        user: {
          id: user.id,
          handle: user.handle,
          email: user.email,
          walletAddress: user.wallet_address,
          tenantId: user.tenant_id,
          tier: user.tier,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          verified: !!user.verified,
          subscriptionStatus: user.subscription_status
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType
        }
      };
    })();
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken) {
    const refreshTokenHash = crypto.hashToken(refreshToken);

    // Find refresh token in database
    const storedToken = db.get(`
      SELECT rt.*, u.* 
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > ?
    `, [refreshTokenHash, Math.floor(Date.now() / 1000)]);

    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    // Verify JWT
    const verification = jwtManager.verifyRefreshToken(refreshToken);
    if (!verification.valid) {
      throw new Error('Invalid refresh token');
    }

    // Generate new token pair
    const tokens = jwtManager.generateTokenPair(storedToken.user_id, storedToken.device_id);

    // Update last used timestamp
    db.run('UPDATE refresh_tokens SET last_used_at = ? WHERE id = ?', [Math.floor(Date.now() / 1000), storedToken.id]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType
    };
  }

  /**
   * Revoke a refresh token (logout)
   */
  revokeToken(refreshToken) {
    const refreshTokenHash = crypto.hashToken(refreshToken);

    const result = db.run(`
      UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?
    `, [refreshTokenHash]);

    return result.changes > 0;
  }

  /**
   * Revoke all tokens for a user (logout everywhere)
   */
  revokeAllTokens(userId) {
    db.run(`
      UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?
    `, [userId]);

    // Also revoke all sessions
    db.run(`
      DELETE FROM sessions WHERE user_id = ?
    `, [userId]);

    return true;
  }

  /**
   * Register a trusted device
   */
  registerTrustedDevice(userId, deviceData) {
    const {
      deviceIdentifier,
      deviceName,
      deviceType,
      ipAddress
    } = deviceData;

    const now = Math.floor(Date.now() / 1000);
    const deviceId = uuidv4();

    // Check if device already exists
    const existing = db.get(
      'SELECT id FROM trusted_devices WHERE user_id = ? AND device_identifier = ?',
      [userId, deviceIdentifier]
    );

    if (existing) {
      db.run(
        'UPDATE trusted_devices SET device_name = ?, last_used_at = ? WHERE id = ?',
        [deviceName, now, existing.id]
      );
      return { id: existing.id, deviceId: existing.device_identifier };
    }

    db.run(`
      INSERT INTO trusted_devices (id, user_id, device_identifier, device_name, device_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [deviceId, userId, deviceIdentifier, deviceName, deviceType, now]);

    return { id: deviceId, deviceId: deviceIdentifier };
  }

  /**
   * Get list of trusted devices for a user
   */
  getTrustedDevices(userId) {
    return db.all(`
      SELECT id, device_identifier, device_name, device_type, last_used_at, created_at
      FROM trusted_devices
      WHERE user_id = ?
      ORDER BY last_used_at DESC
    `, [userId]);
  }

  /**
   * Remove a trusted device
   */
  removeTrustedDevice(userId, deviceId) {
    const result = db.run(`
      DELETE FROM trusted_devices 
      WHERE id = ? AND user_id = ?
    `, [deviceId, userId]);

    // Also revoke related refresh tokens
    db.run(`
      UPDATE refresh_tokens SET revoked = 1 
      WHERE user_id = ? AND device_id = ?
    `, [userId, deviceId]);

    return result.changes > 0;
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    const user = db.get(`
      SELECT id, handle, email, wallet_address, tenant_id, tier, 
             display_name, avatar_url, bio, public_key, verified,
             created_at, updated_at, last_verified_at,
             subscription_status, trial_ends_at, subscription_ends_at, cancel_at_period_end
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) return null;

    return {
      id: user.id,
      handle: user.handle,
      email: user.email,
      walletAddress: user.wallet_address,
      tenantId: user.tenant_id,
      tier: user.tier,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      publicKey: user.public_key,
      verified: !!user.verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastVerifiedAt: user.last_verified_at,
      subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      subscriptionEndsAt: user.subscription_ends_at,
      cancelAtPeriodEnd: !!user.cancel_at_period_end
    };
  }

  /**
   * Log audit event
   */
  logAuditEvent(userId, action, resourceType, resourceId, details = {}, ipAddress = null, userAgent = null) {
    const eventId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    db.run(`
      INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [eventId, userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent, now]);
  }

  /**
   * Validate device code (for OAuth device flow)
   */
  validateDeviceCode(deviceCode, clientId) {
    const now = Math.floor(Date.now() / 1000);
    
    const deviceInfo = db.get(`
      SELECT * FROM device_codes 
      WHERE device_code = ? AND client_id = ? AND status = 'pending' AND expires_at > ?
    `, [deviceCode, clientId, now]);

    return deviceInfo || null;
  }

  /**
   * Authorize device code (user approves device)
   */
  authorizeDeviceCode(userCode, userId) {
    const now = Math.floor(Date.now() / 1000);
    const normalizedUserCode = userCode.toUpperCase().replace(/\s/g, '');

    return db.transaction(() => {
      const deviceInfo = db.get(`
        SELECT * FROM device_codes 
        WHERE user_code = ? AND status = 'pending' AND expires_at > ?
      `, [normalizedUserCode, now]);

      if (!deviceInfo) {
        throw new Error('Invalid or expired user code');
      }

      // Update device code status
      db.run(`
        UPDATE device_codes 
        SET status = 'authorized', user_id = ?, authorized_at = ?
        WHERE id = ?
      `, [userId, now, deviceInfo.id]);

      // Add device to user's trusted devices
      this.registerTrustedDevice(userId, {
        deviceIdentifier: deviceInfo.device_code,
        deviceName: deviceInfo.client_name,
        deviceType: 'tv',
        ipAddress: deviceInfo.ip_address
      });

      return deviceInfo;
    })();
  }
}

module.exports = new AuthService();