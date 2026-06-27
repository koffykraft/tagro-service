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

// ── DROPBOX JOB SYNC via Worker ─────────────────────────
// Central rule:
//   Device writes local copy immediately.
//   Worker writes/updates Dropbox JSON.
//   On load, device pulls branch jobs back and merges.

function localJobsKey() { return isDemo() ? 'tagro_demo_jobs' : 'tagro_jobs'; }
function pendingSyncKey() { return 'tagro_pending_job_sync'; }

function jobWorkOrder(job) {
  return job?.workOrder || job?.workOrderNo || job?.id || job?.jobId || '';
}

function jobBranch(job) {
  const wo = jobWorkOrder(job);
  return job?.branch || session()?.branch || (wo && wo.includes('/') ? wo.split('/')[0] : null);
}

function stableJobString(job) {
  try {
    const copy = { ...(job || {}) };
    delete copy.syncedAt;
    delete copy.syncError;
    return JSON.stringify(copy, Object.keys(copy).sort());
  } catch {
    return JSON.stringify(job || {});
  }
}

function mergeJobArrays(localArr, remoteArr) {
  const map = new Map();
  for (const job of [...(localArr || []), ...(remoteArr || [])]) {
    const wo = jobWorkOrder(job) || ('no_wo_' + Math.random().toString(36).slice(2));
    const existing = map.get(wo);
    if (!existing) {
      map.set(wo, job);
      continue;
    }
    const a = Date.parse(existing.updatedAt || existing.savedAt || existing.createdAt || existing.date || 0) || 0;
    const b = Date.parse(job.updatedAt || job.savedAt || job.createdAt || job.date || 0) || 0;
    map.set(wo, b >= a ? { ...existing, ...job } : { ...job, ...existing });
  }
  return Array.from(map.values());
}

function queuePendingJob(job, reason) {
  if (!job || isDemo()) return;
  const q = jget(pendingSyncKey(), []);
  const wo = jobWorkOrder(job);
  const next = q.filter(x => jobWorkOrder(x.job) !== wo);
  next.push({ job, branch: jobBranch(job), reason: reason || 'sync failed', queuedAt: new Date().toISOString() });
  jset(pendingSyncKey(), next);
}

async function saveJobToCloud(job) {
  if (isDemo()) return { ok: true, demo: true };
  const branch = jobBranch(job);
  const workOrder = jobWorkOrder(job);
  if (!branch || !workOrder) throw new Error('Missing branch or work order');
  const res = await fetch(`${API}/dropbox/save-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch, job: { ...job, branch, workOrder } })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Cloud sync failed');
  return data;
}

async function syncChangedJobs(before, after) {
  if (isDemo()) return;
  const beforeMap = new Map((before || []).map(j => [jobWorkOrder(j), stableJobString(j)]));
  const changed = [];
  for (const job of after || []) {
    const wo = jobWorkOrder(job);
    if (!wo) continue;
    if (beforeMap.get(wo) !== stableJobString(job)) changed.push(job);
  }
  for (const job of changed) {
    try { await saveJobToCloud(job); }
    catch (e) { queuePendingJob(job, e.message); }
  }
}

async function flushPendingSync() {
  if (isDemo()) return { ok: true, sent: 0, remaining: 0 };
  const q = jget(pendingSyncKey(), []);
  const remaining = [];
  let sent = 0;
  for (const item of q) {
    try { await saveJobToCloud(item.job); sent++; }
    catch (e) { remaining.push({ ...item, reason: e.message, lastTriedAt: new Date().toISOString() }); }
  }
  jset(pendingSyncKey(), remaining);
  return { ok: remaining.length === 0, sent, remaining: remaining.length };
}

async function loadJobsFromCloud(branch) {
  if (isDemo()) return [];
  const s = session();
  const b = branch || s?.branch;
  if (!b || b === 'ALL') return [];
  const res = await fetch(`${API}/dropbox/jobs?branch=${encodeURIComponent(b)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Could not load cloud jobs');
  const local = jget(localJobsKey(), []);
  const merged = mergeJobArrays(local, data.jobs || []);
  jset(localJobsKey(), merged);
  window.dispatchEvent(new CustomEvent('tagro-jobs-updated', { detail: { branch: b, count: merged.length } }));
  return merged;
}

async function syncNow() {
  if (isDemo()) { toast('Demo mode — no cloud sync'); return; }
  try {
    const sent = await flushPendingSync();
    await loadJobsFromCloud();
    const pending = jget(pendingSyncKey(), []).length;
    toast(pending ? `Sync partial — ${pending} pending` : 'Sync complete');
    return sent;
  } catch (e) {
    toast('Sync failed — saved offline');
    return { ok: false, error: e.message };
  }
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
    <div class="logo">TAGRO</div>
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
  setTimeout(() => { syncNow().catch(() => {}); }, 800);
}

seed();
