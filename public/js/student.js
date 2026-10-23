const $ = (id) => document.getElementById(id);
const key = getUserKey();

if (!key) { location.href = '/settings'; }

async function init() {
  try {
    const me = await api('/api/me', { key });
    if (me.role !== 'student') {
      showMsg($('msg'), 'This page is for students. Use the teacher page instead.', 'err');
      return;
    }
    const p = me.profile;
    window.myId = p.id;
    $('profile').innerHTML = ['name', 'roll_no', 'email', 'department', 'semester']
      .map((f) => `<div class="kv"><b>${f.replace('_', ' ')}</b>${esc(p[f])}</div>`).join('');

    // own info + marks via the id-based endpoints (server verifies ownership)
    const [info, marks] = await Promise.all([
      api(`/api/students/${p.id}`, { key }),
      api(`/api/students/${p.id}/marks`, { key }),
    ]);
    $('usage').textContent = `API usage: ${me.usage.used} / ${me.usage.limit} requests used`;
    $('marksBody').innerHTML = marks.map((m) => `
      <tr><td>${esc(m.course_code)}</td><td>${esc(m.course_title)}</td>
      <td>${m.assignment}</td><td>${m.midterm}</td><td>${m.final_exam}</td><td><b>${m.total}</b></td></tr>`).join('')
      || '<tr><td colspan="6" class="muted">No marks yet.</td></tr>';
  } catch (e) {
    showMsg($('msg'), `${e.status || ''} ${e.message}`, 'err');
  }
}

$('tryBtn').addEventListener('click', async () => {
  clearMsg($('tryMsg'));
  try {
    const rows = await api(`/api/students/${$('otherId').value}/marks`, { key });
    showMsg($('tryMsg'), `Allowed – ${rows.length} rows returned.`, 'ok');
  } catch (e) {
    showMsg($('tryMsg'), `${e.status} – ${e.message}`, 'err');
  }
});

if (key) init();
