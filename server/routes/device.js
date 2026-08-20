/**
 * Device Authorization Routes (RFC 8628)
 * OAuth 2.0 Device Authorization Grant flow for TV clients
 * Updated to use database persistence
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/device/authorize
 * TV Client initiates device authorization flow.
 * Returns a device code and user code.
 */
router.post('/authorize', (req, res) => {
  try {
    const { clientId, clientName } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const deviceCode = crypto.generateDeviceCode();
    const userCode = crypto.generateUserCode();
    const expiresIn = parseInt(process.env.DEVICE_CODE_EXPIRES_IN) || 600; // 10 minutes default
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + expiresIn;

    // Hash codes for storage
    const deviceCodeHash = crypto.hashToken(deviceCode);
    const userCodeHash = crypto.hashToken(userCode);

    // Store in database
    const id = uuidv4();
    db.run(`
      INSERT INTO device_codes (id, device_code, user_code, device_code_hash, user_code_hash, 
                                client_id, client_name, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [id, deviceCode, userCode, deviceCodeHash, userCodeHash, clientId, clientName || 'Unknown Device', expiresAt, now]);

    console.log(`[DEVICE] New device authorization: ${clientName} (${clientId}) - User Code: ${userCode}`);

    res.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${process.env.WEB_DASHBOARD_URL || 'http://localhost:3001'}/devices/verify`,
      expires_in: expiresIn,
      interval: parseInt(process.env.DEVICE_POLL_INTERVAL) || 5
    });
  } catch (error) {
    console.error('[DEVICE] Authorize error:', error);
    res.status(500).json({
      error: 'authorization_failed',
      message: 'Failed to initiate device authorization'
    });
  }
});

/**
 * POST /api/device/token
 * TV Client polls this endpoint to check if the device has been authorized.
 * Returns access token when authorized, or error if still pending/denied.
 */
