// TAGRO Service — Auth System
// Branch managers and owner config (baked in, not editable by staff)

const BRANCH_MANAGERS = {
  KVR: { name: 'Vishnu',      phone: '9656324446' },
  PKM: { name: 'Anoop K P',   phone: '9349401991' },
  NDD: { name: 'Yedhu',       phone: '9387689763' },
  MDM: { name: 'Ratheesh',    phone: '9487878508' },
  SKT: { name: 'Karthick',    phone: '8190015130' },
  OYR: { name: 'Manager',     phone: '8921773286' },
  SDM: { name: 'Manager',     phone: '8921773285' },
};

const OWNER = { name: 'T M Thomas', phone: '9656361846' };

const BRANCH_STAFF = {
  KVR: [
    { name: 'Rajeev',    phone: '9656024446' },
    { name: 'Anandu',    phone: '7034163696' },
    { name: 'Thankachan',phone: '9207468233' },
  ],
  PKM: [
    { name: 'Anoop P G', phone: '9656921115' },
  ],
  MDM: [
    { name: 'John Victor',phone: '8144114514' },
  ],
  SKT: [
    { name: 'Mahalakshmi',phone: '9047208375' },
    { name: 'Jothi',      phone: '9786547517' },
  ],
  NDD: [],
  OYR: [],
  SDM: [],
};

function getConfig() {
  try { return JSON.parse(localStorage.getItem('tagro_config') || '{}'); } catch { return {}; }
}

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('tagro_session') || 'null'); } catch { return null; }
}

function setSession(data) {
  sessionStorage.setItem('tagro_session', JSON.stringify(data));
}

function clearSession() {
  sessionStorage.removeItem('tagro_session');
}

function hashPIN(pin) {
  // Simple hash — not cryptographic but sufficient for this use case
  let hash = 0;
  const str = pin + 'tagro_salt_2024';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem('tagro_users') || '{}'); } catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem('tagro_users', JSON.stringify(users));
}

function getUserKey(branch, name) {
  return `${branch}_${name.replace(/\s+/g, '_')}`;
}
}

// Check if user is logged in, redirect to login if not
function requireAuth(page) {
  const session = getSession();
  const cfg = getConfig();
  if (!cfg.branch) {
    window.location.href = 'config.html';
    return null;
  }
  if (!session || session.branch !== cfg.branch) {
    window.location.href = `login.html?redirect=${page}`;
    return null;
  }
  return session;
}
