import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { RefreshCw, Zap, Globe, ChevronDown, Search, Maximize2, Minimize2 } from 'lucide-react';
import TicketsTab from './TicketsTab.jsx';
import FollowUpsTab from './FollowUpsTab.jsx';
import WebTab from './WebTab.jsx';
import Button from '../ui/Button.jsx';
import StatusFilterChips from './StatusFilterChips.jsx';

const TABS = [
  { id: 'courier', label: 'Consignments' },
  { id: 'emailAlerts', label: 'Follow-Ups' },
  { id: 'webView', label: 'Web Desk', icon: Globe },
];

const HEIGHTS = { collapsed: 32, normal: 340, tall: 620 };

export default function LedgerSheet({
  tab,
  onSetTab,
  searchQuery,
  onSetSearchQuery,
  displayedRecords,
  displayedEmailAlerts,
  selectedTask,
  refreshingTasks,
  isRefreshingAll,
  onSelectRow,
  onForceRefresh,
  onRefreshAllVisible,
  onDeleteThread,
  onOpenFastReply,
  webState,
  sheetSize,
  onSetSheetSize,
  statusFilter,
  onSetStatusFilter,
  statusCounts,
  journalProps,
}) {
  const isCollapsed = sheetSize === 'collapsed';
  const count = tab === 'courier' ? displayedRecords.length : tab === 'emailAlerts' ? displayedEmailAlerts.length : null;

  return (
    <motion.section
      animate={{ height: HEIGHTS[sheetSize] }}
      transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
      className="shrink-0 bg-[var(--bg-surface)] border-t-2 border-[var(--accent)] flex flex-col overflow-hidden relative z-[600]"
    >
      {/* Sheet header rail */}
      <div className="h-8 shrink-0 flex items-stretch bg-[var(--bg-header)] border-b border-[var(--rule)]">
        <button
          onClick={() => onSetSheetSize(isCollapsed ? 'normal' : 'collapsed')}
          className="px-2.5 flex items-center gap-2 border-r border-[var(--rule)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          title={isCollapsed ? 'Expand ledger' : 'Collapse ledger'}
        >
          <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform duration-200', isCollapsed && 'rotate-180')} />
          <span className="panel-label">Ledger</span>
        </button>

        <nav className="flex items-stretch">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSetTab(t.id);
                  if (isCollapsed) onSetSheetSize('normal');
                }}
                className={clsx(
                  'relative flex items-center gap-1.5 px-3 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
                  isActive
                    ? 'text-[var(--accent)] bg-[var(--bg-surface)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {isActive && <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />}
                {Icon && <Icon className="h-3 w-3" />}
                {t.label}
              </button>
            );
          })}
        </nav>

        {count !== null && (
          <div className="flex items-center px-3 border-r border-[var(--rule)]">
            <span className="font-console text-[10px] text-[var(--text-muted)] tracking-[0.1em]">
              {String(count).padStart(3, '0')} ROWS
            </span>
          </div>
        )}

        {tab === 'courier' && (
          <StatusFilterChips selected={statusFilter} onChange={onSetStatusFilter} counts={statusCounts} />
        )}

        <div className="flex-1" />

        {tab !== 'webView' && (
          <div className="flex items-center gap-1.5 px-2 border-l border-[var(--rule)]">
            <Search className="h-3 w-3 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="FILTER…"
              value={searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              className="bg-transparent border-0 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] w-32 outline-none tracking-[0.08em] uppercase"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2 border-l border-[var(--rule)]">
          <Button tone={selectedTask ? 'outline' : 'ghost'} disabled={!selectedTask} onClick={onOpenFastReply}>
            <Zap className="h-3 w-3" /> Fast Reply
          </Button>
          {tab === 'courier' && (
            <Button tone="ghost" disabled={isRefreshingAll || displayedRecords.length === 0} onClick={onRefreshAllVisible}>
              <RefreshCw className={clsx('h-3 w-3', isRefreshingAll && 'animate-spin')} />
              {isRefreshingAll ? 'Polling' : 'Poll All'}
            </Button>
          )}
          <button
            onClick={() => onSetSheetSize(sheetSize === 'tall' ? 'normal' : 'tall')}
            title={sheetSize === 'tall' ? 'Restore height' : 'Maximise ledger'}
            className="h-7 w-7 flex items-center justify-center border border-[var(--rule)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--rule-strong)] transition-colors"
          >
            {sheetSize === 'tall' ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Sheet body */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[var(--bg-hull)]">
          {tab === 'courier' ? (
            <TicketsTab
              rows={displayedRecords}
              selectedTask={selectedTask}
              refreshingTasks={refreshingTasks}
              onSelect={onSelectRow}
              onForceRefresh={onForceRefresh}
            />
          ) : tab === 'emailAlerts' ? (
            <FollowUpsTab
              alerts={displayedEmailAlerts}
              rows={displayedRecords}
              selectedTask={selectedTask}
              onSelectTicketRef={(ticketRef) => onSelectRow({ ticketRef })}
              onDeleteThread={onDeleteThread}
              {...journalProps}
            />
          ) : (
            <WebTab activeTab={webState.activeTab} urlInput={webState.urlInput} onSetTab={webState.onSetTab} onSetUrl={webState.onSetUrl} />
          )}
        </div>
      )}
    </motion.section>
  );
}
