# Carrier integration

The two networks are integrated differently because they behave differently. Both are reduced to the same internal row before anything else sees them.

## Courier A

**Auth.** A static API key per request, supplied as a request header.

**Quota.** Enforced per key. A key answering `429` is exhausted.

The server holds a pool of keys (`COURIER_API_KEYS`, comma-separated) and walks it in order. A key that answers 429 is flagged `QUOTA_EXCEEDED` and skipped on later calls. Switching the pool back to `AUTO` mode re-arms every key. If auto mode finds the pool empty it re-arms once and retries, rather than failing permanently on one bad minute.

**Responses.**

| HTTP | Interpretation |
|---|---|
| 200 with shipments | Normal - read the status description and the locality |
| 404 | The carrier does not know this number |
| 429 | This key is exhausted, try the next |
| anything else | Transient - keep the last known state and flag the row |

Return-leg statuses get a delivered marker prefixed. A delivered return is the good outcome and should be visually distinct from a delivered outbound.

## Courier B

**Auth.** OAuth2 client-credentials. A token is fetched per call rather than cached; at this volume the extra round trip is cheaper than maintaining expiry state correctly.

**Errors.** Courier B reports application-level failures inside a `200` body. A successful HTTP response is not evidence of a successful lookup, so the body must be inspected for an error object before its contents are trusted. This is the single most common way an integration against this network silently reports nothing found.

**Responses.** Reads `output.completeTrackResults[0].trackResults[0]`, then the status description and the scan city. Location is only present on scans that have one; a status with no location is normal and does not indicate a problem.

## Key health surface

The dashboard exposes pool state directly: which keys exist, each key's status (`OK` or `QUOTA_EXCEEDED`), and the current mode. A success-rate readout derived from the last poll batch drives a nominal or degraded flag.

This exists because the most common question during an incident is *is this the carrier or is this us*, and the answer is usually visible in the key strip before it is visible anywhere else.

## Adding a carrier

1. Add a fetch function returning status and location for one tracking number.
2. Add a routing branch in the poller.
3. Add a filename marker in the watcher.
4. Extend `lib/priority.js` only if the new network uses status vocabulary the keywords do not already cover.

The first three are local. The fourth is the one to think about, and it is the reason classification lives in exactly one file.
