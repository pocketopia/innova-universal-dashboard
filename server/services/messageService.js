/**
 * Message Service
 * Handles conversations and messages for Node-to-Node messaging
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class MessageService {
  /**
   * Get or create conversation between two users
   */
  getOrCreateConversation(userId1, userId2) {
    // Ensure consistent ordering for unique constraint
    const [participant1, participant2] = [userId1, userId2].sort();

    // Try to find existing conversation
    const existing = db.get(`
      SELECT c.*, 
             u1.handle as p1_handle, u1.display_name as p1_name, u1.avatar_url as p1_avatar,
             u2.handle as p2_handle, u2.display_name as p2_name, u2.avatar_url as p2_avatar
      FROM conversations c
      LEFT JOIN users u1 ON c.participant_1_id = u1.id
      LEFT JOIN users u2 ON c.participant_2_id = u2.id
      WHERE c.participant_1_id = ? AND c.participant_2_id = ?
    `, [participant1, participant2]);

    if (existing) {
      return this._formatConversation(existing, userId1);
    }

    // Create new conversation
    const now = Math.floor(Date.now() / 1000);
    const conversationId = uuidv4();

    db.run(`
      INSERT INTO conversations (id, participant_1_id, participant_2_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [conversationId, participant1, participant2, now, now]);

    // Fetch and return the created conversation
    return this.getConversationById(conversationId, userId1);
  }

  /**
   * Get conversation by ID
   */
  getConversationById(conversationId, currentUserId) {
    const conversation = db.get(`
      SELECT c.*, 
             u1.handle as p1_handle, u1.display_name as p1_name, u1.avatar_url as p1_avatar,
             u2.handle as p2_handle, u2.display_name as p2_name, u2.avatar_url as p2_avatar
      FROM conversations c
      LEFT JOIN users u1 ON c.participant_1_id = u1.id
      LEFT JOIN users u2 ON c.participant_2_id = u2.id
      WHERE c.id = ?
    `, [conversationId]);

    if (!conversation) return null;

    return this._formatConversation(conversation, currentUserId);
  }

  /**
   * Get user's conversations with pagination
   */
  getUserConversations(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const conversations = db.all(`
      SELECT c.*, 
             u1.handle as p1_handle, u1.display_name as p1_name, u1.avatar_url as p1_avatar,
             u2.handle as p2_handle, u2.display_name as p2_name, u2.avatar_url as p2_avatar,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
             (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id,
             (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_created_at
      FROM conversations c
      LEFT JOIN users u1 ON c.participant_1_id = u1.id
      LEFT JOIN users u2 ON c.participant_2_id = u2.id
      WHERE c.participant_1_id = ? OR c.participant_2_id = ?
      ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, userId, limit, offset]);

    // Get total count
    const { total } = db.get(`
      SELECT COUNT(*) as total FROM conversations 
      WHERE participant_1_id = ? OR participant_2_id = ?
    `, [userId, userId]);

    return {
      conversations: conversations.map(c => this._formatConversation(c, userId)),
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
   * Send a message
   */
  sendMessage(conversationId, senderId, content, metadata = {}) {
    const now = Math.floor(Date.now() / 1000);
    const messageId = uuidv4();
    const messageType = metadata.type || 'text';

    return db.transaction(() => {
      // Insert message
      db.run(`
        INSERT INTO messages (id, conversation_id, sender_id, content, message_type, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [messageId, conversationId, senderId, content, messageType, JSON.stringify(metadata), now]);

      // Update conversation's last_message_at
      db.run(`
        UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?
      `, [now, now, conversationId]);

      // Return the created message
      return this.getMessageById(messageId);
    })();
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId) {
    const message = db.get(`
      SELECT m.*, u.handle as sender_handle, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [messageId]);

    if (!message) return null;

    return this._formatMessage(message);
  }

  /**
   * Get messages for a conversation with pagination
   */
  getConversationMessages(conversationId, options = {}) {
    const { page = 1, limit = 50, beforeMessageId = null } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT m.*, u.handle as sender_handle, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
    `;
    const params = [conversationId];

    if (beforeMessageId) {
      query += ' AND m.created_at < (SELECT created_at FROM messages WHERE id = ?)';
      params.push(beforeMessageId);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const messages = db.all(query, params);

    // Get total count
    const { total } = db.get(`SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?`, [conversationId]);

    return {
      messages: messages.map(m => this._formatMessage(m)).reverse(), // Return in chronological order
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
   * Mark message as read
   */
  markAsRead(messageId, userId) {
    const now = Math.floor(Date.now() / 1000);

    const message = this.getMessageById(messageId);
    if (!message) return null;

    // Only the recipient can mark as read
    if (message.senderId === userId) {
      throw new Error('Cannot mark your own message as read');
    }

    db.run(`
      UPDATE messages SET is_read = 1, read_at = ?, updated_at = ? WHERE id = ? AND sender_id != ?
    `, [now, now, messageId, userId]);

    return this.getMessageById(messageId);
  }

  /**
   * Mark all messages in conversation as read
   */
  markAllAsRead(conversationId, userId) {
    const now = Math.floor(Date.now() / 1000);

    db.run(`
      UPDATE messages 
      SET is_read = 1, read_at = ?, updated_at = ? 
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `, [now, now, conversationId, userId]);

    return { success: true, markedCount: db.changes };
  }

  /**
   * Get unread message count for user
   */
  getUnreadCount(userId) {
    const { count } = db.get(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.participant_1_id = ? OR c.participant_2_id = ?) AND m.sender_id != ? AND m.is_read = 0
    `, [userId, userId, userId]);

    return count || 0;
  }

  /**
   * Delete a message (soft delete by marking)
   */
  deleteMessage(messageId, userId) {
    const message = this.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Not authorized to delete this message');
    }

    db.run(`DELETE FROM messages WHERE id = ?`, [messageId]);

    return { success: true };
  }

  /**
   * Update user presence (online/offline)
   */
  updatePresence(userId, isOnline, socketId = null) {
    const now = Math.floor(Date.now() / 1000);

    db.run(`
      INSERT INTO user_presence (user_id, is_online, socket_id, last_seen_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        is_online = excluded.is_online,
        socket_id = excluded.socket_id,
        last_seen_at = CASE WHEN excluded.is_online = 1 THEN excluded.last_seen_at ELSE user_presence.last_seen_at END,
        updated_at = excluded.updated_at
    `, [userId, isOnline ? 1 : 0, socketId, isOnline ? now : null, now]);
  }

  /**
   * Get user presence
   */
  getUserPresence(userId) {
    const presence = db.get(`
      SELECT is_online, last_seen_at, socket_id
      FROM user_presence
      WHERE user_id = ?
    `, [userId]);

    return presence || { is_online: 0, last_seen_at: null, socket_id: null };
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    return db.all(`
      SELECT up.user_id, u.handle, u.display_name, u.avatar_url, up.last_seen_at
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      WHERE up.is_online = 1
    `);
  }

  /**
   * Format conversation for API response
   */
  _formatConversation(conv, currentUserId) {
    const otherUserId = conv.participant_1_id === currentUserId ? conv.participant_2_id : conv.participant_1_id;
    const otherUserHandle = conv.participant_1_id === currentUserId ? conv.p2_handle : conv.p1_handle;
    const otherUserName = conv.participant_1_id === currentUserId ? conv.p2_name : conv.p1_name;
    const otherUserAvatar = conv.participant_1_id === currentUserId ? conv.p2_avatar : conv.p1_avatar;

    return {
      id: conv.id,
      otherUser: {
        id: otherUserId,
        handle: otherUserHandle,
        displayName: otherUserName,
        avatarUrl: otherUserAvatar
      },
      lastMessage: conv.last_message_content ? {
        content: conv.last_message_content,
        senderId: conv.last_message_sender_id,
        createdAt: conv.last_message_created_at
      } : null,
      unreadCount: conv.unread_count || 0,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    };
  }

  /**
   * Format message for API response
   */
  _formatMessage(msg) {
    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderHandle: msg.sender_handle,
      senderName: msg.sender_name,
      senderAvatar: msg.sender_avatar,
      content: msg.content,
      messageType: msg.message_type,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : {},
      isRead: !!msg.is_read,
      readAt: msg.read_at,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at
    };
  }
}

module.exports = new MessageService();