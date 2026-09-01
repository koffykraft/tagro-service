(function () {
  const statusFlow = ['Received', 'Inspection', 'Estimate Ready', 'Approved', 'Working', 'Waiting Parts', 'Ready', 'Delivered'];
  const complaints = ['Not starting', 'Starts then stops', 'Low power', 'Chain not moving', 'Chain oil not coming', 'Heavy vibration', 'Fuel leaking', 'Smoke', 'Overheating', 'Customer wants service'];
  const observations = ['Spark plug checked', 'Air filter dirty', 'Fuel line cracked', 'Carburetor needs cleaning', 'Clutch worn', 'Sprocket worn', 'Piston score suspected', 'Oil pump issue', 'Starter rope weak', 'Compression low'];
  const works = ['General service done', 'Carburetor cleaned', 'Spark plug replaced', 'Air filter cleaned', 'Chain sharpened', 'Fuel line replaced', 'Clutch checked', 'Oil pump cleaned', 'Test run completed', 'Customer called'];
  const labour = [
    ['Full Service', 300], ['Carburetor Service', 300], ['Carburetor Repairs', 500],
    ['Clutch Assembly Replacement', 250], ['Piston Replaced', 500], ['Chain Sharpening', 100]
  ];
  const routes = {
    home: ['Today Desk', 'home', home, 'Start here and finish work without hunting for pages.'],
    'service-desk': ['Accept Machine', 'receive', receive, 'Customer, machine, complaint, parts and bill-ready notes in one calm flow.'],
    receive: ['Accept Machine', 'receive', receive, 'Fast intake for the front counter.'],
    quick: ['Quick Entry', 'receive', receive, 'Same intake, opened for fast walk-in jobs.'],
    scan: ['Scan Form', 'receive', receive, 'Form scanning can attach here when the backend confirms it.'],
    tracker: ['Job Tracker', 'jobs', jobsPage, 'Every machine and where it stands.', 'all'],
    queue: ['Workshop Queue', 'jobs', jobsPage, 'Machines waiting or being worked on.', 'active'],
    ready: ['Ready Machines', 'jobs', jobsPage, 'Finished jobs that need pickup or billing.', 'ready'],
    hold: ['Waiting Parts', 'jobs', jobsPage, 'Jobs blocked by parts or outside action.', 'hold'],
    approval: ['Approval Desk', 'jobs', jobsPage, 'Estimates waiting for customer approval.', 'approval'],
    review: ['Review Desk', 'jobs', jobsPage, 'Jobs with missing fields or risk flags.', 'review'],
    exceptions: ['Exceptions', 'jobs', jobsPage, 'Places where the system needs human attention.', 'exceptions'],
    tech: ['Technician View', 'jobs', jobsPage, 'Technician queue without admin clutter.', 'active'],
    work: ['Work Card', 'jobs', workCard, 'One machine, one story, one next action.'],
    job: ['Work Card', 'jobs', workCard, 'Opened from an older job link.'],
    estimate: ['Estimate Builder', 'jobs', workCard, 'Estimate material for the selected work order.'],
    reference: ['Parts Search', 'parts', partsPage, 'Busy-style search with TAGRO aliases and STIHL numbers.'],
    'staff-parts': ['Staff Parts Search', 'parts', partsPage, 'Simple search for counter staff.'],
    parts: ['Parts Search', 'parts', partsPage, 'Find parts, prices, HSN and GST quickly.'],
    catalog: ['Catalog', 'parts', partsPage, 'Catalog data where available.'],
    catalogue: ['Catalog', 'parts', partsPage, 'Catalog data where available.'],
    interactive_catalog_viewer: ['Catalog Viewer', 'parts', partsPage, 'Search first, diagrams later when Data Import supplies them.'],
    bench: ['Bench Reference', 'parts', partsPage, 'Workshop reference and parts lookup.'],
    purchase: ['Purchase Requests', 'purchase', purchasePage, 'What parts must be bought or transferred.'],
    reports: ['Reports', 'reports', reportsPage, 'Simple operational view from current service records.'],
    daily: ['Daily View', 'reports', reportsPage, 'Today, pending, ready and billing material.'],
    config: ['Settings', 'more', settingsPage, 'Branch, staff, data health and device settings.'],
    setup: ['Setup', 'more', settingsPage, 'Safe setup view for this device.'],
    'staff-admin': ['Staff Admin', 'more', settingsPage, 'Staff login and branch access, kept simple.'],
    more: ['More', 'more', morePage, 'All pages, utilities and the mind map.'],
    links: ['Links', 'more', morePage, 'Useful outside links.'],
    handbook: ['Handbook', 'more', morePage, 'Operating notes and safe defaults.'],
    test: ['System Check', 'more', systemCheck, 'Link and data checks.']
  };

  window.TAGRO_OS = { boot };

  async function boot() {
    if (typeof seed === 'function') seed();
    const page = document.body.dataset.page || location.pathname.split('/').pop().replace('.html', '') || 'home';
    if (page !== 'login' && !safeSession()) { location.href = 'login.html'; return; }
    if (page === 'login') { login(); return; }
    loadKVConfig?.().catch(() => {});
    pullJobsFromDropbox?.().catch(() => {});
    shell(page);
  }

  function shell(page) {
    const r = routes[page] || routes.home;
    document.title = 'TAGRO Service | ' + r[0];
    const u = safeSession() || {};
    app().innerHTML = `
      <div class="os-shell">
        <div class="topbar"><div class="topbar-inner">
          <a class="brand" href="home.html"><div class="logo-mark">T</div><div><div class="brand-kicker">TAGRO service</div><div class="brand-title">${escx(r[0])}</div></div></a>
          <div class="top-actions"><span class="chip hide-mobile">${escx(u.branchName || u.branch || branch())}</span><span class="chip good">${escx(u.name || 'Staff')}</span><button class="btn small ghost" id="logoutBtn">Logout</button></div>
        </div></div>
        <main class="os-frame" id="view"></main>
        ${dock(r[1])}
      </div>`;
    document.getElementById('logoutBtn').onclick = () => logout?.();
    r[2](page, r);
  }

  function login() {
    document.title = 'TAGRO Service Login';
    const branches = Object.entries(TAGRO.branches || {});
    app().innerHTML = `<div class="login-page"><div class="login-card">
      <section class="login-art"><div><div class="brand-kicker" style="color:#fff7ef">TAGRO service</div><h1>Simple login for the workshop.</h1><p>Choose branch, choose name, enter PIN. Owner access remains separate.</p></div><div class="fine" style="color:#fff7ef">If a PIN is not set on this device, the screen lets you set it once.</div></section>
      <section class="login-box"><div class="decor-line"></div><p class="section-kicker">Staff login</p><div class="form-grid">
        <label class="field"><span>Branch</span><select id="loginBranch" class="input">${branches.map(([k, v]) => `<option value="${k}">${k} · ${escx(v)}</option>`).join('')}</select></label>
        <label class="field"><span>Staff</span><select id="loginStaff" class="input"></select></label>
        <label class="field full"><span>PIN</span><input id="loginPin" class="input" inputmode="numeric" type="password" placeholder="Enter PIN"></label>
      </div><div class="action-row"><button class="btn primary" id="staffLogin">Login</button><button class="btn soft" id="ownerLogin">Owner/Admin</button></div>
      <p class="fine">Use Owner/Admin only for owner functions. Staff screens remain cleaner.</p></section>
    </div></div>`;
    const br = document.getElementById('loginBranch'), staff = document.getElementById('loginStaff');
    br.value = get('tagro_device_branch', 'KVR');
    const fill = () => {
      set('tagro_device_branch', br.value);
      const people = getBranchStaff?.(br.value) || allPeople?.(br.value) || [];
      staff.innerHTML = people.map(p => `<option value="${escx(p.name)}" data-role="${escx(p.role || 'Staff')}">${escx(p.name)} · ${escx(p.role || 'Staff')}</option>`).join('') || '<option value="Staff" data-role="Staff">Staff</option>';
    };
    br.onchange = fill; fill();
    document.getElementById('staffLogin').onclick = async () => {
      const pin = document.getElementById('loginPin').value.trim();
      if (!pin) return ping('Enter PIN');
      const name = staff.value, role = staff.selectedOptions[0]?.dataset.role || 'Staff', key = 'pin_' + name.replace(/\s+/g, '_');
      const hash = await hashPin(pin), stored = get(key, null);
      if (!stored) { if (!confirm('Set this PIN for ' + name + ' on this device?')) return; set(key, hash); }
      else if (stored !== hash) return ping('Wrong PIN');
      setSession({ name, branch: br.value, branchName: TAGRO.branches[br.value] || br.value, role, loginAt: new Date().toISOString() });
      location.href = 'home.html';
    };
    document.getElementById('ownerLogin').onclick = async () => {
      const pin = prompt('Owner PIN:'); if (pin === null) return;
      const key = 'pin_owner_tmthomas', hash = await hashPin(pin), stored = get(key, null);
      if (!stored) { const confirmPin = prompt('Set owner PIN first time:'); if (confirmPin !== pin) return alert('PINs did not match'); set(key, hash); }
      else if (stored !== hash) return ping('Wrong owner PIN');
      setSession({ name: 'T M Thomas', phone: '9656361846', branch: 'ALL', branchName: 'All Branches', role: 'Owner', loginAt: new Date().toISOString() });
      location.href = 'home.html';
    };
  }

  function home(_, r) {
    const list = visibleJobs();
    view().innerHTML = hero('One clear place for service work.', r[3], '<a class="btn primary" href="service-desk.html">Accept machine</a><a class="btn" href="tracker.html">See jobs</a><a class="btn soft" href="reference.html">Search parts</a>') +
      `<section class="grid app-grid">${tile('Receive', 'Customer, machine, complaint and first estimate', 'service-desk.html', 'IN')}${tile('Workshop', 'Queue, status and work cards', 'tracker.html', 'WK')}${tile('Parts', 'TAGRO aliases, STIHL numbers, price and tax', 'reference.html', 'PT')}${tile('Purchase', 'Parts to buy or transfer', 'purchase.html', 'PO')}${tile('Reports', 'Ready, pending and bill-ready material', 'reports.html', 'RP')}${tile('Settings', 'Branch, staff, data health and all pages', 'more.html', 'ST')}</section>
      <section class="grid two" style="margin-top:16px"><div class="panel"><p class="section-kicker">Needs attention</p>${jobList(list.filter(needsAttention).slice(0, 6), 'No risky jobs right now.')}</div><div class="panel"><p class="section-kicker">Recently touched</p>${jobList(list.sort(byUpdated).slice(0, 6), 'No jobs yet. Accept the first machine.')}</div></section>`;
  }

  function receive(_, r) {
    view().innerHTML = hero('Accept the machine without paperwork stress.', r[3]) + `<section class="split"><aside class="panel side-list"><p class="section-kicker">Flow</p><div class="list">${['Customer', 'Machine', 'Complaint', 'Inspection', 'Parts', 'Save'].map((x, i) => `<div class="row"><div class="row-line"><b>${i + 1}. ${x}</b><span class="chip">${i < 3 ? 'Required' : 'Optional'}</span></div></div>`).join('')}</div></aside>
    <section class="panel"><form id="receiveForm" class="form-grid">
      ${field('phone', 'Phone', 'Customer phone', 'tel')}${field('customerName', 'Customer name', 'Name')}${field('place', 'Place', 'Place or route')}${field('machineModel', 'Machine model', 'MS 250, BG 86, HTP etc')}${field('serial', 'Serial number', 'Optional')}${field('accessories', 'Accessories received', 'Bar, chain, blade, belt')}
      ${tileTextArea('complaint', 'Common complaints', complaints, 'Tap tiles or type complaint')}${tileTextArea('observation', 'Inspection observations', observations, 'Can be filled later')}${tileTextArea('workDone', 'Work done or planned', works, 'Can be filled later')}
      <div class="field full"><label>Parts lookup</label><div class="row"><input id="partQ" class="input" placeholder="Search: clutch ms 460, 46 cl, part number"><div id="partResults" class="list" style="margin-top:10px"></div></div><div id="selectedLines" class="list" style="margin-top:10px"></div></div>
      <div class="field full"><label>Labour tiles</label><div class="quick-bank">${labour.map((x, i) => `<button type="button" class="quick-chip" data-labour="${i}">${escx(x[0])} · ${money(x[1])}</button>`).join('')}</div></div>
      ${field('advance', 'Advance paid', '0', 'decimal')}<label class="field"><span>Status</span><select class="input" name="status">${statusFlow.map(x => `<option>${x}</option>`).join('')}</select></label>
      <div class="field full"><div class="action-row"><button class="btn primary" type="submit">Save service record</button><button class="btn soft" type="button" id="saveEstimate">Save as estimate ready</button><a class="btn" href="tracker.html">Open jobs</a></div></div>
    </form></section></section>`;
    const state = { parts: [], labour: [] };
    bindTextChips(); bindParts(state); bindLabour(state); selectedLines(state);
    document.getElementById('saveEstimate').onclick = () => saveReceive(state, 'Estimate Ready');
    document.getElementById('receiveForm').onsubmit = e => { e.preventDefault(); saveReceive(state); };
  }

  function jobsPage(page, r) {
    const filtered = filterJobs(visibleJobs(), r[4] || 'all');
    view().innerHTML = hero(r[0], r[3], '<a class="btn primary" href="service-desk.html">Accept machine</a><a class="btn" href="reference.html">Search parts</a>') +
      `<section class="panel"><div class="status-rail">${['tracker', 'queue', 'approval', 'hold', 'ready', 'review', 'exceptions'].map(x => `<a class="status-pill ${page === x ? 'on' : ''}" href="${x}.html">${routes[x][0]}</a>`).join('')}</div><div class="list" style="margin-top:16px">${jobList(filtered, 'No jobs in this view.')}</div></section>`;
  }

  function workCard() {
    const id = new URLSearchParams(location.search).get('id');
    const job = allJobs().find(j => String(j.id) === String(id) || String(j.workOrder) === String(id)) || visibleJobs()[0];
    if (!job) { view().innerHTML = hero('No work card selected.', 'Accept a machine first, then the work card opens automatically.', '<a class="btn primary" href="service-desk.html">Accept machine</a>'); return; }
    const total = jobTotals(job);
    view().innerHTML = hero(job.workOrder || 'Work card', `${job.customerName || 'Customer'} · ${job.machineModel || 'Machine'}`, '<button class="btn primary" id="markReady">Mark ready</button><button class="btn soft" id="billReady">Prepare bill material</button><button class="btn" onclick="window.print()">Print</button>') +
      `<section class="grid two"><div class="panel"><p class="section-kicker">Customer and machine</p>${kv('Customer', job.customerName)}${kv('Phone', job.phone)}${kv('Place', job.place)}${kv('Machine', job.machineModel)}${kv('Serial', job.serial)}${kv('Accessories', job.accessories)}<div class="action-row"><a class="btn small" href="tel:${escx(job.phone || '')}">Call</a><a class="btn small" href="https://wa.me/91${String(job.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent('TAGRO update for ' + (job.workOrder || 'your machine') + ': ' + (job.status || 'Received'))}">WhatsApp</a></div></div>
      <div class="panel"><p class="section-kicker">Status</p><div class="status-rail">${statusFlow.map(st => `<button class="status-pill ${job.status === st ? 'on' : ''}" data-status="${st}">${st}</button>`).join('')}</div><div class="list" style="margin-top:14px">${kv('Complaint', job.complaint)}${kv('Observation', job.observation)}${kv('Work done', job.workDone)}</div></div>
      <div class="panel"><p class="section-kicker">Estimate and billing</p>${lines(job)}<div class="row"><div class="row-line"><b>Total with GST</b><span class="money">${money(total.total)}</span></div><div class="row-meta">Base ${money(total.base)} · GST ${money(total.gst)} · Advance ${money(job.advance || 0)}</div></div></div>
      <div class="panel"><p class="section-kicker">Add note</p><textarea id="note" placeholder="Add complaint, observation, work or billing note"></textarea><div class="action-row"><button class="btn" data-note="observation">Add to observation</button><button class="btn" data-note="workDone">Add to work done</button></div></div></section>`;
    document.querySelectorAll('[data-status]').forEach(b => b.onclick = () => updateJob(job, { status: b.dataset.status }));
    document.getElementById('markReady').onclick = () => updateJob(job, { status: 'Ready' });
    document.getElementById('billReady').onclick = () => updateJob(job, { billingState: 'Bill-ready record', status: job.status === 'Delivered' ? job.status : 'Ready' });
    document.querySelectorAll('[data-note]').forEach(b => b.onclick = () => {
      const text = document.getElementById('note').value.trim();
      if (!text) return ping('Type note first');
      updateJob(job, { [b.dataset.note]: append(job[b.dataset.note], text) });
    });
  }

  function partsPage(_, r) {
    view().innerHTML = hero(r[0], r[3], '<a class="btn" href="service-desk.html">Use in new job</a><a class="btn soft" href="purchase.html">Open PO</a>') +
      `<section class="panel"><div class="form-grid"><label class="field full"><span>Search any way</span><input id="partsQ" class="input" autofocus placeholder="cl 46, clutch assembly ms 460, 1122 160 2002"></label></div><div id="partsOut" class="list" style="margin-top:16px"></div><p class="fine">This page consumes accepted canonical parts and price data. Diagrams and images need Data Import and Infrastructure to supply evidence files.</p></section>`;
    const q = document.getElementById('partsQ'), out = document.getElementById('partsOut');
    const run = async () => {
      await ensurePartsData?.();
      const res = q.value.trim() ? (searchParts?.(q.value, 24) || []) : [];
      out.innerHTML = res.length ? res.map(p => `<div class="row"><div class="row-line"><div><div class="row-title">${escx(p.name || p.tagroName || p.stihlName)}</div><div class="row-meta">TAGRO alias: ${escx(p.alias || '')} · STIHL: ${escx(p.stihlName || '')}</div></div><span class="money">${money(p.price || 0)}</span></div><div class="row-line"><span class="row-meta">${escx(p.no || p.stihlNo || p.id)} · HSN ${escx(p.hsn || '')} · GST ${escx(p.gst || 18)}%</span><button class="btn small" data-po="${escx(p.no || p.id)}">Add PO request</button></div></div>`).join('') : (q.value ? '<div class="empty">No match. Try fewer words or number only.</div>' : '<div class="empty">Start typing to search by alias, model, STIHL name or part number.</div>');
      out.querySelectorAll('[data-po]').forEach(b => b.onclick = () => addPo(res.find(p => (p.no || p.id) === b.dataset.po)));
    };
    q.oninput = run; run();
  }

  function purchasePage(_, r) {
    view().innerHTML = hero(r[0], r[3], '<button class="btn primary" id="manualPo">Add manual request</button>') +
      `<section class="grid two"><div class="panel"><p class="section-kicker">Open requests</p><div class="list">${poList(allPo(), 'No PO requests yet.')}</div></div><div class="panel"><p class="section-kicker">PO boundary</p><div class="empty">This is a request board. Supplier PO creation, stock receipt and Busy write-back need the approved PO/accounting connector.</div></div></section>`;
    document.getElementById('manualPo').onclick = () => { const name = prompt('Part or item name'); if (!name) return; addPo({ name, qty: Number(prompt('Quantity', '1') || 1) }); location.reload(); };
    document.querySelectorAll('[data-po-status]').forEach(b => b.onclick = () => { const list = allPo(); const item = list.find(x => x.id === b.dataset.poStatus); if (!item) return; item.status = { Open: 'Ordered', Ordered: 'Done', Done: 'Open' }[item.status || 'Open']; savePoList(list); location.reload(); });
  }

  function reportsPage(_, r) {
    const list = visibleJobs(), total = list.reduce((a, x) => a + jobTotals(x).total, 0);
    view().innerHTML = hero(r[0], r[3], '<a class="btn" href="daily.html">Daily view</a><button class="btn soft" onclick="window.print()">Print</button>') +
      `<section class="grid four"><div class="panel"><p class="section-kicker">Open</p><h2>${list.filter(x => x.status !== 'Delivered').length}</h2></div><div class="panel"><p class="section-kicker">Ready</p><h2>${list.filter(x => x.status === 'Ready').length}</h2></div><div class="panel"><p class="section-kicker">Waiting parts</p><h2>${list.filter(x => x.status === 'Waiting Parts').length}</h2></div><div class="panel"><p class="section-kicker">Estimate value</p><h2>${money(total)}</h2></div></section><section class="panel" style="margin-top:16px"><p class="section-kicker">Bill-ready material</p>${jobList(list.filter(x => x.billingState), 'No bill-ready jobs yet.')}</section>`;
  }

  function settingsPage(_, r) {
    const br = branch(), staff = getBranchStaff?.(br) || [];
    view().innerHTML = hero(r[0], r[3], '<a class="btn" href="more.html">All pages</a>') +
      `<section class="grid two"><div class="panel"><p class="section-kicker">Device</p>${kv('Branch', br + ' · ' + (TAGRO.branches[br] || 'All branches'))}${kv('Logged in as', (safeSession()?.name || '') + ' · ' + (safeSession()?.role || ''))}${kv('Cached parts', (partsData?.() || []).length)}${kv('Pending cloud sync', (get('tagro_pending_sync', []) || []).length)}</div><div class="panel"><p class="section-kicker">Staff on this branch</p><div class="list">${staff.length ? staff.map(x => kv(x.role || 'Staff', x.name)).join('') : '<div class="empty">No staff list cached yet.</div>'}</div></div></section>`;
  }

  function morePage(_, r) {
    const links = get('tagro_links', TAGRO.links || []);
    view().innerHTML = hero(r[0], r[3], '<a class="btn primary" href="TAGRO_OS_SERVICE_APP_MINDMAP.md">Open mind map file</a>') +
      `<section class="grid two"><div class="panel"><p class="section-kicker">All screens</p><div class="grid app-grid">${Object.keys(routes).filter(k => !['job', 'quick', 'catalogue', 'interactive_catalog_viewer'].includes(k)).map(k => tile(routes[k][0], routes[k][3], k + '.html', routes[k][1].slice(0, 2).toUpperCase())).join('')}</div></div><div class="panel"><p class="section-kicker">Useful links</p><div class="list">${links.map(l => `<a class="row" href="${escx(l.url)}"><div class="row-title">${escx(l.title)}</div><div class="row-meta">${escx(l.url)}</div></a>`).join('')}</div></div></section>`;
  }

  function systemCheck(_, r) {
    view().innerHTML = hero(r[0], r[3]) + `<section class="panel"><p class="section-kicker">Local checks</p><div class="list">${kv('Pages covered', Object.keys(routes).length)}${kv('Jobs visible', visibleJobs().length)}${kv('Parts cached', (partsData?.() || []).length)}${kv('Cloud API', window.API || API || 'configured')}</div></section>`;
  }

  function app() { return document.getElementById('app') || document.body; }
  function view() { return document.getElementById('view'); }
  function safeSession() { return typeof session === 'function' ? session() : null; }
  function get(k, d) { return typeof jget === 'function' ? jget(k, d) : JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }
  function set(k, v) { return typeof jset === 'function' ? jset(k, v) : localStorage.setItem(k, JSON.stringify(v)); }
  function escx(v) { return typeof esc === 'function' ? esc(v) : String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function ping(m) { return typeof toast === 'function' ? toast(m) : alert(m); }
  function branch() { const u = safeSession(); return u?.branch || get('tagro_device_branch', 'KVR'); }
  function allJobs() { return typeof jobs === 'function' ? jobs() : get('tagro_jobs', []); }
  function saveJobList(a, id) { return typeof saveJobs === 'function' ? saveJobs(a, id) : set('tagro_jobs', a); }
  function allCustomers() { return typeof customers === 'function' ? customers() : get('tagro_customers', []); }
  function saveCustomerList(a) { set('tagro_customers', a); }
  function allPo() { return typeof po === 'function' ? po() : get('tagro_po', []); }
  function savePoList(a) { return typeof savePo === 'function' ? savePo(a) : set('tagro_po', a); }
  function visibleJobs() { const br = branch(), u = safeSession(); return allJobs().filter(j => u?.role === 'Owner' || br === 'ALL' || j.branch === br || !j.branch); }
  function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  function todayText() { return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }); }
  function dock(g) { return `<nav class="dock no-print">${[['home', 'Home', 'home.html'], ['receive', 'Receive', 'service-desk.html'], ['jobs', 'Jobs', 'tracker.html'], ['parts', 'Parts', 'reference.html'], ['purchase', 'PO', 'purchase.html'], ['reports', 'Reports', 'reports.html']].map(i => `<a class="${g === i[0] ? 'active' : ''}" href="${i[2]}">${i[1]}</a>`).join('')}</nav>`; }
  function hero(t, sub, actions = '') { return `<section class="hero"><div class="panel hero-card"><div class="decor-line"></div><p class="page-kicker">${todayText()}</p><h1 class="page-title">${escx(t)}</h1><p class="page-subtitle">${escx(sub)}</p>${actions ? `<div class="action-row">${actions}</div>` : ''}</div><div class="panel"><p class="section-kicker">Live pulse</p>${pulse()}</div></section>`; }
  function pulse() { const j = visibleJobs(), ready = j.filter(x => x.status === 'Ready').length, active = j.filter(x => !['Ready', 'Delivered'].includes(x.status)).length, hold = j.filter(x => x.status === 'Waiting Parts').length; return `<div class="grid"><div class="row"><div class="row-line"><b>Open workshop</b><span class="chip warn">${active}</span></div><div class="progress"><i style="width:${Math.min(100, active * 12)}%"></i></div></div><div class="row"><div class="row-line"><b>Ready for pickup</b><span class="chip good">${ready}</span></div></div><div class="row"><div class="row-line"><b>Waiting parts</b><span class="chip ${hold ? 'warn' : ''}">${hold}</span></div></div></div>`; }
  function tile(t, d, href, ic) { return `<a class="tile app-tile" href="${href}"><div class="icon">${ic}</div><div><strong>${escx(t)}</strong><span>${escx(d)}</span></div></a>`; }
  function field(name, label, ph, mode) { return `<label class="field"><span>${label}</span><input class="input" name="${name}" ${mode ? `inputmode="${mode}"` : ''} placeholder="${ph}"></label>`; }
  function tileTextArea(name, label, list, ph) { return `<div class="field full"><label>${label}</label><div class="quick-bank" data-target="${name}">${list.map(x => `<button type="button" class="quick-chip" data-text="${escx(x)}">${escx(x)}</button>`).join('')}</div><textarea name="${name}" placeholder="${ph}"></textarea></div>`; }
  function append(oldText, text) { oldText = oldText || ''; return !text || oldText.includes(text) ? oldText : (oldText ? oldText + '; ' : '') + text; }
  function bindTextChips() { document.querySelectorAll('.quick-bank[data-target]').forEach(bank => bank.onclick = e => { const b = e.target.closest('[data-text]'); if (!b) return; const ta = document.querySelector(`[name="${bank.dataset.target}"]`); ta.value = append(ta.value, b.dataset.text); b.classList.add('selected'); }); }
  function bindLabour(state) { document.querySelectorAll('[data-labour]').forEach(b => b.onclick = () => { const x = labour[Number(b.dataset.labour)]; state.labour.push({ type: 'labour', name: x[0], qty: 1, price: x[1], gst: 18, hsn: '9987' }); b.classList.add('selected'); selectedLines(state); }); }
  function bindParts(state) { const q = document.getElementById('partQ'), out = document.getElementById('partResults'); q.oninput = () => { const res = q.value.trim() ? (searchParts?.(q.value, 8) || []) : []; out.innerHTML = res.map((p, i) => `<button type="button" class="row" data-addpart="${i}"><div class="row-line"><b>${escx(p.name || p.tagroName || p.stihlName || 'Part')}</b><span class="money">${money(p.price || 0)}</span></div><div class="row-meta">${escx(p.no || p.stihlNo || p.id || '')} · HSN ${escx(p.hsn || '')} · GST ${escx(p.gst || 18)}%</div></button>`).join('') || (q.value.length > 1 ? '<div class="empty">No matching part found. Try fewer words or part number.</div>' : ''); out.querySelectorAll('[data-addpart]').forEach(btn => btn.onclick = () => { const p = res[Number(btn.dataset.addpart)]; state.parts.push({ type: 'part', name: p.name || p.tagroName || p.stihlName, no: p.no || p.stihlNo || p.id, qty: 1, price: Number(p.price || 0), gst: Number(p.gst || 18), hsn: p.hsn || '', alias: p.alias || '', stihlName: p.stihlName || '' }); q.value = ''; out.innerHTML = ''; selectedLines(state); }); }; }
  function selectedLines(state) { const out = document.getElementById('selectedLines'); if (!out) return; const lines = [...state.parts, ...state.labour], total = lines.reduce((a, l) => a + lineTotal(l).total, 0); out.innerHTML = lines.length ? lines.map(l => `<div class="row"><div class="row-line"><b>${escx(l.name)}</b><span class="money">${money(lineTotal(l).total)}</span></div><div class="row-meta">${escx(l.no || l.type)} · Qty ${escx(l.qty)} · GST ${escx(l.gst || 18)}%</div></div>`).join('') + `<div class="row"><div class="row-line"><b>Estimate total</b><span class="money">${money(total)}</span></div></div>` : '<div class="empty">Selected parts and labour will appear here.</div>'; }
  function lineTotal(l) { const q = Number(l.qty || 1), p = Number(l.price || l.unitPrice || 0), g = Number(l.gst || 18); return { base: q * p, gst: q * p * g / 100, total: q * p * (1 + g / 100) }; }
  function jobTotals(j) { return [...(j.parts || []), ...(j.labour || [])].reduce((a, l) => { const t = lineTotal(l); a.base += t.base; a.gst += t.gst; a.total += t.total; return a; }, { base: 0, gst: 0, total: 0 }); }
  function workNo(br) { return typeof wo === 'function' ? wo(br) : br + '/' + String(Date.now()).slice(-6); }
  function saveReceive(state, forced) { const o = Object.fromEntries(new FormData(document.getElementById('receiveForm')).entries()); if (!o.phone || !o.customerName || !o.machineModel || !o.complaint) return ping('Phone, customer, model and complaint are required.'); const br = branch(); let cs = allCustomers(), c = cs.find(x => x.phone === o.phone) || { id: 'c' + Date.now(), phone: o.phone, branch: br, machines: [] }; c.name = o.customerName; c.place = o.place; c.machines = c.machines || []; if (!c.machines.some(m => (o.serial && m.serial === o.serial) || (!o.serial && m.model === o.machineModel))) c.machines.push({ id: 'm' + Date.now(), model: o.machineModel, serial: o.serial, accessories: o.accessories }); cs = cs.filter(x => x.id !== c.id); cs.unshift(c); saveCustomerList(cs); const job = { id: 'j' + Date.now(), workOrder: workNo(br), branch: br, customerId: c.id, customerName: o.customerName, phone: o.phone, place: o.place, machineModel: o.machineModel, serial: o.serial, accessories: o.accessories, complaint: o.complaint, observation: o.observation, workDone: o.workDone, parts: state.parts, labour: state.labour, advance: Number(o.advance || 0), status: forced || o.status || 'Received', billingState: state.parts.length || state.labour.length ? 'Estimate material' : 'Intake only', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), acceptedBy: safeSession()?.name || 'Staff' }; const list = allJobs(); list.unshift(job); saveJobList(list, job.id); ping('Saved ' + job.workOrder); location.href = 'work.html?id=' + encodeURIComponent(job.id); }
  function needsAttention(j) { return j.status === 'Waiting Parts' || j.status === 'Estimate Ready' || !j.customerName || !j.machineModel || !j.complaint; }
  function byUpdated(a, b) { return Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0); }
  function filterJobs(list, f) { if (f === 'active') return list.filter(j => !['Ready', 'Delivered'].includes(j.status)); if (f === 'ready') return list.filter(j => j.status === 'Ready'); if (f === 'hold') return list.filter(j => j.status === 'Waiting Parts'); if (f === 'approval') return list.filter(j => j.status === 'Estimate Ready'); if (f === 'review') return list.filter(needsAttention); if (f === 'exceptions') return list.filter(j => !j.phone || !j.machineModel || !j.customerName || !j.complaint); return list.sort(byUpdated); }
  function jobList(list, empty) { return list.length ? list.map(j => `<a class="row" href="work.html?id=${encodeURIComponent(j.id || j.workOrder)}"><div class="row-line"><div><div class="row-title">${escx(j.workOrder || j.id)} · ${escx(j.customerName || 'Customer')}</div><div class="row-meta">${escx(j.machineModel || 'Machine')} · ${escx(j.complaint || 'No complaint')} · ${escx(j.phone || 'No phone')}</div></div><span class="chip ${['Ready', 'Delivered', 'Approved'].includes(j.status) ? 'good' : ['Waiting Parts', 'Estimate Ready', 'Inspection'].includes(j.status) ? 'warn' : ''}">${escx(j.status || 'Received')}</span></div><div class="row-line"><span class="row-meta">${escx(j.acceptedBy || 'Staff')} · ${new Date(j.updatedAt || j.createdAt || Date.now()).toLocaleString('en-IN')}</span><span class="money">${money(jobTotals(j).total)}</span></div></a>`).join('') : `<div class="empty">${empty}</div>`; }
  function kv(k, v) { return `<div class="row"><div class="row-meta">${escx(k)}</div><div class="row-title">${escx(v || 'Not filled')}</div></div>`; }
  function lines(j) { const ls = [...(j.parts || []), ...(j.labour || [])]; return ls.length ? ls.map(l => `<div class="row"><div class="row-line"><b>${escx(l.name)}</b><span class="money">${money(lineTotal(l).total)}</span></div><div class="row-meta">${escx(l.no || l.type || 'line')} · Qty ${escx(l.qty || 1)} · HSN ${escx(l.hsn || '')} · GST ${escx(l.gst || 18)}%</div></div>`).join('') : '<div class="empty">No parts or labour added yet.</div>'; }
  function updateJob(job, patch) { const list = allJobs(), i = list.findIndex(x => (x.id || x.workOrder) === (job.id || job.workOrder)); list[i] = { ...job, ...patch, updatedAt: new Date().toISOString() }; saveJobList(list, list[i].id); ping('Updated'); setTimeout(() => location.reload(), 450); }
  function addPo(p) { if (!p) return; const list = allPo(); list.unshift({ id: 'po' + Date.now(), branch: branch(), stihlNo: p.no || p.stihlNo || p.id || '', tagroName: p.name || p.tagroName || p.stihlName || 'Part', stihlName: p.stihlName || '', qty: p.qty || 1, unitPrice: p.price || 0, gst: p.gst || 18, hsn: p.hsn || '', status: 'Open', raisedAt: new Date().toISOString() }); savePoList(list); ping('PO request added'); }
  function poList(list, empty) { return list.length ? list.map(p => `<div class="row"><div class="row-line"><div><div class="row-title">${escx(p.tagroName || p.stihlName || p.name)}</div><div class="row-meta">${escx(p.stihlNo || p.no || 'No part number')} · Qty ${escx(p.qty || 1)} · ${escx(p.branch || branch())} · ${escx(p.workOrder || 'No job link')}</div></div><button class="btn small" data-po-status="${escx(p.id || '')}">${escx(p.status || 'Open')}</button></div></div>`).join('') : `<div class="empty">${empty}</div>`; }
})();
