/**
 * Authentication Routes
 * Handles user registration, login, logout, and token refresh
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate, authRateLimit } = require('../middleware/auth');
const crypto = require('../utils/crypto');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authRateLimit(15 * 60 * 1000, 5), async (req, res) => {
  try {
    const {
      handle,
      email,
      password,
      walletAddress,
      tenantId,
      displayName,
      avatarUrl,
      bio,
      publicKey
    } = req.body;

    // Validation
    if (!handle) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Handle is required'
      });
    }

    // Handle must be alphanumeric with underscores, 3-30 chars
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Handle must be 3-30 alphanumeric characters or underscores'
      });
    }

    // Email validation (if provided)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid email format'
      });
    }

    // Password validation (if provided)
    if (password && password.length < 8) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Password must be at least 8 characters'
      });
    }

    const result = await authService.registerUser({
      handle,
      email,
      password,
      walletAddress,
      tenantId: tenantId || 'innova',
      displayName,
      avatarUrl,
      bio,
      publicKey
    });

    // Set refresh token in secure cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      success: true,
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType
      }
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    
    if (error.message === 'Handle already taken') {
      return res.status(409).json({
        error: 'handle_taken',
        message: 'Handle is already taken'
      });
    }

    if (error.message === 'Email already registered') {
      return res.status(409).json({
        error: 'email_taken',
        message: 'Email is already registered'
      });
    }

    res.status(500).json({
      error: 'registration_failed',
      message: 'Failed to register user'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with credentials
 */
router.post('/login', authRateLimit(15 * 60 * 1000, 5), async (req, res) => {
  try {
    const { identifier, password, rememberDevice } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Identifier and password are required'
      });
    }

    const deviceIdentifier = req.headers['x-device-identifier'];
    const deviceName = req.headers['x-device-name'];
    const deviceType = req.headers['x-device-type'] || 'web';

    const result = await authService.authenticateUser(identifier, password, {
      deviceIdentifier: rememberDevice ? deviceIdentifier : null,
      deviceName: deviceName || 'Web Browser',
      deviceType,
      ipAddress: req.ip
    });

    // Set refresh token in secure cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType
      }
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);

    if (error.message === 'Invalid credentials' || error.message === 'User not found or wallet mismatch') {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid credentials'
      });
    }

    if (error.message === 'No password set. Please use wallet authentication.') {
      return res.status(400).json({
        error: 'wallet_auth_required',
        message: 'This account uses wallet authentication. Please use wallet login.'
      });
    }

    res.status(500).json({
      error: 'login_failed',
      message: 'Failed to login'
    });
  }
});

/**
 * POST /api/auth/login/wallet
 * Authenticate user with wallet (passwordless)
 */
router.post('/login/wallet', authRateLimit(15 * 60 * 1000, 5), async (req, res) => {
  try {
    const { handle, walletAddress, signature } = req.body;

    if (!handle || !walletAddress) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Handle and wallet address are required'
      });
    }

    // TODO: Verify wallet signature (implementation depends on wallet type)
    // For now, we'll just verify the wallet address matches

    const deviceIdentifier = req.headers['x-device-identifier'];
    const deviceName = req.headers['x-device-name'];
    const deviceType = req.headers['x-device-type'] || 'web';

    const result = authService.authenticateWithWallet(handle, walletAddress, {
      deviceIdentifier,
      deviceName: deviceName || 'Web Browser',
      deviceType,
      ipAddress: req.ip
    });

    // Set refresh token in secure cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType
      }
    });
  } catch (error) {
    console.error('[AUTH] Wallet login error:', error);

    if (error.message === 'User not found or wallet mismatch') {
      return res.status(401).json({
        error: 'wallet_mismatch',
        message: 'Wallet not linked to this account'
      });
    }

    res.status(500).json({
      error: 'login_failed',
      message: 'Failed to login with wallet'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Refresh token is required'
      });
    }

    const tokens = authService.refreshAccessToken(refreshToken);

    // Set new refresh token in cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType
    });
  } catch (error) {
    console.error('[AUTH] Token refresh error:', error);

    res.status(401).json({
      error: 'token_refresh_failed',
      message: error.message || 'Failed to refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      authService.revokeToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);

    res.status(500).json({
      error: 'logout_failed',
      message: 'Failed to logout'
    });
  }
});

/**
 * POST /api/auth/logout/all
 * Logout from all devices
 */
router.post('/logout/all', authenticate, async (req, res) => {
  try {
    authService.revokeAllTokens(req.userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('[AUTH] Logout all error:', error);

    res.status(500).json({
      error: 'logout_failed',
      message: 'Failed to logout from all devices'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * GET /api/auth/devices
 * Get list of trusted devices
 */
router.get('/devices', authenticate, (req, res) => {
  try {
    const devices = authService.getTrustedDevices(req.userId);

    res.json({
      success: true,
      devices: devices.map(d => ({
        id: d.id,
        deviceIdentifier: crypto.maskSensitiveData(d.device_identifier, 4),
        deviceName: d.device_name,
        deviceType: d.device_type,
        lastUsedAt: d.last_used_at,
        createdAt: d.created_at
      }))
    });
  } catch (error) {
    console.error('[AUTH] Get devices error:', error);

    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch devices'
    });
  }
});

/**
 * DELETE /api/auth/devices/:deviceId
 * Remove a trusted device
 */
router.delete('/devices/:deviceId', authenticate, (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = authService.removeTrustedDevice(req.userId, deviceId);

    if (!result) {
      return res.status(404).json({
        error: 'device_not_found',
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    console.error('[AUTH] Remove device error:', error);

    res.status(500).json({
      error: 'remove_failed',
      message: 'Failed to remove device'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify authentication (for TV silent refresh)
 */
router.post('/verify', authenticate, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: {
      id: req.user.id,
      handle: req.user.handle,
      subscriptionStatus: req.user.subscriptionStatus
    }
  });
});

module.exports = router;