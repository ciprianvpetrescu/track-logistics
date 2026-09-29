# Architecture

## Processes

Two, plus whatever serves the download folder.

| Process | Entry | Responsibility |
|---|---|---|
| API server | `server/server.js` | File watching, workbook parsing, carrier polling, state, template storage |
| Web app | `web/` (Vite) | Rendering, polling, all operator interaction |

The server is the only thing that talks to the outside world. The browser never calls a carrier API directly; it reads `/api/state` and posts actions. That keeps credentials on one side of the boundary, and it means a carrier outage degrades the UI instead of breaking it.

## Request flow

```
browser  --GET  /api/state---------->  express  --> in-memory ledger
browser  --POST /api/refresh-single->  express  --> carrier API x2 --> ledger
browser  --POST /api/save-note------>  express  --> notes store (debounced)
watcher  --file add / change-------->  parser   --> merge into ledger
```

The front end polls on a fixed interval rather than using websockets. At this scale the state payload is a few hundred kilobytes and a socket buys nothing except reconnection logic. Polling also self-heals: the next tick simply carries the current truth.

## Ingest

`chokidar` watches the download directory at depth 0. On `add` or `change`:

1. The filename is matched against the routing patterns (`MANIFEST_PATTERNS`, `INVENTORY_PATTERNS`) and the second carrier marker.
2. Partial-download suffixes are discarded.
3. The read is retried on `EBUSY`. A browser writing a workbook still holds it open, so a lock error is the normal case, not an exception.
4. The workbook is parsed, normalised into the internal row shape, and merged into the ledger.

On boot the same directory is scanned once and the newest matching workbook of each kind is loaded, so a restart does not leave the dashboard empty until somebody downloads something.

## Merge semantics

For each incoming row the parser resolves the ticket reference, then looks for an existing record with the same reference **in the same carrier list**. If one exists, these fields are carried forward:

- `outboundStatus`, `returnStatus`
- `location`, `coords`
- `note`

Everything else comes from the sheet. A row with no match is new and starts at `Pending Manual Sync`.

Carried-forward fields are taken from the record, not the sheet, on purpose. A sheet can be re-exported at any time with stale columns; the record holds what the carrier last actually said.

## Polling

`POST /api/refresh-single` polls both legs of one consignment. Outbound and return are independent calls and can disagree - a delivered replacement with a never-collected return is common, and the ledger models it explicitly rather than collapsing it into one status.

Courier A walks its key pool on every request and parks any key that answers 429. Courier B fetches an OAuth2 token per call, which is simpler than caching and removes a whole class of expiry-tracking bugs at this volume.

## Persistence

Flat JSON, written atomically through `lib/storefiled.js`: write to `.tmp`, then `rename`. Writes are debounced, so a burst of note edits produces one disk write.

| File | Contents |
|---|---|
| `records_cache.json` | Last known ledger, so a restart restores state |
| `notes.json` | Inline operator notes, keyed by ticket reference |
| `updates.json` | Case journals, keyed by ticket reference |
| `chat_history.json` | Assistant conversation |
| `workspace_notes.json` | Free-form notepad tabs |
| `templates.json` | Mail template library |
| `deleted_threads.json` | Suppressed alert threads |

None of these is authoritative for anything a carrier owns. They are all operation-local and can be deleted without corrupting the system.

## Front end

`App.jsx` holds the module shell and the polling state. `hooks/usePolledState.js` owns the fetch loop. Everything under `components/` is presentational and receives data plus callbacks as props. Derived classification lives in `lib/priority.js` rather than in components, which is what lets the ledger, the filter chips and the dashboard counters agree by construction.
