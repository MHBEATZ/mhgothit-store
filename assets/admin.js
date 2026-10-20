/* MH BEATS admin — talks straight to Supabase (database + file storage). No libraries. */
(() => {
const C = Object.assign({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }, window.MH_CONFIG || {});
const BASE = C.SUPABASE_URL.replace(/\/$/, ''), KEY = C.SUPABASE_ANON_KEY, BUCKET = 'beats';
const configured = /^https?:\/\//.test(BASE) && KEY.length > 20;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const show = (el, on = true) => el.classList.toggle('hide', !on);
function toast(t, bad) { const n = $('#toast'); n.textContent = t; n.classList.toggle('bad', !!bad); n.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => n.classList.remove('on'), bad ? 4500 : 2200); }

/* ---------- tiny Supabase client ---------- */
let session = null;
try { session = JSON.parse(localStorage.getItem('mh_session') || 'null'); } catch (e) { }
function saveSession(s) { session = s; try { s ? localStorage.setItem('mh_session', JSON.stringify(s)) : localStorage.removeItem('mh_session'); } catch (e) { } }

async function authCall(grant, body) {
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || j.error || 'Login failed');
  saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in - 60) * 1000, email: j.user?.email });
}
async function token() {
  if (!session) throw new Error('Not logged in');
  if (Date.now() > session.expires_at) { try { await authCall('refresh_token', { refresh_token: session.refresh_token }); } catch (e) { saveSession(null); location.reload(); throw e; } }
  return session.access_token;
}
async function api(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { method, headers: { apikey: KEY, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.message || j.hint || 'Request failed (' + r.status + ')'); e.code = j.code; e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json().catch(() => null);
}
function upload(path, blob, type, onProg) {
  return new Promise(async (res, rej) => {
    const x = new XMLHttpRequest(); x.open('POST', `${BASE}/storage/v1/object/${BUCKET}/${path}`);
    x.setRequestHeader('apikey', KEY); x.setRequestHeader('Authorization', 'Bearer ' + await token()); x.setRequestHeader('x-upsert', 'true'); x.setRequestHeader('Content-Type', type || 'application/octet-stream'); x.setRequestHeader('cache-control', 'max-age=31536000');
    x.upload.onprogress = e => e.lengthComputable && onProg && onProg(e.loaded / e.total);
    x.onload = () => x.status < 300 ? res(`${BASE}/storage/v1/object/public/${BUCKET}/${path}`) : rej(new Error((JSON.parse(x.responseText || '{}').message) || 'Upload failed (' + x.status + ')'));
    x.onerror = () => rej(new Error('Network error while uploading')); x.send(blob);
  });
}
async function removeFile(path) { if (!path) return; try { await fetch(`${BASE}/storage/v1/object/${BUCKET}/${path}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: 'Bearer ' + await token() } }); } catch (e) { } }

/* ---------- state ---------- */
let beats = [], settings = { id: 1, paypal_email: '', contact_email: '', hero_tagline: '', default_mp3: 30, default_wav: 60, default_exclusive: 200 };

/* ---------- login ---------- */
async function start() {
  if (!configured) { show($('#v-login')); show($('#setup-warn')); $('#login-form').classList.add('hide'); return; }
  if (session) { try { await token(); return enter(); } catch (e) { } }
  show($('#v-login'));
}
$('#login-form').onsubmit = async e => {
  e.preventDefault(); const b = $('#login-btn'); b.disabled = true; b.textContent = 'Logging in…'; show($('#login-err'), false);
  try { await authCall('password', { email: $('#em').value.trim(), password: $('#pw').value }); show($('#v-login'), false); enter(); }
  catch (err) { $('#login-err').textContent = err.message; show($('#login-err')); }
  b.disabled = false; b.textContent = 'Log in';
};
$('#b-out').onclick = () => { saveSession(null); location.reload(); };

async function enter() {
  show($('#v-login'), false); show($('#v-app'));
  await Promise.all([loadBeats(), loadSettings()]);
}

/* ---------- data ---------- */
function dbProblem(e) {
  const w = $('#db-warn');
  if (e.code === 'PGRST205' || e.code === '42P01' || e.status === 404) w.innerHTML = 'The database tables don’t exist yet. In Supabase open <b>SQL Editor</b>, paste everything from <code>supabase-setup.sql</code> and press <b>Run</b>. Then refresh this page.';
  else if (e.status === 401 || e.status === 403) w.innerHTML = 'You’re logged in but not allowed to edit. Make sure the email at the top of <code>supabase-setup.sql</code> is exactly the one you log in with, run it again, then refresh.';
  else w.textContent = e.message;
  show(w);
}
async function loadBeats() {
  try { beats = await api('beats?select=*&order=sort_order.asc,created_at.desc') || []; show($('#db-warn'), false); } catch (e) { dbProblem(e); beats = []; }
  render();
}
async function loadSettings() {
  try { const r = await api('settings?select=*&id=eq.1'); if (r && r[0]) settings = Object.assign(settings, r[0]); } catch (e) { }
}

/* ---------- list ---------- */
function render() {
  $('#s-all').textContent = beats.length; $('#s-live').textContent = beats.filter(b => b.published).length; $('#s-hid').textContent = beats.filter(b => !b.published).length;
  const L = $('#list');
  if (!beats.length) {
    const seed = (window.MH_SEED || []).length;
    L.innerHTML = `<div class="empty"><p style="margin:0 0 16px">No beats yet.</p>${seed ? `<button class="btn hot" id="b-import">Import my ${seed} current beats</button><p class="hint">Copies the beats that are already on your site into the admin so you can edit them.</p>` : ''}</div>`;
    const bi = $('#b-import'); if (bi) bi.onclick = importSeed; return;
  }
  L.innerHTML = beats.map(b => `<div class="item ${b.published ? '' : 'hidden'}" draggable="true" data-id="${b.id}">
    <span class="handle" title="Drag to reorder">⋮⋮</span><img src="${esc(b.art_url)}" alt="" onerror="this.style.opacity=.2">
    <div><h3>${esc(b.title)}</h3><div class="meta"><span class="pill ${b.published ? 'live' : 'off'}">${b.published ? 'Live' : 'Hidden'}</span>${!b.audio_url ? '<span class="pill noaudio">No audio</span>' : ''}${b.exclusive_sold ? '<span class="pill sold">Exclusive sold</span>' : ''}
      ${b.bpm ? `<span>${b.bpm} BPM</span>` : ''}${b.musical_key ? `<span>${esc(b.musical_key)}</span>` : ''}<span>MP3 $${+b.price_mp3} · WAV $${+b.price_wav} · EX $${+b.price_exclusive}</span></div></div>
    <div class="acts"><button class="btn sm" data-a="toggle">${b.published ? 'Hide' : 'Publish'}</button><button class="btn sm" data-a="edit">Edit</button><button class="btn sm danger" data-a="del">Delete</button></div></div>`).join('');
}
$('#list').onclick = async e => {
  const btn = e.target.closest('[data-a]'); if (!btn) return; const id = btn.closest('.item').dataset.id, b = beats.find(x => x.id === id);
  if (btn.dataset.a === 'edit') openBeat(b);
  if (btn.dataset.a === 'toggle') { try { await api('beats?id=eq.' + id, { method: 'PATCH', body: { published: !b.published } }); b.published = !b.published; render(); toast(b.published ? 'Now live on the site' : 'Hidden from the site'); } catch (err) { toast(err.message, 1); } }
  if (btn.dataset.a === 'del') {
    if (!confirm(`Delete “${b.title}” for good? This removes its artwork and audio too.`)) return;
    try { await api('beats?id=eq.' + id, { method: 'DELETE' }); await removeFile(b.art_path); await removeFile(b.audio_path); beats = beats.filter(x => x.id !== id); render(); toast('Deleted'); } catch (err) { toast(err.message, 1); }
  }
};

/* drag to reorder */
let dragId = null;
$('#list').addEventListener('dragstart', e => { const it = e.target.closest('.item'); if (!it) return; dragId = it.dataset.id; it.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { } });
$('#list').addEventListener('dragover', e => { e.preventDefault(); const it = e.target.closest('.item'); $$('.item.over').forEach(x => x.classList.remove('over')); if (it && it.dataset.id !== dragId) it.classList.add('over'); });
$('#list').addEventListener('dragend', () => { $$('.item').forEach(x => x.classList.remove('drag', 'over')); });
$('#list').addEventListener('drop', async e => {
  e.preventDefault(); const it = e.target.closest('.item'); if (!it || !dragId || it.dataset.id === dragId) return;
  const from = beats.findIndex(b => b.id === dragId), to = beats.findIndex(b => b.id === it.dataset.id); const [m] = beats.splice(from, 1); beats.splice(to, 0, m); render();
  try { await Promise.all(beats.map((b, i) => b.sort_order === i ? null : api('beats?id=eq.' + b.id, { method: 'PATCH', body: { sort_order: i } }).then(() => b.sort_order = i))); toast('Order saved'); } catch (err) { toast(err.message, 1); }
});

async function importSeed() {
  const rows = (window.MH_SEED || []).map((b, i) => ({ title: b.title, art_url: b.art, audio_url: b.audio || null, price_mp3: b.licenses.mp3, price_wav: b.licenses.wav, price_exclusive: b.licenses.exclusive, published: true, sort_order: i }));
  try { await api('beats', { method: 'POST', body: rows, prefer: 'return=minimal' }); toast('Imported'); loadBeats(); } catch (e) { toast(e.message, 1); }
}

/* ---------- upload / edit modal ---------- */
let editing = null, artBlob = null, audFile = null;
const o = $('#o-beat');
function dz(dropEl, input, onFile) {
  dropEl.onclick = () => input.click(); input.onchange = () => input.files[0] && onFile(input.files[0]);
  ['dragenter', 'dragover'].forEach(v => dropEl.addEventListener(v, e => { e.preventDefault(); dropEl.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(v => dropEl.addEventListener(v, e => { e.preventDefault(); dropEl.classList.remove('over'); }));
  dropEl.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) onFile(f); });
}
async function shrink(file, max = 1400) {
  const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/jpeg', .88));
}
dz($('#d-art'), $('#f-art'), async f => {
  if (!f.type.startsWith('image/')) return toast('That’s not an image', 1);
  try { artBlob = await shrink(f); setArtPreview(URL.createObjectURL(artBlob), `${(artBlob.size / 1024) | 0} KB · resized`); } catch (e) { toast('Could not read that image', 1); }
});
dz($('#d-aud'), $('#f-aud'), f => {
  if (f.size > 50 * 1024 * 1024) return toast('That file is over 50 MB. Export an MP3 preview instead.', 1);
  audFile = f; setAudPreview(f.name, (f.size / 1048576).toFixed(1) + ' MB'); const p = $('#aud-prev'); p.src = URL.createObjectURL(f); show(p);
  if (!$('#t-title').value) $('#t-title').value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').toUpperCase();
});
function setArtPreview(src, note) { $('#d-art').innerHTML = `<img src="${esc(src)}" alt=""><span class="tag">${esc(note || '')}</span>`; }
function setAudPreview(name, note) { $('#d-aud').innerHTML = `<span>🎵 ${esc(name)}<small>${esc(note || '')} — click to replace</small></span>`; }
function resetDz() {
  $('#d-art').innerHTML = '<span>Click or drop an image<small>JPG / PNG / WEBP. Any size — it’s resized automatically.</small></span>';
  $('#d-aud').innerHTML = '<span>Click or drop an audio file<small>MP3 recommended (max 50 MB). This is what visitors hear.</small></span>';
  show($('#aud-prev'), false); $('#f-art').value = ''; $('#f-aud').value = '';
}
function openBeat(b) {
  editing = b || null; artBlob = null; audFile = null; resetDz();
  $('#m-title').textContent = b ? 'EDIT BEAT' : 'NEW BEAT';
  $('#t-title').value = b?.title || ''; $('#t-bpm').value = b?.bpm || ''; $('#t-key').value = b?.musical_key || ''; $('#t-tags').value = b?.tags || '';
  $('#t-p1').value = b ? b.price_mp3 : settings.default_mp3; $('#t-p2').value = b ? b.price_wav : settings.default_wav; $('#t-p3').value = b ? b.price_exclusive : settings.default_exclusive;
  $('#c-pub').checked = b ? b.published : true; $('#c-sold').checked = !!b?.exclusive_sold;
  if (b?.art_url) setArtPreview(b.art_url, 'current'); if (b?.audio_url) { setAudPreview('Current audio', 'uploaded'); const p = $('#aud-prev'); p.src = b.audio_url; show(p); }
  $('#prog').style.display = 'none'; $('#prog i').style.width = '0'; $('#prog-t').textContent = ''; $('#m-save').disabled = false; o.classList.add('on');
}
$('#b-new').onclick = () => openBeat(null);
$('#m-cancel').onclick = () => { o.classList.remove('on'); $('#aud-prev').pause(); };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'beat';

$('#m-save').onclick = async () => {
  const title = $('#t-title').value.trim(); if (!title) return toast('Give the beat a title', 1);
  if (!editing && !artBlob) return toast('Add artwork first', 1);
  const btn = $('#m-save'); btn.disabled = true; const prog = $('#prog'), bar = prog.querySelector('i'), pt = $('#prog-t'); prog.style.display = 'block';
  const parts = [artBlob && 'art', audFile && 'aud'].filter(Boolean); let done = 0; const upd = (f, label) => { bar.style.width = ((done + f) / Math.max(parts.length, 1) * 100) + '%'; pt.textContent = label; };
  try {
    const id = Date.now().toString(36), row = {
      title, bpm: +$('#t-bpm').value || null, musical_key: $('#t-key').value.trim() || null, tags: $('#t-tags').value.trim() || null,
      price_mp3: +$('#t-p1').value || 0, price_wav: +$('#t-p2').value || 0, price_exclusive: +$('#t-p3').value || 0,
      published: $('#c-pub').checked, exclusive_sold: $('#c-sold').checked
    };
    const oldArt = editing?.art_path, oldAud = editing?.audio_path;
    if (artBlob) { const p = `art/${id}-${slug(title)}.jpg`; upd(0, 'Uploading artwork…'); row.art_url = await upload(p, artBlob, 'image/jpeg', f => upd(f, 'Uploading artwork…')); row.art_path = p; done++; }
    if (audFile) { const ext = (audFile.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, ''); const p = `audio/${id}-${slug(title)}.${ext}`; upd(0, 'Uploading audio…'); row.audio_url = await upload(p, audFile, audFile.type || 'audio/mpeg', f => upd(f, 'Uploading audio…')); row.audio_path = p; done++; }
    pt.textContent = 'Saving…';
    if (editing) { await api('beats?id=eq.' + editing.id, { method: 'PATCH', body: row }); if (artBlob) removeFile(oldArt); if (audFile) removeFile(oldAud); }
    else { row.sort_order = beats.length ? Math.min(...beats.map(b => b.sort_order || 0)) - 1 : 0; await api('beats', { method: 'POST', body: row, prefer: 'return=minimal' }); }
    bar.style.width = '100%'; o.classList.remove('on'); $('#aud-prev').pause(); toast(editing ? 'Saved' : 'Beat is live!'); await loadBeats();
  } catch (e) { toast(e.message, 1); pt.textContent = e.message; btn.disabled = false; }
};

/* ---------- settings ---------- */
const so = $('#o-set');
$('#b-settings').onclick = () => {
  $('#s-pp').value = settings.paypal_email || C.PAYPAL_EMAIL || ''; $('#s-ct').value = settings.contact_email || C.CONTACT_EMAIL || ''; $('#s-tg').value = settings.hero_tagline || '';
  $('#s-d1').value = settings.default_mp3; $('#s-d2').value = settings.default_wav; $('#s-d3').value = settings.default_exclusive; so.classList.add('on');
};
$('#s-cancel').onclick = () => so.classList.remove('on');
$('#s-save').onclick = async () => {
  const row = { id: 1, paypal_email: $('#s-pp').value.trim() || null, contact_email: $('#s-ct').value.trim() || null, hero_tagline: $('#s-tg').value.trim() || null, default_mp3: +$('#s-d1').value || 0, default_wav: +$('#s-d2').value || 0, default_exclusive: +$('#s-d3').value || 0 };
  try { await api('settings', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' }); Object.assign(settings, row); so.classList.remove('on'); toast('Settings saved'); } catch (e) { toast(e.message, 1); }
};
addEventListener('keydown', e => { if (e.key === 'Escape') { o.classList.remove('on'); so.classList.remove('on'); } });

start();
})();
