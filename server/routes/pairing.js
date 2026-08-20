/**
 * TV Pairing Routes
 * Secure pairing API to bridge web dashboard and TV applications
 * via time-sensitive 6-digit alphanumeric codes
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('../utils/crypto');
const jwtManager = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authRateLimit } = require('../middleware/auth');

/**
 * POST /api/pairing/generate
 * Generate a new 6-digit pairing code (TV initiates)
 */
router.post('/generate', authRateLimit(60 * 1000, 10), (req, res) => {
  try {
    const { deviceName, deviceType = 'tv' } = req.body;
    const ipAddress = req.ip;

    // Generate 6-digit alphanumeric code
    const code = crypto.generatePairingCode(6);
    const pairingId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = parseInt(process.env.PAIRING_CODE_EXPIRES_IN) || 300; // 5 minutes default
    const expiresAt = now + expiresIn;

    // Store pairing code
    db.run(`
      INSERT INTO pairing_codes (id, code, device_name, device_type, status, expires_at, created_at, ip_address)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
    `, [pairingId, code, deviceName || 'Unknown Device', deviceType, expiresAt, now, ipAddress]);

    console.log(`[PAIRING] Generated code ${code} for device ${deviceName || 'Unknown'}`);

    res.json({
      success: true,
      code,
      expires_in: expiresIn,
      pairing_id: pairingId,
      verification_uri: `${process.env.WEB_DASHBOARD_URL || 'http://localhost:3001'}/pairing/verify`
    });
  } catch (error) {
    console.error('[PAIRING] Generate code error:', error);
    res.status(500).json({
      error: 'generation_failed',
      message: 'Failed to generate pairing code'
    });
  }
});

/**
 * GET /api/pairing/status/:code
 * Check pairing code status (TV polls this)
 */
router.get('/status/:code', authRateLimit(60 * 1000, 30), (req, res) => {
  try {
    const { code } = req.params;
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    const now = Math.floor(Date.now() / 1000);

    const pairingCode = db.get(`
      SELECT * FROM pairing_codes
      WHERE code = ?
    `, [normalizedCode]);

    if (!pairingCode) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Invalid pairing code'
      });
    }

    // Check if expired
    if (now > pairingCode.expires_at) {
      // Clean up expired code
      db.run('DELETE FROM pairing_codes WHERE id = ?', [pairingCode.id]);
      
      return res.status(404).json({
        success: false,
        status: 'expired',
        message: 'Pairing code has expired'
      });
    }

    res.json({
      success: true,
      status: pairingCode.status,
      device_name: pairingCode.device_name,
      device_type: pairingCode.device_type,
      expires_in: pairingCode.expires_at - now,
      confirmed_at: pairingCode.confirmed_at
    });
  } catch (error) {
    console.error('[PAIRING] Status check error:', error);
    res.status(500).json({
      error: 'status_check_failed',
      message: 'Failed to check pairing status'
    });
  }
});

/**
 * POST /api/pairing/confirm
 * Web dashboard confirms pairing with code (user enters code on web)
 */
