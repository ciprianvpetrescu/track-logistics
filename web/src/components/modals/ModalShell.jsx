import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ModalShell({ open, onClose, title, children, widthClass = 'w-96' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 bg-black/75 z-[900] flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-[var(--bg-surface)] border border-[var(--rule-strong)] shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ${widthClass}`}
          >
            {title && (
              <div className="h-8 shrink-0 flex items-center justify-between px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-3 bg-[var(--accent)]" />
                  <span className="panel-label">{title}</span>
                </div>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--signal-red)] transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
