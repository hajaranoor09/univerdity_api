const express = require('express');
const pool = require('../db');
const { authenticate, requireRole, ownStudentOrTeacher } = require('../middleware/auth');

const router = express.Router();

const MARKS_SQL = `
  SELECT m.id, m.student_id, s.name AS student_name, s.roll_no,
         c.code AS course_code, c.title AS course_title,
         m.assignment, m.midterm, m.final_exam,
         (m.assignment + m.midterm + m.final_exam) AS total
    FROM marks m
    JOIN students s ON s.id = m.student_id
    JOIN courses  c ON c.id = m.course_id`;

// GET /api/me - profile of the key owner (+ key usage). Used by the settings page.
router.get('/me', authenticate, requireRole('student', 'teacher'), async (req, res, next) => {
  try {
    const table = req.user.role === 'student' ? 'students' : 'teachers';
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.user.ownerId]);
    if (!rows.length) return res.status(404).json({ error: 'Profile not found.' });
    res.json({
      role: req.user.role,
      profile: rows[0],
      usage: { used: req.user.requestsUsed, limit: req.user.requestLimit },
    });
  } catch (e) { next(e); }
});

// GET /api/students - teachers only
router.get('/students', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/students/:id - student (own only) or teacher (any)
router.get('/students/:id', authenticate, requireRole('student', 'teacher'), ownStudentOrTeacher,
  async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [req.studentId]);
      if (!rows.length) return res.status(404).json({ error: 'Student not found.' });
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

// GET /api/students/:id/marks - student (own only) or teacher (any)
router.get('/students/:id/marks', authenticate, requireRole('student', 'teacher'), ownStudentOrTeacher,
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(`${MARKS_SQL} WHERE m.student_id = ? ORDER BY c.code`, [req.studentId]);
      res.json(rows);
    } catch (e) { next(e); }
  });

// GET /api/marks - marks of all students, teachers only
router.get('/marks', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${MARKS_SQL} ORDER BY s.id, c.code`);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
