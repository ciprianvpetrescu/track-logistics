import React from 'react';
import { Settings } from 'lucide-react';

const FIELD =
  'w-full bg-[var(--bg-inset)] border border-[var(--rule)] px-2 h-7 text-[10px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]';

const FIELDS = [
  { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
  { key: 'pickupDate', label: 'Pickup Date', type: 'date' },
  { key: 'serialNumber', label: 'Serial No.', type: 'text', placeholder: 'PF34XYZ' },
  { key: 'timeRange', label: 'Time Window', type: 'text', placeholder: '10:00 - 14:00' },
];

export default function VariableForm({ values, onChange, onManageTemplates }) {
  return (
    <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--bg-surface)]">
      <div className="h-7 flex items-center justify-between px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
        <span className="panel-label">Token Injection</span>
        <button
          onClick={onManageTemplates}
          className="flex items-center gap-1 panel-label text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          <Settings className="h-3 w-3" /> Templates
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2.5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="panel-label text-[9px] text-[var(--text-muted)] block mb-1">{f.label}</label>
            <input
              type={f.type}
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
              className={FIELD}
              style={f.type === 'date' ? { colorScheme: 'dark' } : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
