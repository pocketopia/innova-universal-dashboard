/**
 * Admin Routes
 * Handles submission moderation and admin operations
 */

const express = require('express');
const router = express.Router();
const submissionService = require('../services/submissionService');
const { authenticate } = require('../middleware/auth');
const db = require('../database');

/**
 * Middleware to check admin role
 */
function requireAdmin(req, res, next) {
  try {
    const user = db.get('SELECT tier FROM users WHERE id = ?', [req.userId]);
    
    if (!user || user.tier !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('[ADMIN] Role check error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to verify admin role'
    });
  }
}

/**
 * GET /api/admin/submissions/pending
 * Get all pending submissions
 */
router.get('/submissions/pending', authenticate, requireAdmin, (req, res) => {
  try {
    const { page, limit, platform } = req.query;

    const result = submissionService.getPendingSubmissions({
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      platform: platform || null
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[ADMIN] Get pending submissions error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch pending submissions'
    });
  }
});

/**
 * GET /api/admin/submissions/stats
 * Get submission statistics
 */
router.get('/submissions/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const { platform } = req.query;
    const stats = submissionService.getSubmissionStats(platform || null);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[ADMIN] Get submission stats error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch submission statistics'
    });
  }
});

/**
 * PUT /api/admin/submissions/:platform/:id/approve
 * Approve a submission
 */
router.put('/submissions/:platform/:id/approve', authenticate, requireAdmin, (req, res) => {
  try {
    const { platform, id } = req.params;
    const adminUserId = req.userId;
    const { notes } = req.body;

    const submission = submissionService.approveSubmission(id, adminUserId, notes || null);

    if (!submission) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Submission approved and now visible on TV platforms',
      submission
    });
  } catch (error) {
    console.error('[ADMIN] Approve submission error:', error);

    if (error.message === 'Submission not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      });
    }

    if (error.message === 'Submission is already approved') {
      return res.status(400).json({
        error: 'already_approved',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'approval_failed',
      message: 'Failed to approve submission'
    });
  }
});

/**
 * PUT /api/admin/submissions/:platform/:id/reject
 * Reject a submission
 */
router.put('/submissions/:platform/:id/reject', authenticate, requireAdmin, (req, res) => {
  try {
    const { platform, id } = req.params;
    const adminUserId = req.userId;
    const { reason, notes } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Rejection reason is required'
      });
    }

    const submission = submissionService.rejectSubmission(id, adminUserId, reason, notes || null);

    if (!submission) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Submission rejected',
      submission
    });
  } catch (error) {
    console.error('[ADMIN] Reject submission error:', error);

    if (error.message === 'Submission not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'rejection_failed',
      message: 'Failed to reject submission'
    });
  }
});

/**
 * GET /api/admin/submissions/:id/moderation-history
 * Get moderation history for a submission
 */
router.get('/submissions/:id/moderation-history', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const history = db.all(`
      SELECT smq.*, u.handle as moderator_handle
      FROM submission_moderation_queue smq
      LEFT JOIN users u ON smq.moderator_id = u.id
      WHERE smq.submission_id = ?
      ORDER BY smq.reviewed_at DESC
    `, [id]);

    res.json({
      success: true,
      history: history.map(h => ({
        id: h.id,
        moderatorHandle: h.moderator_handle,
        action: h.action,
        notes: h.notes,
        reviewedAt: h.reviewed_at
      }))
    });
  } catch (error) {
    console.error('[ADMIN] Get moderation history error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch moderation history'
    });
  }
});

/**
 * GET /api/admin/users/:userId/submissions
 * Get all submissions by a specific user (admin view)
 */
router.get('/users/:userId/submissions', authenticate, requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit, platform, status } = req.query;

    const result = submissionService.getUserSubmissions(userId, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      platform: platform || null,
      status: status || null
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[ADMIN] Get user submissions error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch user submissions'
    });
  }
});

/**
 * DELETE /api/admin/submissions/:platform/:id
 * Force delete a submission (admin only, any status)
 */
router.delete('/submissions/:platform/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Check if submission exists
    const existing = db.get('SELECT id FROM submissions WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Submission not found'
      });
    }

    db.run('DELETE FROM submissions WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Submission permanently deleted'
    });
  } catch (error) {
    console.error('[ADMIN] Force delete submission error:', error);
    res.status(500).json({
      error: 'delete_failed',
      message: 'Failed to delete submission'
    });
  }
});

module.exports = router;