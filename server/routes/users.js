/**
 * User Profile Routes
 * Handles global profile synchronization - User Node as single source of truth
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/users/profile
 * Get current user's full profile (single source of truth)
 */
router.get('/profile', authenticate, (req, res) => {
  try {
    const user = authService.getUserById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User profile not found'
      });
    }

    // Get trusted devices count
    const devicesCount = db.get(
      'SELECT COUNT(*) as count FROM trusted_devices WHERE user_id = ?',
      [req.userId]
    );

    // Get subscription info if active
    let subscription = null;
    if (['active', 'trialing'].includes(user.subscriptionStatus)) {
      subscription = db.get(`
        SELECT s.*, sp.name as plan_name, sp.description as plan_description, sp.features
        FROM subscriptions s
        JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [req.userId]);
    }

    res.json({
      success: true,
      profile: {
        ...user,
        trustedDevicesCount: devicesCount.count,
        subscription: subscription ? {
          id: subscription.id,
          planId: subscription.plan_id,
          planName: subscription.plan_name,
          planDescription: subscription.plan_description,
          features: subscription.features ? JSON.parse(subscription.features) : [],
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          trialEnd: subscription.trial_end,
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end
        } : null
      }
    });
  } catch (error) {
    console.error('[USERS] Get profile error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * GET /api/users/profile/:userId
 * Get public profile of any user (limited fields)
 */
router.get('/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.get(`
      SELECT id, handle, display_name, avatar_url, bio, tenant_id, tier, verified, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      profile: {
        id: user.id,
        handle: user.handle,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        tenantId: user.tenant_id,
        tier: user.tier,
        verified: !!user.verified,
        memberSince: user.created_at
      }
    });
  } catch (error) {
    console.error('[USERS] Get public profile error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile (syncs globally)
 */
router.put('/profile', authenticate, (req, res) => {
  try {
    const {
      displayName,
      avatarUrl,
      bio,
      walletAddress
    } = req.body;

    const updates = [];
    const values = [];
    const syncLogs = [];
    const now = Math.floor(Date.now() / 1000);

    // Build update fields dynamically
    if (displayName !== undefined) {
      const user = db.get('SELECT display_name FROM users WHERE id = ?', [req.userId]);
      if (user.display_name !== displayName) {
        syncLogs.push({
          field: 'display_name',
          oldValue: user.display_name,
          newValue: displayName
        });
      }
      updates.push('display_name = ?');
      values.push(displayName);
    }

    if (avatarUrl !== undefined) {
      const user = db.get('SELECT avatar_url FROM users WHERE id = ?', [req.userId]);
      if (user.avatar_url !== avatarUrl) {
        syncLogs.push({
          field: 'avatar_url',
          oldValue: user.avatar_url,
          newValue: avatarUrl
        });
      }
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    if (bio !== undefined) {
      const user = db.get('SELECT bio FROM users WHERE id = ?', [req.userId]);
      if (user.bio !== bio) {
        syncLogs.push({
          field: 'bio',
          oldValue: user.bio,
          newValue: bio
        });
      }
      updates.push('bio = ?');
      values.push(bio);
    }

    if (walletAddress !== undefined) {
      updates.push('wallet_address = ?');
      values.push(walletAddress);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'No fields to update'
      });
    }

    // Add updated_at timestamp
    updates.push('updated_at = ?');
    values.push(now);

    // Add user ID for WHERE clause
    values.push(req.userId);

    return db.transaction(() => {
      // Update user profile
      db.run(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `, values);

      // Log profile sync events
      const syncSource = req.headers['x-sync-source'] || 'web';
      syncLogs.forEach(log => {
        const logId = uuidv4();
        db.run(`
          INSERT INTO profile_sync_log (id, user_id, field_changed, old_value, new_value, synced_at, sync_source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [logId, req.userId, log.field, log.oldValue, log.newValue, now, syncSource]);
      });

      // Return updated profile
      const updatedUser = authService.getUserById(req.userId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        syncedFields: syncLogs.map(l => l.field),
        profile: updatedUser
      });
    })();
  } catch (error) {
    console.error('[USERS] Update profile error:', error);
    res.status(500).json({
      error: 'update_failed',
      message: 'Failed to update profile'
    });
  }
});

/**
 * GET /api/users/sync/status
 * Get profile sync status and recent changes
 */
router.get('/sync/status', authenticate, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Get recent sync events
    const syncEvents = db.all(`
      SELECT field_changed, old_value, new_value, synced_at, sync_source
      FROM profile_sync_log
      WHERE user_id = ?
      ORDER BY synced_at DESC
      LIMIT ?
    `, [req.userId, limit]);

    // Get last sync timestamp
    const lastSync = db.get(`
      SELECT MAX(synced_at) as last_synced_at
      FROM profile_sync_log
      WHERE user_id = ?
    `, [req.userId]);

    res.json({
      success: true,
      syncStatus: {
        lastSyncedAt: lastSync.last_synced_at,
        recentChanges: syncEvents.map(e => ({
          field: e.field_changed,
          syncedAt: e.synced_at,
          source: e.sync_source,
          changed: e.old_value !== e.new_value
        }))
      }
    });
  } catch (error) {
    console.error('[USERS] Get sync status error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch sync status'
    });
  }
});

/**
 * GET /api/users/:userId
 * Get user info (basic)
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.get(`
      SELECT id, handle, display_name, avatar_url, tenant_id, tier, verified, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        handle: user.handle,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        tenantId: user.tenant_id,
        tier: user.tier,
        verified: !!user.verified,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('[USERS] Get user error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch user'
    });
  }
});

/**
 * GET /api/users/handle/:handle
 * Get user by handle
 */
router.get('/handle/:handle', (req, res) => {
  try {
    const { handle } = req.params;

    const user = db.get(`
      SELECT id, handle, display_name, avatar_url, bio, tenant_id, tier, verified, created_at
      FROM users
      WHERE handle = ?
    `, [handle]);

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        handle: user.handle,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        tenantId: user.tenant_id,
        tier: user.tier,
        verified: !!user.verified,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('[USERS] Get user by handle error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch user'
    });
  }
});

module.exports = router;