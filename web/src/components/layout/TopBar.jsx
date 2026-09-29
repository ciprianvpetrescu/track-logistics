import React from 'react';
import clsx from 'clsx';
import { LayoutDashboard, Barcode, MessageSquare, StickyNote, Cpu, Settings, Search } from 'lucide-react';

const MODULES = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Logistics' },
  { id: 'scanner', icon: Barcode, label: 'Inventory' },
];

const WIDGETS = [
  { id: 'chat', icon: MessageSquare, label: 'Comms' },
  { id: 'notepad', icon: StickyNote, label: 'Notes' },
  { id: 'ai', icon: Cpu, label: 'Analyst' },
];

export default function TopBar({
  activeModule,
  onSelectModule,
  activeWidget,
  onToggleWidget,
  chatUnreadCount,
  connectionStatus,
  profileName,
  avatarUrl,
  onOpenSettings,
  onOpenProfile,
  onOpenPalette,
}) {
  const live = connectionStatus === 'Live';

  return (
    <header className="h-12 shrink-0 flex items-stretch bg-[var(--bg-surface)] border-b border-[var(--rule)] z-40 relative">
      {/* Identity block */}
      <div className="flex items-center gap-2.5 px-3 border-r border-[var(--rule)]">
        <div className="w-5 h-5 bg-[var(--accent)] flex items-center justify-center shrink-0">
          <span className="text-black font-console text-[11px] font-bold leading-none">S</span>
        </div>
        <div className="leading-none">
          <div className="font-console text-[11px] font-bold tracking-[0.14em] text-[var(--text-primary)]">SWORDS·OPS</div>
          <div className="font-console text-[9px] tracking-[0.1em] text-[var(--text-muted)] mt-0.5">EMEA LOGISTICS</div>
        </div>
      </div>

      {/* Module tabs */}
      <nav className="flex items-stretch">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = activeModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectModule(m.id)}
              className={clsx(
                'relative flex items-center gap-2 px-4 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.12em] transition-colors',
                isActive
                  ? 'text-[var(--accent)] bg-[var(--bg-hull)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.02]'
              )}
            >
              {isActive && <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />}
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Command palette trigger */}
      <button
        onClick={onOpenPalette}
        className="flex items-center gap-2 px-3 border-l border-[var(--rule)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.02] transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="font-console text-[10px] tracking-[0.1em] border border-[var(--rule-strong)] px-1.5 py-0.5">CTRL·K</span>
      </button>

      {/* Widget toggles */}
      <div className="flex items-stretch border-l border-[var(--rule)]">
        {WIDGETS.map((w) => {
          const Icon = w.icon;
          const isActive = activeWidget === w.id;
          return (
            <button
              key={w.id}
              onClick={() => onToggleWidget(w.id)}
              title={w.label}
              className={clsx(
                'relative flex items-center gap-1.5 px-3 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
                isActive
                  ? 'text-[var(--accent)] bg-[var(--bg-hull)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.02]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {w.label}
              {w.id === 'chat' && chatUnreadCount > 0 && !isActive && (
                <span className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-[var(--signal-red)] blink-slow" />
              )}
            </button>
          );
        })}
      </div>

      {/* Link status */}
      <div className="flex items-center gap-2 px-3 border-r border-[var(--rule)]">
        <span className={clsx('w-1.5 h-1.5 shrink-0', live ? 'bg-[var(--signal-green)]' : 'bg-[var(--signal-red)] blink-slow')} />
        <span className="font-console text-[10px] font-bold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
          {live ? 'Link OK' : 'No Link'}
        </span>
      </div>

      {/* Settings + operator */}
      <button
        onClick={onOpenSettings}
        title="Settings"
        className="flex items-center px-3 border-r border-[var(--rule)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      >
        <Settings className="h-4 w-4" />
      </button>
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2 px-3 hover:bg-white/[0.02] transition-colors"
        title="Operator profile"
      >
        <img src={avatarUrl} alt="" className="w-6 h-6 object-cover border border-[var(--rule-strong)]" />
        <span className="font-console text-[10px] font-bold tracking-[0.1em] text-[var(--text-secondary)] uppercase max-w-[110px] truncate">
          {profileName}
        </span>
      </button>
    </header>
  );
}
