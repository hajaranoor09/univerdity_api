const express = require('express');
const path = require('path');
const { requireAdmin } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pages
const page = (name) => (req, res) => res.sendFile(path.join(__dirname, 'public', name));
app.get('/admin', page('admin.html'));
app.get('/settings', page('settings.html'));
app.get('/student', page('student.html'));
app.get('/teacher', page('teacher.html'));
app.get('/', (req, res) => res.redirect('/settings'));

// API
app.use('/api/admin', requireAdmin, require('./routes/admin'));
app.use('/api', require('./routes/user'));

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Central error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
