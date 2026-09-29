# web

The React front end. Built with Vite, styled with Tailwind, no component library - the `components/ui/` primitives are the whole kit.

## Module map

| Path | Contains |
|---|---|
| `src/components/dashboard/` | Command centre: tile readouts, the consignment map, the API-key health strip, the log tail, draggable panel frames |
| `src/components/ledger/` | The consignment table, the follow-ups tab, the embedded web desk, filter chips |
| `src/components/scanner/` | Stock reconciliation: scan input, ledger table, manifest import, screenshot pad |
| `src/components/fastreply/` | Mail template library, variable form, template cards |
| `src/components/widgets/` | Dockable panels - assistant, notes, chat, dock |
| `src/components/modals/` | Settings, template engine, profile |
| `src/components/layout/` | Top bar, module switcher |
| `src/lib/` | API client, classification rules, manifest parsing, exporters, mailto, clipboard |
| `src/hooks/` | Polling, debounced callbacks, toasts, command palette, persisted layout |

## Conventions

**State lives in `App.jsx`; components receive props.** Views are presentational. The one exception is panel geometry and other purely visual preferences, which persist through `useLocalStorageState` so they follow the operator rather than the session.

**Classification is imported, never reimplemented.** Anywhere a row needs a colour, a label or a sort key, it calls into `src/lib/priority.js`. Reimplementing a rule inside a component is how the table and the tile above it end up disagreeing.

**API paths are relative.** The client has no host constant. Hardcoding one broke the dashboard behind a reverse proxy once, and the lesson was that a same-origin relative fetch works everywhere while an absolute one works in exactly one place.
