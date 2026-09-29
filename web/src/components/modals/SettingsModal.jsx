import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import ModalShell from './ModalShell.jsx';
import SettingsGeneralTab from './SettingsGeneralTab.jsx';
import TemplateEngineTab from './TemplateEngineTab.jsx';

const TABS = [
  { id: 'general', label: 'System' },
  { id: 'templates', label: 'Templates' },
];

export default function SettingsModal({
  open,
  onClose,
  templates,
  onSaveTemplates,
  onWipeChat,
  onClearAiCache,
  onHardReset,
  initialTab = 'general',
}) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <ModalShell open={open} onClose={onClose} title="Console Settings" widthClass="w-[620px] h-[600px]">
      <div className="flex items-stretch bg-[var(--bg-header)] border-b border-[var(--rule)] h-8 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'relative px-4 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.12em] transition-colors',
              tab === t.id ? 'text-[var(--accent)] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            {tab === t.id && <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />}
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {tab === 'general' ? (
          <SettingsGeneralTab onWipeChat={onWipeChat} onClearAiCache={onClearAiCache} onHardReset={onHardReset} />
        ) : (
          <TemplateEngineTab templates={templates} onSaveTemplates={onSaveTemplates} />
        )}
      </div>
    </ModalShell>
  );
}
