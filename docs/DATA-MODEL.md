# Data model

## The consignment record

One record per ticket per direction-pair. This is the shape every module works against.

| Field | Type | Notes |
|---|---|---|
| `carrier` | `courierA` or `courierB` | Which network the outbound leg rides on |
| `ticketRef` | string | Ticket reference. The record key everywhere |
| `name` | string | Assigned operator, or `Unassigned` |
| `outboundTrk` | string | Tracking number, or `-` if none has been generated |
| `outboundStatus` | string | Normalised status text for the outbound leg |
| `returnTrk` | string | Return tracking number, or `-` |
| `returnStatus` | string | Normalised status text for the return leg |
| `location` | string | Last scan locality, or `Awaiting Live Data...` |
| `coords` | `[lat, lng]` or null | Geocoded from `location`, cached on the record |
| `note` | string | Inline operator note, resolved from the notes store at read time |
| `rank` | number | Sort priority, derived at parse time |

### Sentinel values

These strings carry meaning and are matched literally. They are not decoration.

| Value | Meaning |
|---|---|
| `-` | No tracking number exists for that leg |
| `No Tracking Generated` | Outbound leg not yet booked |
| `No Return Required` | Return leg closed by policy rather than by delivery |
| `Pending Manual Sync...` | No carrier data yet |
| `Awaiting Live Data...` | No scan location yet |
| red ERROR: NOT FOUND / NO SCANS | The carrier answered, and does not know this number |
| red ERROR: OFFLINE / PROXY THROTTLED | The carrier did not answer |

The distinction between the last two matters. *Not found* is a fact about the shipment. *Offline* is a fact about the network. Collapsing them sends somebody hunting for a parcel that never existed.

## Derived state

`lib/priority.js` is the single classification layer. For any row it answers:

- `isAwaitingCollection` - status matches awaiting, pickup or no-scan keywords
- `isRowCompletedLifecycle` - outbound delivered AND the return leg is either absent or delivered
- `isRowCompletedOutboundOnly` - outbound delivered, return still outstanding
- `isShippingInTransit` - none of the above
- `getOutboundState` - one of `transit`, `delivered`, `awaiting`, `fault`, for colouring
- `getRowSortRank` - 1 to 5, the ledger sort key

`OUTBOUND_STATE_META` carries the label, short label, colour variable and blink flag for each state. Blinking is reserved for `fault`, the only state that needs attention without the operator reading anything.

## Side stores

**Notes** - `{ [ticket]: string }`. Deliberately separate from the record, so a note cannot be lost by a re-upload. The read path prefers the store and falls back to the record's own `note` field for records that predate it.

**Case journal** - `{ [ticket]: [{ id, text, author, timestamp, timeMs }] }`. Append-only from the UI's point of view; deletion is per-entry by `id`.

**Alerts** - pulled from the ticket queue separately and rendered in the Follow-Ups tab. These are not consignments and are never merged into the ledger.

**Expected inventory** - `[{ serial, category, model, state, substate }]`, loaded from an asset export. Column matching is alias-based (`serial number`, `serial no.` and `serial` all resolve) because these exports get re-saved by hand and the headers drift.

## Scan results

Each scanned serial produces a match status against the expected list:

| Status | Meaning |
|---|---|
| `TRUE` | Serial found in the expected list |
| `FALSE` | Scanned but not expected - needs investigation |
| unmatched | Expected but never scanned - needs chasing |

The two failure directions are kept apart because they have different owners. An unexpected item is usually a paperwork problem. A missing item is usually a location problem.
