(function () {
  const state = {
    session: null,
    branch: 'KVR',
    selectedCustomer: null,
    selectedJob: null,
    selectedPart: null,
    estimate: [],
    complaints: [],
    accessories: [],
    draftKey: 'tagro_service_desk_draft_v1'
  };

  const modelSeeds = [
    'MS 170', 'MS 180', 'MS 210', 'MS 230', 'MS 250', 'MS 260', 'MS 361', 'MS 382',
    'MS 440', 'MS 460', 'MS 461', 'MS 462', 'MS 660', 'MS 661',
    'FS 120', 'FS 230', 'FS 250', 'FS 300', 'FS 350', 'FS 450',
    'BG 56', 'BR 420', 'BR 600', 'HS 45', 'TS 420', 'RE 110'
  ];
  const complaintSeeds = [
    "Won't start", 'Starts and stops', 'Low power', 'No acceleration', 'Chain not moving',
    'Chain oil not coming', 'Chain brake problem', 'Fuel leak', 'Oil leak', 'High vibration',
    'Engine noise', 'Overheating', 'Service required', 'Broken starter rope', 'Battery issue', 'Other'
  ];
  const accessorySeeds = ['Guide bar', 'Chain', 'Fuel present', 'Loose parts', 'Battery / charger', 'Photo taken'];
  const inspectionSeeds = [
    'Fuel old / doubtful', 'Spark plug checked', 'Air filter dirty', 'Carburettor needs cleaning',
    'Compression low', 'Chain/bar worn', 'Sprocket worn', 'Oil pump check needed',
    'Starter assembly damaged', 'Customer misuse suspected', 'Estimate before work'
  ];
  const workSeeds = [
    'General service done', 'Carburettor cleaned', 'Air filter cleaned/replaced',
    'Spark plug replaced', 'Fuel line/filter replaced', 'Chain sharpened',
    'Guide bar cleaned/dressed', 'Clutch assembly serviced', 'Starter rope replaced',
    'Test run OK', 'Waiting for parts', 'Customer approval needed'
  ];
  const labourSeeds = [
    { name: 'Full Service', amount: 3000 },
    { name: 'Carburettor Service', amount: 300 },
    { name: 'Carburettor Repairs', amount: 500 },
    { name: 'Clutch Assembly Replacement', amount: 250 },
    { name: 'Piston Replacement Labour', amount: 500 },
    { name: 'Chain Sharpening', amount: 120 },
    { name: 'Inspection / Diagnosis', amount: 150 }
  ];

  function el(id) { return document.getElementById(id); }
  function money(n) { return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN'); }
  function cleanText(s) { return String(s || '').trim(); }
  function modelValue() {
    return cleanText(el('machine-model-free').value || el('machine-model').value).toUpperCase();
  }
  function getCustomTiles(kind) {
    return jget('tagro_service_tiles_' + kind, []);
  }
  function saveCustomTiles(kind, list) {
    jset('tagro_service_tiles_' + kind, Array.from(new Set(list.map(cleanText).filter(Boolean))));
  }
  function unique(list) {
    return Array.from(new Set(list.map(cleanText).filter(Boolean)));
  }
  function appendText(id, text) {
    const node = el(id);
    const current = cleanText(node.value);
    node.value = current ? current + '\n' + text : text;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    updateDeskSummary();
  }
  function customerHay(c) {
    return [c.name, c.phone, c.place].concat(c.alias || []).join(' ').toLowerCase();
  }
  function activeBranch() {
    const s = state.session || session();
    return s?.role === 'Owner' ? (jget('tagro_device_branch', 'KVR') || 'KVR') : (s?.branch || 'KVR');
  }
  function branchJobs() {
    const s = state.session || session();
    return jobs().filter(j => s?.role === 'Owner' || s?.demo || j.branch === state.branch);
  }
  function touchJob(job) {
    job.updatedAt = new Date().toISOString();
    const all = jobs();
    const idx = all.findIndex(j => j.id === job.id || j.workOrder === job.workOrder);
    if (idx >= 0) all[idx] = job; else all.push(job);
    saveJobs(all, job.id);
  }
  function addTimeline(job, type, text) {
    job.timeline = Array.isArray(job.timeline) ? job.timeline : [];
    job.timeline.push({ type, description: text, text, by: state.session?.name || 'Staff', at: new Date().toISOString() });
  }
  function saveDraft() {
    const draft = {
      customer: state.selectedCustomer,
      complaints: state.complaints,
      accessories: state.accessories,
      estimate: state.estimate,
      values: {
        customerSearch: el('customer-search')?.value,
        newName: el('new-name')?.value,
        newPhone: el('new-phone')?.value,
        newPlace: el('new-place')?.value,
        model: el('machine-model')?.value,
        modelFree: el('machine-model-free')?.value,
        serial: el('machine-serial')?.value,
        complaintFree: el('complaint-free')?.value,
        observation: el('observation')?.value,
        workDone: el('work-done')?.value,
        labour: el('labour')?.value,
        billNote: el('bill-note')?.value
      }
    };
    jset(state.draftKey, draft);
  }
  function restoreDraft() {
    const draft = jget(state.draftKey, null);
    if (!draft) return;
    state.selectedCustomer = draft.customer || null;
    state.complaints = draft.complaints || [];
    state.accessories = draft.accessories || [];
    state.estimate = draft.estimate || [];
    Object.entries(draft.values || {}).forEach(([key, val]) => {
      const map = {
        customerSearch: 'customer-search', newName: 'new-name', newPhone: 'new-phone', newPlace: 'new-place',
        model: 'machine-model', modelFree: 'machine-model-free', serial: 'machine-serial', complaintFree: 'complaint-free',
        observation: 'observation', workDone: 'work-done', labour: 'labour', billNote: 'bill-note'
      };
      if (el(map[key]) && val != null) el(map[key]).value = val;
    });
  }

  function renderStats() {
    const arr = branchJobs();
    el('stat-total').textContent = arr.filter(j => !['Delivered', 'Customer Declined'].includes(j.status)).length;
    el('stat-estimate').textContent = arr.filter(j => ['Waiting Approval', 'Estimate Ready'].includes(j.status)).length;
    el('stat-ready').textContent = arr.filter(j => j.status === 'Ready').length;
    el('stat-waiting').textContent = arr.filter(j => String(j.status || '').toLowerCase().includes('wait')).length;
  }
  function renderChips(id, values, selected, handlerName) {
    el(id).innerHTML = values.map(v => `<button type="button" class="desk-chip ${selected.includes(v) ? 'on' : ''}" onclick="${handlerName}('${encodeURIComponent(v)}')">${esc(v)}${selected.includes(v) ? ' ✓' : ''}</button>`).join('');
  }
  function renderModelChips(models) {
    const chosen = modelValue();
    el('model-chips').innerHTML = models.slice(0, 40).map(m => `<button type="button" class="desk-chip model ${chosen === m.toUpperCase() ? 'on' : ''}" onclick="chooseModelTile('${encodeURIComponent(m)}')">${esc(m)}</button>`).join('');
  }
  function renderPhraseChips(id, values, targetField, handlerName) {
    el(id).innerHTML = values.map(v => `<button type="button" class="desk-chip" onclick="${handlerName}('${encodeURIComponent(v)}')">${esc(v)}</button>`).join('');
  }
  function renderLabourChips() {
    const custom = getCustomTiles('labour').map(name => ({ name, amount: 0 }));
    const values = labourSeeds.concat(custom);
    el('labour-chips').innerHTML = values.map(v => `<button type="button" class="desk-chip service" onclick="chooseLabourTile('${encodeURIComponent(v.name)}', ${Number(v.amount || 0)})">${esc(v.name)}<small>${Number(v.amount || 0) ? money(v.amount) : 'Set amount manually'}</small></button>`).join('');
  }
  function renderCustomerChoice() {
    const c = state.selectedCustomer;
    el('chosen-customer').innerHTML = c
      ? `<div class="desk-alert">Using customer: ${esc(c.name)}${c.phone ? ' · ' + esc(c.phone) : ''}${c.place ? ' · ' + esc(c.place) : ''}</div>`
      : `<div class="desk-alert">Start with phone or name. Existing customers are reused; new customers are saved only when the job is received.</div>`;
  }
  function renderModels() {
    const seen = new Set();
    const models = [];
    modelSeeds.concat(getCustomTiles('models')).forEach(m => {
      const name = cleanText(m).toUpperCase();
      if (name && !seen.has(name)) { seen.add(name); models.push(name); }
    });
    getBranchModels(state.branch).forEach(m => {
      const name = cleanText(m.model || m.name || m.code || m).toUpperCase();
      if (name && !seen.has(name)) { seen.add(name); models.push(name); }
    });
    customers().forEach(c => (c.machines || []).forEach(m => {
      const name = cleanText(m.model || m.name || m.code || m).toUpperCase();
      if (name && !seen.has(name)) { seen.add(name); models.push(name); }
    }));
    jobs().forEach(j => {
      const name = cleanText(j.machine?.model || j.model).toUpperCase();
      if (name && !seen.has(name)) { seen.add(name); models.push(name); }
    });
    el('machine-model').innerHTML = '<option value="">Known model</option>' + models.sort((a,b) => a.localeCompare(b, undefined, { numeric: true })).map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    renderModelChips(models);
  }
  function renderLists() {
    renderChips('complaint-chips', unique(complaintSeeds.concat(getCustomTiles('complaints'))), state.complaints, 'toggleComplaint');
    renderChips('accessory-chips', accessorySeeds, state.accessories, 'toggleAccessoryDesk');
    renderPhraseChips('inspection-chips', unique(inspectionSeeds.concat(getCustomTiles('inspection'))), 'observation', 'chooseInspectionTile');
    renderPhraseChips('work-chips', unique(workSeeds.concat(getCustomTiles('work'))), 'work-done', 'chooseWorkTile');
    renderLabourChips();
    renderEstimate();
    renderSummary();
    saveDraft();
  }
  function renderEstimate() {
    const box = el('estimate-lines');
    const labour = Number(el('labour')?.value || 0);
    const partsTotal = state.estimate.reduce((a, p) => a + Number(p.total || 0), 0);
    if (!state.estimate.length) {
      box.innerHTML = '<p>No parts added yet. Search by TAGRO name, STIHL name, part number, or model words.</p>';
    } else {
      box.innerHTML = state.estimate.map((p, i) => `
        <div class="desk-part">
          <strong>${esc(p.name || p.tagroName || p.stihlName || p.no)}</strong>
          <small>${esc(p.no || p.stihlNo || '')}${p.stihlName ? ' · STIHL: ' + esc(p.stihlName) : ''}</small>
          <small>Qty ${Number(p.qty || 1)} · ${money(p.price)} each · GST ${Number(p.gst || 0)}% <button class="btn red" style="min-height:34px;padding:4px 9px;margin-left:6px" onclick="removeEstimateLine(${i})">Remove</button></small>
        </div>`).join('');
    }
    el('estimate-total').textContent = money(partsTotal + labour);
  }
  function renderSummary() {
    const c = state.selectedCustomer;
    const complaintText = state.complaints.concat(cleanText(el('complaint-free')?.value) ? [cleanText(el('complaint-free')?.value)] : []).filter(Boolean).join(' / ');
    el('summary-box').innerHTML = `
      <div class="desk-mini"><div class="desk-mini-label">Customer</div><div class="desk-mini-value">${c ? esc(c.name) + (c.phone ? ' · ' + esc(c.phone) : '') : 'Not selected yet'}</div></div>
      <div class="desk-mini"><div class="desk-mini-label">Machine</div><div class="desk-mini-value">${esc(modelValue() || 'Not entered yet')}${el('machine-serial')?.value ? ' · ' + esc(el('machine-serial').value) : ''}</div></div>
      <div class="desk-mini"><div class="desk-mini-label">Complaint</div><div class="desk-mini-value">${esc(complaintText || 'Not entered yet')}</div></div>
      <div class="desk-mini"><div class="desk-mini-label">Estimate</div><div class="desk-mini-value">${state.estimate.length} parts · Labour ${money(el('labour')?.value || 0)} · Total <b>${el('estimate-total')?.textContent || '₹0'}</b></div></div>`;
  }

  window.searchDeskCustomers = function () {
    const q = cleanText(el('customer-search').value).toLowerCase();
    const pool = customers().filter(c => state.session?.role === 'Owner' || state.session?.demo || c.branch === state.branch);
    const matches = (q ? pool.filter(c => customerHay(c).includes(q)) : pool.slice(-6)).slice(0, 8);
    el('customer-results').classList.add('show');
    el('customer-results').innerHTML = matches.map(c => `<button type="button" onclick="chooseDeskCustomer('${encodeURIComponent(c.id)}')"><strong>${esc(c.name)}</strong><small>${esc(c.phone || 'No phone')}${c.place ? ' · ' + esc(c.place) : ''}${(c.machines || []).length ? ' · ' + (c.machines || []).length + ' machine(s)' : ''}</small></button>`).join('') || '<button type="button" onclick="useTypedCustomer()">Use as new customer</button>';
  };
  window.chooseDeskCustomer = function (id) {
    const c = customers().find(x => String(x.id) === decodeURIComponent(id));
    if (!c) return;
    state.selectedCustomer = c;
    el('customer-search').value = c.name;
    el('new-name').value = c.name || '';
    el('new-phone').value = c.phone || '';
    el('new-place').value = c.place || '';
    el('customer-results').classList.remove('show');
    const firstMachine = (c.machines || [])[0];
    if (firstMachine) {
      el('machine-model-free').value = firstMachine.model || '';
      el('machine-serial').value = firstMachine.serial || firstMachine.serialNo || '';
    }
    renderCustomerChoice();
    renderSummary();
    saveDraft();
  };
  window.useTypedCustomer = function () {
    const q = cleanText(el('customer-search').value);
    if (q && !el('new-name').value && !/^\d{6,}$/.test(q)) el('new-name').value = q;
    if (/^\d{6,}$/.test(q) && !el('new-phone').value) el('new-phone').value = q;
    el('new-name').focus();
    el('customer-results').classList.remove('show');
  };
  window.toggleComplaint = function (raw) {
    const value = decodeURIComponent(raw);
    if (value === 'Other') { el('complaint-free').focus(); return; }
    const i = state.complaints.indexOf(value);
    if (i >= 0) state.complaints.splice(i, 1); else state.complaints.push(value);
    renderLists();
  };
  window.toggleAccessoryDesk = function (raw) {
    const value = decodeURIComponent(raw);
    const i = state.accessories.indexOf(value);
    if (i >= 0) state.accessories.splice(i, 1); else state.accessories.push(value);
    renderLists();
  };
  window.chooseModelTile = function (raw) {
    const value = decodeURIComponent(raw).toUpperCase();
    const select = el('machine-model');
    if (Array.from(select.options).some(o => o.value === value)) select.value = value;
    el('machine-model-free').value = value;
    renderModels();
    updateDeskSummary();
  };
  window.syncModelSelect = function () {
    if (el('machine-model').value) el('machine-model-free').value = el('machine-model').value;
    renderModelChips(Array.from(el('machine-model').options).map(o => o.value).filter(Boolean));
    updateDeskSummary();
  };
  window.addModelTile = function () {
    const typed = cleanText(el('machine-model-free').value || el('machine-model').value).toUpperCase();
    const value = cleanText(prompt('Model tile name', typed || 'MS 250'));
    if (!value) return;
    const list = getCustomTiles('models');
    list.push(value.toUpperCase());
    saveCustomTiles('models', list);
    el('machine-model-free').value = value.toUpperCase();
    renderModels();
    updateDeskSummary();
  };
  window.addComplaintTile = function () {
    const typed = cleanText(el('complaint-free').value);
    const value = cleanText(prompt('Complaint tile text', typed || 'Customer says machine is not working'));
    if (!value) return;
    const list = getCustomTiles('complaints');
    list.push(value);
    saveCustomTiles('complaints', list);
    if (!state.complaints.includes(value)) state.complaints.push(value);
    renderLists();
  };
  window.chooseInspectionTile = function (raw) {
    appendText('observation', decodeURIComponent(raw));
  };
  window.addInspectionTile = function () {
    const typed = cleanText(el('observation').value.split('\n').pop());
    const value = cleanText(prompt('Inspection tile text', typed || 'Estimate before work'));
    if (!value) return;
    const list = getCustomTiles('inspection');
    list.push(value);
    saveCustomTiles('inspection', list);
    appendText('observation', value);
    renderLists();
  };
  window.chooseWorkTile = function (raw) {
    appendText('work-done', decodeURIComponent(raw));
  };
  window.addWorkTile = function () {
    const typed = cleanText(el('work-done').value.split('\n').pop());
    const value = cleanText(prompt('Work tile text', typed || 'General service done'));
    if (!value) return;
    const list = getCustomTiles('work');
    list.push(value);
    saveCustomTiles('work', list);
    appendText('work-done', value);
    renderLists();
  };
  window.chooseLabourTile = function (rawName, amount) {
    const name = decodeURIComponent(rawName);
    if (Number(amount || 0)) el('labour').value = Number(amount || 0);
    appendText('bill-note', name);
    renderLists();
  };
  window.addLabourTile = function () {
    const value = cleanText(prompt('Labour tile name', 'Custom labour'));
    if (!value) return;
    const list = getCustomTiles('labour');
    list.push(value);
    saveCustomTiles('labour', list);
    renderLists();
  };
  window.searchDeskParts = async function () {
    const q = cleanText(el('part-search').value);
    const box = el('part-results');
    if (q.length < 2) { box.classList.remove('show'); return; }
    let matches = [];
    if (typeof searchParts === 'function') matches = searchParts(q, 8);
    if (!matches.length) {
      await ensurePartsData().catch(() => []);
      if (typeof searchParts === 'function') matches = searchParts(q, 8);
    }
    box.classList.add('show');
    box.innerHTML = matches.length ? matches.map(p => `<button type="button" onclick="pickDeskPart('${encodeURIComponent(p.no || p.stihlNo || p.id || '')}')"><strong>${esc(p.name || p.tagroName || p.stihlName || p.no)}</strong><small>${esc(p.no || p.stihlNo || '')}${p.stihlName ? ' · ' + esc(p.stihlName) : ''} · ${money(p.price || p.mrp || 0)}</small></button>`).join('') : '<button type="button">No matching part in cached master. Try part number or fewer words.</button>';
  };
  window.pickDeskPart = function (rawNo) {
    const no = decodeURIComponent(rawNo);
    const part = (typeof searchParts === 'function' ? searchParts(no, 1)[0] : null) || (partsData ? partsData().find(p => String(p.no || p.stihlNo || p.id) === no) : null);
    if (!part) return;
    state.selectedPart = part;
    el('part-search').value = part.name || part.tagroName || part.stihlName || part.no;
    el('part-qty').value = '1';
    el('part-price').value = Number(part.price || part.mrp || 0) || '';
    el('part-results').classList.remove('show');
  };
  window.addDeskPart = function () {
    if (!state.selectedPart && cleanText(el('part-search').value)) {
      state.selectedPart = { no: '', name: cleanText(el('part-search').value), stihlName: '', price: Number(el('part-price').value || 0), gst: 18, hsn: '' };
    }
    const p = state.selectedPart;
    if (!p) return toast('Search and select a part first');
    const qty = Math.max(1, Number(el('part-qty').value || 1));
    const price = Number(el('part-price').value || p.price || p.mrp || 0);
    state.estimate.push({
      no: p.no || p.stihlNo || p.id || '',
      name: p.name || p.tagroName || p.stihlName || '',
      tagroName: p.tagroName || p.name || '',
      stihlName: p.stihlName || '',
      hsn: p.hsn || '',
      gst: Number(p.gst || 18),
      qty, price, total: qty * price
    });
    state.selectedPart = null;
    el('part-search').value = '';
    el('part-price').value = '';
    renderLists();
  };
  window.removeEstimateLine = function (i) {
    state.estimate.splice(i, 1);
    renderLists();
  };
  window.createOrUpdateDeskJob = function (targetStatus) {
    const c = state.selectedCustomer || {
      id: 'c' + Date.now(),
      branch: state.branch,
      name: cleanText(el('new-name').value),
      phone: cleanText(el('new-phone').value),
      place: cleanText(el('new-place').value),
      alias: [],
      machines: []
    };
    if (!c.name) return toast('Customer name is needed');
    const model = modelValue();
    if (!model) return toast('Machine model is needed');
    const freeComplaint = cleanText(el('complaint-free').value);
    const complaintList = state.complaints.concat(freeComplaint ? [freeComplaint] : []);
    if (!complaintList.length) return toast('Complaint is needed');

    const customersList = customers();
    let stored = customersList.find(x => String(x.id) === String(c.id));
    if (!stored) { stored = { ...c, machines: [] }; customersList.push(stored); }
    stored.name = c.name; stored.phone = c.phone; stored.place = c.place || '';
    const serialNo = cleanText(el('machine-serial').value);
    stored.machines = stored.machines || [];
    if (!stored.machines.some(m => (serialNo && (m.serial === serialNo || m.serialNo === serialNo)) || (m.model === model && !serialNo))) {
      stored.machines.push({ id: 'm' + Date.now(), model, serial: serialNo });
    }
    jset('tagro_customers', customersList);

    const now = new Date().toISOString();
    const labour = Number(el('labour').value || 0);
    const total = state.estimate.reduce((a, p) => a + Number(p.total || 0), 0) + labour;
    const job = state.selectedJob || {
      id: 'j' + Date.now(),
      workOrder: wo(state.branch),
      branch: state.branch,
      branchName: TAGRO.branches[state.branch] || state.branch,
      date: now,
      acceptedBy: state.session?.name || 'Staff',
      source: 'service-desk',
      timeline: []
    };
    job.customerId = stored.id;
    job.customer = { name: stored.name, phone: stored.phone, place: stored.place || '' };
    job.machine = { model, serialNo };
    job.complaints = complaintList.map(text => ({ text, status: 'Received', at: now }));
    job.observation = cleanText(el('observation').value);
    job.workDone = cleanText(el('work-done').value);
    job.accessories = state.accessories;
    job.estimate = state.estimate;
    job.parts = state.estimate;
    job.labour = labour;
    job.billingNote = cleanText(el('bill-note').value);
    job.total = total;
    job.status = targetStatus || job.status || 'Received';
    addTimeline(job, 'service_desk', `Service Desk saved as ${job.status}`);
    touchJob(job);
    state.selectedJob = job;
    localStorage.removeItem(state.draftKey);
    toast('Saved — opening job card');
    setTimeout(() => { location.href = 'work.html?id=' + encodeURIComponent(job.id); }, 500);
  };
  window.openOldReceive = function () { location.href = 'receive.html'; };
  window.updateDeskSummary = function () { renderSummary(); saveDraft(); };
  window.clearDeskDraft = function () {
    if (!confirm('Clear this Service Desk screen? Saved jobs will not be deleted.')) return;
    localStorage.removeItem(state.draftKey);
    location.reload();
  };

  window.addEventListener('DOMContentLoaded', async function () {
    state.session = requireLogin();
    if (!state.session) return;
    state.branch = activeBranch();
    initShell('quick');
    el('desk-branch').textContent = state.session.role === 'Owner' ? `Owner view · active branch ${state.branch}` : (TAGRO.branches[state.branch] || state.branch);
    renderModels();
    restoreDraft();
    renderModels();
    renderCustomerChoice();
    renderStats();
    renderLists();
    document.querySelectorAll('input,textarea,select').forEach(node => {
      node.addEventListener('input', updateDeskSummary);
      node.addEventListener('change', updateDeskSummary);
    });
    el('machine-model').addEventListener('change', syncModelSelect);
    ensurePartsData().then(() => renderModels()).catch(() => {});
  });
})();
