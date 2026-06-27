// TAGRO Service — app.js
// Data, auth, and API calls
// API keys never in browser — all calls go through Cloudflare Worker

const API = 'https://tagro-api.icy-fire-d2ac.workers.dev';

const TAGRO = {
  branches: {
    KVR:'Karavaloor', PKM:'Ponkunnam', NDD:'Nedumangad',
    MDM:'Marthandam', SKT:'Shencottai', OYR:'Oyoor', SDM:'Sadanandapuram'
  },
  people: {
    KVR: { manager:'Vishnu', staff:['Rajeev','Anandu','Thankachan'] },
    PKM: { manager:'Anoop K P', staff:['Anoop P G'] },
    NDD: { manager:'Yedhu', staff:[] },
    MDM: { manager:'Ratheesh', staff:['John Victor'] },
    SKT: { manager:'Karthick', staff:['Mahalakshmi','Jothi'] },
    OYR: { manager:'Manager', staff:[] },
    SDM: { manager:'Manager', staff:[] }
  },
  owner: { name:'T M Thomas', role:'Owner' },
  parts: [
    { no:'1123-640-2000', name:'MS250 Clutch Drum', price:480, stock:{KVR:0,PKM:1,MDM:2,SKT:0} },
    { no:'0000-400-7000', name:'Spark Plug', price:180, stock:{KVR:12,PKM:5,MDM:8,SKT:6} },
    { no:'4134-120-0600', name:'FS120 Carburetor Kit', price:950, stock:{KVR:0,PKM:0,MDM:1,SKT:0} },
    { no:'3639-000-0068', name:'36RS Chain', price:720, stock:{KVR:3,PKM:12,MDM:6,SKT:2} },
    { no:'3005-000-4813', name:'MS250 Guide Bar', price:1450, stock:{KVR:1,PKM:0,MDM:0,SKT:1} }
  ],
  customers: [
    { id:'c1', branch:'KVR', name:'Thomas Thumpassery', alias:['Thomas Estate'], phone:'9656361846', place:'Karavaloor',
      machines:[{id:'m1',model:'MS 250',serial:'184-KVR-250',note:'Frequent chain/clutch work'},{id:'m2',model:'FS 120',serial:'361-KVR-120',note:'Estate brushcutter'}] },
    { id:'c2', branch:'KVR', name:'Jose Sawmill', alias:['Sawmill Jose'], phone:'9447000001', place:'Anchal',
      machines:[{id:'m3',model:'MS 383',serial:'382-JOSE',note:'Hard daily use'}] },
    { id:'c3', branch:'KVR', name:'Rubber Biju', alias:['Biju','Kuttappan'], phone:'9447000002', place:'Oyoor',
      machines:[{id:'m4',model:'SR 450',serial:'SR-BIJU',note:'Sprayer'}] },
    { id:'c4', branch:'MDM', name:'Victor Farms', alias:['Victor'], phone:'9447000003', place:'Marthandam',
      machines:[{id:'m5',model:'BR 600',serial:'BR-VIC',note:''}] }
  ],
  links: [
    { title:'TAGRO', url:'https://tagro.in' },
    { title:'STIHL India', url:'https://www.stihl.in' },
    { title:'Jain Irrigation', url:'https://www.jains.com' },
    { title:'GST Portal', url:'https://www.gst.gov.in' },
    { title:'Kerala Agriculture', url:'https://keralaagriculture.gov.in' }
  ],
  charges: [
    { name:'Full Service', amount:3000 },
    { name:'Carburetor Service', amount:300 },
    { name:'Carburetor Repairs', amount:500 },
    { name:'Clutch Assembly Replacement', amount:250 },
    { name:'Piston Replaced', amount:500 }
  ]
};

// ── LOCAL STORAGE HELPERS ─────────────────────────────────

function jget(k, d) { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)) } catch { return d } }
function jset(k, v) { localStorage.setItem(k, JSON.stringify(v)) }

