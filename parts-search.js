// TAGRO Parts Search — Busy-style multi-word match
// "gas cy"      → finds CYLINDER GASKET, GASKET CYL etc
// "36RSC"       → finds 36RS .325 chain (normalised match)
// "sr 420 pump" → finds SR420 pump parts
// Space, case, dash, dot — all ignored in matching

function norm(s) {
  return String(s || '').toLowerCase().replace(/[\s\-\.\/]/g, '');
}

function partsData() {
  return jget('tagro_parts_data', []);
}

// Main search — called from work.html and parts.html
function searchParts(query, limit) {
  limit = limit || 10;
  var words = query.toLowerCase().trim().split(/\s+/).filter(function(w){ return w.length > 0; });
  if (!words.length || (words.length === 1 && words[0].length < 2)) return [];

  var nq  = norm(query);
  var all = partsData();
  var results = [];

  for (var i = 0; i < all.length; i++) {
    var p = all[i];
    if (p.active === 'N') continue;

    var raw = [p.name, p.alias, p.no, p.stihlName, p.stihlNo, p.modelGroup].join(' ');

    // Strategy A: normalised full-string match (good for part numbers and codes)
    var normRaw = norm(raw);
    var matchA  = nq.length >= 2 && normRaw.includes(nq);

    // Strategy B: every word appears somewhere (Busy-style)
    var rawLow = raw.toLowerCase();
    var matchB = words.every(function(w){ return rawLow.includes(w); });

    if (!matchA && !matchB) continue;

    var score = 0;
    if (norm(p.no).startsWith(nq))         score = 10;
    else if (norm(p.no).includes(nq))      score = 8;
    else if (matchA)                        score = 6;
    else if (rawLow.startsWith(words[0]))   score = 4;
    else                                    score = 2;

    results.push(Object.assign({}, p, { _score: score }));
    if (results.length >= limit * 4) break;
  }

  return results
    .sort(function(a, b){ return b._score - a._score; })
    .slice(0, limit);
}

// Stock helpers
function totalStockForPart(p) {
  if (!p.stock) return 0;
  return Object.values(p.stock).reduce(function(a, b){ return a + Number(b || 0); }, 0);
}

function stockAtBranch(p, branch) {
  return Number((p.stock || {})[branch] || 0);
}

// Import from Excel — called by parts.html after SheetJS parse
function importPartsFromExcel(rows) {
  var parts = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var name = String(row['TAGRO NAME'] || '').trim();
    if (!name) continue;
    var stihlName = String(row['STIHL NAME'] || '').trim();
    parts.push({
      id:          String(row['STIHL PART NUMBER'] || row['TAGRO NAME'] || Date.now()),
      name:        name,
      alias:       String(row['ALIAS'] || '').trim(),
      no:          String(row['STIHL PART NUMBER'] || '').trim().replace(/\s/g, ''),
      stihlNo:     String(row['STIHL PART NUMBER'] || '').trim().replace(/\s/g, ''),
      stihlName:   stihlName,
      hsn:         String(row['HSN CODE'] || '').trim(),
      gst:         Number(row['GST %'] || 18),
      price:       Number(row['PRICE (₹)'] || 0),
      mrp:         Number(row['MRP (₹)'] || 0),
      unit:        String(row['UNIT'] || 'Pcs').trim(),
      modelGroup:  String(row['MODEL GROUP'] || '').trim(),
      group:       String(row['PARENT GROUP'] || 'Spare parts').trim(),
      active:      String(row['ACTIVE'] || 'Y').trim().toUpperCase(),
      stock:       {},
      needsUpdate: stihlName.includes('XXX_UPDATE'),
    });
  }
  jset('tagro_parts_data', parts);
  jset('tagro_parts_updated', new Date().toISOString());
  return parts.length;
}

// Generate PO line from part
function partToPOLine(part, qty, workOrder, branch) {
  return {
    id:        'po' + Date.now() + Math.random().toString(36).slice(2, 5),
    branch:    branch,
    workOrder: workOrder,
    stihlNo:   part.no,
    stihlName: part.needsUpdate ? part.name : (part.stihlName || part.name),
    tagroName: part.name,
    qty:       qty,
    unitPrice: part.price,
    gst:       part.gst,
    hsn:       part.hsn,
    lineTotal: part.price * qty,
    taxAmount: (part.price * qty * part.gst) / 100,
    status:    'Open',
    raisedAt:  new Date().toISOString(),
  };
}