router.post('/confirm', authenticate, authRateLimit(60 * 1000, 5), (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Pairing code is required'
      });
    }

    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    const now = Math.floor(Date.now() / 1000);

    return db.transaction(() => {
      const pairingCode = db.get(`
        SELECT * FROM pairing_codes
        WHERE code = ? AND status = 'pending' AND expires_at > ?
      `, [normalizedCode, now]);

      if (!pairingCode) {
        throw new Error('Invalid or expired pairing code');
      }

      // Update pairing code status
      db.run(`
        UPDATE pairing_codes
        SET status = 'confirmed', user_id = ?, confirmed_at = ?
        WHERE id = ?
      `, [userId, now, pairingCode.id]);

      // Register TV as trusted device
      const deviceId = uuidv4();
      db.run(`
        INSERT INTO trusted_devices (id, user_id, device_identifier, device_name, device_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [deviceId, userId, pairingCode.code, pairingCode.device_name, pairingCode.device_type, now]);

      // Generate tokens for the TV device
      const tokens = jwtManager.generateTokenPair(userId, deviceId);

      // Store refresh token for TV
      const refreshTokenHash = crypto.hashToken(tokens.refreshToken);
      const refreshTokenId = uuidv4();
      const refreshExpiresAt = now + (30 * 24 * 60 * 60); // 30 days

      db.run(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, device_name, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [refreshTokenId, userId, refreshTokenHash, deviceId, pairingCode.device_name, refreshExpiresAt, now]);

      console.log(`[PAIRING] User ${userId} confirmed pairing with device ${pairingCode.device_name}`);

      res.json({
        success: true,
        message: 'Device paired successfully',
        device: {
          id: deviceId,
          name: pairingCode.device_name,
          type: pairingCode.device_type
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType
        }
      });
    })();
  } catch (error) {
    console.error('[PAIRING] Confirm error:', error);

    if (error.message === 'Invalid or expired pairing code') {
      return res.status(404).json({
        error: 'invalid_code',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'confirmation_failed',
      message: 'Failed to confirm pairing'
    });
  }
});

/**
 * POST /api/pairing/token
 * TV polls for pairing completion and receives tokens
 * This is called after the user confirms on web dashboard
 */
router.post('/token', authRateLimit(60 * 1000, 30), (req, res) => {
  try {
    const { code, device_name } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Pairing code is required'
      });
    }

    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    const now = Math.floor(Date.now() / 1000);

    const pairingCode = db.get(`
      SELECT pc.*, u.* 
      FROM pairing_codes pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.code = ? AND pc.status = 'confirmed' AND pc.expires_at > ?
    `, [normalizedCode, now]);

    if (!pairingCode) {
      // Check if code exists but is still pending
      const pendingCode = db.get(`
        SELECT * FROM pairing_codes
        WHERE code = ? AND status = 'pending' AND expires_at > ?
      `, [normalizedCode, now]);

      if (pendingCode) {
        return res.status(202).json({
          success: false,
          status: 'pending',
          message: 'Waiting for user confirmation',
          expires_in: pendingCode.expires_at - now
        });
      }

      return res.status(404).json({
        error: 'invalid_or_expired',
        message: 'Invalid or expired pairing code'
      });
    }

    // Check if already used (tokens already issued)
    if (pairingCode._tokens_issued) {
      return res.status(400).json({
        error: 'already_used',
        message: 'Pairing code has already been used'
      });
    }

    // Mark as used and issue tokens
    return db.transaction(() => {
      // Mark pairing code as used
      db.run(`
        UPDATE pairing_codes
        SET status = 'used'
        WHERE id = ?
      `, [pairingCode.id]);

      // Get the trusted device that was created during confirmation
      const device = db.get(`
        SELECT * FROM trusted_devices
        WHERE user_id = ? AND device_identifier = ?
      `, [pairingCode.user_id, pairingCode.code]);

      if (!device) {
        throw new Error('Device not found');
      }

      // Generate tokens
      const tokens = jwtManager.generateTokenPair(pairingCode.user_id, device.id);

      // Mark tokens as issued (using a flag in pairing_codes)
      db.run(`
        UPDATE pairing_codes SET _tokens_issued = 1 WHERE id = ?
      `, [pairingCode.id]);

      console.log(`[PAIRING] Tokens issued for device ${device.device_name}`);

      res.json({
        success: true,
        user: {
          id: pairingCode.user_id,
          handle: pairingCode.handle,
          email: pairingCode.email
        },
        device: {
          id: device.id,
          name: device.device_name,
          type: device.device_type
        },
        tokens: tokens
      });
    })();
  } catch (error) {
    console.error('[PAIRING] Token error:', error);

    if (error.message === 'Device not found') {
      return res.status(404).json({
        error: 'device_not_found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'token_generation_failed',
      message: 'Failed to generate tokens'
    });
  }
});

/**
 * DELETE /api/pairing/:code
 * Cancel/delete a pairing code
 */
router.delete('/:code', authenticate, (req, res) => {
  try {
    const { code } = req.params;
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    const result = db.run(`
      DELETE FROM pairing_codes
      WHERE code = ? AND (user_id = ? OR status = 'pending')
    `, [normalizedCode, req.userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Pairing code not found'
      });
    }

    res.json({
      success: true,
      message: 'Pairing code cancelled'
    });
  } catch (error) {
    console.error('[PAIRING] Cancel error:', error);
    res.status(500).json({
      error: 'cancel_failed',
      message: 'Failed to cancel pairing code'
    });
  }
});

/**
 * GET /api/pairing/history
 * Get pairing history for current user
 */
router.get('/history', authenticate, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const status = req.query.status;

    let query = `
      SELECT code, device_name, device_type, status, created_at, confirmed_at, expires_at
      FROM pairing_codes
      WHERE user_id = ?
    `;
    const params = [req.userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const history = db.all(query, params);

    res.json({
      success: true,
      history: history.map(h => ({
        code: crypto.maskSensitiveData(h.code, 2),
        deviceName: h.device_name,
        deviceType: h.device_type,
        status: h.status,
        createdAt: h.created_at,
        confirmedAt: h.confirmed_at,
        expiredAt: h.expires_at
      }))
    });
  } catch (error) {
    console.error('[PAIRING] History error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch pairing history'
    });
  }
});

module.exports = router;