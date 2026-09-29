# Sanitisation

This repository is a copy of an internal tool prepared for publication. The substitutions below were applied mechanically across `server/`, `web/src/` and the docs. Nothing else changed: logic, control flow, module structure and comments are as they were in the running system.

## Brands and endpoints

| Original | Replacement |
|---|---|
| First courier brand | `CourierA` |
| First courier API hostname | `api.courier-a.example` |
| First courier tracking page | `tracking.example-courier.com` |
| Second courier brand | `CourierB` |
| Second courier API hostname | `apis.example-courier.com` |
| Second courier tracking page | `www.example-courier.com/track` |
| Ticketing platform | `Ticket queue` |
| Ticketing instance | `ticket-queue.example.com` |
| Employer name in mail templates | `ACME` |
| Corporate mail domain | `[returns mailbox]` |

## Internal identifiers

Source identifiers were renamed alongside the brands, so that no search of the codebase reconstructs the original deployments.

| Original | Replacement |
|---|---|
| `dhlRecords` / `fedexRecords` | `courierARecords` / `courierBRecords` |
| `dhlApiKeys` / `currentDhlApiMode` | `courierAKeys` / `courierAMode` |
| `fetchDHLTrackingStatus` | `fetchCourierATrackingStatus` |
| `fetchFedExTrackingStatus` | `fetchCourierBTrackingStatus` |
| `FEDEX_CLIENT_ID` / `FEDEX_CLIENT_SECRET` | `COURIER_B_CLIENT_ID` / `COURIER_B_CLIENT_SECRET` |
| `GEOAPIFY_API_KEY` | `GEOCODE_API_KEY` |
| `parseAlmHardwareFile` | `parseAssetExport` |
| `parseExcelDataMatrix` | `parseManifestWorkbook` |
| `stockExpectedList` | `expectedInventory` |

Carrier values in the data (`'dhl'`, `'fedex'`) became `'courierA'` and `'courierB'` throughout, including the record shape and the filename routing.

## Credentials removed

Every credential that appeared as a literal is now an environment variable.

| Credential | Environment variable |
|---|---|
| Four courier A API keys | `COURIER_API_KEYS`, comma-separated pool |
| Courier B OAuth2 client id and secret | `COURIER_CLIENT_ID`, `COURIER_CLIENT_SECRET` |
| Geocoding key | `GEOCODE_API_KEY` |
| Basic-auth password on a dead code path | `change-me` |

The basic-auth middleware was already commented out in the running system - authentication happens at a reverse proxy in front of the app - so it stays commented out here with a placeholder rather than being deleted, because removing it would misrepresent how the tool is deployed.

**If you had access to the original and are reading this to check for leaks: the four courier keys should be rotated regardless.** They were removed from this repository, but they existed in plaintext in the source before publication.

## Data removed

No live data is included. The state files ship as empty samples.

| Removed | Kept |
|---|---|
| `notes.json` with real ticket notes | `notes.sample.json` containing `{}` |
| `records_cache.json` with real consignments | `records_cache.sample.json` with empty arrays |
| `updates.json`, `chat_history.json`, `workspace_notes.json` | Empty sample equivalents |
| `templates.json` with branded mail bodies | Not included |
| Exported workbooks | Not included |
| Backup files and timestamped template snapshots | Not included |

## Left in place, deliberately

Two things were not sanitised, because removing them would misrepresent the tool.

**The proxy-bypass TLS agent.** The running system sets `rejectUnauthorized: false` on outbound requests. That is a real property of the deployment, it is visible in any copy of the source, and a reader deserves to find it rather than discover it was quietly removed from the published version. It is not good practice, and the source says so.

**The carrier-specific quirks.** The 429 handling, the error-inside-200 pattern, the different location field paths. These are the actual content of the integration work. Generalising them into a tidy abstraction would delete the interesting part.
