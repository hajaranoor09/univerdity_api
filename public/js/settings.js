const $ = (id) => document.getElementById(id);

async function verify(key) {
  const me = await api('/api/me', { key });
  $('info').innerHTML = `
    <div class="kv"><b>Name</b>${esc(me.profile.name)}</div>
    <div class="kv"><b>Role</b>${me.role}</div>
    <div class="kv"><b>Requests</b>${me.usage.used} / ${me.usage.limit}</div>`;
  $('goLink').href = '/' + me.role;
  $('infoCard').style.display = 'block';
  return me;
}

$('saveBtn').addEventListener('click', async () => {
  clearMsg($('msg'));
  const key = $('keyInput').value.trim();
  if (!key) return showMsg($('msg'), 'Please enter an API key.', 'err');
  try {
    await verify(key);
    setUserKey(key);
    showMsg($('msg'), 'API key verified and saved.', 'ok');
  } catch (e) {
    $('infoCard').style.display = 'none';
    showMsg($('msg'), `${e.status || ''} ${e.message}`, 'err');
  }
});

$('clearBtn').addEventListener('click', () => {
  clearUserKey();
  $('keyInput').value = '';
  $('infoCard').style.display = 'none';
  showMsg($('msg'), 'Saved key removed.', 'ok');
});

const saved = getUserKey();
if (saved) {
  $('keyInput').value = saved;
  verify(saved).catch((e) => showMsg($('msg'), `Saved key problem: ${e.message}`, 'err'));
}
