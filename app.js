// TAGRO Service — app.js
// Data, auth, API calls, shell navigation, and Reference Centre Cloudflare link

const API = 'https://tagro-api.icy-fire-d2ac.workers.dev';

const TAGRO = {
  branches: {
    KVR: 'Karavaloor',
    PKM: 'Ponkunnam',
    NDD: 'Nedumangad',
    MDM: 'Marthandam',
    SKT: 'Shencottai',
    OYR: 'Oyoor',
    SDM: 'Sadanandapuram'
  },

  people: {
    KVR: { manager: 'Vishnu', staff: ['Rajeev', 'Anandu', 'Thankachan'] },
    PKM: { manager: 'Anoop K P', staff: ['Anoop P G'] },
    NDD: { manager: 'Yedhu', staff: [] },
    MDM: { manager: 'Ratheesh', staff: ['John Victor'] },
    SKT: { manager: 'Karthick', staff: ['Mahalakshmi', 'Jothi'] },
    OYR: { manager: 'Manager', staff: [] },
    SDM: { manager: 'Manager', staff: [] }
  },

  owner: { name: 'T M Thomas', role: 'Owner' },

  parts: [
    { no: '1123-640-2000', name: 'MS250 Clutch Drum', price: 480, stock: { KVR: 0, PKM: 1, MDM: 2, SKT: 0 } },
    { no: '0000-400-7000', name: 'Spark Plug', price: 180, stock: { KVR: 12, PKM: 5, MDM: 8, SKT: 6 } },
    { no: '4134-120-0600', name: 'FS120 Carburetor Kit', price: 950, stock: { KVR: 0, PKM: 0, MDM: 1, SKT: 0 } },
    { no: '3639-000-0068', name: '36RS Chain', price: 720, stock: { KVR: 3, PKM: 12, MDM: 6, SKT: 2 } },
    { no: '3005-000-4813', name: 'MS250 Guide Bar', price: 1450, stock: { KVR: 1, PKM: 0, MDM: 0, SKT: 1 } }
  ],

  customers: [
    {
      id: 'c1',
      branch: 'KVR',
      name: 'Thomas Thumpassery',
      alias: ['Thomas Estate'],
      phone: '9656361846',
      place: 'Karavaloor',
      machines: [
        { id: 'm1', model: 'MS 250', serial: '184-KVR-250', note: 'Frequent chain/clutch work' },
        { id: 'm2', model: 'FS 120', serial: '361-KVR-120', note: 'Estate brushcutter' }
      ]
    },
    {
      id: 'c2',
      branch: 'KVR',
      name: 'Jose Sawmill',
      alias: ['Sawmill Jose'],
      phone: '9447000001',
      place: 'Anchal',
      machines: [{ id: 'm3', model: 'MS 383', serial: '382-JOSE', note: 'Hard daily use' }]
    },
    {
      id: 'c3',
      branch: 'KVR',
      name: 'Rubber Biju',
      alias: ['Biju', 'Kuttappan'],
      phone: '9447000002',
      place: 'Oyoor',
      machines: [{ id: 'm4', model: 'SR 450', serial: 'SR-BIJU', note: 'Sprayer' }]
    },
    {
      id: 'c4',
      branch: 'MDM',
      name: 'Victor Farms',
      alias: ['Victor'],
      phone: '9447000003',
      place: 'Marthandam',
      machines: [{ id: 'm5', model: 'BR 600', serial: 'BR-VIC', note: '' }]
    }
  ],

  links: [
    { title: 'TAGRO', url: 'https://tagro.in' },
    { title: 'STIHL India', url: 'https://www.stihl.in' },
    { title: 'Jain Irrigation', url: 'https://www.jains.com' },
    { title: 'GST Portal', url: 'https://www.gst.gov.in' },
    { title: 'Kerala Agriculture', url: 'https://keralaagriculture.gov.in' }
  ],

  charges: [
    { name: 'Full Service', amount: 3000 },
    { name: 'Carburetor Service', amount: 300 },
    { name: 'Carburetor Repairs', amount: 500 },
    { name: 'Clutch Assembly Replacement', amount: 250 },
    { name: 'Piston Replaced', amount: 500 }
  ]
};

// local storage helpers
function jget(k, d) {
  try {
    return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
  } catch {
    return d;
  }
}

