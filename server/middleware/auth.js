/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

const jwtManager = require('../utils/jwt');
const db = require('../database');

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Extract token from cookies
 */
function extractTokenFromCookies(req) {
  const cookies = req.cookies;
  return cookies?.accessToken || null;
}

/**
 * Authentication middleware - verifies JWT access token
 */
function authenticate(req, res, next) {
  try {
    // Try to get token from header first, then cookies
    const token = extractTokenFromHeader(req) || extractTokenFromCookies(req);

    if (!token) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'No authentication token provided'
      });
    }

    // Verify the access token
    const verification = jwtManager.verifyAccessToken(token);

    if (!verification.valid) {
      if (verification.expired) {
        return res.status(401).json({
          error: 'token_expired',
          message: 'Access token has expired',
          expired: true
        });
      }

      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid authentication token'
      });
    }

    // Get user from database
    const userId = verification.decoded.sub;
    const user = db.get('SELECT id, handle, email, wallet_address, tenant_id, tier, display_name, avatar_url, verified, subscription_status FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(401).json({
        error: 'user_not_found',
        message: 'User no longer exists'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = userId;
    req.token = token;

    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return res.status(500).json({
      error: 'authentication_error',
      message: 'An error occurred during authentication'
    });
  }
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const token = extractTokenFromHeader(req) || extractTokenFromCookies(req);

    if (token) {
      const verification = jwtManager.verifyAccessToken(token);
      
      if (verification.valid) {
        const userId = verification.decoded.sub;
        const user = db.get('SELECT id, handle, email, wallet_address, tenant_id, tier, display_name, avatar_url, verified, subscription_status FROM users WHERE id = ?', [userId]);
        
        if (user) {
          req.user = user;
          req.userId = userId;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

/**
 * Check if user has specific role/tier
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'Authentication required'
      });
    }

    // Check if user has the required role
    const userRoles = req.user.tier ? [req.user.tier] : [];
    
    if (!userRoles.includes(role) && role !== 'admin') {
      return res.status(403).json({
        error: 'insufficient_permissions',
        message: `Required role: ${role}`
      });
    }

    next();
  };
}

/**
 * Check if user subscription is active
 */
function requireActiveSubscription(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'authentication_required',
      message: 'Authentication required'
    });
  }

  const activeStatuses = ['active', 'trialing'];
  
  if (!activeStatuses.includes(req.user.subscription_status)) {
    return res.status(403).json({
      error: 'subscription_required',
      message: 'Active subscription required',
      current_status: req.user.subscription_status
    });
  }

  next();
}

/**
 * Rate limit for authentication endpoints
 */
function authRateLimit(windowMs = 15 * 60 * 1000, max = 5) {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    const attempt = attempts.get(key);

    if (now - attempt.firstAttempt > windowMs) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (attempt.count >= max) {
      const retryAfter = Math.ceil((attempt.firstAttempt + windowMs - now) / 1000);
      return res.status(429).json({
        error: 'too_many_attempts',
        message: 'Too many authentication attempts. Please try again later.',
        retry_after: retryAfter
      });
    }

    attempt.count++;
    next();
  };
}

/**
 * Check if device is trusted
 */
function requireTrustedDevice(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'authentication_required',
      message: 'Authentication required'
    });
  }

  const deviceIdentifier = req.headers['x-device-identifier'];
  
  if (!deviceIdentifier) {
    return res.status(400).json({
      error: 'device_identifier_required',
      message: 'Device identifier header required'
    });
  }

  // Check if device is trusted
  const trustedDevice = db.get(
    'SELECT * FROM trusted_devices WHERE user_id = ? AND device_identifier = ?',
    [req.userId, deviceIdentifier]
  );

  if (!trustedDevice) {
    return res.status(403).json({
      error: 'device_not_trusted',
      message: 'Device is not trusted. Please re-authenticate.',
      requires_verification: true
    });
  }

  // Update last used timestamp
  db.run('UPDATE trusted_devices SET last_used_at = ? WHERE id = ?', [Math.floor(Date.now() / 1000), trustedDevice.id]);

  req.trustedDevice = trustedDevice;
  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireActiveSubscription,
  authRateLimit,
  requireTrustedDevice,
  extractTokenFromHeader,
  extractTokenFromCookies
};