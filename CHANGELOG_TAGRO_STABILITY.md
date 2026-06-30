# TAGRO Stability Refactor — 30 June 2026

## Outcome

The existing static HTML/CSS/JavaScript application was repaired in place. No framework, npm runtime, database, or new paid service was introduced. Existing localStorage keys and job structures remain compatible.

## Significant changes

### Receive machine workflow

- Replaced the non-functional placeholder in receive.html with a complete three-step workshop flow.
- Existing customers can be found by phone, name, alias, or place.
- Previous customer machines can be selected with one tap.
- New customers and machines are saved back to the existing tagro_customers key.
- Multiple complaints, urgency, serial number, and received accessories are recorded.
- Jobs retain the existing tagro_jobs format: customer, machine, complaints, accessories, timeline, branch, and workOrder.
- The final action saves locally first, queues existing Dropbox sync, and opens the new Work page.
- Owner-created jobs use the configured device branch instead of the invalid ALL branch.

### Device setup and admin access

- Fixed the fresh-device loop between Login and Settings.
- After choosing a branch, a clear **Continue to Login** action is shown.
- setup.html now opens the working device settings page.
- Owner and Manager sessions now receive a **Setup** navigation item and a setup link in the user menu.
- Unauthenticated setup only exposes branch selection; staff, PIN, data, and reset controls stay hidden.
- Non-manager staff cannot see staff/PIN/reset administration controls.

### Work page and mobile use

- Corrected sticky tab positions so Work tabs no longer sit underneath the global header/navigation.
- Increased tab, status, message, field, and button touch areas for one-hand Android use.
- Improved focus visibility, disabled-button feedback, phone-width navigation, and workshop-lighting contrast.

### Parts Master

- The template button now downloads the bundled TAGRO Parts Master Template.xlsx file and works without relying on a renamed GitHub URL.
- Excel uploads reject non-Excel files and explain when the spreadsheet reader is unavailable.
- Clear-parts now resets search and filter state visibly.
- The owner Parts Master seed control now becomes a usable retry button when the Worker cannot be reached and checks HTTP success before reporting completion.

### Branch, Dropbox, and offline reliability

- Dropbox job saves use job.branch, preventing owner edits from being written to /ALL/jobs.json.
- Failed saves preserve the correct branch in tagro_pending_sync.
- Owner sync now pulls all seven branch job files and merges by branch plus work order.
- Service worker cache upgraded to tagro-v3.
- PWA paths are relative, so the same files work at a custom domain or a GitHub Pages repository subfolder.
- Navigation uses network-first with cached offline fallback; static assets remain cache-first.
- The bundled Parts Master spreadsheet is included in the offline cache.

### Existing pages preserved

- Restored broken assets/app.css and assets/app.js references on 11 existing pages. No pages or features were removed.

## Compatibility review

Verified frontend contracts against Cloudflare/TAGRO API — Cloudflare Worker v3.txt for OTP, device activation, configuration, staff, models, parts, Dropbox jobs, SMS, and AI routes.

No Cloudflare Worker code or Dropbox file format was changed.

## Verification completed

- Syntax checks passed for all changed JavaScript and inline page scripts.
- A localStorage/Dropbox contract test confirmed tagro_jobs retains its existing shape and sends the correct work order and branch.
- An offline test confirmed failed branch jobs enter tagro_pending_sync under the correct branch.
- An owner-sync test confirmed all seven branches are requested and merged.
- Local page/asset audit passed for the TAGRO application. The unrelated catalogue.html document still contains its pre-existing links to missing coffee-leaf reference pages and was intentionally not rewritten.

## Setup steps

1. Upload the contents of this folder to the GitHub repository root.
2. In GitHub Pages, publish from the repository root as before.
3. On each phone, open TAGRO, choose the device branch once, then tap **Continue to Login**.
4. Existing installed phones may need one refresh or one close/reopen so service worker tagro-v3 takes control.
5. No Cloudflare Worker redeploy is required for these frontend repairs.
