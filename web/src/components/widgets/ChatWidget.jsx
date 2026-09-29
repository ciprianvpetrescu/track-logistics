import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Send } from 'lucide-react';
import WidgetFrame from './WidgetFrame.jsx';
import { api } from '../../lib/api.js';

export default function ChatWidget({ onClose, messages, profileName }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    api.sendChat(profileName, input).catch(console.error);
    setInput('');
  };

  return (
    <WidgetFrame title="Comms Channel" status={`${messages.length} MSG`} onClose={onClose}>
      <div className="flex-1 overflow-y-auto bg-[var(--bg-inset)] px-1.5 py-1 space-y-0.5">
        {messages.map((msg, idx) => {
          const mine = msg.sender === profileName;
          return (
            <div
              key={idx}
              className={clsx(
                'flex items-baseline gap-1 px-0.5 leading-tight border-l-2',
                mine ? 'border-[var(--accent)]/50' : 'border-transparent'
              )}
            >
              {msg.timestamp && (
                <span className="font-console text-[8px] text-[var(--text-dim)] shrink-0 tabular-nums">{msg.timestamp}</span>
              )}
              <span
                className={clsx(
                  'font-console text-[8px] uppercase tracking-[0.06em] shrink-0',
                  mine ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
                )}
              >
                {msg.sender}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] break-words">{msg.text}</span>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="font-console text-[9px] text-[var(--text-dim)] uppercase tracking-[0.1em] text-center py-6">Channel quiet</div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSend} className="shrink-0 flex border-t border-[var(--rule)]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[var(--bg-surface)] px-2 h-7 text-[10px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dim)]"
          placeholder="Transmit…"
        />
        <button className="w-7 shrink-0 bg-[var(--accent)] text-black flex items-center justify-center hover:bg-[#ff8442] transition-colors">
          <Send className="h-3 w-3" />
        </button>
      </form>
    </WidgetFrame>
  );
}
