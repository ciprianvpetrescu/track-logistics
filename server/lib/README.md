# server/lib

| File | Purpose |
|---|---|
| `aiRouter.js` | Deterministic intent router behind `POST /api/ai/chat`. Reads the live in-memory ledger directly - no model, no network call. Answers questions about delayed, errored and completed consignments, and about expected-versus-scanned stock. |
| `storefiled.js` | Atomic JSON store: write to a temporary file, then rename, with debounced writes. Used for every persisted collection so a crash mid-save cannot leave a half-written state file behind. |
