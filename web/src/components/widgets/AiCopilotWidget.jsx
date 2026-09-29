import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Send } from 'lucide-react';
import WidgetFrame from './WidgetFrame.jsx';
import { api } from '../../lib/api.js';
import { useLocalStorageState } from '../../hooks/useLocalStorageState.js';

const DEFAULT_HISTORY = [
  { sender: 'ai', text: 'Assistant online — answers come from the live consignment index. Try "summary", "how many are delayed", or "status of ticketRef1234".' },
];

const SUGGESTIONS = ['summary', 'how many are delayed', 'which keys are throttled'];

export default function AiCopilotWidget({ onClose, profileName }) {
  const [history, setHistory] = useLocalStorageState('isolated_console_ai_history', DEFAULT_HISTORY);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

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

  return (
    <WidgetFrame title="OPERATIONS ASSISTANT" status="LOCAL" onClose={onClose}>
      <div className="flex-1 overflow-y-auto bg-[var(--bg-inset)] p-2.5 space-y-2.5">
        {history.map((msg, idx) => {
          const isAi = msg.sender === 'ai';
          return (
            <div key={idx} className={clsx('flex flex-col', isAi ? 'items-start' : 'items-end')}>
              <span className="font-console text-[9px] uppercase tracking-[0.1em] text-[var(--text-dim)] mb-0.5">
                {isAi ? 'ASSIST' : 'OPERATOR'}
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
          <div className="font-console text-[10px] text-[var(--accent)] uppercase tracking-[0.12em] blink-slow">▍querying index…</div>
        )}
        <div ref={endRef} />
      </div>

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="shrink-0 flex border-t border-[var(--rule)]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-[var(--bg-surface)] px-2.5 h-9 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dim)]"
          placeholder="Query consignment index…"
        />
        <button
          disabled={loading}
          className="w-10 shrink-0 bg-[var(--accent)] text-black flex items-center justify-center hover:bg-[#ff8442] transition-colors disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </WidgetFrame>
  );
}
