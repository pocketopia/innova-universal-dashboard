/**
 * Account Deletion Routes
 * Compliance-ready account deletion with cascading data purge
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const crypto = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/users/delete/request
 * Request account deletion (first step)
 */
router.post('/delete/request', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    const now = Math.floor(Date.now() / 1000);

    // Check if deletion already requested
    const existingRequest = db.get(`
      SELECT * FROM deletion_requests WHERE user_id = ? AND status = 'pending'
    `, [userId]);

    if (existingRequest) {
      return res.json({
        success: true,
        alreadyRequested: true,
        requestedAt: existingRequest.requested_at,
        message: 'Deletion request already pending'
      });
    }

    // Create deletion request
    const requestId = uuidv4();
    db.run(`
      INSERT INTO deletion_requests (id, user_id, requested_at, status)
      VALUES (?, ?, ?, 'pending')
    `, [requestId, userId, now]);

    // Gather data for export (user might want to download before deletion)
    const userData = gatherUserData(userId);

    res.json({
      success: true,
      requiresConfirmation: true,
      message: 'Are you sure you want to delete your account? This action cannot be undone.',
      dataPreview: {
        profile: {
          handle: userData.user.handle,
          email: userData.user.email
        },
        devices: userData.devices.length,
        hasSubscription: !!userData.subscription,
        accountAge: now - userData.user.created_at
      },
      warning: 'All data will be permanently deleted including profile, devices, and subscription.',
      exportAvailable: true
    });
  } catch (error) {
    console.error('[DELETION] Request error:', error);
    res.status(500).json({
      error: 'request_failed',
      message: 'Failed to process deletion request'
    });
  }
});

/**
 * POST /api/users/delete/confirm
 * Confirm deletion with password verification
 */
router.post('/delete/confirm', authenticate, async (req, res) => {
  try {
    const { password, reason } = req.body;
    const userId = req.userId;

    if (!password) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Password verification required'
      });
    }

    // Verify password
    const user = db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
    
    if (!user || !user.password_hash) {
      return res.status(400).json({
        error: 'verification_failed',
        message: 'Cannot verify identity. Please contact support.'
      });
    }

    const passwordValid = await crypto.verifyPassword(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        error: 'verification_failed',
        message: 'Incorrect password'
      });
    }

    // Execute cascading deletion
    const deletionResult = executeCascadingDeletion(userId, reason);

    // Revoke all tokens
    authService.revokeAllTokens(userId);

    // Clear any session cookies
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Account deleted successfully',
      deletion: {
        completedAt: deletionResult.completedAt,
        itemsDeleted: deletionResult.itemsDeleted
      }
    });
  } catch (error) {
    console.error('[DELETION] Confirm error:', error);
    res.status(500).json({
      error: 'deletion_failed',
      message: 'Failed to delete account'
    });
  }
});

/**
 * GET /api/users/delete/status
 * Check deletion request status
 */
router.get('/delete/status', authenticate, (req, res) => {
  try {
    const userId = req.userId;

    const deletionRequest = db.get(`
      SELECT * FROM deletion_requests WHERE user_id = ?
    `, [userId]);

    if (!deletionRequest) {
      return res.json({
        success: true,
        hasRequest: false
      });
    }

    res.json({
      success: true,
      hasRequest: true,
      status: deletionRequest.status,
      requestedAt: deletionRequest.requested_at,
      completedAt: deletionRequest.completed_at
    });
  } catch (error) {
    console.error('[DELETION] Status error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch deletion status'
    });
  }
});

/**
 * DELETE /api/users/delete/:requestId (Admin)
 * Admin endpoint to process pending deletion
 */
router.delete('/delete/:requestId', authenticate, (req, res) => {
  try {
    // Check if user is admin (simplified check)
    const user = db.get('SELECT tier FROM users WHERE id = ?', [req.userId]);
    if (user?.tier !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Admin access required'
      });
    }

    const { requestId } = req.params;
    const { completedBy } = req.body;

    const deletionRequest = db.get(`
      SELECT * FROM deletion_requests WHERE id = ? AND status = 'pending'
    `, [requestId]);

    if (!deletionRequest) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Deletion request not found or already processed'
      });
    }

    // Execute deletion
    const deletionResult = executeCascadingDeletion(deletionRequest.user_id, deletionRequest.reason);

    // Update deletion request
    const now = Math.floor(Date.now() / 1000);
    db.run(`
      UPDATE deletion_requests
      SET status = 'completed', completed_at = ?, completed_by = ?
      WHERE id = ?
    `, [now, completedBy || req.userId, requestId]);

    res.json({
      success: true,
      message: 'Account deleted successfully',
      deletion: deletionResult
    });
  } catch (error) {
    console.error('[DELETION] Admin delete error:', error);
    res.status(500).json({
      error: 'deletion_failed',
      message: 'Failed to process deletion'
    });
  }
});

