// Same-origin API calls. The old hardcoded `http://${HOST}:5000` broke the
// dashboard through the Cloudflare tunnel (no port 5000 exposed there) — every
// API call failed, so shipments + chat vanished. Empty BASE = relative URLs,
// which work on localhost AND behind the tunnel/portal.
const BASE = '';

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return res.json().catch(() => ({}));
}

export const api = {
  base: BASE,
  getState: () => fetch(`${BASE}/api/state`).then((r) => r.json()),
  setApiMode: (mode) => postJson('/api/set-api-mode', { mode }),
  refreshSingle: (ticketRef, carrier) => postJson('/api/refresh-single', { ticketRef, carrier }),
  saveNote: (ticketRef, note) => postJson('/api/save-note', { ticketRef, note }),
  sendChat: (sender, text) => postJson('/api/chat/send', { sender, text }),
  wipeChat: () => postJson('/api/chat/wipe'),
  deleteThread: (threadId) => postJson('/api/delete-thread', { threadId }),
  saveWorkspaceNotes: (notes) => postJson('/api/workspace-note/save', { notes }),
  aiChat: (message, operatorName) => postJson('/api/ai/chat', { message, operatorName }),
  assistantChat: (message) => postJson('/api/chat', { message }), // routes to the rule-based router over live state
  addUpdate: (ticketRef, text, author) => postJson('/api/updates/add', { ticketRef, text, author }),
  deleteUpdate: (ticketRef, id) => postJson('/api/updates/delete', { ticketRef, id }),
};
