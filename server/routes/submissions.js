/**
 * Submission Routes
 * Handles content submission for all platforms
 */

const express = require('express');
const router = express.Router();
const submissionService = require('../services/submissionService');
const submissionValidation = require('../middleware/submissionValidation');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/submissions/taxonomies
 * Get platform taxonomies (for dropdown population)
 * Also handles GET /api/taxonomies via app.get in app.js
 */
router.get('/taxonomies', (req, res) => {
  try {
    const { platform } = req.query;
    const { taxonomies } = submissionValidation;

    if (platform) {
      const platformConfig = submissionValidation.getPlatformConfig(platform);
      if (!platformConfig) {
        return res.status(400).json({
          error: 'invalid_platform',
          message: `Invalid platform: ${platform}`
        });
      }
      return res.json({
        success: true,
        platform: platformConfig
      });
    }

    res.json({
      success: true,
      taxonomies: {
        platforms: Object.keys(taxonomies.platforms).map(key => ({
          id: key,
          name: taxonomies.platforms[key].name,
          description: taxonomies.platforms[key].description
        })),
        globalTags: taxonomies.globalTags,
        contentRatings: taxonomies.contentRatings,
        validationRules: taxonomies.validationRules
      }
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Get taxonomies error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch taxonomies'
    });
  }
});

/**
 * GET /api/submissions/:platform
 * Get submissions for a platform (approved content for TV apps)
 */
router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { page, limit, category, genre, sortBy, sortOrder } = req.query;

    // Validate platform
    const platformConfig = submissionValidation.getPlatformConfig(platform);
    if (!platformConfig) {
      return res.status(400).json({
        error: 'invalid_platform',
        message: `Invalid platform: ${platform}`
      });
    }

    const result = submissionService.getSubmissionsByPlatform(platform, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      category: category || null,
      genre: genre || null,
      sortBy: sortBy || 'submitted_at',
      sortOrder: sortOrder || 'DESC'
    });

    // Track view for each submission (analytics)
    result.submissions.forEach(s => {
      submissionService.trackEvent(s.id, 'view', null, req.sessionID || req.ip);
    });

    res.json({
      success: true,
      platform: platformConfig.name,
      ...result
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Get platform submissions error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch submissions'
    });
  }
});

/**
 * GET /api/submissions/:platform/:id
 * Get single submission details
 */
router.get('/:platform/:id', async (req, res) => {
  try {
    const { platform, id } = req.params;

    // Validate platform
    const platformConfig = submissionValidation.getPlatformConfig(platform);
    if (!platformConfig) {
      return res.status(400).json({
        error: 'invalid_platform',
        message: `Invalid platform: ${platform}`
      });
    }

    const submission = submissionService.getSubmissionById(id);

    if (!submission) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Submission not found or not approved'
      });
    }

    // Track view
    submissionService.trackEvent(id, 'view', null, req.sessionID || req.ip);

    res.json({
      success: true,
      submission
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Get submission error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch submission'
    });
  }
});

/**
 * POST /api/submissions/:platform
 * Create a new submission
 * Requires authentication and validation
 */
router.post('/:platform', authenticate, submissionValidation.validateSubmission, async (req, res) => {
  try {
    const userId = req.userId;
    const validatedData = req.validatedData;
    const validationLog = req.validationLog;

    const submission = submissionService.createSubmission(userId, validatedData, validationLog);

    res.status(201).json({
      success: true,
      message: 'Submission created and pending approval',
      submission
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Create submission error:', error);
    res.status(500).json({
      error: 'creation_failed',
      message: 'Failed to create submission'
    });
  }
});

/**
 * PUT /api/submissions/:platform/:id
 * Update a submission (author only, pending submissions)
 */
router.put('/:platform/:id', authenticate, async (req, res) => {
  try {
    const { platform, id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    // Validate platform
    const platformConfig = submissionValidation.getPlatformConfig(platform);
    if (!platformConfig) {
      return res.status(400).json({
        error: 'invalid_platform',
        message: `Invalid platform: ${platform}`
      });
    }

    const submission = submissionService.updateSubmission(id, userId, updates);

    res.json({
      success: true,
      message: 'Submission updated',
      submission
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Update submission error:', error);

    if (error.message === 'Submission not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      });
    }

    if (error.message === 'Not authorized to update this submission' || 
        error.message === 'Cannot update a submission that is not pending') {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'update_failed',
      message: 'Failed to update submission'
    });
  }
});

/**
 * DELETE /api/submissions/:platform/:id
 * Delete a submission (author only, pending submissions)
 */
router.delete('/:platform/:id', authenticate, async (req, res) => {
  try {
    const { platform, id } = req.params;
    const userId = req.userId;

    // Validate platform
    const platformConfig = submissionValidation.getPlatformConfig(platform);
    if (!platformConfig) {
      return res.status(400).json({
        error: 'invalid_platform',
        message: `Invalid platform: ${platform}`
      });
    }

    const result = submissionService.deleteSubmission(id, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Delete submission error:', error);

    if (error.message === 'Submission not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      });
    }

    if (error.message === 'Not authorized to delete this submission' || 
        error.message === 'Cannot delete a submission that is not pending') {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'delete_failed',
      message: 'Failed to delete submission'
    });
  }
});

/**
 * GET /api/submissions/me
 * Get current user's submissions
 */
router.get('/me/submissions', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
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
    console.error('[SUBMISSIONS] Get user submissions error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch submissions'
    });
  }
});

module.exports = router;