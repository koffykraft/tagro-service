# TAGRO Service App Change Notes

Date: 2026-09-01

Source: Owner mobile review screenshots and notes.

## Status

Documentation only. Do not treat this file as implementation.

## Notes to carry forward

### 0. Parts Search correction pass

Implemented in commit after owner review:
- Parts Search should not show explanatory narrative blocks in the working area.
- Parts Search should start with purpose, job/machine context and urgency.
- Results should be tap-to-select.
- Quantity should be adjustable before selection and in the basket.
- Basket should show part number, HSN, GST, price, quantity and totals.
- `Purchase Requests` and `PO` should not compete as separate names. Use `PO`.

Still to review after mobile testing:
- Whether purpose options should be Estimate, Job, PO, Urgent, Reorder, Reference or a shorter shop-language set.
- Whether the selected job/machine list should show only active jobs by default.
- Whether PO basket should become the only purchase entry route.

### 1. Duplicate navigation language

Problem:
- `Accept Machine` and `Receive` currently point to the same function.
- In the Apps dropdown this creates confusion because both words may be used for the same door.

Decision needed:
- Use one main action label consistently.
- Suggested staff-facing label: `Receive Machine`.
- Optional short label for bottom navigation: `Receive`.

### 2. Tile placement and dropdowns

Problem:
- Some tile groups take too much vertical space on mobile.
- Inspection already works better inside a dropdown/collapsible area.

Requested direction:
- Machine model should have both:
  - dropdown
  - quick tiles
- Complaint should also be available as:
  - dropdown/collapsible tile area
  - manual text field
- Inspection and work notes can remain tucked away unless needed.

Design intent:
- Prime screen space should go to the immediate intake fields.
- Extra tile banks should not push important fields too far down.

### 3. Parts search selection friction

Problem:
- Current parts search flow requires too many steps:
  - type search
  - close keyboard / press tick
  - tap Add PO request
  - return to typing
  - repeat
- This is painful on phone.

Requested direction:
- Tapping the item card itself should select/add the item.
- Avoid needing a separate `Add PO request` button for the common path.
- Keep a secondary action only when needed.

### 4. Quantity capture at selection time

Problem:
- PO requires quantity.
- If quantity is not captured while selecting the item, staff may have to revisit the list later.

Requested direction:
- Parts search result should allow fast quantity selection.
- Possible pattern:
  - item card tap adds Qty 1 immediately
  - small `+` and `-` controls appear on selected item
  - quantity pill on the item card
  - optional long press or edit for exact quantity

Design intent:
- Select part and quantity in the same flow.
- Do not make staff reopen the same search result just to adjust quantity.

### 5. PO flow

Problem:
- If parts are being added for PO, item and quantity should be captured together.

Requested direction:
- Parts Search page should support a PO basket.
- Basket should show:
  - part number
  - item name
  - HSN
  - GST
  - price
  - quantity
  - line total
- PO request should be created from the basket, not one isolated button at a time.

### 6. More edits expected

Owner note:
- There may be more edits.

Working instruction:
- Treat these notes as a pending change list.
- Do not close the design pass after only these items.
- Continue collecting friction observations before major integration with OS.

## TAGARCH boundary

Owned by Service App:
- intake workflow
- service desk tiles
- work card usability
- parts search interaction for operational selection
- PO request preparation screen

Owned elsewhere:
- canonical parts import
- canonical price update
- real supplier PO generation
- Busy write-back
- shared OS/service unification decision
