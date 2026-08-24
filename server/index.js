/**
 * Innova Ecosystem Backend Server
 * Main entry point - starts the Express application with Socket.IO
 * 
 * Features:
 * - JWT Authentication with refresh tokens
 * - Global Profile Synchronization
 * - Compliance-Ready Account Deletion
 * - TV Pairing with 6-digit codes
 * - Subscription Management with Trial Flow
 * - OAuth 2.0 Device Authorization Grant (RFC 8628)
 * - Real-Time Node-to-Node Messaging (WebSocket)
 */

const app = require('./app');
const { initializeSocketIO } = require('./socket');

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const http = require('http').createServer(app);

// Initialize Socket.IO for real-time messaging
initializeSocketIO(http, app);

// Start server
http.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌐 Innova Ecosystem Backend Server v2.0.0              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket enabled (Socket.IO)`);
  console.log(``);
  console.log(`📋 Available Endpoints:`);
  console.log(``);
  console.log(`  🔐 Authentication:`);
  console.log(`     POST /api/auth/register          - Register new user`);
  console.log(`     POST /api/auth/login             - User login`);
  console.log(`     POST /api/auth/login/wallet      - Wallet login`);
  console.log(`     POST /api/auth/refresh           - Refresh access token`);
  console.log(`     POST /api/auth/logout            - User logout`);
  console.log(`     POST /api/auth/logout/all        - Logout all devices`);
  console.log(`     GET  /api/auth/me                - Get current user`);
  console.log(`     GET  /api/auth/devices           - List trusted devices`);
  console.log(`     DELETE /api/auth/devices/:id     - Remove trusted device`);
  console.log(``);
  console.log(`  👤 User Profile:`);
  console.log(`     GET  /api/users/profile          - Get user profile`);
  console.log(`     PUT  /api/users/profile          - Update user profile`);
  console.log(`     GET  /api/users/sync/status      - Get sync status`);
  console.log(`     GET  /api/users/:userId          - Get user by ID`);
  console.log(`     GET  /api/users/handle/:handle   - Get user by handle`);
  console.log(``);
  console.log(`  🗑️  Account Deletion:`);
  console.log(`     POST /api/users/delete/request   - Request account deletion`);
  console.log(`     POST /api/users/delete/confirm   - Confirm deletion`);
  console.log(`     GET  /api/users/delete/status    - Check deletion status`);
  console.log(``);
  console.log(`  📺 TV Pairing:`);
  console.log(`     POST /api/pairing/generate       - Generate pairing code`);
  console.log(`     POST /api/pairing/confirm        - Confirm pairing`);
  console.log(`     GET  /api/pairing/status/:code   - Check pairing status`);
  console.log(`     POST /api/pairing/token          - Get tokens after pairing`);
  console.log(`     GET  /api/pairing/history        - Get pairing history`);
  console.log(``);
  console.log(`  💳 Subscriptions:`);
  console.log(`     GET  /api/subscriptions/plans           - List plans`);
  console.log(`     GET  /api/subscriptions/current         - Get current subscription`);
  console.log(`     POST /api/subscriptions/checkout        - Start subscription`);
  console.log(`     POST /api/subscriptions/cancel/initiate - Start cancellation`);
  console.log(`     POST /api/subscriptions/cancel/confirm  - Confirm cancellation`);
  console.log(`     POST /api/subscriptions/resume          - Resume subscription`);
  console.log(`     POST /api/subscriptions/trial/convert   - Convert trial`);
  console.log(`     GET  /api/subscriptions/invoices        - Get invoices`);
  console.log(``);
  console.log(`  📱 Device Authorization (RFC 8628):`);
  console.log(`     POST /api/device/authorize       - Initiate device auth`);
  console.log(`     POST /api/device/token           - Poll for token`);
  console.log(`     GET  /api/device/status/:code    - Check device status`);
  console.log(`     POST /api/device/authorize-user  - Authorize device`);
  console.log(``);
  console.log(`  📬 Real-Time Messaging (WebSocket + REST):`);
  console.log(`     WebSocket: Connect to Socket.IO with JWT token`);
  console.log(`       - send_message: Send real-time message`);
  console.log(`       - mark_as_read: Mark messages as read`);
  console.log(`       - typing_indicator: Show typing status`);
  console.log(`     REST API:`);
  console.log(`     GET  /api/messages/conversations      - Get inbox`);
  console.log(`     GET  /api/messages/:conversationId    - Get chat history`);
  console.log(`     POST /api/messages/:userId            - Send message`);
  console.log(`     POST /api/messages/:id/read           - Mark as read`);
  console.log(`     GET  /api/messages/presence/:userId   - Check online status`);
  console.log(`     GET  /api/messages/online             - List online users`);
  console.log(`     GET  /api/messages/unread/count       - Get unread count`);
  console.log(``);
  console.log(`  📝 Content Submissions:`);
  console.log(`     GET  /api/submissions/taxonomies      - Get platform taxonomies`);
  console.log(`     GET  /api/submissions/:platform       - Get approved content`);
  console.log(`     POST /api/submissions/:platform       - Submit content`);
  console.log(`     GET  /api/submissions/me              - Get my submissions`);
  console.log(``);
  console.log(`  🔧 Admin:`);
  console.log(`     GET  /api/admin/submissions/pending   - Get pending submissions`);
  console.log(`     PUT  /api/admin/submissions/:id/approve - Approve submission`);
  console.log(`     PUT  /api/admin/submissions/:id/reject  - Reject submission`);
  console.log(``);
  console.log(`  ❤️  Health:`);
  console.log(`     GET  /api/health                 - Health check`);
  console.log(``);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database:  SQLite (persistent)`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[SIGTERM] Received shutdown signal. Closing server...');
  http.close(() => {
    console.log('[SIGTERM] Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SIGINT] Received interrupt signal. Closing server...');
  http.close(() => {
    console.log('[SIGINT] Server closed.');
    process.exit(0);
  });
});

module.exports = http;