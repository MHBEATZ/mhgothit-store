import { CFG, loadBeats, loadSettings } from './data.js';
import { audio, audioState } from './player.js';
import { initScene } from './scene.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let beats = [], cart = [], cur = -1, si = 0, paypal = CFG.PAYPAL_EMAIL, contact = CFG.CONTACT_EMAIL;
let scene = null;

function toast(t) { const n = $('#toast'); n.textContent = t; n.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => n.classList.remove('on'), 1900); }
const cartToggle = () => $('#cart').classList.toggle('open');
const meta = b => [b.bpm ? b.bpm + ' BPM' : '', b.key, ...(b.tags ? b.tags.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2) : [])].filter(Boolean);
const licOpts = b => `<option value="mp3">MP3 lease: $${b.licenses.mp3}</option><option value="wav">WAV lease: $${b.licenses.wav}</option>${b.exclusiveSold ? '<option value="exclusive" disabled>Exclusive: SOLD</option>' : `<option value="exclusive">Exclusive: $${b.licenses.exclusive}</option>`}`;

/* ---------- cart / paypal ---------- */
function drawCart() {
  $('#items').innerHTML = cart.map((x, i) => `<li><span>${esc(x.t)}<br>$${x.p}</span><button data-rm="${i}">Remove</button></li>`).join('') || '<li style="color:var(--steel)">Nothing here yet.</li>';
  $('#total').textContent = cart.reduce((s, x) => s + x.p, 0); $('#cc').textContent = cart.length;
}
function addToCart(i, kind) {
  const b = beats[i]; if (!b) return;
  cart.push({ t: `${b.title} (${kind.toUpperCase()})`, p: +b.licenses[kind] }); drawCart(); toast('Added to cart');
}
function checkout() {
  if (!cart.length) return toast('Your cart is empty');
  const q = new URLSearchParams({ cmd: '_cart', upload: 1, business: paypal, currency_code: 'USD', return: location.origin, cancel_return: location.href, no_shipping: 1 });
  cart.forEach((x, i) => { q.append('item_name_' + (i + 1), 'MH BEATS: ' + x.t); q.append('amount_' + (i + 1), x.p); q.append('quantity_' + (i + 1), 1); });
  window.open('https://www.paypal.com/cgi-bin/webscr?' + q, '_blank');
}
$('#cartbtn').onclick = cartToggle; $('#cartx').onclick = cartToggle; $('#pay').onclick = checkout;
$('#items').onclick = e => { const i = e.target.dataset.rm; if (i !== undefined) { cart.splice(+i, 1); drawCart(); } };

/* ---------- player ---------- */
function play(i) {
  const b = beats[i]; if (!b) return;
  if (!b.audio) { toast('Preview coming soon'); return; }
  if (cur === i) { audio.paused ? audio.play() : audio.pause(); return; }
  cur = i; audio.src = b.audio; audio.play().catch(() => toast('Tap play again to start audio'));
}
function syncPlay() {
  const playing = !audio.paused;
  scene && scene.setPlaying(playing ? cur : -1);
  $$('.beat').forEach((d, i) => { const on = i === cur && playing; d.classList.toggle('on', on); d.querySelector('.play').textContent = on ? '❚❚' : '▶'; });
  const b = beats[cur]; if (b) { $('#npi').src = b.art; $('#npt').textContent = b.title; $('#np').classList.add('on'); }
  $('#npb').textContent = playing ? '❚❚' : '▶';
  $('#spp').textContent = cur === si && playing ? 'Pause' : 'Play';
  document.body.classList.toggle('playing', playing);
}
['play', 'pause', 'ended'].forEach(v => audio.addEventListener(v, syncPlay));
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return; const p = audio.currentTime / audio.duration * 100 + '%';
  $('#npp').style.width = p; const d = $('#b' + cur); if (d) d.querySelector('.bar i').style.width = p;
  $('#vbar i').style.width = cur === si ? p : '0%';
});
audio.addEventListener('error', () => { if (audio.src) toast('Could not load that preview'); });
$('#npb').onclick = () => play(cur);
$('#vbar').onclick = e => { if (cur !== si || !audio.duration) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; };
new IntersectionObserver(es => document.body.classList.toggle('invault', es[0].isIntersecting), { threshold: .55 }).observe($('#store'));
$('#np .npb').onclick = e => { if (!audio.duration) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; };

/* ---------- vault ui ---------- */
function vaultUI(i, b) {
  if (!b) return; si = i;
  $('#spt').textContent = b.title; const fb = $('#fbart'); if (fb) fb.src = b.art;
  $('#spm').innerHTML = meta(b).map(t => `<span>${esc(t)}</span>`).join('');
  $('#spl').innerHTML = licOpts(b);
  if (b._accent) document.documentElement.style.setProperty('--accent', b._accent);
  $('#spc').textContent = `${String(i + 1).padStart(2, '0')} / ${String(beats.length).padStart(2, '0')}`;
  $('#vbar i').style.width = '0%'; syncPlay();
}
$('#spp').onclick = () => play(si);
$('#spa').onclick = () => addToCart(si, $('#spl').value);
$('#prev').onclick = () => scene ? scene.select(si - 1) : vaultNoGL(si - 1);
$('#next').onclick = () => scene ? scene.select(si + 1) : vaultNoGL(si + 1);
function vaultNoGL(i) { si = Math.max(0, Math.min(beats.length - 1, i)); vaultUI(si, beats[si]); }

