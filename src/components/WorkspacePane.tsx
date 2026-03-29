import React, { useEffect, useMemo, useState } from 'react';
import type { TerminalTab, WorkspaceEntry, WorkspaceSnapshot } from '../types';

interface WorkspacePaneProps {
  tab: TerminalTab;
  isActive: boolean;
  onOpenFile: (filePath: string, label?: string) => void;
}

function renderEntry(
  entry: WorkspaceEntry,
  depth: number,
  activePath: string | undefined,
  onOpenFile: (filePath: string, label?: string) => void,
) {
  const isActive = activePath === entry.path;
  const indent = depth * 14;

  if (entry.kind === 'file') {
    return (
      <button
        key={entry.path}
        onClick={() => onOpenFile(entry.path, entry.name)}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] transition-all ${
          isActive ? 'bg-[#38bdf8]/12 text-[#d7f3ff]' : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
        }`}
        style={{ paddingLeft: 12 + indent }}
      >
        <span className="text-[10px] text-white/25">📄</span>
        <span className="truncate">{entry.name}</span>
      </button>
    );
  }

  return (
    <div key={entry.path}>
      <div
        className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30"
        style={{ paddingLeft: 12 + indent }}
      >
        <span>📁</span>
        <span className="truncate">{entry.name}</span>
      </div>
      <div className="space-y-0.5">
        {(entry.children || []).map((child) => renderEntry(child, depth + 1, activePath, onOpenFile))}
      </div>
    </div>
  );
}

export const WorkspacePane: React.FC<WorkspacePaneProps> = ({ tab, isActive, onOpenFile }) => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [status, setStatus] = useState('Loading workspace...');
  const [query, setQuery] = useState('');
  const rootPath = tab.rootPath || tab.cwd || tab.filePath || '';

  const loadSnapshot = async () => {
    if (!rootPath) {
      setStatus('No workspace path.');
      return;
    }

    setStatus('Refreshing workspace...');
    const result = await window.systalog?.filesystem.getWorkspaceSnapshot(rootPath);
    if (result?.success && result.snapshot) {
      setSnapshot(result.snapshot);
      setStatus('Workspace ready');
      return;
    }
    setStatus(result?.error || 'Unable to read workspace.');
  };

  useEffect(() => {
    loadSnapshot();
  }, [rootPath]);

  const filteredEntries = useMemo(() => {
    if (!snapshot) return [];
    if (!query.trim()) return snapshot.entries;

    const lowered = query.toLowerCase();
    const filterTree = (entries: WorkspaceEntry[]): WorkspaceEntry[] => {
      return entries.flatMap((entry) => {
        if (entry.kind === 'file') {
          return entry.name.toLowerCase().includes(lowered) ? [entry] : [];
        }
        const children = filterTree(entry.children || []);
        if (entry.name.toLowerCase().includes(lowered) || children.length > 0) {
          return [{ ...entry, children }];
        }
        return [];
      });
    };

    return filterTree(snapshot.entries);
  }, [query, snapshot]);

  const changedFiles = useMemo(() => {
    if (!snapshot) return [];
    if (!query.trim()) return snapshot.changedFiles;
    const lowered = query.toLowerCase();
    return snapshot.changedFiles.filter((item) => item.path.toLowerCase().includes(lowered));
  }, [query, snapshot]);

  return (
    <div className={`h-full w-full bg-sys-bg ${isActive ? '' : 'pointer-events-none'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0b1424]/90 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-white">{tab.label}</p>
            <p className="truncate text-[10px] text-white/30 font-mono">{rootPath}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#14b8a6]/10 px-2.5 py-1 text-[10px] font-mono text-[#9ae6dc]">
              {status}
            </span>
            <button
              onClick={loadSnapshot}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/70"
            >
              Refresh
            </button>
            <button
              onClick={() => rootPath && window.systalog?.shell.openPath(rootPath)}
              className="rounded-xl border border-[#f2a33b]/15 bg-[#f2a33b]/10 px-3 py-2 text-[10px] font-semibold text-[#ffd79a]"
            >
              Reveal folder
            </button>
          </div>
        </div>

        <div className="border-b border-white/[0.06] bg-[#07111f] px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter files, folders, and changed paths..."
            className="w-full rounded-2xl border border-white/10 bg-[#020611]/55 px-4 py-3 text-[11px] text-white outline-none"
          />
        </div>

        <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
          <div className="overflow-y-auto border-r border-white/[0.06] bg-[#07111f] p-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#f2a33b]/75 font-mono">Changed files</p>
              <div className="mt-3 space-y-1.5">
                {changedFiles.length === 0 && (
                  <p className="text-[11px] text-white/30">No tracked git changes detected here yet.</p>
                )}
                {changedFiles.map((item) => (
                  <button
                    key={`${item.status}-${item.path}`}
                    onClick={() => onOpenFile(item.path, item.path.split('/').pop() || 'File')}
                    className="flex w-full items-start gap-3 rounded-xl border border-white/8 bg-[#020611]/40 px-3 py-2 text-left hover:border-[#38bdf8]/20 hover:bg-[#38bdf8]/6"
                  >
                    <span className="mt-0.5 rounded-full bg-[#38bdf8]/10 px-2 py-0.5 text-[9px] font-mono text-[#8ed8ff]">
                      {item.status}
                    </span>
                    <span className="truncate text-[11px] text-white/68">{item.path.split('/').slice(-3).join('/')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-y-auto bg-[radial-gradient(circle_at_top,#132036,transparent_45%),#020611] p-5">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(2,6,17,0.55)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 font-mono">Workspace tree</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-white">Inspect what the model touched</h2>
                </div>
                {snapshot?.gitRoot && (
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-mono text-white/50">
                    git root: {snapshot.gitRoot.split('/').pop()}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-1">
                {filteredEntries.length === 0 && (
                  <p className="text-[12px] text-white/35">No visible files matched this filter.</p>
                )}
                {filteredEntries.map((entry) => renderEntry(entry, 0, tab.focusPath, onOpenFile))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
