// TAGRO Parts Search & Price Updating Utility (Updated June 2026)
// Space, case, dash, slash, dot — all ignored in matching part numbers
// Automatically left-pads truncated leading zeros back to 11 digits

/**
 * Normalizes a string by turning it lowercase, stripping spaces, dashes, dots, and slashes.
 * Restores leading zeroes dropped by spreadsheet parsers to exactly 11 digits if numeric.
 * @param {string} s - The raw part number/identifier
 * @param {boolean} isQuery - Set to true if normalizing user search query to prevent partial-match padding bugs
 */
function norm(s, isQuery) {
  if (!s) return "";
  let str = String(s).trim();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  str = str.replace(/[^A-Za-z0-9]/g, '');
  
  // Pad numeric strings under 11 digits (unless it is a short partial query string)
  if (/^\d+$/.test(str) && str.length < 11) {
    if (!isQuery || str.length >= 7) {
      str = str.padStart(11, '0');
    }
  }
  return str.toLowerCase();
}

/**
 * Retrieves the current parts master database from localStorage.
 */
function partsData() {
  return jget('tagro_parts_data', []);
}

/**
 * Main search engine — used across work.html and parts.html.
 * Implements a "Busy-style" multi-word search strategy with score priorities.
 */
function searchParts(query, limit) {
  limit = limit || 10;
  var words = query.toLowerCase().trim().split(/\s+/).filter(function(w){ return w.length > 0; });
  if (!words.length || (words.length === 1 && words[0].length < 2)) return [];

  var nq  = norm(query, true);
  var all = partsData();
  var results = [];

  for (var i = 0; i < all.length; i++) {
    var p = all[i];
    if (p.active === 'N') continue;

    var raw = [p.name, p.alias, p.no, p.stihlName, p.stihlNo, p.modelGroup].join(' ');

    // Strategy A: Normalized full-string match (perfect for exact code/number lookup)
    var normRaw = norm(raw, false);
    var matchA  = nq.length >= 2 && normRaw.includes(nq);

    // Strategy B: Multi-word query (every input word appears somewhere in metadata)
    var rawLow = raw.toLowerCase();
    var matchB = words.every(function(w){ return rawLow.includes(w); });

    if (!matchA && !matchB) continue;

    var score = 0;
    var normNo = norm(p.no, false);
    
    // Exact structural matching logic boosting search priority metrics
    if (normNo === nq)                      score = 12; // Perfect exact match override
    else if (normNo.startsWith(nq))         score = 10;
    else if (normNo.includes(nq))           score = 8;
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

// Stock lookup helpers
function totalStockForPart(p) {
  if (!p.stock) return 0;
  return Object.values(p.stock).reduce(function(a, b){ return a + Number(b || 0); }, 0);
}

function stockAtBranch(p, branch) {
  return Number((p.stock || {})[branch] || 0);
}

/**
 * Dynamic price lists, HSN, and GST updates from uploaded Excel spreadsheets.
 * Matches incoming row columns to existing part numbers using robust normalized keys.
 * Preserves custom names, aliases, groupings, and stock metrics.
 */
function updatePricesFromExcel(rows) {
  var existingList = partsData();
  var updatedCount = 0;
  var appendedCount = 0;

  // Pre-index existing parts by normalized part number for high-performance lookup
  var index = {};
  for (var i = 0; i < existingList.length; i++) {
    var p = existingList[i];
    if (p.no) {
      index[norm(p.no, false)] = i;
    }
  }

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row) continue;

    // Normalise keys to lowercase without spaces to match any arbitrary column structures
    var normalizedRow = {};
    Object.keys(row).forEach(function(k) {
      var nk = k.toLowerCase().replace(/[^a-z0-9%]/g, '');
      normalizedRow[nk] = row[k];
    });

    // 1. EXTRACT PART NUMBER
    var partNoRaw = normalizedRow['stihlpartnumber'] || 
                    normalizedRow['partnumber'] || 
                    normalizedRow['partno'] || 
                    normalizedRow['materialnumber'] || 
                    normalizedRow['material'] || 
                    normalizedRow['no'] ||
                    normalizedRow['partnos'];
                    
    var cleanNo = String(partNoRaw || '').trim().replace(/\s/g, '');
    if (!cleanNo || cleanNo === 'nan' || cleanNo === 'undefined') continue;

    var key = norm(cleanNo, false);

    // 2. EXTRACT UPDATED METRICS
    var rawPrice = normalizedRow['price'] || 
                   normalizedRow['priceunit'] || 
                   normalizedRow['retailprice'] || 
                   normalizedRow['retailpriceunit'] || 
                   normalizedRow['dealerprice'] || 
                   normalizedRow['dptr'];
    var price = parseFloat(rawPrice);

    var rawMRP = normalizedRow['mrp'] || 
                 normalizedRow['mrprs'] || 
                 normalizedRow['maxretailprice'] || 
                 normalizedRow['customermrp'] || 
                 normalizedRow['mrpunit'];
    var mrp = parseFloat(rawMRP);

    var hsn = String(normalizedRow['hsn'] || 
                     normalizedRow['hsncode'] || 
                     normalizedRow['tariffcode'] || 
                     normalizedRow['tariff'] || 
                     '').trim();

    var rawGST = normalizedRow['gst'] || 
                 normalizedRow['gst%'] || 
                 normalizedRow['tax'] || 
                 normalizedRow['taxrate'] || 
                 normalizedRow['gstpercent'] || 
                 18;
    var gst = parseInt(rawGST) || 18;

    // 3. EXECUTE INTEGRATION PIPELINE
    if (index.hasOwnProperty(key)) {
      var idx = index[key];
      var existingPart = existingList[idx];

      if (!isNaN(price)) existingPart.price = price;
      if (!isNaN(mrp))   existingPart.mrp = mrp;
      if (hsn)           existingPart.hsn = hsn;
      if (!isNaN(gst))   existingPart.gst = gst;

      existingPart.needsUpdate = false;
      existingPart.lastPriceSync = new Date().toISOString();

      existingList[idx] = existingPart;
      updatedCount++;
    } else {
      var name = String(row['TAGRO NAME'] || row['STIHL NAME'] || row['DESCRIPTION'] || row['NAME'] || 'New STIHL Part').trim();
      
      existingList.push({
        id:          cleanNo,
        name:        name,
        alias:       '',
        no:          cleanNo,
        stihlNo:     cleanNo,
        stihlName:   String(row['STIHL NAME'] || name).trim(),
        hsn:         hsn || '8467',
        gst:         gst,
        price:       isNaN(price) ? 0 : price,
        mrp:         isNaN(mrp) ? 0 : mrp,
        unit:        String(row['UNIT'] || 'Pcs').trim(),
        modelGroup:  String(row['MODEL GROUP'] || row['MODEL'] || '').trim(),
        group:       String(row['PARENT GROUP'] || 'Spare parts').trim(),
        active:      'Y',
        stock:       {},
        needsUpdate: false,
        lastPriceSync: new Date().toISOString()
      });
      appendedCount++;
    }
  }

  jset('tagro_parts_data', existingList);
  jset('tagro_parts_updated', new Date().toISOString());

  return {
    updated: updatedCount,
    appended: appendedCount,
    total: existingList.length
  };
}

/**
 * Legacy overwrite import method. Used if completely resetting master database layout.
 */
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

/**
 * Creates PO rows for purchase orders
 */
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