router.post('/token', (req, res) => {
  try {
    const { device_code, client_id } = req.body;
    
    if (!device_code || !client_id) {
      return res.status(400).json({ error: 'device_code and client_id are required' });
    }

    const now = Math.floor(Date.now() / 1000);
    const deviceCodeHash = crypto.hashToken(device_code);

    // Find device code in database
    const deviceInfo = db.get(`
      SELECT dc.*, u.* 
      FROM device_codes dc
      LEFT JOIN users u ON dc.user_id = u.id
      WHERE dc.device_code_hash = ? AND dc.client_id = ?
    `, [deviceCodeHash, client_id]);

    if (!deviceInfo) {
      return res.status(400).json({ error: 'invalid_device_code' });
    }

    // Check if expired
    if (now > deviceInfo.expires_at) {
      db.run('DELETE FROM device_codes WHERE id = ?', [deviceInfo.id]);
      return res.status(400).json({ error: 'expired_device_code' });
    }

    switch (deviceInfo.status) {
      case 'pending':
        return res.status(400).json({ error: 'authorization_pending' });
        
      case 'denied':
        db.run('DELETE FROM device_codes WHERE id = ?', [deviceInfo.id]);
        return res.status(400).json({ error: 'access_denied' });
        
      case 'authorized':
        if (!deviceInfo.user_id) {
          return res.status(500).json({ error: 'server_error' });
        }

        // Generate access token
        const jwtManager = require('../utils/jwt');
        const tokens = jwtManager.generateTokenPair(deviceInfo.user_id, deviceInfo.id);

        // Store access token
        const accessTokenHash = crypto.hashToken(tokens.accessToken);
        const accessTokenId = uuidv4();
        const accessExpiresAt = now + tokens.expiresIn;

        db.run(`
          INSERT INTO access_tokens (id, token_hash, user_id, client_id, device_code_id, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [accessTokenId, accessTokenHash, deviceInfo.user_id, deviceInfo.client_id, deviceInfo.id, accessExpiresAt, now]);

        // Clean up device code
        db.run('DELETE FROM device_codes WHERE id = ?', [deviceInfo.id]);

        console.log(`[DEVICE] Token issued for ${deviceInfo.client_name} - User: ${deviceInfo.user_id}`);

        return res.json({
          access_token: tokens.accessToken,
          token_type: 'Bearer',
          expires_in: tokens.expiresIn
        });
        
      default:
        return res.status(400).json({ error: 'invalid_grant' });
    }
  } catch (error) {
    console.error('[DEVICE] Token error:', error);
    res.status(500).json({
      error: 'token_error',
      message: 'Failed to process token request'
    });
  }
});

/**
 * GET /api/device/status/:userCode
 * Web dashboard checks the status of a user code.
 * Returns the current status and device info.
 */
router.get('/status/:userCode', (req, res) => {
  try {
    const { userCode } = req.params;
    const normalizedUserCode = userCode.toUpperCase().replace(/\s/g, '');
    const userCodeHash = crypto.hashToken(normalizedUserCode);
    const now = Math.floor(Date.now() / 1000);

    const deviceInfo = db.get(`
      SELECT * FROM device_codes
      WHERE user_code_hash = ?
    `, [userCodeHash]);

    if (!deviceInfo) {
      return res.status(404).json({ error: 'invalid_user_code' });
    }

    // Check if expired
    if (now > deviceInfo.expires_at) {
      db.run('DELETE FROM device_codes WHERE id = ?', [deviceInfo.id]);
      return res.status(404).json({ error: 'expired_user_code' });
    }

    res.json({
      status: deviceInfo.status,
      client_name: deviceInfo.client_name,
      client_id: deviceInfo.client_id,
      expires_in: deviceInfo.expires_at - now
    });
  } catch (error) {
    console.error('[DEVICE] Status error:', error);
    res.status(500).json({
      error: 'status_error',
      message: 'Failed to check device status'
    });
  }
});

/**
 * POST /api/device/authorize-user
 * Web dashboard endpoint where user submits the code and authorizes the device.
 * Requires user authentication.
 */
router.post('/authorize-user', (req, res) => {
  try {
    const { userCode, userId, action = 'authorize' } = req.body;
    
    if (!userCode || !userId) {
      return res.status(400).json({ error: 'user_code and user_id are required' });
    }

    const normalizedUserCode = userCode.toUpperCase().replace(/\s/g, '');
    const userCodeHash = crypto.hashToken(normalizedUserCode);
    const now = Math.floor(Date.now() / 1000);

    const deviceInfo = db.get(`
      SELECT * FROM device_codes
      WHERE user_code_hash = ? AND status = 'pending'
    `, [userCodeHash]);

    if (!deviceInfo) {
      return res.status(404).json({ error: 'invalid_user_code' });
    }

    // Check if expired
    if (now > deviceInfo.expires_at) {
      db.run('DELETE FROM device_codes WHERE id = ?', [deviceInfo.id]);
      return res.status(404).json({ error: 'expired_user_code' });
    }

    // Get user info
    const user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    // Check INVA token balance (if required)
    const minBalance = parseInt(process.env.MIN_INVA_BALANCE) || 10;
    // Note: INVA balance check is simplified - in production, check actual wallet balance

    if (action === 'authorize') {
      // Authorize the device
      db.run(`
        UPDATE device_codes
        SET status = 'authorized', user_id = ?, authorized_at = ?
        WHERE id = ?
      `, [userId, now, deviceInfo.id]);

      // Add device to user's trusted devices
      const deviceId = uuidv4();
      db.run(`
        INSERT INTO trusted_devices (id, user_id, device_identifier, device_name, device_type, created_at)
        VALUES (?, ?, ?, ?, 'tv', ?)
      `, [deviceId, userId, deviceInfo.device_code, deviceInfo.client_name, now]);

      console.log(`[DEVICE] User ${user.handle || user.email} authorized device ${deviceInfo.client_name}`);

      res.json({
        success: true,
        message: 'Device authorized successfully',
        device_name: deviceInfo.client_name
      });
    } else if (action === 'deny') {
      // Deny the device
      db.run('DELETE FROM device_codes WHERE id = ?', [deviceInfo.id]);

      console.log(`[DEVICE] User ${user.handle || user.email} denied device ${deviceInfo.client_name}`);

      res.json({
        success: true,
        message: 'Device authorization denied'
      });
    } else {
      return res.status(400).json({ error: 'invalid_action' });
    }
  } catch (error) {
    console.error('[DEVICE] Authorize user error:', error);
    res.status(500).json({
      error: 'authorization_failed',
      message: 'Failed to process authorization'
    });
  }
});

/**
 * GET /api/device/cleanup
 * Admin endpoint to clean up expired device codes
 */
router.get('/cleanup', (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    const result = db.run(`
      DELETE FROM device_codes WHERE expires_at < ?
    `, [now]);

    res.json({
      success: true,
      cleaned: result.changes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEVICE] Cleanup error:', error);
    res.status(500).json({
      error: 'cleanup_failed',
      message: 'Failed to cleanup expired codes'
    });
  }
});

module.exports = router;