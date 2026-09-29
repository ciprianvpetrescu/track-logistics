import React, { useEffect, useRef } from 'react';
import Panel from '../ui/Panel.jsx';

export default function SystemLogTail({ logs }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [logs]);

  return (
    <Panel label="Telemetry" status="STREAM" draggable className="h-full" bodyClass="p-0 overflow-hidden">
      <div className="h-full overflow-y-auto bg-[var(--bg-inset)] px-2 py-1.5 font-console text-[10px] leading-[1.65]">
        {logs.length === 0 && <div className="text-[var(--text-dim)] italic">awaiting telemetry…</div>}
        {logs.slice(-40).map((log, i) => {
          const isErr = /error|fail|throttl|offline/i.test(log);
          const isOk = /success|ingest|parsed|loaded/i.test(log);
          return (
            <div
              key={i}
              className="flex gap-1.5 whitespace-nowrap"
              style={{ color: isErr ? 'var(--signal-red)' : isOk ? 'var(--signal-green)' : 'var(--text-muted)' }}
            >
              <span className="text-[var(--text-dim)] shrink-0">›</span>
              <span className="truncate">{log}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </Panel>
  );
}
