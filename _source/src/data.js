// Loads beats + settings from Supabase (if config.js is filled in), else from the built-in starter list.
const C = Object.assign({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '', PAYPAL_EMAIL: 'mhloco133@gmail.com', CONTACT_EMAIL: 'contact@mhbeats.com' }, window.MH_CONFIG || {});
export const CFG = C;
export const configured = () => /^https?:\/\//.test(C.SUPABASE_URL) && (C.SUPABASE_ANON_KEY || '').length > 20;

async function rest(path) {
  const r = await fetch(C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path, { headers: Object.assign({ apikey: C.SUPABASE_ANON_KEY }, C.SUPABASE_ANON_KEY.startsWith('eyJ') ? { Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY } : {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
const num = (v, d) => (v === null || v === undefined || v === '' || isNaN(+v)) ? d : +v;

export function norm(r) {
  return {
    id: r.id, title: (r.title || 'Untitled').trim(), bpm: r.bpm || null, key: r.musical_key || r.key || '', tags: r.tags || '',
    art: r.art_url || r.art || '', audio: r.audio_url || r.audio || '',
    licenses: { mp3: num(r.price_mp3 ?? r.licenses?.mp3, 30), wav: num(r.price_wav ?? r.licenses?.wav, 60), exclusive: num(r.price_exclusive ?? r.licenses?.exclusive, 200) },
    exclusiveSold: !!r.exclusive_sold
  };
}

export async function loadBeats() {
  if (configured()) {
    try {
      const rows = await rest('beats?select=*&published=eq.true&order=sort_order.asc,created_at.desc');
      return { beats: rows.map(norm), source: 'live' };
    } catch (e) { console.warn('MH BEATS: could not reach the database, showing the built-in beats.', e); }
  }
  return { beats: (window.MH_SEED || []).map(norm), source: 'seed' };
}

export async function loadSettings() {
  if (!configured()) return {};
  try { const r = await rest('settings?select=*&id=eq.1'); return r[0] || {}; } catch (e) { return {}; }
}
