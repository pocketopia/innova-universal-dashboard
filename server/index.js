/**
 * Innova Ecosystem - OAuth 2.0 Device Authorization Grant Server
 * 
 * This server implements the OAuth 2.0 Device Authorization Grant flow (RFC 8628)
 * for TV clients (LG webOS, Amazon Fire TV, Samsung Tizen, Roku) to authenticate
 * users who will authorize the device from a web dashboard.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware - Configure CORS to allow specific origins
const corsOptions = {
  origin: ['http://localhost:3001', 'http://10.0.0.2:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// In-memory storage for device codes and user sessions
// In production, use Redis or a database
const deviceCodes = new Map(); // deviceCode -> { userCode, expiresIn, createdAt, status, userId?, clientId? }
const userCodes = new Map();   // userCode -> deviceCode (for quick lookup)
const users = new Map();       // userId -> { id, email, invaBalance, devices: [] }
const accessTokens = new Map(); // token -> { userId, clientId, expiresAt }

// Mock user database (for demo purposes)
// In production, this would query a real database
function createUser(email, invaBalance = 100) {
  const userId = uuidv4();
  users.set(userId, {
    id: userId,
    email,
    invaBalance,
    devices: []
  });
  return users.get(userId);
}

// Create some test users
createUser('admin@innova.eco', 500);
createUser('user@innova.eco', 50);
createUser('novice@innova.eco', 5); // Below minimum balance

// Generate a short user code (e.g., "ABCD-EFGH")
function generateUserCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a device code (longer, for internal use)
function generateDeviceCode() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate access token
function generateAccessToken() {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * POST /api/device/authorize
 * 
 * TV Client initiates device authorization flow.
 * Returns a device code and user code.
 */
app.post('/api/device/authorize', (req, res) => {
  const { clientId, clientName } = req.body;
  
  if (!clientId) {
    return res.status(400).json({ error: 'client_id is required' });
  }
  
  const deviceCode = generateDeviceCode();
  const userCode = generateUserCode();
  const expiresIn = parseInt(process.env.DEVICE_CODE_EXPIRES_IN) || 600; // 10 minutes
  
  deviceCodes.set(deviceCode, {
    userCode,
    expiresIn,
    createdAt: Date.now(),
    status: 'pending', // pending, authorized, denied, expired
    clientId,
    clientName: clientName || 'Unknown Device',
    userId: null
  });
  
  userCodes.set(userCode, deviceCode);
  
  console.log(`[DEVICE] New device authorization: ${clientName} (${clientId}) - User Code: ${userCode}`);
  
  res.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `${process.env.WEB_DASHBOARD_URL || 'http://localhost:3001'}/devices/verify`,
    expires_in: expiresIn,
    interval: 5 // Polling interval in seconds
  });
});

/**
 * POST /api/device/token
 * 
 * TV Client polls this endpoint to check if the device has been authorized.
 * Returns access token when authorized, or error if still pending/denied.
 */
app.post('/api/device/token', (req, res) => {
  const { device_code, client_id } = req.body;
  
  if (!device_code || !client_id) {
    return res.status(400).json({ error: 'device_code and client_id are required' });
  }
  
  const deviceInfo = deviceCodes.get(device_code);
  
  if (!deviceInfo) {
    return res.status(400).json({ error: 'invalid_device_code' });
  }
  
  // Check if device code has expired
  const elapsed = (Date.now() - deviceInfo.createdAt) / 1000;
  if (elapsed > deviceInfo.expiresIn) {
    deviceCodes.delete(device_code);
    userCodes.delete(deviceInfo.userCode);
    return res.status(400).json({ error: 'expired_device_code' });
  }
  
  // Check if client_id matches
  if (deviceInfo.clientId !== client_id) {
    return res.status(400).json({ error: 'invalid_client' });
  }
  
  switch (deviceInfo.status) {
    case 'pending':
      // Still waiting for user authorization
      return res.status(400).json({ error: 'authorization_pending' });
      
    case 'denied':
      // User denied the authorization
      deviceCodes.delete(device_code);
      userCodes.delete(deviceInfo.userCode);
      return res.status(400).json({ error: 'access_denied' });
      
    case 'authorized':
      // User has authorized the device
      if (!deviceInfo.userId) {
        return res.status(500).json({ error: 'server_error' });
      }
      
      // Generate access token
      const accessToken = generateAccessToken();
      const expiresAt = Date.now() + (parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN) || 3600) * 1000;
      
      accessTokens.set(accessToken, {
        userId: deviceInfo.userId,
        clientId: deviceInfo.clientId,
        expiresAt,
        deviceCode
      });
      
      // Clean up
      deviceCodes.delete(device_code);
      userCodes.delete(deviceInfo.userCode);
      
      console.log(`[DEVICE] Token issued for ${deviceInfo.clientName} - User: ${deviceInfo.userId}`);
      
      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN) || 3600
      });
      
    default:
      return res.status(400).json({ error: 'invalid_grant' });
  }
});

/**
 * GET /api/device/status/:userCode
 * 
 * Web dashboard checks the status of a user code.
 * Returns the current status and device info.
 */
