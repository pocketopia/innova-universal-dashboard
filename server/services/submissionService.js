/**
 * Submission Service
 * Handles submission CRUD operations, validation logging, and admin approval
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { logValidation } = require('../middleware/submissionValidation');

class SubmissionService {
  /**
   * Create a new submission
   */
  createSubmission(userId, submissionData, validationLog) {
    const now = Math.floor(Date.now() / 1000);
    const submissionId = uuidv4();

    return db.transaction(() => {
      // Insert submission
      db.run(`
        INSERT INTO submissions (id, platform, user_id, title, description, category, genre, 
                                 tags, media_urls, thumbnail_url, metadata, status, is_approved, 
                                 submitted_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
      `, [
        submissionId,
        submissionData.platform,
        userId,
        submissionData.title,
        submissionData.description,
        submissionData.category,
        submissionData.genre || null,
        JSON.stringify(submissionData.tags || []),
        JSON.stringify(submissionData.media_urls),
        submissionData.thumbnail_url || null,
        JSON.stringify(submissionData.metadata || {}),
        now,
        now
      ]);

      // Log validation results
      if (validationLog && validationLog.length > 0) {
        logValidation(db, submissionId, validationLog);
      }

      // Return created submission
      return this.getSubmissionById(submissionId);
    })();
  }

  /**
   * Get submission by ID
   */
  getSubmissionById(submissionId, includeUnpublished = false) {
    const query = `
      SELECT s.*, u.handle as author_handle, u.display_name as author_name, u.avatar_url as author_avatar
      FROM submissions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `;

    const submission = db.get(query, [submissionId]);

    if (!submission) return null;

    // Only return approved submissions unless includeUnpublished is true
    if (!includeUnpublished && submission.is_approved !== 1) {
      return null;
    }

    return this._formatSubmission(submission);
  }

  /**
   * Get submissions by platform (for TV apps - approved only)
   */
  getSubmissionsByPlatform(platform, options = {}) {
    const {
      page = 1,
      limit = 20,
      category = null,
      genre = null,
      sortBy = 'submitted_at',
      sortOrder = 'DESC',
      approvedOnly = true
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT s.*, u.handle as author_handle, u.display_name as author_name, u.avatar_url as author_avatar
      FROM submissions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.platform = ?
    `;
    const params = [platform.toLowerCase()];

    if (approvedOnly) {
      query += ' AND s.is_approved = 1';
    }

    if (category) {
      query += ' AND s.category = ?';
      params.push(category.toLowerCase());
    }

    if (genre) {
      query += ' AND s.genre = ?';
      params.push(genre.toLowerCase());
    }

    // Sorting
    const validSortFields = ['submitted_at', 'approved_at', 'view_count', 'like_count', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'submitted_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY s.${sortField} ${order}`;

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const submissions = db.all(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM submissions s
      WHERE s.platform = ?
    `;
    const countParams = [platform.toLowerCase()];

    if (approvedOnly) {
      countQuery += ' AND s.is_approved = 1';
    }

    if (category) {
      countQuery += ' AND s.category = ?';
      countParams.push(category.toLowerCase());
    }

    if (genre) {
      countQuery += ' AND s.genre = ?';
      countParams.push(genre.toLowerCase());
    }

    const { total } = db.get(countQuery, countParams);

    return {
      submissions: submissions.map(s => this._formatSubmission(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get user's submissions
   */
  getUserSubmissions(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      platform = null,
      status = null
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT * FROM submissions
      WHERE user_id = ?
    `;
    const params = [userId];

    if (platform) {
      query += ' AND platform = ?';
      params.push(platform.toLowerCase());
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const submissions = db.all(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM submissions WHERE user_id = ?`;
    const countParams = [userId];

    if (platform) {
      countQuery += ' AND platform = ?';
      countParams.push(platform.toLowerCase());
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const { total } = db.get(countQuery, countParams);

    return {
      submissions: submissions.map(s => this._formatSubmission(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update submission (author only, pending submissions)
   */
  updateSubmission(submissionId, userId, updates) {
    const now = Math.floor(Date.now() / 1000);
    const existing = this.getSubmissionById(submissionId, true);

    if (!existing) {
      throw new Error('Submission not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Not authorized to update this submission');
    }

    if (existing.status !== 'pending') {
      throw new Error('Cannot update a submission that is not pending');
    }

    const allowedUpdates = ['title', 'description', 'category', 'genre', 'tags', 'media_urls', 'thumbnail_url', 'metadata'];
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'tags' || key === 'media_urls' || key === 'metadata') {
          value = JSON.stringify(value);
        }
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(submissionId);

    db.run(`UPDATE submissions SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    return this.getSubmissionById(submissionId, true);
  }

  /**
   * Delete submission (author only, pending submissions)
   */
  deleteSubmission(submissionId, userId) {
    const existing = this.getSubmissionById(submissionId, true);

    if (!existing) {
      throw new Error('Submission not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Not authorized to delete this submission');
    }

    if (existing.status !== 'pending') {
      throw new Error('Cannot delete a submission that is not pending');
    }

    db.run('DELETE FROM submissions WHERE id = ?', [submissionId]);

    return { success: true, message: 'Submission deleted' };
  }

  /**
   * Approve submission (admin only)
   */
  approveSubmission(submissionId, adminUserId, notes = null) {
    const now = Math.floor(Date.now() / 1000);

    return db.transaction(() => {
      const existing = this.getSubmissionById(submissionId, true);

      if (!existing) {
        throw new Error('Submission not found');
      }

      if (existing.is_approved === 1) {
        throw new Error('Submission is already approved');
      }

      // Update submission
      db.run(`
        UPDATE submissions 
        SET status = 'approved', is_approved = 1, approved_at = ?, approved_by = ?, updated_at = ?
        WHERE id = ?
      `, [now, adminUserId, now, submissionId]);

      // Log moderation action
      const modId = uuidv4();
      db.run(`
        INSERT INTO submission_moderation_queue (id, submission_id, moderator_id, action, notes, reviewed_at)
        VALUES (?, ?, ?, 'approve', ?, ?)
      `, [modId, submissionId, adminUserId, notes || null, now]);

      return this.getSubmissionById(submissionId, true);
    })();
  }

  /**
   * Reject submission (admin only)
   */
  rejectSubmission(submissionId, adminUserId, reason, notes = null) {
    const now = Math.floor(Date.now() / 1000);

    return db.transaction(() => {
      const existing = this.getSubmissionById(submissionId, true);

      if (!existing) {
        throw new Error('Submission not found');
      }

      if (existing.status === 'rejected') {
        throw new Error('Submission is already rejected');
      }

      // Update submission
      db.run(`
        UPDATE submissions 
        SET status = 'rejected', is_approved = 0, rejection_reason = ?, updated_at = ?
        WHERE id = ?
      `, [reason, now, submissionId]);

      // Log moderation action
      const modId = uuidv4();
      db.run(`
        INSERT INTO submission_moderation_queue (id, submission_id, moderator_id, action, notes, reviewed_at)
        VALUES (?, ?, ?, 'reject', ?, ?)
      `, [modId, submissionId, adminUserId, notes || null, now]);

      return this.getSubmissionById(submissionId, true);
    })();
  }

  /**
   * Get pending submissions (admin only)
   */
  getPendingSubmissions(options = {}) {
    const {
      page = 1,
      limit = 20,
      platform = null
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT s.*, u.handle as author_handle, u.display_name as author_name
      FROM submissions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pending'
    `;
    const params = [];

    if (platform) {
      query += ' AND s.platform = ?';
      params.push(platform.toLowerCase());
    }

    query += ' ORDER BY s.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const submissions = db.all(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM submissions WHERE status = 'pending'`;
    const countParams = [];

    if (platform) {
      countQuery += ' AND platform = ?';
      countParams.push(platform.toLowerCase());
    }

    const { total } = db.get(countQuery, countParams);

    return {
      submissions: submissions.map(s => this._formatSubmission(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get submission statistics (admin only)
   */
  getSubmissionStats(platform = null) {
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_authors
      FROM submissions
    `;
    const params = [];

    if (platform) {
      query += ' WHERE platform = ?';
      params.push(platform.toLowerCase());
    }

    query += ' GROUP BY status';

    const statusCounts = db.all(query, params);

    // Get platform breakdown
    let platformQuery = `
      SELECT 
        platform,
        COUNT(*) as total,
        SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM submissions
      GROUP BY platform
    `;

    const platformStats = db.all(platformQuery);

    return {
      byStatus: statusCounts.reduce((acc, row) => {
        acc[row.status] = { count: row.count, uniqueAuthors: row.unique_authors };
        return acc;
      }, {}),
      byPlatform: platformStats,
      totalSubmissions: statusCounts.reduce((sum, row) => sum + row.count, 0)
    };
  }

  /**
   * Track submission analytics
   */
  trackEvent(submissionId, eventType, userId = null, sessionId = null, metadata = {}) {
    const now = Math.floor(Date.now() / 1000);
    const eventId = uuidv4();

    db.run(`
      INSERT INTO submission_analytics (id, submission_id, event_type, user_id, session_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [eventId, submissionId, eventType, userId, sessionId, JSON.stringify(metadata), now]);

    // Update counters for views and likes
    if (eventType === 'view') {
      db.run('UPDATE submissions SET view_count = view_count + 1 WHERE id = ?', [submissionId]);
    } else if (eventType === 'like') {
      db.run('UPDATE submissions SET like_count = like_count + 1 WHERE id = ?', [submissionId]);
    }
  }

  /**
   * Format submission for API response
   */
  _formatSubmission(submission) {
    return {
      id: submission.id,
      platform: submission.platform,
      userId: submission.user_id,
      authorHandle: submission.author_handle,
      authorName: submission.author_name,
      authorAvatar: submission.author_avatar,
      title: submission.title,
      description: submission.description,
      category: submission.category,
      genre: submission.genre,
      tags: submission.tags ? JSON.parse(submission.tags) : [],
      mediaUrls: submission.media_urls ? JSON.parse(submission.media_urls) : [],
      thumbnailUrl: submission.thumbnail_url,
      metadata: submission.metadata ? JSON.parse(submission.metadata) : {},
      status: submission.status,
      isApproved: !!submission.is_approved,
      rejectionReason: submission.rejection_reason,
      submittedAt: submission.submitted_at,
      approvedAt: submission.approved_at,
      approvedBy: submission.approved_by,
      updatedAt: submission.updated_at,
      viewCount: submission.view_count || 0,
      likeCount: submission.like_count || 0
    };
  }
}

module.exports = new SubmissionService();