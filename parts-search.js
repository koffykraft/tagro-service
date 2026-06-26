// TAGRO Parts Search — Busy-style multi-word fuzzy match
// "gas cy" finds "CYLINDER GASKET" and "GASKET CYLINDER"
// "36RSC" = "36 RSC" = "36210001640" = "36rsc"
// Space, case, dash, dot insensitive

// ── Normalise a string for matching ──────────────────────
function norm(s) {
  return String(s || '').toLowerCase().replace(/[\s\-\.\/]/g, '');
}

// ── Split query into words for multi-word matching ────────
function queryWords(q) {
  return q.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
}

// ── Parts data from localStorage ─────────────────────────
function partsData() {
  return jget('tagro_parts_data', []);
}

// ── Main search function ──────────────────────────────────
// Matches like Busy: each word in the query must appear
// somewhere in the part's searchable text — any order, any case
function searchParts(query, limit = 10) {
  const words = queryWords(query);
  if (!words.length || (words.length === 1 && words[0].length < 2)) return [];

  const all = partsData();
  const results = [];

  for (const p of all) {
    if (p.active === 'N') continue;

    // Build one long searchable string from all name fields
    const raw = [
      p.name, p.alias, p.no, p.stihlName, p.stihlNo, p.modelGroup
    ].join(' ');

    // Two match strategies:
    // Strategy A — normalised (strips spaces): good for part numbers and codes
    const normRaw = norm(raw);
    const normQ   = norm(query);
    const matchA  = normQ.length >= 2 && normRaw.includes(normQ);

    // Strategy B — word-by-word (Busy style): each word must appear somewhere
    const rawLower = raw.toLowerCase();
    const matchB   = words.every(w => rawLower.includes(w));

    if (!matchA && !matchB) continue;

    // Score for ranking
    let score = 0;
    if (norm(p.no).startsWith(normQ))       score = 10; // exact part no prefix
    else if (norm(p.no).includes(normQ))    score = 8;  // part no contains
    else if (matchA)                         score = 6;  // normalised match
    else if (rawLower.startsWith(words[0])) score = 4;  // name starts with first word
    else                                     score = 2;  // word match anywhere

    results.push({ ...p, _score: score });
    if (results.length >= limit * 4) break;
  }

  return results
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

// ── Stock helpers ─────────────────────────────────────────
function totalStockForPart(p) {
  if (!p.stock) return 0;
  return Object.values(p.stock).reduce((a, b) => a + Number(b || 0), 0);
}

function stockAtBranch(p, branch) {
  return Number((p.stock || {})[branch] || 0);
}

// ── Import from Excel (called by parts.html upload) ───────
function importPartsFromExcel(rows) {
  const parts = [];

  for (const row of rows) {
    const name = String(row['TAGRO NAME'] || '').trim();
    if (!name) continue;

    const stihlName = String(row['STIHL NAME'] || '').trim();

    parts.push({
      id:          String(row['STIHL PART NUMBER'] || row['TAGRO NAME'] || Date.now()),
      name,
      alias:       String(row['ALIAS'] || '').trim(),
      no:          String(row['STIHL PART NUMBER'] || '').trim().replace(/\s/g, ''),
      stihlNo:     String(row['STIHL PART NUMBER'] || '').trim().replace(/\s/g, ''),
      stihlName,
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

// ── Generate PO line ──────────────────────────────────────
function partToPOLine(part, qty, workOrder, branch) {
  return {
    id:        'po' + Date.now() + Math.random().toString(36).slice(2, 5),
    branch,
    workOrder,
    stihlNo:   part.no,
    stihlName: part.needsUpdate ? part.name : (part.stihlName || part.name),
    tagroName: part.name,
    qty,
    unitPrice: part.price,
    gst:       part.gst,
    hsn:       part.hsn,
    lineTotal: part.price * qty,
    taxAmount: (part.price * qty * part.gst) / 100,
    status:    'Open',
    raisedAt:  new Date().toISOString(),
  };
}
