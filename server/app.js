/**
 * Innova Ecosystem Backend - Express Application
 * Complete backend infrastructure with authentication, subscriptions, and TV pairing
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Initialize database
const db = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pairingRoutes = require('./routes/pairing');
const subscriptionRoutes = require('./routes/subscriptions');
const deletionRoutes = require('./routes/deletion');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const streamshareRoutes = require('./routes/streamshare');

// Import existing device authorization routes (from original index.js)
const deviceRoutes = require('./routes/device');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3001', 'http://10.0.0.2:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Identifier', 'X-Device-Name', 'X-Device-Type', 'X-Sync-Source']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// ============================================
// Rate Limiting
// ============================================

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'too_many_requests',
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    error: 'too_many_auth_requests',
    message: 'Too many authentication attempts, please try again later.'
  }
});

// ============================================
// Request Logging
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  const dbStats = db.isConnected() ? db.getStats() : null;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: dbStats ? {
      connected: dbStats.connected,
      tables: dbStats.tables
    } : null
  });
});

// Authentication routes
app.use('/api/auth', authLimiter, authRoutes);

// User routes (profile, sync)
app.use('/api/users', userRoutes);

// Account deletion routes
app.use('/api/users', deletionRoutes);

// TV Pairing routes
app.use('/api/pairing', pairingRoutes);

// Subscription routes
app.use('/api/subscriptions', subscriptionRoutes);

// Device authorization routes (RFC 8628 - existing functionality)
app.use('/api/device', deviceRoutes);

// Submission routes (content submission and retrieval)
// Note: /api/submissions/taxonomies is handled by the submissions router
app.use('/api/submissions', submissionRoutes);

// Message routes (real-time messaging REST API)
app.use('/api/messages', messageRoutes);

// StreamShare routes (product delivery system)
app.use('/api/streamshare', streamshareRoutes);

// Admin routes (submission moderation)
app.use('/api/admin', adminRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/refresh',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'GET /api/users/profile',
      'PUT /api/users/profile',
      'POST /api/users/delete/request',
      'POST /api/users/delete/confirm',
      'POST /api/pairing/generate',
      'POST /api/pairing/confirm',
      'GET /api/pairing/status/:code',
      'POST /api/pairing/token',
      'GET /api/subscriptions/plans',
      'GET /api/subscriptions/current',
      'POST /api/subscriptions/checkout',
      'POST /api/subscriptions/cancel/initiate',
      'POST /api/subscriptions/cancel/confirm',
      'POST /api/subscriptions/resume',
      'POST /api/device/authorize',
      'POST /api/device/token',
      'GET /api/health'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message;

  res.status(err.status || 500).json({
    error: 'internal_error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// Graceful Shutdown
// ============================================

const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Received shutdown signal. Closing server gracefully...`);
  
  db.close();
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  db.close();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  db.close();
  process.exit(1);
});

module.exports = app;