function jset(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}

// sanitizer
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// session
function session() {
  return jget('tagro_session', null);
}

function setSession(s) {
  jset('tagro_session', { ...s, loginAt: s.loginAt || new Date().toISOString() });
}

function logout() {
  localStorage.removeItem('tagro_session');
  location.href = 'login.html';
}

function isDemo() {
  const s = session();
  return s && s.demo;
}

function requireLogin() {
  const s = session();

  if (!s) {
    location.href = 'login.html';
    return null;
  }

  if (!s.demo && s.loginAt) {
    const age = Date.now() - new Date(s.loginAt).getTime();

    if (age > 12 * 60 * 60 * 1000) {
      localStorage.removeItem('tagro_session');
      location.href = 'login.html?expired=1';
      return null;
    }
  }

  return s;
}

// users/auth
function users() {
  return jget('tagro_users', {});
}

function saveUsers(u) {
  jset('tagro_users', u);
}

async function hashPin(pin) {
  const txt = new TextEncoder().encode(pin + '|tagro-service-v1');
  const buf = await crypto.subtle.digest('SHA-256', txt);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function userKey(branch, name) {
  return branch + '_' + name.replace(/\s+/g, '_');
}

function allPeople(branch) {
  const p = TAGRO.people[branch] || { manager: 'Manager', staff: [] };
  const arr = [{ name: p.manager, role: 'Manager' }, ...p.staff.map(n => ({ name: n, role: 'Staff' }))];
  arr.push({ name: 'Demo', role: 'Practice' });
  return arr;
}

// seed data
function seed() {
  if (!localStorage.getItem('tagro_customers')) jset('tagro_customers', TAGRO.customers);
  if (!localStorage.getItem('tagro_parts')) jset('tagro_parts', TAGRO.parts);
  if (!localStorage.getItem('tagro_links')) jset('tagro_links', TAGRO.links);
  if (!localStorage.getItem('tagro_comments')) jset('tagro_comments', []);
  if (!localStorage.getItem('tagro_jobs')) jset('tagro_jobs', []);
  if (!localStorage.getItem('tagro_po')) jset('tagro_po', []);
}

function customers() {
  return jget('tagro_customers', TAGRO.customers);
}

function jobs() {
  return jget(isDemo() ? 'tagro_demo_jobs' : 'tagro_jobs', []);
}

function saveJobs(a, touchedId) {
  jset(isDemo() ? 'tagro_demo_jobs' : 'tagro_jobs', a);
  return syncJobs(a, touchedId);
}

function po() {
  return jget(isDemo() ? 'tagro_demo_po' : 'tagro_po', []);
}

function savePo(a) {
  jset(isDemo() ? 'tagro_demo_po' : 'tagro_po', a);
}

function comments() {
  return jget('tagro_comments', []);
}

function saveComment(txt) {
  const s = session();
  const a = comments();

  a.unshift({
    by: s?.name || '',
    branch: s?.branch || 'ALL',
    text: txt,
    at: new Date().toISOString()
  });

  jset('tagro_comments', a);
}

function parts() {
  return jget('tagro_parts', TAGRO.parts);
}

function findParts(q) {
  q = String(q || '').toLowerCase().trim();
  return parts().filter(p => (p.name + ' ' + p.no).toLowerCase().includes(q)).slice(0, 8);
}

function totalStock(p) {
  return Object.values(p.stock || {}).reduce((a, b) => a + Number(b || 0), 0);
}

function findCustomers(q, branch) {
  q = String(q || '').toLowerCase().trim();
  if (!q) return [];

  return customers().filter(c =>
    (c.branch === branch || session()?.role === 'Owner' || isDemo()) &&
    [c.name, c.phone, c.place, ...(c.alias || [])].join(' ').toLowerCase().includes(q)
  ).slice(0, 8);
}

// work order
function wo(branch) {
  if (isDemo()) return 'DEMO-' + String(Date.now()).slice(-4);

  const y = new Date().getFullYear().toString().slice(-2);
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const key = 'wo_' + branch + '_' + y + m;
  const n = Number(localStorage.getItem(key) || 0) + 1;

  localStorage.setItem(key, n);

  return `${branch}/${y}${m}/${String(n).padStart(3, '0')}`;
}

// Cloudflare API calls
async function sendSMS(type, data) {
  if (isDemo()) {
    toast('Demo: SMS would be sent to ' + data.phone);
    return;
  }

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
  } catch {
    toast('SMS error — check connection');
  }
}