/**
 * Gather user data for export/preview
 */
function gatherUserData(userId) {
  // Get user profile
  const user = db.get(`
    SELECT id, handle, email, wallet_address, display_name, avatar_url, bio, 
           created_at, subscription_status
    FROM users WHERE id = ?
  `, [userId]);

  // Get devices
  const devices = db.all(`
    SELECT device_identifier, device_name, device_type, created_at
    FROM trusted_devices WHERE user_id = ?
  `, [userId]);

  // Get subscription
  const subscription = db.get(`
    SELECT s.*, sp.name as plan_name
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
    LIMIT 1
  `, [userId]);

  // Get pairing history count
  const pairingCount = db.get(`
    SELECT COUNT(*) as count FROM pairing_codes WHERE user_id = ?
  `, [userId]);

  // Get profile sync log count
  const syncCount = db.get(`
    SELECT COUNT(*) as count FROM profile_sync_log WHERE user_id = ?
  `, [userId]);

  return {
    user: {
      id: user.id,
      handle: user.handle,
      email: user.email,
      walletAddress: user.wallet_address,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      createdAt: user.created_at,
      subscriptionStatus: user.subscription_status
    },
    devices,
    subscription: subscription ? {
      planName: subscription.plan_name,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    } : null,
    pairingCount: pairingCount.count,
    syncCount: syncCount.count
  };
}

/**
 * Execute cascading deletion of all user data
 */
function executeCascadingDeletion(userId, reason = null) {
  const now = Math.floor(Date.now() / 1000);
  const itemsDeleted = {};

  return db.transaction(() => {
    // 1. Revoke all refresh tokens
    const tokensResult = db.run(`
      UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?
    `, [userId]);
    itemsDeleted.refreshTokens = tokensResult.changes;

    // 2. Delete all sessions
    const sessionsResult = db.run(`
      DELETE FROM sessions WHERE user_id = ?
    `, [userId]);
    itemsDeleted.sessions = sessionsResult.changes;

    // 3. Delete trusted devices
    const devicesResult = db.run(`
      DELETE FROM trusted_devices WHERE user_id = ?
    `, [userId]);
    itemsDeleted.devices = devicesResult.changes;

    // 4. Cancel active subscriptions
    const subscriptionsResult = db.run(`
      UPDATE subscriptions 
      SET status = 'canceled', ended_at = ?, cancel_at_period_end = 1
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `, [now, userId]);
    itemsDeleted.subscriptions = subscriptionsResult.changes;

    // 5. Delete pairing codes
    const pairingResult = db.run(`
      DELETE FROM pairing_codes WHERE user_id = ?
    `, [userId]);
    itemsDeleted.pairingCodes = pairingResult.changes;

    // 6. Delete profile sync logs
    const syncResult = db.run(`
      DELETE FROM profile_sync_log WHERE user_id = ?
    `, [userId]);
    itemsDeleted.profileSyncLogs = syncResult.changes;

    // 7. Delete invoices (or anonymize)
    const invoicesResult = db.run(`
      DELETE FROM invoices WHERE user_id = ?
    `, [userId]);
    itemsDeleted.invoices = invoicesResult.changes;

    // 8. Delete cancellation surveys
    const surveysResult = db.run(`
      DELETE FROM cancellation_surveys WHERE user_id = ?
    `, [userId]);
    itemsDeleted.cancellationSurveys = surveysResult.changes;

    // 9. Delete audit log entries (or anonymize for compliance)
    // We'll anonymize instead of delete for compliance
    db.run(`
      UPDATE audit_log 
      SET user_id = NULL, details = '{"anonymized": true}'
      WHERE user_id = ?
    `, [userId]);
    itemsDeleted.auditLogAnonymized = true;

    // 10. Finally, delete the user
    const userResult = db.run(`
      DELETE FROM users WHERE id = ?
    `, [userId]);
    itemsDeleted.user = userResult.changes;

    // 11. Update deletion request
    db.run(`
      UPDATE deletion_requests
      SET status = 'completed', completed_at = ?, reason = ?
      WHERE user_id = ? AND status = 'pending'
    `, [now, reason, userId]);

    console.log(`[DELETION] User ${userId} account deleted. Items:`, itemsDeleted);

    return {
      completedAt: now,
      itemsDeleted,
      totalItemsDeleted: Object.values(itemsDeleted).reduce((sum, val) => 
        typeof val === 'number' ? sum + val : sum, 0)
    };
  })();
}

module.exports = router;