app.get('/api/device/status/:userCode', (req, res) => {
  const { userCode } = req.params;
  const normalizedUserCode = userCode.toUpperCase().replace(/\s/g, '');
  
  const deviceCode = userCodes.get(normalizedUserCode);
  
  if (!deviceCode) {
    return res.status(404).json({ error: 'invalid_user_code' });
  }
  
  const deviceInfo = deviceCodes.get(deviceCode);
  
  if (!deviceInfo) {
    return res.status(404).json({ error: 'invalid_device_code' });
  }
  
  // Check if expired
  const elapsed = (Date.now() - deviceInfo.createdAt) / 1000;
  if (elapsed > deviceInfo.expiresIn) {
    deviceCodes.delete(deviceCode);
    userCodes.delete(normalizedUserCode);
    return res.status(404).json({ error: 'expired_user_code' });
  }
  
  res.json({
    status: deviceInfo.status,
    client_name: deviceInfo.clientName,
    client_id: deviceInfo.clientId,
    expires_in: deviceInfo.expiresIn - Math.floor(elapsed)
  });
});

/**
 * POST /api/device/authorize-user
 * 
 * Web dashboard endpoint where user submits the code and authorizes the device.
 * Requires user authentication (simplified for demo).
 */
app.post('/api/device/authorize-user', (req, res) => {
  const { userCode, userId, action = 'authorize' } = req.body;
  const normalizedUserCode = userCode.toUpperCase().replace(/\s/g, '');
  
  if (!userCode || !userId) {
    return res.status(400).json({ error: 'user_code and user_id are required' });
  }
  
  const deviceCode = userCodes.get(normalizedUserCode);
  
  if (!deviceCode) {
    return res.status(404).json({ error: 'invalid_user_code' });
  }
  
  const deviceInfo = deviceCodes.get(deviceCode);
  
  if (!deviceInfo) {
    return res.status(404).json({ error: 'invalid_device_code' });
  }
  
  // Check if already processed
  if (deviceInfo.status !== 'pending') {
    return res.status(400).json({ error: 'code_already_processed' });
  }
  
  // Check if expired
  const elapsed = (Date.now() - deviceInfo.createdAt) / 1000;
  if (elapsed > deviceInfo.expiresIn) {
    deviceCodes.delete(deviceCode);
    userCodes.delete(normalizedUserCode);
    return res.status(404).json({ error: 'expired_user_code' });
  }
  
  // Get user info
  const user = users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  
  // Check INVA token balance
  const minBalance = parseInt(process.env.MIN_INVA_BALANCE) || 10;
  if (action === 'authorize' && user.invaBalance < minBalance) {
    return res.status(403).json({ 
      error: 'insufficient_inva_balance',
      message: `Minimum ${minBalance} INVA tokens required to link devices`,
      current_balance: user.invaBalance,
      required_balance: minBalance
    });
  }
  
  if (action === 'authorize') {
    // Authorize the device
    deviceInfo.status = 'authorized';
    deviceInfo.userId = userId;
    
    // Add device to user's device list
    user.devices.push({
      deviceCode,
      clientId: deviceInfo.clientId,
      clientName: deviceInfo.clientName,
      authorizedAt: new Date().toISOString()
    });
    
    console.log(`[DEVICE] User ${user.email} authorized device ${deviceInfo.clientName}`);
    
    res.json({
      success: true,
      message: 'Device authorized successfully',
      device_name: deviceInfo.clientName
    });
  } else if (action === 'deny') {
    // Deny the device
    deviceInfo.status = 'denied';
    
    // Clean up
    deviceCodes.delete(deviceCode);
    userCodes.delete(normalizedUserCode);
    
    console.log(`[DEVICE] User ${user.email} denied device ${deviceInfo.clientName}`);
    
    res.json({
      success: true,
      message: 'Device authorization denied'
    });
  } else {
    return res.status(400).json({ error: 'invalid_action' });
  }
});

/**
 * GET /api/users/:userId
 * 
 * Get user info including INVA balance and linked devices.
 */
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  
  // Don't expose sensitive data
  const { invaBalance, devices } = user;
  
  res.json({
    id: userId,
    inva_balance: invaBalance,
    devices: devices.map(d => ({
      client_name: d.clientName,
      client_id: d.clientId,
      authorized_at: d.authorizedAt
    }))
  });
});

/**
 * POST /api/users
 * 
 * Create a new user (for testing).
 */
app.post('/api/users', (req, res) => {
  const { email, invaBalance = 100 } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }
  
  const user = createUser(email, invaBalance);
  
  console.log(`[USER] Created user: ${email} with ${invaBalance} INVA`);
  
  res.json({
    id: user.id,
    email: user.email,
    inva_balance: user.invaBalance
  });
});

/**
 * GET /api/health
 * 
 * Health check endpoint.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    device_codes_active: deviceCodes.size,
    access_tokens_active: accessTokens.size
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`� Innova OAuth Device Server running on port ${PORT}`);
  console.log(`�📺 Device Authorization: POST http://localhost:${PORT}/api/device/authorize`);
  console.log(`🔑 Token Polling: POST http://localhost:${PORT}/api/device/token`);
  console.log(`🌐 User Authorization: POST http://localhost:${PORT}/api/device/authorize-user`);
  console.log(`📊 Health Check: GET http://localhost:${PORT}/api/health`);
});

module.exports = app;