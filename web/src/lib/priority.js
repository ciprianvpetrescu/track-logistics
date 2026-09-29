const AWAITING_KEYWORDS = ['awaiting collection', 'pickup', 'not collected', 'no tracking', 'pending manual sync'];
const RETURN_FAULT_KEYWORDS = ['🔴', 'throttled', 'offline', 'error', 'quota', 'not found'];

export const isAwaitingCollection = (row) =>
  AWAITING_KEYWORDS.some((kw) => String(row.outboundStatus || '').toLowerCase().includes(kw));

export const isRowCompletedLifecycle = (row) =>
  String(row.outboundStatus || '').toLowerCase().includes('delivered') &&
  (row.returnTrk === '-' ||
    row.returnTrk === '' ||
    String(row.returnStatus || '').toLowerCase().includes('no return required') ||
    String(row.returnStatus || '').toLowerCase().includes('delivered'));

export const isRowCompletedOutboundOnly = (row) =>
  String(row.outboundStatus || '').toLowerCase().includes('delivered') && !isRowCompletedLifecycle(row);

export const isShippingInTransit = (row) =>
  !isAwaitingCollection(row) && !isRowCompletedLifecycle(row) && !isRowCompletedOutboundOnly(row);

export const getRowSortRank = (row) => {
  if (isAwaitingCollection(row)) return 1;
  if (isShippingInTransit(row)) return 2;
  if (isRowCompletedOutboundOnly(row)) return 3;
  if (isRowCompletedLifecycle(row)) return 4;
  return 5;
};

/* ------------------------------------------------------------------
   Outbound leg colour states.

   Single source of truth: the ledger row indicator, the status filter
   chips and the dashboard counters all derive from this, so a row can
   never be painted one colour and counted under another.
   ------------------------------------------------------------------ */

export const OUTBOUND_STATES = ['transit', 'delivered', 'awaiting', 'fault'];

export const OUTBOUND_STATE_META = {
  transit: { label: 'In Transit', short: 'Transit', color: 'var(--signal-amber)', blink: false },
  delivered: { label: 'Delivered', short: 'Delivered', color: 'var(--signal-green)', blink: false },
  awaiting: { label: 'Awaiting Collection', short: 'Awaiting', color: 'var(--signal-red)', blink: false },
  fault: { label: 'Faulted / No Scans', short: 'Faulted', color: 'var(--signal-red)', blink: true },
};

export function getOutboundState(row) {
  const s = String(row.outboundStatus || '').toLowerCase();
  if (s.includes('🔴')) return 'fault';
  if (AWAITING_KEYWORDS.some((kw) => s.includes(kw))) return 'awaiting';
  if (s.includes('delivered')) return 'delivered';
  return 'transit';
}

export function getReturnTone(status) {
  const s = String(status || '').toLowerCase();
  if (RETURN_FAULT_KEYWORDS.some((kw) => s.includes(kw))) return { color: 'var(--signal-red)', blink: true };
  if (s.includes('delivered') || s.includes('🟢')) return { color: 'var(--signal-green)', blink: false };
  if (s === '-' || s.includes('no track') || s.includes('no return required') || s.includes('pending manual sync'))
    return { color: 'var(--text-dim)', blink: false };
  return { color: 'var(--signal-amber)', blink: false };
}

export function countByOutboundState(rows) {
  const counts = { transit: 0, delivered: 0, awaiting: 0, fault: 0 };
  rows.forEach((row) => {
    counts[getOutboundState(row)] += 1;
  });
  return counts;
}
