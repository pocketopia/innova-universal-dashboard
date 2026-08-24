/**
 * WebSocket Server Initialization
 * Real-time Node-to-Node messaging using Socket.IO
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const messageService = require('./services/messageService');
const { verifyToken } = require('./utils/jwt');
const db = require('./database');

let io = null;

/**
 * Initialize Socket.IO server
 */
function initializeSocketIO(httpServer, app) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://10.0.0.2:3001'];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // JWT Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.userHandle = decoded.handle;
      next();
    } catch (error) {
      console.error('[SOCKET] Auth error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[SOCKET] User connected: ${userId} (${socket.id})`);

    // Join user's private room
    socket.join(`user_${userId}`);

    // Update presence
    messageService.updatePresence(userId, true, socket.id);

    // Broadcast online status to relevant users
    socket.broadcast.emit('user_online', {
      userId,
      timestamp: Math.floor(Date.now() / 1000)
    });

    // ---- Event Handlers ----

    /**
     * Send Message Event
     * Payload: { recipientId, content, metadata? }
     */
    socket.on('send_message', (data, callback) => {
      try {
        const { recipientId, content, metadata = {} } = data;

        if (!recipientId || !content) {
          return callback?.({ error: 'Missing recipientId or content' });
        }

        if (recipientId === userId) {
          return callback?.({ error: 'Cannot send message to yourself' });
        }

        // Get or create conversation
        const conversation = messageService.getOrCreateConversation(userId, recipientId);
        if (!conversation) {
          return callback?.({ error: 'Failed to create conversation' });
        }

        // Send message
        const message = messageService.sendMessage(conversation.id, userId, content, metadata);

        // Emit to recipient's room
        socket.to(`user_${recipientId}`).emit('receive_message', {
          ...message,
          conversationId: conversation.id,
          senderId: userId,
          senderHandle: socket.userHandle
        });

        // Also emit to sender with conversation info
        socket.emit('message_sent', {
          ...message,
          conversationId: conversation.id
        });

        callback?.({ success: true, message, conversationId: conversation.id });
      } catch (error) {
        console.error('[SOCKET] send_message error:', error);
        callback?.({ error: error.message });
      }
    });

    /**
     * Mark as Read Event
     * Payload: { conversationId, messageId? }
     */
    socket.on('mark_as_read', (data, callback) => {
      try {
        const { conversationId, messageId } = data;

        if (!conversationId) {
          return callback?.({ error: 'Missing conversationId' });
        }

        if (messageId) {
          // Mark single message as read
          const message = messageService.markAsRead(messageId, userId);
          if (message) {
            // Notify sender that their message was read
            socket.to(`user_${message.senderId}`).emit('message_read', {
              messageId: message.id,
              conversationId: message.conversation_id,
              readBy: userId,
              readAt: message.readAt
            });
          }
        } else {
          // Mark all messages in conversation as read
          const result = messageService.markAllAsRead(conversationId, userId);

          // Get unread messages that were just marked
          const conversation = messageService.getConversationById(conversationId, userId);
          if (conversation) {
            socket.to(`user_${conversation.otherUser.id}`).emit('conversation_read', {
              conversationId,
              readBy: userId,
              timestamp: Math.floor(Date.now() / 1000)
            });
          }
        }

        callback?.({ success: true });
      } catch (error) {
        console.error('[SOCKET] mark_as_read error:', error);
        callback?.({ error: error.message });
      }
    });

    /**
     * Typing Indicator Event
     * Payload: { recipientId, isTyping }
     */
    socket.on('typing_indicator', (data) => {
      const { recipientId, isTyping } = data;
      if (recipientId) {
        socket.to(`user_${recipientId}`).emit('user_typing', {
          userId,
          isTyping,
          timestamp: Math.floor(Date.now() / 1000)
        });
      }
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${userId} (${socket.id})`);

      // Update presence
      messageService.updatePresence(userId, false, null);

      // Broadcast offline status
      socket.broadcast.emit('user_offline', {
        userId,
        timestamp: Math.floor(Date.now() / 1000)
      });
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error(`[SOCKET] Error for user ${userId}:`, error);
    });
  });

  console.log('[SOCKET] Socket.IO initialized');
  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit event to user's room
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Broadcast event to all users except sender
 */
function broadcastExcept(userId, event, data) {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Get connected socket IDs for a user
 */
function getUserSockets(userId) {
  if (!io) return [];
  const room = io.sockets.adapter.rooms.get(`user_${userId}`);
  return room ? Array.from(room) : [];
}

/**
 * Check if user is online (has active socket connection)
 */
function isUserOnline(userId) {
  return getUserSockets(userId).length > 0;
}

module.exports = {
  initializeSocketIO,
  getIO,
  emitToUser,
  broadcastExcept,
  getUserSockets,
  isUserOnline
};