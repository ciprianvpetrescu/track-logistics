import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { ExternalLink, MonitorOff } from 'lucide-react';
import { supportsWebview } from '../../lib/runtime.js';

const QUICK_NAV = [
  { id: 'courierA', label: 'MyCourierA+', url: 'https://tracking.example-courier.com' },
  { id: 'courierB', label: 'CourierB', url: 'https://www.courierB.com' },
  { id: 'scknow', label: 'Ticket queue', url: 'https://ticket-queue.example.com' },
  { id: 'slack', label: 'Slack', url: 'https://ACME.readme.slack.com' },
  { id: 'webex', label: 'Webex', url: 'https://webex.com' },
];

export { QUICK_NAV };

function BrowserFallback({ urlInput }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-inset)] flex items-center justify-center p-6">
      <div className="max-w-[560px] w-full border border-[var(--rule)] bg-[var(--bg-surface)]">
        <div className="h-7 flex items-center gap-2 px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
          <span className="w-1 h-3 bg-[var(--signal-amber)]" />
          <span className="panel-label">Embedded Browser Unavailable</span>
        </div>

        <div className="p-4">
          <div className="flex gap-3">
            <MonitorOff className="h-5 w-5 text-[var(--signal-amber)] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
              The Web Desk embeds sites using Electron's <span className="font-console text-[var(--accent)]">&lt;webview&gt;</span>, which
              only exists in the desktop shell. You're viewing the console in a normal browser tab, so it can't render here.
              <div className="mt-2 text-[var(--text-muted)]">
                Launch with <span className="font-console text-[var(--text-primary)]">npm run desktop</span> to use it inline. Most of these
                sites also send <span className="font-console">X-Frame-Options</span>, so a plain iframe wouldn't load them either.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--rule)]">
            <div className="panel-label text-[9px] text-[var(--text-muted)] mb-2">Open externally instead</div>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_NAV.map((n) => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-2.5 h-8 border border-[var(--rule)] bg-[var(--bg-inset)] font-console text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                >
                  {n.label}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ))}
              <a
                href={urlInput}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-2.5 h-8 border border-[var(--accent)] bg-[var(--accent)]/12 font-console text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                Current URL
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WebTab({ activeTab, urlInput, onSetTab, onSetUrl }) {
  // Electron may not have upgraded <webview> yet at first paint, so re-test
  // once after mount rather than trusting the initial synchronous read.
  const [canEmbed, setCanEmbed] = useState(supportsWebview);
  useEffect(() => {
    if (!canEmbed && supportsWebview()) setCanEmbed(true);
  }, [canEmbed]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <div className="h-8 shrink-0 flex items-stretch bg-[var(--bg-header)] border-b border-[var(--rule)]">
        {QUICK_NAV.map((btn) => (
          <button
            key={btn.id}
            onClick={() => {
              onSetTab(btn.id);
              onSetUrl(btn.url);
            }}
            className={clsx(
              'relative px-3 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
              activeTab === btn.id
                ? 'text-[var(--accent)] bg-[var(--bg-surface)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            {activeTab === btn.id && <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />}
            {btn.label}
          </button>
        ))}

        <div className="flex-1 flex items-center gap-2 px-2 border-l border-[var(--rule)]">
          <span className="panel-label text-[var(--text-dim)] shrink-0">URL</span>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => onSetUrl(e.target.value)}
            className="flex-1 bg-[var(--bg-inset)] border border-[var(--rule)] px-2 h-6 text-[10px] text-[var(--accent)] outline-none focus:border-[var(--accent)]"
          />
          <a
            href={urlInput}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in external browser"
            className="shrink-0 w-6 h-6 border border-[var(--rule)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {canEmbed ? (
        <div className="flex-1 bg-white relative min-h-0">
          <webview
            id="native-browser-iframe-node"
            src={urlInput}
            style={{ width: '100%', height: '100%', display: 'flex' }}
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          />
        </div>
      ) : (
        <BrowserFallback urlInput={urlInput} />
      )}
    </div>
  );
}