// ── XSS SANITIZER ─────────────────────────────────────────
// Always use esc() when injecting user data into innerHTML

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── SESSION ───────────────────────────────────────────────

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function session() { return jget('tagro_session', null) }
function setSession(s) { jset('tagro_session', { ...s, loginAt: s.loginAt || new Date().toISOString() }) }
function logout() { localStorage.removeItem('tagro_session'); location.href = 'login.html' }
function isDemo() { let s = session(); return s && s.demo }
function requireLogin() {
  let s = session();
  if (!s) { location.href = 'login.html'; return null; }
  // Check 12-hour expiry (demo sessions exempt)
  if (!s.demo && s.loginAt) {
    const age = Date.now() - new Date(s.loginAt).getTime();
    if (age > SESSION_TTL_MS) {
      localStorage.removeItem('tagro_session');
      location.href = 'login.html?expired=1';
      return null;
    }
  }
  return s;
}

// ── USERS / AUTH ──────────────────────────────────────────

function users() { return jget('tagro_users', {}) }
function saveUsers(u) { jset('tagro_users', u) }

async function hashPin(pin) {
  const txt = new TextEncoder().encode(pin + '|tagro-service-v1');
  const buf = await crypto.subtle.digest('SHA-256', txt);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function userKey(branch, name) { return branch + '_' + name.replace(/\s+/g, '_') }

function allPeople(branch) {
  let p = TAGRO.people[branch] || { manager:'Manager', staff:[] };
  let arr = [{ name: p.manager, role:'Manager' }, ...p.staff.map(n => ({ name: n, role:'Staff' }))];
  arr.push({ name:'Demo', role:'Practice' });
  return arr;
}

// ── DATA ──────────────────────────────────────────────────

function seed() {
  if (!localStorage.getItem('tagro_customers')) jset('tagro_customers', TAGRO.customers);
  if (!localStorage.getItem('tagro_parts')) jset('tagro_parts', TAGRO.parts);
  if (!localStorage.getItem('tagro_links')) jset('tagro_links', TAGRO.links);
  if (!localStorage.getItem('tagro_comments')) jset('tagro_comments', []);
  if (!localStorage.getItem('tagro_jobs')) jset('tagro_jobs', []);
  if (!localStorage.getItem('tagro_po')) jset('tagro_po', []);
}

function customers() { return jget('tagro_customers', TAGRO.customers) }
function jobs() { return jget(isDemo() ? 'tagro_demo_jobs' : 'tagro_jobs', []) }
function saveJobs(a) { jset(isDemo() ? 'tagro_demo_jobs' : 'tagro_jobs', a); syncJobs(a) }
function po() { return jget(isDemo() ? 'tagro_demo_po' : 'tagro_po', []) }
function savePo(a) { jset(isDemo() ? 'tagro_demo_po' : 'tagro_po', a) }
function comments() { return jget('tagro_comments', []) }
function saveComment(txt) {
  let s = session();
  let a = comments();
  a.unshift({ by: s.name, branch: s.branch || 'ALL', text: txt, at: new Date().toISOString() });
  jset('tagro_comments', a);
}
function parts() { return jget('tagro_parts', TAGRO.parts) }
function findParts(q) {
  q = q.toLowerCase().trim();
  return parts().filter(p => (p.name + ' ' + p.no).toLowerCase().includes(q)).slice(0, 8);
}
function totalStock(p) { return Object.values(p.stock || {}).reduce((a, b) => a + Number(b || 0), 0) }
function findCustomers(q, branch) {
  q = q.toLowerCase().trim();
  if (!q) return [];
  return customers().filter(c =>
    (c.branch === branch || session()?.role === 'Owner' || isDemo()) &&
    [c.name, c.phone, c.place, ...(c.alias || [])].join(' ').toLowerCase().includes(q)
  ).slice(0, 8);
}

// ── WORK ORDER ────────────────────────────────────────────

function wo(branch) {
  if (isDemo()) return 'DEMO-' + String(Date.now()).slice(-4);
  let y = new Date().getFullYear().toString().slice(-2);
  let m = String(new Date().getMonth() + 1).padStart(2, '0');
  let key = 'wo_' + branch + '_' + y + m;
  let n = Number(localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, n);
  return `${branch}/${y}${m}/${String(n).padStart(3, '0')}`;
}

// ── API CALLS via Cloudflare Worker ──────────────────────

// Send SMS via Worker (API key stays on server)
async function sendSMS(type, data) {
  if (isDemo()) { toast('Demo: SMS would be sent to ' + data.phone); return; }
  try {
    const res = await fetch(`${API}/sms/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.ok) toast('SMS sent');
    else toast('SMS failed');
    return result;
  } catch (e) {
    toast('SMS error — check connection');
  }
}

// Sync jobs to Dropbox via Worker
async function syncJobs(jobsArr) {
  if (isDemo()) return;
  let s = session();
  if (!s || !s.branch) return;
  // Send only the last changed job — Worker does UPSERT by workOrder
  const job = jobsArr[jobsArr.length - 1];
  if (!job) return;
  try {
    const res = await fetch(`${API}/dropbox/save-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: s.branch, job })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      // Queue for retry
      const q = jget('tagro_pending_sync', []);
      q.push({ job, branch: s.branch, failedAt: new Date().toISOString(), reason: data.error || 'sync failed' });
      jset('tagro_pending_sync', q);
    }
  } catch(e) {
    const q = jget('tagro_pending_sync', []);
    q.push({ job, branch: s.branch, failedAt: new Date().toISOString(), reason: e.message });
    jset('tagro_pending_sync', q);
  }
}

