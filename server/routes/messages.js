/**
 * Messages Routes
 * REST API fallback for Node-to-Node messaging
 */

const express = require('express');
const router = express.Router();
const messageService = require('../services/messageService');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/messages/conversations
 * Get user's conversations (inbox list)
 */
router.get('/conversations', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    const { page, limit } = req.query;

    const result = messageService.getUserConversations(userId, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100)
    });

    // Get total unread count
    const totalUnread = messageService.getUnreadCount(userId);

    res.json({
      success: true,
      totalUnread,
      ...result
    });
  } catch (error) {
    console.error('[MESSAGES] Get conversations error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch conversations'
    });
  }
});

/**
 * GET /api/messages/:conversationId
 * Get chat history for a conversation
 */
router.get('/:conversationId', authenticate, (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page, limit, beforeMessageId } = req.query;
    const userId = req.userId;

    // Verify user is participant in conversation
    const conversation = messageService.getConversationById(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Conversation not found or you are not a participant'
      });
    }

    const result = messageService.getConversationMessages(conversationId, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100),
      beforeMessageId: beforeMessageId || null
    });

    res.json({
      success: true,
      conversation,
      ...result
    });
  } catch (error) {
    console.error('[MESSAGES] Get conversation messages error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch messages'
    });
  }
});

/**
 * POST /api/messages/:userId
 * Start a new conversation / Send first message to a user
 */
router.post('/:userId', authenticate, (req, res) => {
  try {
    const recipientId = req.params.userId;
    const currentUserId = req.userId;
    const { content, metadata = {} } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Message content is required'
      });
    }

    if (recipientId === currentUserId) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Cannot send message to yourself'
      });
    }

    // Get or create conversation
    const conversation = messageService.getOrCreateConversation(currentUserId, recipientId);
    if (!conversation) {
      return res.status(500).json({
        error: 'creation_failed',
        message: 'Failed to create conversation'
      });
    }

    // Send message
    const message = messageService.sendMessage(conversation.id, currentUserId, content, metadata);

    res.status(201).json({
      success: true,
      message: 'Message sent',
      conversation: {
        id: conversation.id,
        otherUser: conversation.otherUser
      },
      message
    });
  } catch (error) {
    console.error('[MESSAGES] Send message error:', error);
    res.status(500).json({
      error: 'send_failed',
      message: 'Failed to send message'
    });
  }
});

/**
 * POST /api/messages/:conversationId/read
 * Mark messages as read
 */
router.post('/:conversationId/read', authenticate, (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;
    const userId = req.userId;

    // Verify user is participant
    const conversation = messageService.getConversationById(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Conversation not found'
      });
    }

    if (messageId) {
      // Mark single message
      const message = messageService.markAsRead(messageId, userId);
      if (!message) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Message not found'
        });
      }

      res.json({
        success: true,
        message: 'Message marked as read',
        message: {
          id: message.id,
          isRead: true,
          readAt: message.readAt
        }
      });
    } else {
      // Mark all as read
      const result = messageService.markAllAsRead(conversationId, userId);

      res.json({
        success: true,
        message: 'All messages marked as read',
        markedCount: result.markedCount
      });
    }
  } catch (error) {
    console.error('[MESSAGES] Mark as read error:', error);

    if (error.message === 'Cannot mark your own message as read') {
      return res.status(400).json({
        error: 'validation_error',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'update_failed',
      message: 'Failed to mark messages as read'
    });
  }
});

/**
 * DELETE /api/messages/:messageId
 * Delete a message
 */
router.delete('/:conversationId/messages/:messageId', authenticate, (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const result = messageService.deleteMessage(messageId, userId);

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('[MESSAGES] Delete message error:', error);

    if (error.message === 'Message not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      });
    }

    if (error.message === 'Not authorized to delete this message') {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'delete_failed',
      message: 'Failed to delete message'
    });
  }
});

/**
 * GET /api/messages/presence/:userId
 * Get user's online presence status
 */
router.get('/presence/:userId', authenticate, (req, res) => {
  try {
    const { userId } = req.params;
    const presence = messageService.getUserPresence(userId);

    res.json({
      success: true,
      presence: {
        isOnline: !!presence.is_online,
        lastSeenAt: presence.last_seen_at
      }
    });
  } catch (error) {
    console.error('[MESSAGES] Get presence error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch presence status'
    });
  }
});

/**
 * GET /api/messages/online
 * Get list of online users
 */
router.get('/online', authenticate, (req, res) => {
  try {
    const onlineUsers = messageService.getOnlineUsers();

    res.json({
      success: true,
      onlineUsers: onlineUsers.map(u => ({
        userId: u.user_id,
        handle: u.handle,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        lastSeenAt: u.last_seen_at
      }))
    });
  } catch (error) {
    console.error('[MESSAGES] Get online users error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch online users'
    });
  }
});

/**
 * GET /api/messages/unread/count
 * Get unread message count for current user
 */
router.get('/unread/count', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    const count = messageService.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('[MESSAGES] Get unread count error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch unread count'
    });
  }
});

module.exports = router;