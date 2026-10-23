// Shared AJAX helper: sends the API key in the x-api-key header
async function api(path, { method = 'GET', body, key } = {}) {
  const headers = { 'x-api-key': key || '' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'msg show ' + (type === 'ok' ? 'ok' : 'err');
}
function clearMsg(el) { el.className = 'msg'; el.textContent = ''; }

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(v) { return v ? new Date(v).toLocaleString() : '—'; }

const USER_KEY = 'userApiKey';
function getUserKey() { try { return localStorage.getItem(USER_KEY); } catch (_) { return null; } }
function setUserKey(k) { try { localStorage.setItem(USER_KEY, k); } catch (_) {} }
function clearUserKey() { try { localStorage.removeItem(USER_KEY); } catch (_) {} }
