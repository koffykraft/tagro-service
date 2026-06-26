// TAGRO Parts Search
// Space-insensitive, multi-field, live search
// Handles: "36RSC" = "36 RSC" = "36210001640" = "36rsc"

// ── Normalise query ──────────────────────────────────────
function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\-\.\/]/g, ''); // strip spaces, dashes, dots, slashes
}

// ── Parts data ───────────────────────────────────────────
// Parts are loaded from tagro_parts_data in localStorage
// which is populated when staff upload the parts master Excel

function partsData() {
  return jget('tagro_parts_data', []);
}

// ── Search ───────────────────────────────────────────────
function searchParts(query, limit = 10) {
  const q = normalise(query);
  if (q.length < 2) return [];

  const all = partsData();
  const results = [];

  for (const p of all) {
    if (p.active === 'N') continue;

    // Build searchable string: name + alias + part number + stihl name
    const haystack = normalise(
      [p.name, p.alias, p.no, p.stihlName, p.stihlNo].join(' ')
    );

    if (haystack.includes(q)) {
      // Score: exact part number match ranks highest
      const score =
        normalise(p.no).startsWith(q) ? 3 :
        normalise(p.stihlNo).startsWith(q) ? 2 :
        normalise(p.name).startsWith(q) ? 1 : 0;
      results.push({ ...p, _score: score });
    }

    if (results.length >= limit * 3) break; // collect extra, then sort
  }

  return results
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

// ── Render suggestion dropdown ────────────────────────────
// targetEl: the suggestions container div
// part: part object
// onSelect: callback(part)
function renderPartSuggestions(results, targetEl, onSelect) {
  if (!results.length) {
    targetEl.innerHTML = '<div class="suggest-empty">No parts found</div>';
    targetEl.classList.remove('hide');
    return;
  }

  targetEl.innerHTML = results.map((p, i) => {
    const stock = totalStockForPart(p);
    const stockBadge = stock > 0
      ? `<span class="badge green">${stock} in stock</span>`
      : `<span class="badge red">No stock</span>`;

    const needsUpdate = (p.stihlName || '').includes('XXX_UPDATE');

    return `
    <button onclick="selectPart(${i})" class="suggest-row">
      <div class="suggest-main">
        <b>${p.name}</b>
        ${needsUpdate ? '<span class="badge amber">Price TBD</span>' : ''}
        ${stockBadge}
      </div>
      <div class="suggest-sub">
        <span class="mono">${p.no || '—'}</span>
        <span class="sep">·</span>
        ${p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : 'Price TBD'}
        ${p.mrp ? `<span class="muted">MRP ₹${Number(p.mrp).toLocaleString('en-IN')}</span>` : ''}
        ${p.modelGroup ? `<span class="sep">·</span><span class="muted">${p.modelGroup}</span>` : ''}
      </div>
    </button>`;
  }).join('');

  targetEl.classList.remove('hide');

  // Expose for inline onclick
  window._partResults = results;
  window.selectPart = function(i) {
    targetEl.classList.add('hide');
    if (onSelect) onSelect(results[i]);
  };
}

// ── Stock across branches ─────────────────────────────────
function totalStockForPart(p) {
  if (!p.stock) return 0;
  return Object.values(p.stock).reduce((a, b) => a + Number(b || 0), 0);
}

function stockAtBranch(p, branch) {
  return Number((p.stock || {})[branch] || 0);
}

// ── Parts master upload handler ───────────────────────────
// Called when staff upload the Excel file via the parts management page
// Converts Excel JSON (from SheetJS) to parts array and saves to localStorage

function importPartsFromExcel(rows) {
  // rows: array of objects from SheetJS, each row = one part
  const parts = [];

  for (const row of rows) {
    const name = String(row['TAGRO NAME'] || '').trim();
    if (!name) continue;

    const stihlName = String(row['STIHL NAME'] || '').trim();

    parts.push({
      id:         String(row['STIHL PART NUMBER'] || row['TAGRO NAME'] || Date.now()),
      name:       name,
      alias:      String(row['ALIAS'] || '').trim(),
      no:         String(row['STIHL PART NUMBER'] || '').trim().replace(/\s/g, ''),
      stihlNo:    String(row['STIHL PART NUMBER'] || '').trim().replace(/\s/g, ''),
      stihlName:  stihlName,
      hsn:        String(row['HSN CODE'] || '').trim(),
      gst:        Number(row['GST %'] || 18),
      price:      Number(row['PRICE (₹)'] || 0),
      mrp:        Number(row['MRP (₹)'] || 0),
      unit:       String(row['UNIT'] || 'Pcs').trim(),
      modelGroup: String(row['MODEL GROUP'] || '').trim(),
      group:      String(row['PARENT GROUP'] || 'Spare parts').trim(),
      active:     String(row['ACTIVE'] || 'Y').trim().toUpperCase(),
      stock:      {},  // stock levels managed separately
      needsUpdate: stihlName.includes('XXX_UPDATE'),
    });
  }

  jset('tagro_parts_data', parts);
  jset('tagro_parts_updated', new Date().toISOString());
  return parts.length;
}

// ── Generate PO line for a part ───────────────────────────
function partToPOLine(part, qty, workOrder, branch) {
  return {
    id:          'po' + Date.now() + Math.random().toString(36).slice(2, 5),
    branch:      branch,
    workOrder:   workOrder,
    stihlNo:     part.no,
    stihlName:   part.needsUpdate ? part.name : (part.stihlName || part.name),
    tagroName:   part.name,
    qty:         qty,
    unitPrice:   part.price,
    gst:         part.gst,
    hsn:         part.hsn,
    lineTotal:   part.price * qty,
    taxAmount:   (part.price * qty * part.gst) / 100,
    status:      'Open',
    raisedAt:    new Date().toISOString(),
  };
}
