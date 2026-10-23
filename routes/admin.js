const express = require('express');
const crypto = require('crypto');
const pool = require('../db');

const router = express.Router();

// GET /api/admin/students
router.get('/students', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/admin/teachers
router.get('/teachers', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM teachers ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/admin/keys  - all keys with owner name, usage and status
router.get('/keys', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT k.id, k.api_key, k.owner_type, k.owner_id,
              COALESCE(s.name, t.name) AS owner_name,
              k.request_limit, k.requests_used, k.status, k.created_at, k.last_used_at
         FROM api_keys k
         LEFT JOIN students s ON k.owner_type = 'student' AND s.id = k.owner_id
         LEFT JOIN teachers t ON k.owner_type = 'teacher' AND t.id = k.owner_id
        ORDER BY k.id`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/admin/keys/:id/usage - recent request log for one key
router.get('/keys/:id/usage', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid key id.' });
    const [rows] = await pool.query(
      'SELECT method, endpoint, status_code, created_at FROM api_usage_log WHERE api_key_id = ? ORDER BY id DESC LIMIT 50',
      [id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/admin/keys  { owner_type, owner_id, request_limit }
router.post('/keys', async (req, res, next) => {
  try {
    const { owner_type, owner_id } = req.body;
    const limit = Number(req.body.request_limit);
    const ownerId = Number(owner_id);

    if (!['student', 'teacher'].includes(owner_type)) {
      return res.status(400).json({ error: "owner_type must be 'student' or 'teacher'." });
    }
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ error: 'owner_id must be a positive integer.' });
    }
    if (!Number.isInteger(limit) || limit <= 0) {
      return res.status(400).json({ error: 'request_limit must be a positive integer.' });
    }

    const table = owner_type === 'student' ? 'students' : 'teachers';
    const [owner] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [ownerId]);
    if (!owner.length) return res.status(404).json({ error: `${owner_type} not found.` });

    const [existing] = await pool.query(
      "SELECT id FROM api_keys WHERE owner_type = ? AND owner_id = ? AND status = 'active'",
      [owner_type, ownerId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'This user already has an active key. Revoke it first.' });
    }

    const apiKey = 'uk_' + crypto.randomBytes(20).toString('hex');
    const [result] = await pool.query(
      'INSERT INTO api_keys (api_key, owner_type, owner_id, request_limit) VALUES (?,?,?,?)',
      [apiKey, owner_type, ownerId, limit]
    );
    res.status(201).json({ id: result.insertId, api_key: apiKey, owner_type, owner_id: ownerId, request_limit: limit });
  } catch (e) { next(e); }
});

// PUT /api/admin/keys/:id/limit  { request_limit }
router.put('/keys/:id/limit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const limit = Number(req.body.request_limit);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid key id.' });
    if (!Number.isInteger(limit) || limit <= 0) {
      return res.status(400).json({ error: 'request_limit must be a positive integer.' });
    }
    const [result] = await pool.query('UPDATE api_keys SET request_limit = ? WHERE id = ?', [limit, id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'API key not found.' });
    res.json({ message: 'Request limit updated.', id, request_limit: limit });
  } catch (e) { next(e); }
});

// PUT /api/admin/keys/:id/revoke
router.put('/keys/:id/revoke', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid key id.' });
    const [result] = await pool.query("UPDATE api_keys SET status = 'revoked' WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'API key not found.' });
    res.json({ message: 'API key revoked.', id });
  } catch (e) { next(e); }
});

module.exports = router;
