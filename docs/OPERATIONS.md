# Operations

## Starting it

```bash
npm run dev        # server + vite, development
npm start          # production: API server plus built front end
```

The server listens on `PORT` (default 5000). The front end is served from `web/dist` when built, or by Vite in development.

## Daily use

1. Export the consignment manifest and let it land in the download folder. The dashboard picks it up a few seconds after the file finishes writing.
2. The ledger populates. Rows with no carrier data sit at `Pending Manual Sync`.
3. Use **Refresh all visible** to poll the carrier for everything on screen, or the per-row refresh for one consignment.
4. Work the ledger top-down. Rank 1 rows are collections that have not happened, and they go stale fastest.
5. Leave a note on anything you had to chase. The note survives the next upload.

## Reconciling stock

1. Export the expected inventory and let it land in the download folder.
2. Switch to the scanner module and scan serials in.
3. Filter to outstanding only to see what has not been found yet.
4. Export CSV when done. The serials-only export is the one to hand to anybody who does not need the classification.

## When something looks wrong

**Rows stuck at Pending Manual Sync.** No poll has succeeded. Check the key strip first: a fully exhausted pool explains it with no further investigation.

**A row shows faulted.** Either the carrier answered and does not know the number, or the carrier did not answer. The status text distinguishes the two. Read it before acting.

**A status changed with no shipment movement.** Suspect the merge. It matches on ticket reference, so a manifest whose ticket column changed will produce rows that do not pair up with their previous state. Check that the reference is still in a recognised column.

**Notes appear to have vanished.** They are keyed by ticket reference. If the reference changed in the sheet, the notes are still on disk under the old key. Look in `notes.json` before re-entering anything.

**Map pins are in the wrong place.** Pins come from forward-geocoding the locality string, with a deterministic fallback for rows that never got coordinates. A pin sitting at a fallback position means the geocode failed for that row, not that the shipment moved.

## Maintenance

There is no scheduled job. The state files are flat JSON and can be inspected, backed up or truncated directly. Rotating `chat_history.json` and `workspace_notes.json` now and then keeps the state payload small, which is the main thing that affects UI responsiveness.

If the ledger is wrong in a way you cannot explain, deleting `records_cache.json` and re-uploading the current manifest produces a clean rebuild. Notes and journals live in separate files and are not affected.
