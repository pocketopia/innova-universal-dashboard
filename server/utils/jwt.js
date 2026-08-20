/**
 * JWT Utility Module
 * Handles JWT token generation, verification, and management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTManager {
  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET || 'innova-access-secret';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'innova-refresh-secret';
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  }

  /**
   * Generate access token for a user
   */
  generateAccessToken(userId, additionalClaims = {}) {
    const payload = {
      sub: userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      ...additionalClaims
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
      algorithm: 'HS256'
    });
  }

  /**
   * Generate refresh token for a user
   */
  generateRefreshToken(userId, deviceId = null) {
    const payload = {
      sub: userId,
      type: 'refresh',
      jti: crypto.randomUUID(),
      deviceId,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      algorithm: 'HS256'
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256']
      });

      if (decoded.type !== 'access') {
        return { valid: false, error: 'Invalid token type' };
      }

      return { valid: true, decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired', expired: true };
      }
      return { valid: false, error: error.message };
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256']
      });

      if (decoded.type !== 'refresh') {
        return { valid: false, error: 'Invalid token type' };
      }

      return { valid: true, decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired', expired: true };
      }
      return { valid: false, error: error.message };
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Get token expiration timestamp
   */
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded ? decoded.exp * 1000 : null; // Convert to milliseconds
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(userId, deviceId = null) {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken(userId, deviceId);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.accessExpiresIn),
      tokenType: 'Bearer'
    };
  }

  /**
   * Parse expires_in to seconds
   */
  parseExpiresIn(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return value;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken, storedTokenHash) {
    // First verify the refresh token
    const verification = this.verifyRefreshToken(refreshToken);
    
    if (!verification.valid) {
      return { valid: false, error: verification.error };
    }

    // Check if the token hash matches stored hash (prevent token reuse if revoked)
    if (storedTokenHash) {
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      if (tokenHash !== storedTokenHash) {
        return { valid: false, error: 'Token mismatch - possible revocation' };
      }
    }

    // Generate new token pair
    const userId = verification.decoded.sub;
    const deviceId = verification.decoded.deviceId;
    const tokens = this.generateTokenPair(userId, deviceId);

    return { valid: true, ...tokens };
  }
}

module.exports = new JWTManager();