// Pull jobs from Dropbox and merge with local on page load
async function pullJobsFromDropbox() {
  if (isDemo()) return;
  let s = session();
  if (!s || !s.branch) return;
  try {
    const res = await fetch(`${API}/dropbox/jobs?branch=${encodeURIComponent(s.branch)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.jobs) || !data.jobs.length) return;
    // Merge: timestamp wins — most recent version of each job kept
    const local = jget('tagro_jobs', []);
    const map = {};
    [...data.jobs, ...local].forEach(j => {
      const wo = j.workOrder || j.id || '';
      if (!wo) return;
      const existing = map[wo];
      if (!existing) { map[wo] = j; return; }
      const ta = Date.parse(existing.updatedAt || existing.savedAt || 0) || 0;
      const tb = Date.parse(j.updatedAt || j.savedAt || 0) || 0;
      map[wo] = tb > ta ? j : existing;
    });
    const merged = Object.values(map);
    jset('tagro_jobs', merged);
    // Also flush pending queue
    flushPendingSync().catch(() => {});
  } catch {}
}

// Retry any jobs that failed to sync
async function flushPendingSync() {
  if (isDemo()) return;
  let s = session();
  if (!s || !s.branch) return;
  const q = jget('tagro_pending_sync', []);
  if (!q.length) return;
  const remaining = [];
  for (const item of q) {
    try {
      const res = await fetch(`${API}/dropbox/save-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: item.branch || s.branch, job: item.job })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) remaining.push(item);
    } catch { remaining.push(item); }
  }
  jset('tagro_pending_sync', remaining);
}

// AI fault diagnosis via Worker
async function diagnose(model, complaint, observations) {
  try {
    const res = await fetch(`${API}/ai/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, complaint, observations })
    });
    const result = await res.json();
    return result.ok ? result.data : null;
  } catch { return null; }
}

// Scan paper form via Worker
async function scanForm(imageBase64, mediaType) {
  try {
    const res = await fetch(`${API}/ai/scan-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType: mediaType || 'image/jpeg' })
    });
    const result = await res.json();
    return result.ok ? result.data : null;
  } catch { return null; }
}

// ── CACHE-FIRST KV CONFIG LOADER ──────────────────────────
// Loads staff, models, parts from Worker KV
// Cache-first: uses localStorage until server version changes
// Called silently on every page load after login

const CACHE_KEYS = {
  staff:          'tagro_kv_staff',
  models:         'tagro_kv_models',
  parts:          'tagro_parts_data',
  personalModels: 'tagro_personal_models',
  versions:       'tagro_cache_versions'
};

function getCachedVersions() {
  return jget(CACHE_KEYS.versions, { staff: null, models: null, parts: null });
}

function setCachedVersions(v) {
  jset(CACHE_KEYS.versions, v);
}

