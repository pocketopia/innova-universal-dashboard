/**
 * StreamShare Review Portal
 * Live review portal for delivered video projects with real-time chat
 * 
 * Features:
 * - Video player side-by-side with real-time chat
 * - Socket.IO integration for live messaging
 * - "Request Revision" and "Approve Project" actions
 * - Automated status messages in chat feed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import apiClient from '../../lib/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

/**
 * StreamShare Review Portal Component
 */
export default function StreamShareReviewPortal({ deliveryId, initialDelivery = null }) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [loading, setLoading] = useState(!initialDelivery);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null); // 'approve' | 'revision' | null
  const [revisionNotes, setRevisionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch delivery details
  const fetchDelivery = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/streamshare/deliveries/${deliveryId}`);
      if (response.success) {
        setDelivery(response.delivery);
      }
    } catch (err) {
      setError('Failed to load delivery');
      console.error('Error fetching delivery:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!delivery || !delivery.conversationId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token found');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected from server');
      setConnected(false);
    });

    // Receive new message
    newSocket.on('receive_message', (data) => {
      if (data.conversationId === delivery.conversationId) {
        setMessages(prev => [...prev, {
          id: data.id,
          senderId: data.senderId,
          senderName: data.senderName || data.senderHandle,
          senderAvatar: data.senderAvatar,
          content: data.content,
          messageType: data.messageType,
          metadata: data.metadata,
          isRead: false,
          createdAt: data.createdAt,
          isOwn: false
        }]);
      }
    });

    // Message sent confirmation
    newSocket.on('message_sent', (data) => {
      if (data.conversationId === delivery.conversationId) {
        setMessages(prev => [...prev, {
          ...data,
          isOwn: true
        }]);
      }
    });

    // Message read receipt
    newSocket.on('message_read', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, isRead: true, readAt: data.readAt } : msg
      ));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [delivery?.conversationId]);

  // Fetch chat history
  useEffect(() => {
    if (!delivery?.conversationId || !socket) return;

    const fetchMessages = async () => {
      try {
        const response = await apiClient.get(`/api/messages/${delivery.conversationId}`);
        if (response.success) {
          setMessages(response.messages || []);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();
  }, [delivery?.conversationId, socket]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !delivery?.conversationId) return;

    socket.emit('send_message', {
      recipientId: delivery.creatorId === getCurrentUserId() 
        ? delivery.clientId 
        : delivery.creatorId,
      content: newMessage.trim(),
      metadata: { deliveryId: delivery.id }
    }, (response) => {
      if (response.success) {
        setNewMessage('');
      }
    });
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle approval
  const handleApprove = async () => {
    setProcessing(true);
    try {
      const response = await apiClient.put(`/api/streamshare/deliveries/${deliveryId}/status`, {
        status: 'approved'
      });
      
      if (response.success) {
        setDelivery(response.delivery);
        setShowConfirmModal(null);
      }
    } catch (err) {
      console.error('Error approving delivery:', err);
      alert('Failed to approve delivery');
    } finally {
      setProcessing(false);
    }
  };

  // Handle revision request
  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      alert('Please provide revision notes');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.put(`/api/streamshare/deliveries/${deliveryId}/status`, {
        status: 'revisions_requested',
        notes: revisionNotes.trim()
      });
      
      if (response.success) {
        setDelivery(response.delivery);
        setShowConfirmModal(null);
        setRevisionNotes('');
      }
    } catch (err) {
      console.error('Error requesting revision:', err);
      alert('Failed to request revision');
    } finally {
      setProcessing(false);
    }
  };

  // Get current user ID from token
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  // Check if current user is client
  const isClient = delivery?.clientId === getCurrentUserId();
  const canTakeAction = isClient && delivery?.status === 'pending_review';

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="review-portal-loading">
        <div className="spinner"></div>
        <p>Loading delivery...</p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="review-portal-error">
        <p>{error || 'Delivery not found'}</p>
      </div>
    );
  }

  return (
    <div className="streamshare-review-portal">
      <div className="review-portal-header">
        <h2>{delivery.projectName}</h2>
        <div className={`status-badge status-${delivery.status}`}>
          {delivery.status.replace('_', ' ').toUpperCase()}
        </div>
        <div className="connection-status">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="review-portal-content">
        {/* Video Player Section */}
        <div className="video-section">
          <div className="video-player">
            {delivery.mediaUrl?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video 
                controls 
                poster={delivery.thumbnailUrl}
                className="video-element"
              >
                <source src={delivery.mediaUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="media-placeholder">
                <img 
                  src={delivery.mediaUrl} 
                  alt={delivery.projectName}
                  className="media-image"
                />
              </div>
            )}
          </div>
          
          <div className="delivery-info">
            <h3>Project Details</h3>
            {delivery.description && (
              <p className="description">{delivery.description}</p>
            )}
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Creator:</span>
                <span className="value">{delivery.creatorName || delivery.creatorHandle}</span>
              </div>
              <div className="info-item">
                <span className="label">Delivered:</span>
                <span className="value">
                  {new Date(delivery.deliveredAt * 1000).toLocaleDateString()}
                </span>
              </div>
              {delivery.revisionCount > 0 && (
                <div className="info-item">
                  <span className="label">Revisions:</span>
                  <span className="value">{delivery.revisionCount}</span>
                </div>
              )}
              {delivery.revisionNotes && (
                <div className="info-item revision-notes">
                  <span className="label">Revision Notes:</span>
                  <span className="value">{delivery.revisionNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons (Client Only) */}
          {canTakeAction && (
            <div className="action-buttons">
              <button 
                className="btn btn-approve"
                onClick={() => setShowConfirmModal('approve')}
                disabled={processing}
              >
                ✅ Approve Project
              </button>
              <button 
                className="btn btn-revision"
                onClick={() => setShowConfirmModal('revision')}
                disabled={processing}
              >
                🔄 Request Revision
              </button>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="chat-section">
          <div className="chat-header">
            <h3>Project Chat</h3>
            <span className="participant-count">
              {delivery.creatorName} & {delivery.clientName}
            </span>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message ${msg.isOwn ? 'own' : ''} ${msg.messageType === 'system' ? 'system' : ''}`}
              >
                <div className="message-header">
                  <span className="sender-name">{msg.senderName}</span>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="message-content">
                  {msg.messageType === 'system' ? (
                    <span className="system-message">{msg.content}</span>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.isOwn && msg.isRead && (
                  <span className="read-receipt">✓ Read</span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={2}
              disabled={!connected}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !connected}
              className="btn btn-send"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {showConfirmModal === 'approve' ? (
              <>
                <h3>Confirm Approval</h3>
                <p>Are you sure you want to approve this project? This action cannot be undone.</p>
                <div className="modal-actions">
                  <button className="btn btn-cancel" onClick={() => setShowConfirmModal(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-approve" onClick={handleApprove} disabled={processing}>
                    {processing ? 'Processing...' : 'Confirm Approval'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Request Revision</h3>
                <p>Please describe the changes you'd like the creator to make:</p>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Enter revision notes..."
                  rows={4}
                  className="revision-notes-input"
                />
                <div className="modal-actions">
                  <button className="btn btn-cancel" onClick={() => setShowConfirmModal(null)}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-revision" 
                    onClick={handleRequestRevision} 
                    disabled={processing || !revisionNotes.trim()}
                  >
                    {processing ? 'Sending...' : 'Send Revision Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .streamshare-review-portal {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .review-portal-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #333;
        }

        .review-portal-header h2 {
          flex: 1;
          margin: 0;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }

        .status-pending_review {
          background: #FFA000;
          color: #000;
        }

        .status-revisions_requested {
          background: #FF5722;
          color: #fff;
        }

        .status-approved {
          background: #4CAF50;
          color: #fff;
        }

        .status-cancelled {
          background: #9E9E9E;
          color: #fff;
        }

        .connection-status {
          font-size: 12px;
          color: #888;
        }

        .review-portal-content {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
        }

        .video-section {
          display: flex;
          flex-direction: column;
        }

        .video-player {
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 16/9;
          margin-bottom: 20px;
        }

        .video-element {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .media-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .media-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .delivery-info {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .delivery-info h3 {
          margin: 0 0 12px 0;
          color: #888;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .description {
          color: #ccc;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .info-grid {
          display: grid;
          gap: 8px;
        }

        .info-item {
          display: flex;
          gap: 8px;
        }

        .info-item .label {
          color: #666;
          min-width: 100px;
        }

        .info-item .value {
          color: #fff;
        }

        .revision-notes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #333;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-approve {
          background: #4CAF50;
          color: #fff;
        }

        .btn-approve:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-revision {
          background: #FF5722;
          color: #fff;
        }

        .btn-revision:hover:not(:disabled) {
          background: #e64a19;
        }

        .btn-cancel {
          background: #333;
          color: #fff;
        }

        .btn-cancel:hover {
          background: #444;
        }

        .btn-send {
          background: #2196F3;
          color: #fff;
          padding: 8px 16px;
        }

        .btn-send:hover:not(:disabled) {
          background: #1976D2;
        }

        /* Chat Section */
        .chat-section {
          background: #1a1a1a;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          height: 600px;
        }

        .chat-header {
          padding: 16px;
          border-bottom: 1px solid #333;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .participant-count {
          font-size: 12px;
          color: #666;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message {
          max-width: 90%;
        }

        .message.own {
          align-self: flex-end;
          text-align: right;
        }

        .message.system {
          align-self: center;
          max-width: 100%;
          text-align: center;
        }

        .message-header {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 4px;
        }

        .message.own .message-header {
          flex-direction: row-reverse;
        }

        .sender-name {
          font-weight: 600;
          font-size: 12px;
          color: #2196F3;
        }

        .message-time {
          font-size: 10px;
          color: #666;
        }

        .message-content {
          background: #2a2a2a;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.4;
        }

        .message.own .message-content {
          background: #2196F3;
          color: #fff;
        }

        .system-message {
          color: #888;
          font-style: italic;
          font-size: 12px;
        }

        .read-receipt {
          font-size: 10px;
          color: #4CAF50;
        }

        .chat-input {
          padding: 16px;
          border-top: 1px solid #333;
          display: flex;
          gap: 8px;
        }

        .chat-input textarea {
          flex: 1;
          background: #2a2a2a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 10px;
          color: #fff;
          font-size: 14px;
          resize: none;
        }

        .chat-input textarea:focus {
          outline: none;
          border-color: #2196F3;
        }

        .chat-input textarea:disabled {
          opacity: 0.5;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #2a2a2a;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
        }

        .modal-content h3 {
          margin: 0 0 12px 0;
        }

        .modal-content p {
          color: #aaa;
          margin-bottom: 16px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .revision-notes-input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 10px;
          color: #fff;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 16px;
        }

        .revision-notes-input:focus {
          outline: none;
          border-color: #FF5722;
        }

        /* Loading & Error */
        .review-portal-loading,
        .review-portal-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #888;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top-color: #2196F3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .review-portal-content {
            grid-template-columns: 1fr;
          }

          .chat-section {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
}