# MAP 2 — Second, Independent Pass

## Storage key inventory
Re-derived via two different regex strategies (localStorage.*Item and jget/jset separately, then merged/deduped).
Result: 24 keys, IDENTICAL list to Map 1's 23+1 grouping. Confirmed match.

## Storage islands — re-verified with full line context
- tagro_labour_data: read at config.html:446 (count display only) and work.html:728 (fallback logic).
  Written nowhere. CONFIRMED real island.
  NEW FINDING not in Map 1: config.html's own labour count display (line 446) is ALSO broken by this —
  it will always show a stale/default count, not the admin's actual saved charges. Map 1 only flagged
  the work.html consequence, missed this config.html self-inconsistency.
- tagro_logo_data: read once at app.js:542 (the exact line added this session). Written nowhere. CONFIRMED.

## syncJobs array-bug — re-derived from raw function text, both halves
- syncJobs(jobsArr): const job = jobsArr[jobsArr.length - 1] — confirmed exact text match to Map 1.
- saveJob() in work.html: builds full `all` array via jobs(), updates job by id via findIndex,
  passes ENTIRE array to saveJobs(all) -> syncJobs(all). Confirmed exact text match to Map 1.
- CONCLUSION CONFIRMED: any job not last in array order never syncs its real edits; wrong job
  silently re-synced instead. No error surfaced to user. Severity assessment HOLDS on independent re-check.

## Navigation/flow claim — RE-DERIVED WITH BROADER SEARCH, FOUND DISCREPANCY FROM MAP 1
- Map 1 claimed "2 of 52 functions navigate anywhere" (location.href only).
- Map 2 broadened the search to also catch window.open() and location.assign().
- ACTUAL COUNT: 5 navigation triggers total — 3x window.open('wa.me/...') + 2x location.href
  (tech.html, catalog.html). Map 1's number (2) was an undercount due to narrower regex.
- HOWEVER: the wa.me opens leave the app entirely (external, not workflow navigation) and don't
  represent "forward movement within the job lifecycle" in any meaningful sense.
- CONCLUSION: Map 1's underlying structural claim (no internal forward navigation after completing
  Estimate/Status/Timeline actions) STILL HOLDS. Only the literal function-count was imprecise.
  This is a precision correction, not a reversal.

## Inbound link count to work.html — re-verified file by file
- 7 files reference "work.html" as a string: catalog.html(x2), home.html, purchase.html,
  receive.html, reports.html, tech.html(x2), tracker.html
- Manually inspected tech.html's 2 references: BOTH are comments only ("launched from work.html"),
  NOT actual links. tech.html receives context FROM work.html via URL params but never links back.
- catalog.html's 2 references: 1 comment + 1 actual location.href (already counted as one path in Map 1).
- TRUE COUNT OF REAL INBOUND PATHS: 6 (catalog, home, purchase, receive, reports, tracker).
  EXACT MATCH to Map 1.

## Key-mismatch pattern — re-confirmed via config.html source inspection
- config.html writes ONLY to tagro_custom_charges (5 separate jget/jset operations, all consistent
  with each other). Never writes to, never reads from, never bridges tagro_labour_data except for
  the broken count display noted above.
- CONFIRMS Map 1's root-cause category A (key/field-name drift) with one additional consequence found.