async function loadKVConfig() {
  try {
    const s        = session();
    const branch   = s?.branch || jget('tagro_device_branch', null);
    const name     = s?.name || null;
    const cached   = getCachedVersions();

    // Build query — tell server what versions we have
    const params = new URLSearchParams();
    if (branch && branch !== 'ALL') params.set('branch', branch);
    if (name) params.set('name', name);
    if (cached.staff)  params.set('v_staff',  cached.staff);
    if (cached.models) params.set('v_models', cached.models);
    if (cached.parts)  params.set('v_parts',  cached.parts);

    const resp = await fetch(`${API}/config/all?${params}`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data.ok) return;

    const newVersions = { ...cached };

    // Update staff if server sent new version
    if (data.staff?.length) {
      jset(CACHE_KEYS.staff, data.staff);
      newVersions.staff = data.versions?.staff || cached.staff;
    }

    // Update models if server sent new version
    if (data.models?.length) {
      jset(CACHE_KEYS.models, data.models);
      newVersions.models = data.versions?.models || cached.models;
    }

    // Update parts if server sent new version (large payload)
    if (data.parts?.length) {
      jset(CACHE_KEYS.parts, data.parts);
      newVersions.parts = data.versions?.parts || cached.parts;
    }

    // Update personal model banner
    if (data.personalModels !== undefined) {
      jset(CACHE_KEYS.personalModels + '_' + (name || ''), data.personalModels);
    }

    setCachedVersions(newVersions);

  } catch(e) {
    // Silent fail — cached data still works
  }
}

// Accessors — always use cache, load is background
function kvStaff()  { return jget(CACHE_KEYS.staff, null); }
function kvModels() { return jget(CACHE_KEYS.models, null); }
function kvParts()  { return jget(CACHE_KEYS.parts, null); }

function getBranchStaff(branch) {
  const kv = kvStaff();
  if (kv) return kv.filter(s => s.branch === branch && s.active !== false);
  const p = TAGRO.people[branch] || { manager:'Manager', staff:[] };
  return [
    { name: p.manager, branch, role:'Manager', phone:'' },
    ...p.staff.map(n => ({ name: n, branch, role:'Staff', phone:'' }))
  ].filter(s => s.name && s.name !== 'Manager');
}

function getStaffPhoneKV(name, branch) {
  const kv = kvStaff();
  if (kv) {
    const found = kv.find(s => s.name === name && (!branch || s.branch === branch));
    if (found?.phone) return found.phone;
  }
  return jget('tagro_staff_phones', {})[name] || '';
}

function getBranchModels(branch) {
  const kv = kvModels();
  if (kv) return kv.filter(m => !branch || m.branches.includes(branch));
  return [];
}
// ── DEVICE ID ─────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem('tagro_device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('tagro_device_id', id);
  }
  return id;
}




function toast(m) {
  let t = document.querySelector('.toast') || document.body.appendChild(
    Object.assign(document.createElement('div'), { className: 'toast' })
  );
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function today() { return new Date().toISOString().slice(0, 10) }

function initShell(active) {
  seed();
  let s = session();
  let top = document.createElement('div');
  top.className = 'top';
  top.innerHTML = `
    <img src="data:image/png;base64,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" style="height:28px;width:auto;display:block" alt="TAGRO">
    <span class="tag">${s?.demo ? 'DEMO' : s?.role === 'Owner' ? 'ALL' : esc(s?.branch) || '—'}</span>
    <span class="user" onclick="logout()">${esc(s?.name) || ''} ×</span>`;
  document.body.prepend(top);

  if (s?.demo) document.body.insertAdjacentHTML('afterbegin',
    '<div class="demo">DEMO MODE — practice data only. Nothing here is a real job.</div>');

  let nav = document.createElement('div');
  nav.className = 'nav';
  let tabs = [
    ['home.html','Home','home'],
    ['receive.html','Receive','quick'],
    ['bench.html','Bench','bench'],
    ['tracker.html','Jobs','jobs'],
    ['tech.html','Tech','tech'],
    ['purchase.html','PO','po'],
    ['links.html','Links','links']
  ];
  // Owner gets Staff Admin
  if (s?.role === 'Owner') tabs.push(['staff-admin.html','Staff','admin']);

  nav.innerHTML = tabs.map(t =>
    `<a href="${t[0]}" class="${active === t[2] ? 'on' : ''}">${t[1]}</a>`
  ).join('');
  document.body.insertBefore(nav, document.body.children[s?.demo ? 2 : 1]);

  // Load KV config and pull Dropbox jobs silently in background
  loadKVConfig().catch(() => {});
  setTimeout(() => { pullJobsFromDropbox().catch(() => {}); }, 1000);
}

seed();
