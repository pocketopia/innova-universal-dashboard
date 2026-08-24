/**
 * StreamShare Routes
 * Product delivery system for StreamShare platform
 */

const express = require('express');
const router = express.Router();
const deliveryService = require('../services/deliveryService');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/streamshare/deliver
 * Create a new delivery (creator submits work to client)
 */
router.post('/deliver', authenticate, (req, res) => {
  try {
    const creatorId = req.userId;
    const { clientId, project_name, description, media_url, thumbnail_url, metadata = {} } = req.body;

    // Validate required fields
    if (!clientId || !project_name || !media_url) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'clientId, project_name, and media_url are required'
      });
    }

    const delivery = deliveryService.createDelivery(creatorId, clientId, {
      project_name,
      description,
      media_url,
      thumbnail_url,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Delivery submitted successfully',
      delivery
    });
  } catch (error) {
    console.error('[STREAMSHARE] Deliver error:', error);
    res.status(500).json({
      error: 'delivery_failed',
      message: 'Failed to create delivery'
    });
  }
});

/**
 * GET /api/streamshare/deliveries
 * Get deliveries for current user (creator or client)
 */
router.get('/deliveries', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    const { role, page, limit, status } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);

    let result;

    if (role === 'creator') {
      result = deliveryService.getCreatorDeliveries(userId, {
        page: pageNum,
        limit: limitNum,
        status: status || null
      });
    } else if (role === 'client') {
      result = deliveryService.getClientDeliveries(userId, {
        page: pageNum,
        limit: limitNum,
        status: status || null
      });
    } else {
      // Return both (could optimize with a combined query)
      const creatorDeliveries = deliveryService.getCreatorDeliveries(userId, {
        page: pageNum,
        limit: limitNum,
        status: status || null
      });
      const clientDeliveries = deliveryService.getClientDeliveries(userId, {
        page: pageNum,
        limit: limitNum,
        status: status || null
      });

      result = {
        asCreator: creatorDeliveries,
        asClient: clientDeliveries
      };
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[STREAMSHARE] Get deliveries error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch deliveries'
    });
  }
});

/**
 * GET /api/streamshare/deliveries/:id
 * Get a specific delivery
 */
router.get('/deliveries/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const delivery = deliveryService.getDeliveryById(id);

    if (!delivery) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Delivery not found'
      });
    }

    // Verify user is creator or client
    if (delivery.creatorId !== userId && delivery.clientId !== userId) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Not authorized to view this delivery'
      });
    }

    res.json({
      success: true,
      delivery
    });
  } catch (error) {
    console.error('[STREAMSHARE] Get delivery error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch delivery'
    });
  }
});

/**
 * PUT /api/streamshare/deliveries/:id/status
 * Update delivery status (client approves or requests revisions)
 */
router.put('/deliveries/:id/status', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Status is required'
      });
    }

    if (!['approved', 'revisions_requested'].includes(status)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid status. Must be "approved" or "revisions_requested"'
      });
    }

    if (status === 'revisions_requested' && !notes) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Revision notes are required when requesting revisions'
      });
    }

    const delivery = deliveryService.updateDeliveryStatus(id, status, userId, notes);

    res.json({
      success: true,
      message: `Delivery ${status === 'approved' ? 'approved' : 'revision requested'}`,
      delivery
    });
  } catch (error) {
    console.error('[STREAMSHARE] Update status error:', error);

    if (error.message === 'Delivery not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      });
    }

    if (error.message === 'Not authorized to update this delivery') {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'update_failed',
      message: 'Failed to update delivery status'
    });
  }
});

/**
 * GET /api/streamshare/stats
 * Get delivery statistics for current user
 */
router.get('/stats', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    const { role } = req.query;

    if (role === 'creator') {
      const stats = deliveryService.getCreatorStats(userId);
      res.json({ success: true, stats });
    } else if (role === 'client') {
      // Client stats (could be added to delivery service)
      res.json({ success: true, stats: {} });
    } else {
      res.json({ success: true, stats: {} });
    }
  } catch (error) {
    console.error('[STREAMSHARE] Get stats error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;