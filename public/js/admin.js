let ADMIN_KEY = null;
let students = [], teachers = [];

const $ = (id) => document.getElementById(id);
const msg = $('msg');

const adminApi = (path, opts = {}) => api('/api/admin' + path, { ...opts, key: ADMIN_KEY });

$('loginBtn').addEventListener('click', async () => {
  ADMIN_KEY = $('adminKey').value.trim();
  clearMsg($('authMsg'));
  try {
    await loadAll();
    try { sessionStorage.setItem('adminKey', ADMIN_KEY); } catch (_) {}
    $('panel').style.display = 'block';
    showMsg($('authMsg'), 'Authenticated as administrator.', 'ok');
  } catch (e) {
    $('panel').style.display = 'none';
    showMsg($('authMsg'), `${e.status || ''} ${e.message}`, 'err');
  }
});

async function loadAll() {
  [students, teachers] = await Promise.all([adminApi('/students'), adminApi('/teachers')]);
  renderPeople();
  fillOwners();
  await loadKeys();
}

function renderPeople() {
  $('studentsBody').innerHTML = students.map((s) =>
    `<tr><td>${s.id}</td><td>${esc(s.roll_no)}</td><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.department)}</td><td>${s.semester}</td></tr>`).join('');
  $('teachersBody').innerHTML = teachers.map((t) =>
    `<tr><td>${t.id}</td><td>${esc(t.name)}</td><td>${esc(t.email)}</td><td>${esc(t.department)}</td></tr>`).join('');
}

function fillOwners() {
  const list = $('ownerType').value === 'student' ? students : teachers;
  $('ownerId').innerHTML = list.map((p) => `<option value="${p.id}">${esc(p.name)}${p.roll_no ? ' (' + esc(p.roll_no) + ')' : ''}</option>`).join('');
}
$('ownerType').addEventListener('change', fillOwners);

async function loadKeys() {
  const keys = await adminApi('/keys');
  $('keysBody').innerHTML = keys.map((k) => {
    const pct = Math.min(100, Math.round((k.requests_used / k.request_limit) * 100));
    const revoked = k.status === 'revoked';
    return `<tr>
      <td>${k.id}</td>
      <td>${esc(k.owner_name)}<br><span class="muted">${k.owner_type}</span></td>
      <td><code class="key">${esc(k.api_key)}</code></td>
      <td>${k.requests_used}<div class="bar"><div style="width:${pct}%"></div></div></td>
      <td><input type="number" min="1" value="${k.request_limit}" style="width:80px" id="lim-${k.id}"></td>
      <td><span class="badge ${k.status}">${k.status}</span></td>
      <td>${fmtDate(k.last_used_at)}</td>
      <td>
        <div class="row">
          <button class="ghost" onclick="updateLimit(${k.id})">Update</button>
          <button class="ghost" onclick="viewUsage(${k.id}, '${esc(k.owner_name)}')">Log</button>
          <button class="danger" ${revoked ? 'disabled' : ''} onclick="revokeKey(${k.id})">Revoke</button>
        </div>
      </td></tr>`;
  }).join('') || '<tr><td colspan="8" class="muted">No keys yet.</td></tr>';
}

$('genBtn').addEventListener('click', async () => {
  clearMsg(msg); clearMsg($('newKey'));
  try {
    const out = await adminApi('/keys', {
      method: 'POST',
      body: {
        owner_type: $('ownerType').value,
        owner_id: Number($('ownerId').value),
        request_limit: Number($('limit').value),
      },
    });
    showMsg($('newKey'), `New key: ${out.api_key}  (give this to the user)`, 'ok');
    await loadKeys();
  } catch (e) { showMsg(msg, `${e.status} – ${e.message}`, 'err'); }
});

async function updateLimit(id) {
  clearMsg(msg);
  try {
    const out = await adminApi(`/keys/${id}/limit`, { method: 'PUT', body: { request_limit: Number($(`lim-${id}`).value) } });
    showMsg(msg, out.message, 'ok');
    await loadKeys();
  } catch (e) { showMsg(msg, `${e.status} – ${e.message}`, 'err'); }
}

async function revokeKey(id) {
  if (!confirm('Revoke this API key? The user will lose access immediately.')) return;
  clearMsg(msg);
  try {
    const out = await adminApi(`/keys/${id}/revoke`, { method: 'PUT' });
    showMsg(msg, out.message, 'ok');
    await loadKeys();
  } catch (e) { showMsg(msg, `${e.status} – ${e.message}`, 'err'); }
}

async function viewUsage(id, owner) {
  try {
    const rows = await adminApi(`/keys/${id}/usage`);
    $('usageTitle').textContent = `Request log – key #${id} (${owner})`;
    $('usageBody').innerHTML = rows.map((r) =>
      `<tr><td>${fmtDate(r.created_at)}</td><td>${r.method}</td><td>${esc(r.endpoint)}</td><td>${r.status_code}</td></tr>`).join('')
      || '<tr><td colspan="4" class="muted">No requests logged yet.</td></tr>';
    $('usageCard').style.display = 'block';
    $('usageCard').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { showMsg(msg, `${e.status} – ${e.message}`, 'err'); }
}

// Restore session
try {
  const saved = sessionStorage.getItem('adminKey');
  if (saved) { $('adminKey').value = saved; $('loginBtn').click(); }
} catch (_) {}
