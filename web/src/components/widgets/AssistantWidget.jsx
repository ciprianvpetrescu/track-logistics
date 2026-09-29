import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Brain, Send, Trash2, X, Paperclip } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useLocalStorageState } from '../../hooks/useLocalStorageState.js';

const W = 400;
const H = 540;

const DEFAULT_HISTORY = [
  { sender: 'ai', text: 'Assistant online — ask me about the parcels. Try "summary", "how many are delayed", or "status of ticketRef1234".' },
];

const SUGGESTIONS = ['summary', 'how many are delayed', 'which keys are throttled'];

export default function AssistantWidget({ profileName }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useLocalStorageState('assist_brain_pos', null);
  const [history, setHistory] = useLocalStorageState('assist_brain_floating_history', DEFAULT_HISTORY);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0 });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading, open]);

  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      const rh = Math.min(H, window.innerHeight - 80);
      setPos((prev) => {
        const base = prev || { x: window.innerWidth - W - 16, y: window.innerHeight - H - 16 };
        return {
          x: Math.min(Math.max(base.x + dx, 8), Math.max(8, window.innerWidth - W - 8)),
          y: Math.min(Math.max(base.y + dy, 8), Math.max(8, window.innerHeight - rh - 8)),
        };
      });
    };
    const up = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [setPos]);

  const send = async (query) => {
    if (!query.trim() || loading) return;
    setInput('');
    const next = [...history, { sender: 'user', text: query }];
    setHistory(next);
    setLoading(true);
    try {
      const data = await api.assistantChat(query);
      setHistory([...next, { sender: 'ai', text: data.reply || 'No response.' }]);
    } catch {
      setHistory([...next, { sender: 'ai', text: 'ERR · brain unreachable.' }]);
    } finally {
      setLoading(false);
    }
  };

  /* ticketRef list upload: posts the raw file to /api/upload (CourierA/CourierB/ALM),
     the server parses it and the tracking index refreshes. */
  const handleUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    const kind = name.includes('courierB') ? 'courierB' : name.includes('asset') ? 'asset' : 'courierA';
    const next = [...history, { sender: 'user', text: '📤 upload: ' + file.name + ' (' + kind + ')' }];
    setHistory(next);
    setUploading(true);
    try {
      const res = await fetch('/api/upload?type=' + kind, { method: 'POST', body: file });
      const d = await res.json().catch(() => ({}));
      if (d && d.ok) {
        setHistory([...next, { sender: 'ai', text: '✅ ' + file.name + ' ingested as ' + kind.toUpperCase() + ' — trackings refreshed. Ask me about the parcels.' }]);
      } else {
        setHistory([...next, { sender: 'ai', text: '⚠️ Could not read ' + file.name + ' — is it a valid ' + kind.toUpperCase() + ' Excel export? (' + (d.error || 'parse failed') + ')' }]);
      }
    } catch (err) {
      setHistory([...next, { sender: 'ai', text: 'ERR · upload failed: ' + err }]);
    } finally {
      setUploading(false);
    }
  };

  const defaultPos = { x: window.innerWidth - W - 16, y: window.innerHeight - H - 16 };
  const p = pos || defaultPos;

  return (
    <>
      {/* floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Chat with the assistant"
        className={clsx(
          'fixed bottom-5 right-5 z-[940] h-11 w-11 rounded-full flex items-center justify-center border transition-all shadow-[0_4px_24px_rgba(0,0,0,0.6)]',
          open
            ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
            : 'bg-[var(--bg-surface)] text-[var(--accent)] border-[var(--accent)]/50 hover:bg-[var(--accent)]/15'
        )}
      >
        <Brain className="h-5 w-5" />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
      </button>

      {open && (
        <div
          className="fixed z-[950] flex flex-col bg-[var(--bg-surface)] border border-[var(--rule-strong)] rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden"
          style={{ left: p.x, top: p.y, width: Math.min(W, window.innerWidth - 16), height: Math.min(H, window.innerHeight - 80) }}
        >
          {/* draggable header */}
          <div
            onMouseDown={(e) => {
              if (e.target.closest('button')) return;
              dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY };
              e.preventDefault();
            }}
            className="h-9 shrink-0 flex items-center justify-between px-3 bg-[var(--bg-header)] border-b border-[var(--rule)] cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="panel-label">OPERATIONS ASSISTANT</span>
              <span className="panel-label text-[var(--text-muted)]">LIVE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHistory(DEFAULT_HISTORY)}
                title="Wipe local chat"
                className="text-[var(--text-muted)] hover:text-[var(--signal-red)] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--signal-red)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-inset)] p-2.5 space-y-2.5">
            {history.map((msg, idx) => {
              const isAi = msg.sender === 'ai';
              return (
                <div key={idx} className={clsx('flex flex-col', isAi ? 'items-start' : 'items-end')}>
                  <span className="font-console text-[9px] uppercase tracking-[0.1em] text-[var(--text-dim)] mb-0.5">
                    {isAi ? 'ASSIST' : profileName || 'YOU'}
                  </span>
                  <div
                    className={clsx(
                      'px-2 py-1.5 max-w-[92%] text-[11px] leading-relaxed whitespace-pre-wrap border font-console',
                      isAi
                        ? 'bg-[var(--bg-surface)] border-l-2 border-l-[var(--accent)] border-y-[var(--rule)] border-r-[var(--rule)] text-[var(--text-secondary)]'
                        : 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--text-primary)]'
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="font-console text-[10px] text-[var(--accent)] uppercase tracking-[0.12em] blink-slow">▍thinking…</div>
            )}
            <div ref={endRef} />
          </div>

          {/* suggestions */}
          <div className="shrink-0 flex flex-wrap gap-1 px-2 py-1.5 border-t border-[var(--rule)] bg-[var(--bg-surface)]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="px-1.5 py-0.5 border border-[var(--rule)] font-console text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="shrink-0 flex border-t border-[var(--rule)]"
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              disabled={loading || uploading}
              title="Upload ticketRef parcel list (CourierA / CourierB / ALM export)"
              className="w-9 shrink-0 border-r border-[var(--rule)] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-[var(--bg-surface)] px-2.5 h-9 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dim)]"
              placeholder="Ask about the parcels…"
            />
            <button
              disabled={loading}
              className="w-10 shrink-0 bg-[var(--accent)] text-black flex items-center justify-center hover:bg-[#ff8442] transition-colors disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