async function syncJobs(jobsArr, touchedId) {
  if (isDemo()) return;

  const s = session();
  if (!s || !s.branch) return;

  const job = touchedId
    ? jobsArr.find(j => j.id === touchedId || j.workOrder === touchedId)
    : jobsArr[jobsArr.length - 1];

  if (!job) return;

  try {
    const res = await fetch(`${API}/dropbox/save-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: job.branch || s.branch, job })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      const q = jget('tagro_pending_sync', []);
      q.push({
        job,
        branch: job.branch || s.branch,
        failedAt: new Date().toISOString(),
        reason: data.error || 'sync failed'
      });
      jset('tagro_pending_sync', q);
    }
  } catch (e) {
    const q = jget('tagro_pending_sync', []);
    q.push({
      job,
      branch: job.branch || s.branch,
      failedAt: new Date().toISOString(),
      reason: e.message
    });
    jset('tagro_pending_sync', q);
  }
}

async function pullJobsFromDropbox() {
  if (isDemo()) return;

  const s = session();
  if (!s || !s.branch) return;

  const branchCodes = (s.role === 'Owner' || s.branch === 'ALL')
    ? Object.keys(TAGRO.branches)
    : [s.branch];

  try {
    const responses = await Promise.all(branchCodes.map(async branch => {
      try {
        const res = await fetch(`${API}/dropbox/jobs?branch=${encodeURIComponent(branch)}`);
        if (!res.ok) return [];

        const data = await res.json();
        return data.ok && Array.isArray(data.jobs) ? data.jobs : [];
      } catch {
        return [];
      }
    }));

    const remote = responses.flat();

    if (!remote.length) {
      flushPendingSync().catch(() => {});
      return;
    }

    const local = jget('tagro_jobs', []);
    const map = {};

    [...remote, ...local].forEach(j => {
      const key = (j.branch || '') + '|' + (j.workOrder || j.id || '');

      if (!key.endsWith('|')) {
        const existing = map[key];

        if (!existing) {
          map[key] = j;
          return;
        }

        const ta = Date.parse(existing.updatedAt || existing.savedAt || 0) || 0;
        const tb = Date.parse(j.updatedAt || j.savedAt || 0) || 0;

        map[key] = tb > ta ? j : existing;
      }
    });

    jset('tagro_jobs', Object.values(map));
    flushPendingSync().catch(() => {});
  } catch {}
}

async function flushPendingSync() {
  if (isDemo()) return;

  const s = session();
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
    } catch {
      remaining.push(item);
    }
  }

  jset('tagro_pending_sync', remaining);
}

async function diagnose(model, complaint, observations) {
  try {
    const res = await fetch(`${API}/ai/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, complaint, observations })
    });

    const result = await res.json();
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

