import React from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function CommandPalette({ open, onClose, groups }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 bg-black/75 z-[950] flex items-start justify-center pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[580px] bg-[var(--bg-surface)] border border-[var(--rule-strong)] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
              <div className="h-8 flex items-center gap-2 px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
                <span className="w-1 h-3 bg-[var(--accent)]" />
                <span className="panel-label">Command Input</span>
                <div className="flex-1" />
                <span className="panel-label text-[var(--text-dim)]">ESC to abort</span>
              </div>

              <div className="flex items-center gap-2 px-3 border-b border-[var(--rule)] bg-[var(--bg-inset)]">
                <ChevronRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                <Command.Input
                  autoFocus
                  placeholder="type command…"
                  className="flex-1 bg-transparent outline-none h-10 font-console text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
                />
              </div>

              <Command.List className="max-h-[340px] overflow-y-auto">
                <Command.Empty className="text-center font-console text-[10px] uppercase tracking-[0.1em] text-[var(--text-dim)] py-8">
                  No matching command
                </Command.Empty>
                {groups.map((group) => (
                  <Command.Group
                    key={group.group}
                    heading={group.group}
                    className="[&_[cmdk-group-heading]]:panel-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:bg-[var(--bg-header)] [&_[cmdk-group-heading]]:border-y [&_[cmdk-group-heading]]:border-[var(--rule)] [&_[cmdk-group-heading]]:block"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.id}
                          value={item.label}
                          onSelect={() => {
                            item.run();
                            onClose();
                          }}
                          className="flex items-center gap-2.5 px-3 h-9 font-console text-[11px] text-[var(--text-secondary)] cursor-pointer border-l-2 border-transparent aria-selected:border-l-[var(--accent)] aria-selected:bg-[var(--accent)]/10 aria-selected:text-[var(--accent)]"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {item.label}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
