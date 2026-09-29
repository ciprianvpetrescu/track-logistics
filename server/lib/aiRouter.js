// Rule-based intent router for /api/ai/chat — no external LLM, no local
// model inference. Answers are grounded in the live in-memory tracking
// state so responses are always factually correct, just not generative.

const DELAY_KEYWORDS = ['awaiting collection', 'pickup', 'not collected', 'no tracking', 'pending manual sync'];
const ERROR_KEYWORDS = ['🔴', 'throttled', 'offline', 'error', 'quota', 'not found'];

function isDelayed(row) {
  const out = String(row.outboundStatus || '').toLowerCase();
  return DELAY_KEYWORDS.some((kw) => out.includes(kw));
}

function isErrored(row) {
  const out = String(row.outboundStatus || '').toLowerCase();
  const ret = String(row.returnStatus || '').toLowerCase();
  return ERROR_KEYWORDS.some((kw) => out.includes(kw) || ret.includes(kw));
}

function findTicketRefToken(message) {
  const match = message.match(/[A-Za-z]{2,6}\d{4,}/);
  return match ? match[0].toUpperCase() : null;
}

function describeRecord(row) {
  const lines = [`**${row.ticketRef}** — ${row.name || 'Unassigned'}`];
  lines.push(`Outbound: ${row.outboundStatus || 'Unknown'} via ${row.carrier?.toUpperCase() || '?'}${row.outboundTrk && row.outboundTrk !== '-' ? ` (#${row.outboundTrk})` : ''}`);
  if (row.returnTrk && row.returnTrk !== '-') {
    lines.push(`Return: ${row.returnStatus || 'Unknown'} (#${row.returnTrk})`);
  } else {
    lines.push('Return: not required / not yet initiated');
  }
  if (row.location) lines.push(`Last known location: ${row.location}`);
  return lines.join('\n');
}

function answerQuery(message, state) {
  const { courierARecords = [], courierBRecords = [], expectedInventory = [], courierAKeys = [] } = state;
  const allRecords = [...courierARecords, ...courierBRecords];
  const q = String(message || '').trim().toLowerCase();

  const ticketRefToken = findTicketRefToken(message);
  if (ticketRefToken) {
    const row = allRecords.find((r) => String(r.ticketRef).toUpperCase() === ticketRefToken);
    if (row) return describeRecord(row);
    return `I couldn't find a tracking record for **${ticketRefToken}**. It may not have been ingested yet.`;
  }

  if (q.includes('throttle') || q.includes('quota') || q.includes('which key')) {
    const bad = courierAKeys.filter((k) => k.status !== 'OK');
    if (bad.length === 0) return '✅ All CourierA API keys are currently healthy (OK).';
    return `⚠️ ${bad.length} CourierA API key(s) are degraded: ${bad.map((k) => `Key ${k.id} (${k.status})`).join(', ')}.`;
  }

  if (q.includes('delay') || q.includes('awaiting') || q.includes('stuck')) {
    const delayed = allRecords.filter(isDelayed);
    if (delayed.length === 0) return '✅ No shipments are currently awaiting collection or stuck without tracking.';
    const list = delayed.slice(0, 6).map((r) => `${r.ticketRef} (${r.carrier.toUpperCase()}, ${r.outboundStatus})`).join('; ');
    return `📦 **${delayed.length} shipment(s) are currently delayed**: ${list}${delayed.length > 6 ? ', ...' : ''}`;
  }

  if (q.includes('error') || q.includes('fail')) {
    const errored = allRecords.filter(isErrored);
    if (errored.length === 0) return '✅ No shipments are currently reporting API/tracking errors.';
    const list = errored.slice(0, 6).map((r) => r.ticketRef).join(', ');
    return `🔴 **${errored.length} record(s) have tracking errors**: ${list}${errored.length > 6 ? ', ...' : ''}`;
  }

  if (['how many', 'total', 'count', 'metrics', 'inventory', 'summary'].some((kw) => q.includes(kw))) {
    const delayedCount = allRecords.filter(isDelayed).length;
    const erroredCount = allRecords.filter(isErrored).length;
    return [
      '📊 **Operations Summary**',
      `• Trackings indexed: **${allRecords.length}** (CourierA: ${courierARecords.length}, CourierB: ${courierBRecords.length})`,
      `• Delayed / awaiting collection: **${delayedCount}**`,
      `• Reporting errors: **${erroredCount}**`,
      `• Stock items expected (ALM): **${expectedInventory.length}**`,
    ].join('\n');
  }

  return "🤖 I can answer questions grounded in live data — try \"how many are delayed\", \"status of ticketRef1234\", \"which keys are throttled\", or \"give me a summary\".";
}

module.exports = { answerQuery };