async function scanForm(imageBase64, mediaType) {
  try {
    const res = await fetch(`${API}/ai/scan-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType: mediaType || 'image/jpeg' })
    });

    const result = await res.json();
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

// Reference Centre Cloudflare database
async function loadReferenceCentre() {
  const box = document.getElementById('reference-results');
  if (!box) return;

  box.innerHTML = '<p>Loading TAGRO Reference Centre from Cloudflare...</p>';

  try {
    const res = await fetch(`${API}/reference/all`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      box.innerHTML = '<p>Reference database not available.</p>';
      return;
    }

    const manuals = data.manuals || [];
    const partsLists = data.partsLists || data.parts_lists || [];
    const images = data.images || [];
    const documents = data.documents || [];

    box.innerHTML = `
      <h3>Manuals</h3>
      ${manuals.map(m => referenceCard(m, 'Open manual')).join('') || '<p>No manuals found.</p>'}

      <h3>Illustrated Parts Lists</h3>
      ${partsLists.map(p => referenceCard(p, 'Open parts list')).join('') || '<p>No parts lists found.</p>'}

      <h3>Images</h3>
      ${images.map(i => referenceCard(i, 'Open image')).join('') || '<p>No images found.</p>'}

      <h3>Documents</h3>
      ${documents.map(d => referenceCard(d, 'Open document')).join('') || '<p>No documents found.</p>'}
    `;
  } catch {
    box.innerHTML = '<p>Could not connect to Cloudflare Reference database.</p>';
  }
}

function referenceCard(item, label) {
  const title = item.model || item.title || item.name || item.filename || 'Reference item';
  const type = item.type || item.category || item.source || '';
  const url = item.url || item.publicUrl || item.downloadUrl || item.path || '#';

  return `
    <div class="card">
      <strong>${esc(title)}</strong><br>
      ${type ? `<small>${esc(type)}</small><br>` : ''}
      ${url && url !== '#'
        ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`
        : '<small>No link available</small>'}
    </div>
  `;
}

async function searchReferenceCentre(query) {
  query = String(query || '').trim();
  const box = document.getElementById('reference-results');
  if (!box || !query) return;

  box.innerHTML = '<p>Searching TAGRO Reference Centre...</p>';

  try {
    const res = await fetch(`${API}/reference/search?q=${encodeURIComponent(query)}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      box.innerHTML = '<p>No matching reference items found.</p>';
      return;
    }

    const results = data.results || data.items || [];

    box.innerHTML = `
      <h3>Search Results</h3>
      ${results.map(r => referenceCard(r, 'Open')).join('') || '<p>No matching reference items found.</p>'}
    `;
  } catch {
    box.innerHTML = '<p>Could not search Cloudflare Reference database.</p>';
  }
}

// cache-first KV config loader
const CACHE_KEYS = {
  staff: 'tagro_kv_staff',
  models: 'tagro_kv_models',
  parts: 'tagro_parts_data',
  personalModels: 'tagro_personal_models',
  versions: 'tagro_cache_versions'
};

function getCachedVersions() {
  return jget(CACHE_KEYS.versions, { staff: null, models: null, parts: null });
}

function setCachedVersions(v) {
  jset(CACHE_KEYS.versions, v);
}

async function loadKVConfig() {
  try {
    const s = session();
    const branch = s?.branch || jget('tagro_device_branch', null);
    const name = s?.name || null;
    const cached = getCachedVersions();

    const params = new URLSearchParams();

    if (branch && branch !== 'ALL') params.set('branch', branch);
    if (name) params.set('name', name);
    if (cached.staff) params.set('v_staff', cached.staff);
    if (cached.models) params.set('v_models', cached.models);
    if (cached.parts) params.set('v_parts', cached.parts);

    const resp = await fetch(`${API}/config/all?${params}`);
    if (!resp.ok) return;

    const data = await resp.json();
    if (!data.ok) return;

    const newVersions = { ...cached };

    if (data.staff?.length) {
      jset(CACHE_KEYS.staff, data.staff);
      newVersions.staff = data.versions?.staff || cached.staff;
    }

    if (data.models?.length) {
      jset(CACHE_KEYS.models, data.models);
      newVersions.models = data.versions?.models || cached.models;
    }

    if (data.parts?.length) {
      jset(CACHE_KEYS.parts, data.parts);
      newVersions.parts = data.versions?.parts || cached.parts;
    }

    if (data.personalModels !== undefined) {
      jset(CACHE_KEYS.personalModels + '_' + (name || ''), data.personalModels);
    }

    setCachedVersions(newVersions);
  } catch {}
}

function kvStaff() {
  return jget(CACHE_KEYS.staff, null);
}

function kvModels() {
  return jget(CACHE_KEYS.models, null);
}

function kvParts() {
  return jget(CACHE_KEYS.parts, null);
}

function getBranchStaff(branch) {
  const kv = kvStaff();

  if (kv) return kv.filter(s => s.branch === branch && s.active !== false);

  const p = TAGRO.people[branch] || { manager: 'Manager', staff: [] };

  return [
    { name: p.manager, branch, role: 'Manager', phone: '' },
    ...p.staff.map(n => ({ name: n, branch, role: 'Staff', phone: '' }))
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

function getDeviceId() {
  let id = localStorage.getItem('tagro_device_id');

  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('tagro_device_id', id);
  }

  return id;
}

function toast(m) {
  const t = document.querySelector('.toast') || document.body.appendChild(
    Object.assign(document.createElement('div'), { className: 'toast' })
  );

  t.textContent = m;
  t.classList.add('show');

  setTimeout(() => t.classList.remove('show'), 2200);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// voice helper
let voiceRecognition = null;

function initializeUniversalVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  const styles = `
    .voice-fab {
      position: fixed;
      bottom: 85px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #df6427;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 9999;
      border: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .voice-fab:active { transform: scale(0.9); }

    .voice-fab.listening {
      background: #287a3e;
      animation: pulseVoice 1.4s infinite;
    }

    .voice-panel {
      position: fixed;
      bottom: 155px;
      right: 20px;
      width: 320px;
      background: #fff;
      border-radius: 16px;
      border: 1.5px solid #eee;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      z-index: 9998;
      overflow: hidden;
      font-family: -apple-system, sans-serif;
    }

    .voice-panel-header {
      background: #fdf6f2;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .voice-panel-body {
      padding: 16px;
      max-height: 200px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.5;
      color: #333;
    }

    .voice-waves {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
      height: 24px;
    }

    .voice-waves span {
      width: 4px;
      height: 10px;
      background: #df6427;
      border-radius: 2px;
      animation: wave 0.8s infinite ease-in-out;
    }

    .voice-waves span:nth-child(2) { animation-delay: 0.2s; }
    .voice-waves span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes wave {
      0%, 100% { height: 8px; }
      50% { height: 24px; }
    }

    @keyframes pulseVoice {
      0% { box-shadow: 0 0 0 0 rgba(40,122,62, 0.7); }
      70% { box-shadow: 0 0 0 15px rgba(40,122,62, 0); }
      100% { box-shadow: 0 0 0 0 rgba(40,122,62, 0); }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);

  const container = document.createElement('div');

  container.innerHTML = `
    <button class="voice-fab" id="v-fab" title="Hands-free Assistant">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
    </button>

    <div class="voice-panel" id="v-panel">
      <div class="voice-panel-header">
        <strong style="color:#df6427; font-size:14px;">TAGRO Technical Reference Centre</strong>
        <button id="v-panel-close" style="background:none; border:none; font-size:16px; cursor:pointer; color:#999;">×</button>
      </div>

      <div class="voice-panel-body" id="v-status">
        Tap the Mic to search the Reference Centre, parts catalogue, STIHL manuals, illustrated parts lists, repair procedures, or create estimates hands-free.
      </div>

      <div class="voice-waves" id="v-waves" style="display:none; padding-bottom:12px;">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const fab = document.getElementById('v-fab');
  const panel = document.getElementById('v-panel');
  const status = document.getElementById('v-status');
  const waves = document.getElementById('v-waves');
  const close = document.getElementById('v-panel-close');

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;
  voiceRecognition.lang = 'en-IN';

  voiceRecognition.onstart = () => {
    fab.classList.add('listening');
    panel.style.display = 'flex';

    status.innerHTML = `
      <span style="color:#287a3e; font-weight:700;">Listening for your query...</span><br>
      <em style="color:#999; font-size:11px;">
        e.g., "Show MS462 service manual", "Find piston 1123-030-2016", "Open FS120 IPL", "Troubleshoot chain brake", or "Add this part to my purchase list"
      </em>
    `;

    waves.style.display = 'flex';

    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  voiceRecognition.onerror = e => {
    fab.classList.remove('listening');
    waves.style.display = 'none';
    status.textContent = `Speech error: ${e.error || 'Blocked by browser security. Ensure page is HTTPS.'}`;
  };

  voiceRecognition.onend = () => {
    fab.classList.remove('listening');
    waves.style.display = 'none';
  };

  voiceRecognition.onresult = async event => {
    const speechToText = event.results[0][0].transcript;

    status.innerHTML = `
      <strong>You:</strong> "${esc(speechToText)}"<br><br>
      <span style="color:#df6427;">
        Searching TAGRO Reference Centre...<br>
        Checking STIHL manuals...<br>
        Searching Illustrated Parts Lists...<br>
        Searching TAGRO parts database...
      </span>
    `;

    try {
      const activeModel = localStorage.getItem('tagro_active_voice_model') || 'MS 462';

      const response = await fetch(`${API}/ai/tech-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          mode: 'reference',
          source: 'reference.html',
          question: speechToText
        })
      });

      const data = await response.json();

      if (data.ok) {
        status.innerHTML = `<strong>Answer:</strong><br>${esc(data.answer).replace(/\n/g, '<br>')}`;
        speakAloud(data.answer);
      } else {
        status.textContent = 'Could not find technical guidance for that query.';
      }
    } catch {
      status.textContent = 'Connection issue. Failed to connect to server database.';
    }
  };

  fab.onclick = () => {
    if (fab.classList.contains('listening')) {
      voiceRecognition.stop();
    } else {
      try {
        voiceRecognition.start();
      } catch {
        toast('Microphone blocked. Ensure site is HTTPS and has mic permissions enabled.');
      }
    }
  };

  close.onclick = () => {
    panel.style.display = 'none';
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };
}

