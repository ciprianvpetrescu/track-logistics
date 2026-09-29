import React from 'react';
import { Trash2, Cpu, RefreshCw } from 'lucide-react';

const ACTIONS = [
  { id: 'wipe', icon: Trash2, label: 'Purge Global Comms Log', desc: 'Clears chat_history.json on the server', tone: 'danger' },
  { id: 'ai', icon: Cpu, label: 'Flush Analyst Cache', desc: 'Clears locally stored AI conversation', tone: 'normal' },
  { id: 'reset', icon: RefreshCw, label: 'Cold Reset Client', desc: 'Wipes localStorage and reloads the console', tone: 'normal' },
];

export default function SettingsGeneralTab({ onWipeChat, onClearAiCache, onHardReset }) {
  const handlers = { wipe: onWipeChat, ai: onClearAiCache, reset: onHardReset };

  return (
    <div className="divide-y divide-[var(--rule)] border border-[var(--rule)]">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        const danger = a.tone === 'danger';
        return (
          <button
            key={a.id}
            onClick={handlers[a.id]}
            className="w-full flex items-center gap-3 px-3 py-3 text-left bg-[var(--bg-inset)] hover:bg-white/[0.03] transition-colors group"
          >
            <span
              className="w-7 h-7 shrink-0 border flex items-center justify-center"
              style={{
                borderColor: danger ? 'var(--signal-red)' : 'var(--rule-strong)',
                color: danger ? 'var(--signal-red)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span
                className="block font-console text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: danger ? 'var(--signal-red)' : 'var(--text-primary)' }}
              >
                {a.label}
              </span>
              <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">{a.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
