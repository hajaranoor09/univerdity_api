const crypto = require('crypto');
const pool = require('../db');

// Predefined admin key (override with the ADMIN_API_KEY environment variable)
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin-master-key-2026';

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Protects /api/admin/*  (key sent in the x-api-key header)
function requireAdmin(req, res, next) {
  const key = req.header('x-api-key');
  if (!key) {
    return res.status(401).json({ error: 'API key missing. Send it in the x-api-key header.' });
  }
  if (!safeEqual(key, ADMIN_KEY)) {
    return res.status(403).json({ error: 'Invalid admin API key.' });
  }
  req.user = { role: 'admin' };
  next();
}

// Validates student/teacher keys, enforces status + request limit, logs usage
async function authenticate(req, res, next) {
  try {
    const key = req.header('x-api-key');
    if (!key) {
      return res.status(401).json({ error: 'API key missing. Send it in the x-api-key header.' });
    }

    const [rows] = await pool.query('SELECT * FROM api_keys WHERE api_key = ?', [key]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid API key.' });
    }
    const k = rows[0];

    // Log every request made with a known key once the response is sent
    res.on('finish', () => {
      pool
        .query(
          'INSERT INTO api_usage_log (api_key_id, method, endpoint, status_code) VALUES (?,?,?,?)',
          [k.id, req.method, req.originalUrl.slice(0, 200), res.statusCode]
        )
        .catch(() => {});
    });

    if (k.status !== 'active') {
      return res.status(403).json({ error: 'This API key has been revoked.' });
    }

    // Atomic increment: only succeeds while the key is active and under its limit
    const [result] = await pool.query(
      `UPDATE api_keys
          SET requests_used = requests_used + 1, last_used_at = NOW()
        WHERE id = ? AND status = 'active' AND requests_used < request_limit`,
      [k.id]
    );
    if (result.affectedRows === 0) {
      return res.status(429).json({ error: 'Request limit exceeded for this API key.' });
    }

    req.user = {
      role: k.owner_type,
      ownerId: k.owner_id,
      keyId: k.id,
      requestLimit: k.request_limit,
      requestsUsed: k.requests_used + 1,
    };
    next();
  } catch (err) {
    next(err);
  }
}

// Role-based permission check
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

// Students may only touch their own record (the id comes from the key, never the client);
// teachers may access any student.
function ownStudentOrTeacher(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid student id.' });
  }
  if (req.user.role === 'student' && id !== req.user.ownerId) {
    return res.status(403).json({ error: "Access denied: you can only view your own records." });
  }
  req.studentId = id;
  next();
}

module.exports = { requireAdmin, authenticate, requireRole, ownStudentOrTeacher };