function speakAloud(text) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const cleanText = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/PROBLEM:/gi, 'Problem statement:')
    .replace(/CAUSE:/gi, 'Likely cause:')
    .replace(/CHECK:/gi, 'Check procedure:')
    .replace(/FIX:/gi, 'Repair action:');

  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.lang = 'en-IN';

  window.speechSynthesis.speak(utterance);
}

// shell
function initShell(active) {
  seed();

  const s = session();

  const top = document.createElement('header');

  top.innerHTML = `
    <a class="logo-link" href="home.html" style="font-weight:900;font-style:italic;font-size:18px;letter-spacing:-1px;color:var(--dark);text-decoration:none;display:flex;align-items:center">
      <span style="color:var(--orange);font-style:normal;margin-right:2px">▰</span>TAGRO
    </a>

    <span class="branch">${s?.demo ? 'DEMO' : s?.role === 'Owner' ? 'ALL' : esc(s?.branch) || '—'}</span>
    <span class="user" onclick="openUserMenu()">${esc(s?.name) || ''}</span>
  `;

  document.body.prepend(top);

  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.className = 'modal';

  menu.innerHTML = `
    <div class="sheet">
      <h2 style="margin-top:0">${esc(s?.name) || ''}</h2>
      <p class="sub">${s?.demo ? 'DEMO' : s?.role === 'Owner' ? 'All Branches' : esc(s?.branch) || ''}</p>

      <a class="btn block" href="home.html" style="margin-top:14px">Home</a>

      ${s?.role === 'Owner' || s?.role === 'Manager'
        ? '<a class="btn block" href="config.html" style="margin-top:10px">Device Setup & Settings</a>'
        : ''}

      <button class="btn block" style="margin-top:10px" onclick="closeUserMenu()">Cancel</button>
      <button class="btn red block" style="margin-top:10px" onclick="confirmLogout()">Logout</button>
    </div>
  `;

  document.body.appendChild(menu);

  if (s?.demo) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div class="demo">DEMO MODE — practice data only. Nothing here is a real job.</div>'
    );
  }

  const nav = document.createElement('div');
  nav.className = 'nav';

  const tabs = [
    ['home.html', 'Home', 'home'],
    ['receive.html', 'Receive', 'quick'],
    ['tracker.html', 'Jobs', 'jobs'],
    ['tech.html', 'Tech', 'tech'],
    ['reference.html', 'Reference', 'reference'],
    ['purchase.html', 'PO', 'po'],
    ['links.html', 'Links', 'links']
  ];

  if (s?.role === 'Owner' || s?.role === 'Manager') {
    tabs.push(['config.html', 'Setup', 'setup']);
  }

  if (s?.role === 'Owner') {
    tabs.push(['staff-admin.html', 'Staff', 'admin']);
  }

  nav.innerHTML = tabs.map(t =>
    `<a href="${t[0]}" class="${active === t[2] ? 'on' : ''}">${t[1]}</a>`
  ).join('');

  document.body.insertBefore(nav, document.body.children[s?.demo ? 2 : 1]);

  loadKVConfig().catch(() => {});

  setTimeout(() => {
    pullJobsFromDropbox().catch(() => {});
  }, 1000);

  if (active === 'reference') {
    loadReferenceCentre().catch(() => {});
  }

  initializeUniversalVoice();
}

function openUserMenu() {
  document.getElementById('user-menu').classList.add('open');
}

function closeUserMenu() {
  document.getElementById('user-menu').classList.remove('open');
}

function confirmLogout() {
  if (confirm('Log out of TAGRO?')) logout();
}

seed();

// tab switcher
function showTab(tabName, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(tabName);
  if (target) target.style.display = 'block';

  if (btn) btn.classList.add('active');
}
