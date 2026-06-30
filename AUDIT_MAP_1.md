# MAP 1 — First Pass Findings (from prior analysis)

## Storage key islands
- tagro_labour_data: READ by config.html, work.html — WRITTEN by nobody
- tagro_logo_data: READ by app.js — WRITTEN by nobody
- tagro_custom_charges: WRITTEN by config.html — never READ by work.html (mismatch, not island)

## Bugs found in work.html (8 total)
1. analyzeVoiceInput() calls getConfig() — does not exist anywhere
2. catalog.html part-add uses job.estimate.push() (array) vs work.html's job.estimate.lines.push() (object.lines)
3. openWhatsApp() doesn't await generateEstimateImage() promise before logging success
4. voiceApply() complaint mode writes job.complaint (singular string) vs rest of app's job.complaints (array)
5. voiceApply() parts mode writes unitPrice/price vs addPartLine()'s standardRate/amount
6. renderTimeline() complaint box reads job.complaint (wrong field)
7. sendStatusSMS() and sendReadySMS() log success without checking response.ok
8. updateQty() defined but never called (dead code)

## Sync layer
- syncJobs(jobsArr) only sends jobsArr[jobsArr.length - 1] regardless of which job was actually edited
- No branch-silence/staleness detection exists anywhere
- pullJobsFromDropbox / flushPendingSync logic itself is sound

## Structural/flow findings
- work.html: 6 inbound links (receive, tracker, home, purchase, reports, catalog-return), ~1 outbound (tracker only)
- Only 2 of 52 functions in work.html ever navigate anywhere (openTechAssistant, openCatalogForThisJob)
- No sequencing — 4 flat unordered tabs, no forward momentum after any completed action

## AI/reporting gap
- diagnose() exists, works, but is single-job only — no cross-job/cross-branch AI function exists anywhere
- reports.html is a descriptive renderer only — no anomaly detection, no insight generation

## Deleted files (prior session)
- 17 dead files removed: Malayalam Generation B set, duplicate catalog/catalogue, bench.html, stub redirects