/* ---------- grid ---------- */
function tilt(d) {
  d.onmousemove = e => { const r = d.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; d.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`; d.style.setProperty('--gx', (px + .5) * 100 + '%'); d.style.setProperty('--gy', (py + .5) * 100 + '%'); };
  d.onmouseleave = () => d.style.transform = '';
}
function buildGrid() {
  const c = $('#beats'); c.innerHTML = '';
  if (!beats.length) { c.innerHTML = '<p class="sub">New beats are on the way.</p>'; return; }
  beats.forEach((x, i) => {
    const d = document.createElement('article'); d.className = 'beat'; d.id = 'b' + i;
    d.innerHTML = `<div class="art"><img src="${esc(x.art)}" alt="${esc(x.title)} artwork" loading="lazy"><button class="play" aria-label="Play ${esc(x.title)}">▶</button></div><h3>${esc(x.title)}</h3><div class="chips">${meta(x).map(t => `<span>${esc(t)}</span>`).join('')}</div><div class="bar"><i></i></div><select id="l${i}" aria-label="License">${licOpts(x)}</select><button class="btn add">Add to cart</button>`;
    d.querySelector('.play').onclick = () => play(i);
    d.querySelector('.add').onclick = () => addToCart(i, $('#l' + i).value);
    d.querySelector('.bar').onclick = e => { if (cur !== i || !audio.duration) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; };
    tilt(d); c.appendChild(d);
  });
}
$$('.card').forEach(tilt);

/* ---------- page chrome: cursor, timecode, counters, year ---------- */
$('.hero h1').innerHTML = [...'MHBEATS'].map((c, i) => `<span style="transition:opacity 1s ${.2 + i * .09}s,filter 1s ${.2 + i * .09}s,transform 1s ${.2 + i * .09}s">${c}</span>`).join('');
$('#yrs').dataset.t = new Date().getFullYear() - 2013;
new IntersectionObserver((es, o) => es.forEach(x => {
  if (!x.isIntersecting) return; o.disconnect();
  $$('#stats strong').forEach(el => { const T = +el.dataset.t, S = el.dataset.s || '', t0 = performance.now(); (function f(n) { const p = Math.min(1, (n - t0) / 1800); el.textContent = Math.round(T * (1 - Math.pow(1 - p, 3))) + (p >= 1 ? S : ''); if (p < 1) requestAnimationFrame(f); })(t0); });
}), { threshold: .4 }).observe($('#stats'));

const cu = $('#cur'), tc = $('#tc'), yn = $('#yn'), yc = $('#yc');
let tx = 0, ty = 0, cx = 0, cy = 0;
addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
(function loop() {
  requestAnimationFrame(loop);
  cx += (tx - cx) * .2; cy += (ty - cy) * .2; cu.style.transform = `translate(${cx}px,${cy}px)`;
  const mp = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 133, P = n => String(n).padStart(2, '0');
  const s = `● 00:${P(Math.floor(mp / 60))}:${P(Math.floor(mp % 60))}:${P(Math.floor(mp % 1 * 24))}`; if (tc.textContent !== s) tc.textContent = s;
  const y = $('#yr').getBoundingClientRect();
  if (y.top < innerHeight && y.bottom > 0) {
    const p = Math.max(0, Math.min(1, -y.top / (y.height - innerHeight))), Y = new Date().getFullYear(), n = Math.round(2013 + (Y - 2013) * p);
    yn.style.setProperty('--p', p.toFixed(3)); if (yn.textContent != n) yn.textContent = n;
    yc.textContent = p < .08 ? 'Day one.' : p > .97 ? (Y - 2013) + ' years in. Still going.' : 'Still building.';
  }
  document.body.classList.toggle('bass', audioState.bass > .5);
  document.documentElement.style.setProperty('--b', audioState.bass.toFixed(3));
})();

/* ---------- boot ---------- */
async function boot() {
  const canvas = $('#gl');
  scene = initScene(canvas, {
    onSelect: vaultUI,
    onPick: i => play(i),
    onHover: h => document.body.classList.toggle('hovcover', h)
  });
  if (!scene) document.body.classList.add('nogl');

  const dataP = Promise.all([loadBeats(), loadSettings()]);
  const minWait = new Promise(r => setTimeout(r, 2600));
  const ready = scene ? Promise.race([scene.ready, new Promise(r => setTimeout(r, 7000))]) : Promise.resolve();
  const [[res, st]] = await Promise.all([dataP, ready, minWait]).then(a => [a[0]]);
  beats = res.beats;
  if (st.paypal_email) paypal = st.paypal_email;
  if (st.contact_email) { contact = st.contact_email; $$('a[data-mail]').forEach(a => a.href = 'mailto:' + contact); }
  if (st.hero_tagline) $('.hero p').textContent = st.hero_tagline;
  buildGrid(); drawCart();
  if (!beats.length) { $('#vault-ui').style.display = 'none'; $('#vault-empty').style.display = 'block'; }
  if (scene) { scene.api = scene; scene.setBeats(beats); } else if (beats.length) vaultUI(0, beats[0]);

  scene && (scene.started = 1);
  document.body.classList.remove('load'); document.body.classList.add('go'); $('#intro').classList.add('done');
}
addEventListener('keydown', e => { if (!scene) { if (e.key === 'ArrowRight') vaultNoGL(si + 1); if (e.key === 'ArrowLeft') vaultNoGL(si - 1); } });
boot();
