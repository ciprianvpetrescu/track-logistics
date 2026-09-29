import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import VariableForm from './VariableForm.jsx';
import TemplateCard from './TemplateCard.jsx';
import { buildTemplateContext } from '../../lib/templates.js';

export default function FastReplyPanel({
  open,
  onClose,
  selectedTask,
  activeRow,
  values,
  onChangeValues,
  templates,
  onManageTemplates,
  onCopied,
}) {
  const ctx = buildTemplateContext({
    row: activeRow,
    selectedTask,
    deliveryDate: values.deliveryDate,
    pickupDate: values.pickupDate,
    serialNumber: values.serialNumber,
    timeRange: values.timeRange,
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.16, ease: 'easeOut' }}
          className="fixed right-0 top-12 bottom-0 w-[440px] bg-[var(--bg-hull)] border-l border-[var(--rule-strong)] flex flex-col z-[800] shadow-[-16px_0_40px_rgba(0,0,0,0.6)]"
        >
          <div className="h-8 shrink-0 flex items-center justify-between px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1 h-3 bg-[var(--accent)]" />
              <span className="panel-label">Fast Reply</span>
              <span className="font-console text-[10px] text-[var(--accent)] truncate">· {selectedTask}</span>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--signal-red)] transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <VariableForm values={values} onChange={onChangeValues} onManageTemplates={onManageTemplates} />

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-0">
            {templates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} ctx={ctx} onCopied={onCopied} />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
