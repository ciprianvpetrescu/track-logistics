import React, { useRef, useEffect } from 'react';
import clsx from 'clsx';
import Panel from '../ui/Panel.jsx';

export default function ScanInput({ value, onChange, onSubmit, feedback }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const state = feedback?.type;

  return (
    <Panel label="Scan Intake" accent ticks status={state === 'error' ? 'REJECT' : state === 'success' ? 'ACCEPT' : 'READY'}>
      <div className="p-3">
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            placeholder="AWAIT BARCODE…"
            className={clsx(
              'w-full bg-[var(--bg-inset)] border-2 px-3 h-14 text-center font-console text-lg tracking-[0.12em] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-dim)] placeholder:tracking-[0.2em] placeholder:text-sm',
              state === 'error'
                ? 'border-[var(--signal-red)]'
                : state === 'success'
                ? 'border-[var(--signal-green)]'
                : 'border-[var(--rule-strong)] focus:border-[var(--accent)]'
            )}
          />
        </form>
        <div className="mt-2.5 h-8 border border-[var(--rule)] bg-[var(--bg-inset)] flex items-center px-2.5">
          {feedback ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={clsx('w-1.5 h-4 shrink-0', feedback.type === 'error' ? 'bg-[var(--signal-red)] blink-slow' : 'bg-[var(--signal-green)]')}
              />
              <span
                className="font-console text-[10px] font-bold uppercase tracking-[0.08em] truncate"
                style={{ color: feedback.type === 'error' ? 'var(--signal-red)' : 'var(--signal-green)' }}
              >
                {feedback.msg}
              </span>
            </div>
          ) : (
            <span className="font-console text-[10px] text-[var(--text-dim)] uppercase tracking-[0.12em]">idle · awaiting input</span>
          )}
        </div>
      </div>
    </Panel>
  );
}
