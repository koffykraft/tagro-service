```javascript
const API = 'https://tagro-api.icy-fire-d2ac.workers.dev';

const TAGRO = {
    branches: {
        KVR: 'Karavaloor', PKM: 'Ponkunnam', NDD: 'Nedumangad',
        MDM: 'Marthandam', SKT: 'Shencottai', OYR: 'Oyoor', SDM: 'Sadanandapuram'
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
        { no: '0000-400-7000', name: 'Spark Plug', price: 150, stock: { KVR: 5, PKM: 2 } }
    ]
};

const tabs = [
    ['home.html', 'Home', 'home'],
    ['receive.html', 'Receive', 'quick'],
    ['tracker.html', 'Jobs', 'jobs'],
    ['tech.html', 'Tech', 'tech'],
    ['reference.html', 'Reference', 'reference'],
    ['purchase.html', 'PO', 'po'],
    ['links.html', 'Links', 'links']
];

const s = JSON.parse(sessionStorage.getItem('session') || '{}');
if (s?.role === 'Owner' || s?.role === 'Manager') tabs.push(['config.html', 'Setup', 'setup']);
if (s?.role === 'Owner') tabs.push(['staff-admin.html', 'Staff', 'admin']);

const nav = document.createElement('div');
nav.className = 'nav';
nav.innerHTML = tabs.map(t => 
    `<a href="${t[0]}" class="${window.location.pathname.includes(t[0]) ? 'active' : ''}">${t[1]}</a>`
).join('');

document.body.insertBefore(nav, document.body.children[s?.demo ? 2 : 1]);

async function loadKVConfig() { return true; }
async function pullJobsFromDropbox() { return true; }
function kvParts() { return TAGRO.parts; }
function esc(str) { return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function seed() { console.log("TAGRO Initialized"); }

seed();
loadKVConfig();

```
