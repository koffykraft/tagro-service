# TAGRO OS Service App Mind Map

Last updated: 2026-08-31

## All-page map

TAGRO OS Service App is the operational layer for machine repair work.

```
Login
  -> Home
      -> Accept Machine
          -> Customer info
          -> Machine info
          -> Complaint tiles plus note
          -> Inspection tiles plus note
          -> Work tiles plus note
          -> Parts search
          -> Labour tiles
          -> Save service record
              -> Work Card
                  -> Status movement
                  -> Billing material
                  -> WhatsApp or call
      -> Job Tracker
          -> Queue
          -> Approval
          -> Waiting Parts
          -> Ready
          -> Review
          -> Exceptions
      -> Parts Search
          -> TAGRO alias search
          -> STIHL number search
          -> Price, HSN, GST check
          -> PO request
      -> Purchase Requests
          -> Open
          -> Ordered
          -> Done
      -> Reports
          -> Open jobs
          -> Ready jobs
          -> Waiting parts
          -> Bill-ready material
      -> Settings and More
          -> Branch and staff view
          -> Data health
          -> All screen links
```

## Core rule

Staff should not need to remember where to go next. Each saved machine record opens a work card. Each work card carries the customer, machine, complaint, inspection, work, parts, labour, status and billing material together.

## Page maps

### login.html

Purpose: authenticate staff or owner/admin.

Required:
- Branch choice
- Staff choice
- PIN
- Owner/Admin route

Produces:
- Current device session

### home.html, index.html, root-index.html

Purpose: daily cockpit.

Shows:
- Open workshop count
- Ready count
- Waiting parts count
- Main app tiles
- Risk jobs
- Recently touched jobs

### service-desk.html, receive.html, quick.html, scan.html

Purpose: accept a machine and create the operational service record.

Required:
- Customer phone
- Customer name
- Machine model
- Complaint

Optional:
- Place
- Serial number
- Accessories received
- Inspection observation
- Work done
- Parts
- Labour
- Advance

Produces:
- Customer record
- Machine record inside customer history
- Service job
- Estimate material when parts/labour are added

### tracker.html

Purpose: all visible jobs for the logged-in branch or owner.

Shows:
- Work order
- Customer
- Machine
- Complaint
- Status
- Estimate total

### queue.html and tech.html

Purpose: active workshop work.

Includes:
- Received
- Inspection
- Estimate Ready
- Approved
- Working
- Waiting Parts

Excludes:
- Ready
- Delivered

### approval.html

Purpose: estimates waiting for approval.

Includes:
- Jobs with status Estimate Ready

### hold.html

Purpose: jobs blocked by parts.

Includes:
- Jobs with status Waiting Parts

### ready.html

Purpose: machines ready for pickup or billing.

Includes:
- Jobs with status Ready

### review.html

Purpose: quality check before the day ends.

Includes:
- Jobs with missing important information
- Jobs waiting for attention

### exceptions.html

Purpose: strict missing-data view.

Includes:
- Missing phone
- Missing customer
- Missing model
- Missing complaint

### work.html, job.html, estimate.html

Purpose: one machine work card.

Shows:
- Customer and machine info
- Complaint, observation and work done
- Parts and labour lines
- GST estimate total
- Status buttons
- Print
- WhatsApp update
- Billing material preparation

Produces:
- Updated service job
- Bill-ready marker

### reference.html, staff-parts.html, parts.html, catalog.html, catalogue.html, interactive_catalog_viewer.html, bench.html

Purpose: read-only parts and reference lookup.

Consumes:
- Canonical parts data from the existing parts cache/API
- TAGRO aliases
- STIHL names and numbers
- Price, HSN and GST

Produces:
- Local PO request when user taps Add PO request

Boundary:
- Does not import price lists.
- Does not create canonical catalog data.
- Diagrams, manuals and images need Data Import and Infrastructure evidence locations.

### purchase.html

Purpose: operational purchase request board.

Shows:
- Open requests
- Ordered requests
- Done requests

Boundary:
- This is not yet supplier PO generation.
- This does not write to Busy.
- This does not receive stock.

### reports.html and daily.html

Purpose: simple operational status view.

Shows:
- Open count
- Ready count
- Waiting parts count
- Estimate value
- Bill-ready material

Boundary:
- Does not own analytics, margin intelligence or family report delivery.

### config.html, setup.html, staff-admin.html

Purpose: safe device and staff visibility.

Shows:
- Current branch
- Current user
- Cached parts count
- Pending cloud sync count
- Staff list for branch when cached

Boundary:
- Does not become the full Infrastructure admin console.

### more.html, links.html, handbook.html, test.html

Purpose: support pages.

Shows:
- All screen links
- Useful external links
- Basic data health checks

## Data ownership boundaries

### Owned here

- Service intake UI
- Work card UI
- Operational job status
- Estimate and bill-ready material
- Staff-friendly search and flow

### Consumed here

- Canonical parts and price data
- Staff list
- Machine model list
- Cloud job sync helper

### Owned elsewhere

- Canonical import of price lists and aliases: TAGRO Data Import
- Cloudflare infrastructure, D1, R2, auth and APIs: Infrastructure
- Busy read/write and accounting connector: Busy Bridge or Infrastructure
- Dashboards and business intelligence: TAGRO Intelligence
- Daily WhatsApp/PDF/family delivery: TAGRO Daily
