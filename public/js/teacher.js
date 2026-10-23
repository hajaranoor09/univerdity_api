const $ = (id) => document.getElementById(id);
const key = getUserKey();
let allMarks = [];

if (!key) { location.href = '/settings'; }

function renderMarks(filter = '') {
  const f = filter.toLowerCase();
  const rows = allMarks.filter((m) =>
    [m.student_name, m.roll_no, m.course_code, m.course_title].join(' ').toLowerCase().includes(f));
  $('marksBody').innerHTML = rows.map((m) => `
    <tr><td>${esc(m.roll_no)}</td><td>${esc(m.student_name)}</td><td>${esc(m.course_code)}</td>
    <td>${m.assignment}</td><td>${m.midterm}</td><td>${m.final_exam}</td><td><b>${m.total}</b></td></tr>`).join('')
    || '<tr><td colspan="7" class="muted">No matching records.</td></tr>';
}

async function init() {
  try {
    const me = await api('/api/me', { key });
    if (me.role !== 'teacher') {
      showMsg($('msg'), 'This page is for teachers. Use the student page instead.', 'err');
      return;
    }
    $('welcome').textContent = `Welcome, ${me.profile.name}`;
    const [students, marks] = await Promise.all([
      api('/api/students', { key }),
      api('/api/marks', { key }),
    ]);
    $('usage').textContent = `API usage: ${me.usage.used} / ${me.usage.limit} requests used`;
    $('studentsBody').innerHTML = students.map((s) =>
      `<tr><td>${s.id}</td><td>${esc(s.roll_no)}</td><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.department)}</td><td>${s.semester}</td></tr>`).join('');
    allMarks = marks;
    renderMarks();
  } catch (e) {
    showMsg($('msg'), `${e.status || ''} ${e.message}`, 'err');
  }
}

$('search').addEventListener('input', (e) => renderMarks(e.target.value));
if (key) init();
