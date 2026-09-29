import React, { useState } from 'react';
import { Plus, FileEdit, Trash2, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button.jsx';

const FIELD =
  'w-full bg-[var(--bg-inset)] border border-[var(--rule)] px-2 h-8 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]';

export default function TemplateEngineTab({ templates, onSaveTemplates }) {
  const [editing, setEditing] = useState(null);

  const handleSave = () => {
    if (!editing.title.trim() || !editing.body.trim()) return;
    const next = editing.id
      ? templates.map((t) => (t.id === editing.id ? editing : t))
      : [...templates, { ...editing, id: `tpl-${Date.now()}` }];
    onSaveTemplates(next);
    setEditing(null);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this template?')) onSaveTemplates(templates.filter((t) => t.id !== id));
  };

  if (editing) {
    return (
      <div className="flex flex-col h-full gap-3">
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 w-fit panel-label text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to list
        </button>
        <div>
          <label className="panel-label text-[9px] text-[var(--text-muted)] block mb-1.5">Template Title</label>
          <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={FIELD} />
        </div>
        <div>
          <label className="panel-label text-[9px] text-[var(--text-muted)] block mb-1.5">Subject Line</label>
          <input type="text" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className={FIELD} />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <label className="panel-label text-[9px] text-[var(--text-muted)] block mb-1.5">Body · tokens [NAME] [ticketRef] [DELIVERY_DATE] …</label>
          <textarea
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            className="w-full flex-1 min-h-[200px] bg-[var(--bg-inset)] border border-[var(--rule)] p-2 text-[11px] leading-relaxed text-[var(--text-secondary)] outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
        <Button tone="accent" onClick={handleSave} className="w-full h-9">
          Commit Template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setEditing({ title: '', subject: '', body: '' })}
        className="w-full border border-dashed border-[var(--accent)]/50 hover:border-[var(--accent)] hover:bg-[var(--accent)]/8 text-[var(--accent)] py-3 font-console text-[10px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-3.5 w-3.5" /> New Template
      </button>
      <div className="border border-[var(--rule)] divide-y divide-[var(--rule)]">
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex justify-between items-center gap-3 px-3 py-2.5 bg-[var(--bg-inset)]">
            <div className="min-w-0">
              <div className="font-console text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.06em] truncate">{tpl.title}</div>
              <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{tpl.subject}</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setEditing(tpl)}
                className="w-7 h-7 border border-[var(--rule)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
              >
                <FileEdit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(tpl.id)}
                className="w-7 h-7 border border-[var(--rule)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--signal-red)] hover:border-[var(--signal-red)] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
