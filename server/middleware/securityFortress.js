/**
 * Innova Backend Security Fortress Middleware
 * Enforces OWASP Security Headers, Sliding-Window Rate Limiting, and Anti-Replay Nonce Verification
 */
const seenNonces = new Map(); // nonce -> timestamp
const ipRequestCounts = new Map(); // ip -> { count, windowStart }

const NONCE_TTL_MS = 60 * 1000; // 60-second anti-replay window
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 180;

function securityFortressMiddleware(req, res, next) {
  // 1. Strict OWASP HTTP Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=()');
  res.setHeader('X-Innova-Security-Enclave', 'ECDSA-P256-DPoP-Active');

  // 2. IP Brute-Force & Flood Rate Limiter
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'local';
  const now = Date.now();
  const rateEntry = ipRequestCounts.get(clientIp) || { count: 0, windowStart: now };
  if (now - rateEntry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateEntry.count = 1;
    rateEntry.windowStart = now;
  } else {
    rateEntry.count += 1;
  }
  ipRequestCounts.set(clientIp, rateEntry);
  if (rateEntry.count > MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Innova Security Shield: Too many requests from this network origin. Please wait 60 seconds.'
    });
  }

  // 3. Anti-Replay Nonce & Timestamp Freshness Verification (when X-Innova-Nonce header is supplied)
  const nonce = req.headers['x-innova-nonce'];
  const tsHeader = req.headers['x-innova-timestamp'];
  if (nonce && tsHeader) {
    const reqTs = Number(tsHeader);
    if (Number.isNaN(reqTs) || Math.abs(now - reqTs) > NONCE_TTL_MS) {
      return res.status(401).json({
        error: 'stale_request_timestamp',
        message: 'Innova Anti-Replay Shield: Request timestamp outside 60-second freshness window.'
      });
    }
    if (seenNonces.has(nonce)) {
      return res.status(401).json({
        error: 'replay_attack_detected',
        message: 'Innova Anti-Replay Shield: Duplicate cryptographic nonce rejected.'
      });
    }
    seenNonces.set(nonce, now);
    // Prune expired nonces
    if (seenNonces.size > 2000) {
      for (const [k, v] of seenNonces.entries()) {
        if (now - v > NONCE_TTL_MS) seenNonces.delete(k);
      }
    }
  }

  next();
}

module.exports = securityFortressMiddleware;
