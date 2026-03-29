import React, { useMemo, useState } from 'react';
import type { TerminalTab } from '../types';

interface BrowserPaneProps {
  tab: TerminalTab;
  isActive: boolean;
}

export const BrowserPane: React.FC<BrowserPaneProps> = ({ tab, isActive }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState('Loading');
  const targetUrl = tab.url || '';
  const frameTitle = useMemo(() => tab.label || 'Browser', [tab.label]);

  return (
    <div className={`h-full w-full bg-sys-bg ${isActive ? '' : 'pointer-events-none'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0b1424]/90 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-white">{frameTitle}</p>
            <p className="truncate text-[10px] text-white/30 font-mono">{targetUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#38bdf8]/10 px-2.5 py-1 text-[10px] font-mono text-[#8ed8ff]">
              {status}
            </span>
            <button
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/70"
            >
              Refresh
            </button>
            <button
              onClick={() => targetUrl && window.systalog?.clipboard.writeText(targetUrl)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/70"
            >
              Copy URL
            </button>
            <button
              onClick={() => targetUrl && window.systalog?.shell.openExternal(targetUrl)}
              className="rounded-xl border border-[#f2a33b]/15 bg-[#f2a33b]/10 px-3 py-2 text-[10px] font-semibold text-[#ffd79a]"
            >
              Open external
            </button>
          </div>
        </div>

        {targetUrl ? (
          <iframe
            key={`${targetUrl}-${refreshKey}`}
            src={targetUrl}
            title={frameTitle}
            className="h-full w-full border-0 bg-[#020611]"
            onLoad={() => setStatus('Live')}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/35">
            No browser target was provided.
          </div>
        )}
      </div>
    </div>
  );
};
