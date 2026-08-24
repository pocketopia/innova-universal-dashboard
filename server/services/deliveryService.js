/**
 * Delivery Service
 * Handles StreamShare product deliveries and client-creator workflows
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const messageService = require('./messageService');

class DeliveryService {
  /**
   * Create a new delivery
   * Automatically creates a conversation for the project
   */
  createDelivery(creatorId, clientId, deliveryData) {
    const now = Math.floor(Date.now() / 1000);
    const deliveryId = uuidv4();

    return db.transaction(() => {
      // Create conversation for this delivery
      const conversation = messageService.getOrCreateConversation(creatorId, clientId);

      // Insert delivery
      db.run(`
        INSERT INTO streamshare_deliveries 
        (id, creator_id, client_id, project_name, description, media_url, 
         thumbnail_url, conversation_id, status, delivered_at, updated_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?)
      `, [
        deliveryId,
        creatorId,
        clientId,
        deliveryData.project_name,
        deliveryData.description || null,
        deliveryData.media_url,
        deliveryData.thumbnail_url || null,
        conversation.id,
        now,
        now,
        JSON.stringify(deliveryData.metadata || {})
      ]);

      // Post system message to conversation
      messageService.sendMessage(
        conversation.id,
        creatorId,
        `📦 New delivery: "${deliveryData.project_name}" has been submitted for review.`,
        { type: 'system', deliveryId }
      );

      return this.getDeliveryById(deliveryId);
    })();
  }

  /**
   * Get delivery by ID
   */
  getDeliveryById(deliveryId) {
    const delivery = db.get(`
      SELECT d.*,
             c.handle as creator_handle, c.display_name as creator_name, c.avatar_url as creator_avatar,
             cl.handle as client_handle, cl.display_name as client_name, cl.avatar_url as client_avatar
      FROM streamshare_deliveries d
      LEFT JOIN users c ON d.creator_id = c.id
      LEFT JOIN users cl ON d.client_id = cl.id
      WHERE d.id = ?
    `, [deliveryId]);

    if (!delivery) return null;

    return this._formatDelivery(delivery);
  }

  /**
   * Get deliveries for a creator
   */
  getCreatorDeliveries(creatorId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT d.*,
             cl.handle as client_handle, cl.display_name as client_name, cl.avatar_url as client_avatar
      FROM streamshare_deliveries d
      LEFT JOIN users cl ON d.client_id = cl.id
      WHERE d.creator_id = ?
    `;
    const params = [creatorId];

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.delivered_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const deliveries = db.all(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM streamshare_deliveries WHERE creator_id = ?`;
    const countParams = status ? [creatorId, status] : [creatorId];
    const { total } = db.get(countQuery, countParams);

    return {
      deliveries: deliveries.map(d => this._formatDelivery({ ...d, creator_handle: null, creator_name: null, creator_avatar: null })),
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
   * Get deliveries for a client
   */
  getClientDeliveries(clientId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT d.*,
             c.handle as creator_handle, c.display_name as creator_name, c.avatar_url as creator_avatar
      FROM streamshare_deliveries d
      LEFT JOIN users c ON d.creator_id = c.id
      WHERE d.client_id = ?
    `;
    const params = [clientId];

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.delivered_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const deliveries = db.all(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM streamshare_deliveries WHERE client_id = ?`;
    const countParams = status ? [clientId, status] : [clientId];
    const { total } = db.get(countQuery, countParams);

    return {
      deliveries: deliveries.map(d => this._formatDelivery({ ...d, client_handle: null, client_name: null, client_avatar: null })),
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
   * Update delivery status
   */
  updateDeliveryStatus(deliveryId, status, userId, notes = null) {
    const now = Math.floor(Date.now() / 1000);

    return db.transaction(() => {
      const delivery = this.getDeliveryById(deliveryId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      // Verify user is the client
      if (delivery.clientId !== userId) {
        throw new Error('Not authorized to update this delivery');
      }

      let updateQuery;
      let updateParams;

      if (status === 'approved') {
        updateQuery = `
          UPDATE streamshare_deliveries 
          SET status = 'approved', approved_at = ?, updated_at = ? 
          WHERE id = ?
        `;
        updateParams = [now, now, deliveryId];
      } else if (status === 'revisions_requested') {
        updateQuery = `
          UPDATE streamshare_deliveries 
          SET status = 'revisions_requested', revision_count = revision_count + 1, 
              revision_notes = ?, updated_at = ? 
          WHERE id = ?
        `;
        updateParams = [notes, now, deliveryId];
      } else {
        throw new Error('Invalid status');
      }

      db.run(updateQuery, updateParams);

      // Post system message to conversation
      if (delivery.conversationId) {
        const action = status === 'approved' ? '✅ approved' : '🔄 requested revisions';
        messageService.sendMessage(
          delivery.conversationId,
          userId,
          `Project "${delivery.projectName}" has been ${action}.`,
          { type: 'system', deliveryId, status }
        );
      }

      return this.getDeliveryById(deliveryId);
    })();
  }

  /**
   * Get delivery statistics for a creator
   */
  getCreatorStats(creatorId) {
    const stats = db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'revisions_requested' THEN 1 ELSE 0 END) as revisions,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(CASE WHEN status = 'approved' THEN revision_count + 1 ELSE NULL END) as avg_revisions
      FROM streamshare_deliveries
      WHERE creator_id = ?
    `, [creatorId]);

    return stats;
  }

  /**
   * Format delivery for API response
   */
  _formatDelivery(row) {
    return {
      id: row.id,
      creatorId: row.creator_id,
      creatorHandle: row.creator_handle,
      creatorName: row.creator_name,
      creatorAvatar: row.creator_avatar,
      clientId: row.client_id,
      clientHandle: row.client_handle,
      clientName: row.client_name,
      clientAvatar: row.client_avatar,
      projectName: row.project_name,
      description: row.description,
      mediaUrl: row.media_url,
      thumbnailUrl: row.thumbnail_url,
      conversationId: row.conversation_id,
      status: row.status,
      revisionCount: row.revision_count,
      revisionNotes: row.revision_notes,
      approvedAt: row.approved_at,
      deliveredAt: row.delivered_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}

module.exports = new DeliveryService();