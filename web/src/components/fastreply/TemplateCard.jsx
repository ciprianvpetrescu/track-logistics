import React from 'react';
import { Copy, Mail } from 'lucide-react';
import { formatTextToRichHtml } from '../../lib/templates.js';
import { writeRichTextToClipboard } from '../../lib/clipboard.js';
import { openGmailCompose } from '../../lib/mailto.js';

export default function TemplateCard({ template, ctx, onCopied }) {
  const richBodyHtml = formatTextToRichHtml(template.body, ctx);

  return (
    <div className="border border-[var(--rule)] bg-[var(--bg-surface)]">
      <div className="h-7 flex items-center justify-between gap-2 px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
        <span className="panel-label truncate">{template.title}</span>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => writeRichTextToClipboard(richBodyHtml).then(() => onCopied?.())}
            className="flex items-center gap-1 px-1.5 h-5 border border-[var(--rule-strong)] font-console text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            <Copy className="h-2.5 w-2.5" /> Copy
          </button>
          <button
            onClick={() => openGmailCompose(template.subject, richBodyHtml, ctx)}
            className="flex items-center gap-1 px-1.5 h-5 bg-[var(--accent)] text-black font-console text-[9px] font-bold uppercase tracking-[0.08em] hover:bg-[#ff8442] transition-colors"
          >
            <Mail className="h-2.5 w-2.5" /> Gmail
          </button>
        </div>
      </div>
      <div
        className="p-2.5 text-[11px] text-[var(--text-secondary)] leading-relaxed max-h-[240px] overflow-y-auto bg-[var(--bg-inset)]"
        dangerouslySetInnerHTML={{ __html: richBodyHtml }}
      />
    </div>
  );
}
