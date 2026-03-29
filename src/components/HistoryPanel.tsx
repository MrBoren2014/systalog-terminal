import React, { useState, useEffect } from 'react';

const terminalEscapePattern = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|P[\s\S]*?\x1b\\)/g;

export function sanitizeTerminalTranscript(text: string): string {
  return text
    .replace(terminalEscapePattern, '')
    .replace(/\[\??\d[\d;]*[A-Za-z]/g, '')
    .replace(/(?:^|\n)0;[^\n]*/g, '\n')
    .replace(/\r/g, '')
    .replace(/\u0007/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface SessionRecord {
  id: string;
  label: string;
  provider: string;
  model?: string;
  command?: string;
  cwd?: string;
  envOverrides?: Record<string, string>;
  icon: string;
  color: string;
  startedAt: number;
  endedAt?: number;
  outputSnippet: string; // First ~500 chars of output
  fullOutput: string;    // Complete scrollback
}

interface HistoryPanelProps {
  onClose: () => void;
  onRelaunch: (record: SessionRecord) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose, onRelaunch }) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    window.systalog?.store.get('sessionHistory').then((data) => {
      if (Array.isArray(data)) {
        const normalized = (data as SessionRecord[]).map((session) => ({
          ...session,
          outputSnippet: sanitizeTerminalTranscript(session.outputSnippet || session.fullOutput || ''),
          fullOutput: sanitizeTerminalTranscript(session.fullOutput || session.outputSnippet || ''),
        }));
        setSessions(normalized.sort((a, b) => b.startedAt - a.startedAt));
        window.systalog?.store.set('sessionHistory', normalized);
      }
    });
  }, []);

  const filtered = search.trim()
    ? sessions.filter((s) =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.outputSnippet.toLowerCase().includes(search.toLowerCase()) ||
        (s.model || '').toLowerCase().includes(search.toLowerCase())
      )
    : sessions;

  const clearHistory = () => {
    window.systalog?.store.set('sessionHistory', []);
    setSessions([]);
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    window.systalog?.store.set('sessionHistory', next);
  };

  const copyOutput = (text: string) => {
    window.systalog?.clipboard.writeText(text);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[640px] max-h-[80vh] rounded-2xl border border-white/10 bg-sys-bg shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Session History</h2>
            <p className="text-[10px] text-white/30 font-mono">{sessions.length} sessions saved</p>
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button onClick={clearHistory} className="px-2.5 py-1 rounded-lg text-[10px] text-[#e85d3f] hover:bg-[#e85d3f]/10 transition-all">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-white/[0.06] shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions, models, output..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-[#e85d3f]/40 font-mono"
          />
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-white/20">{search ? 'No matching sessions' : 'No sessions yet'}</p>
              <p className="text-[10px] text-white/15 mt-1">Sessions are saved automatically when tabs close</p>
            </div>
          )}

          {filtered.map((session) => {
            const isExpanded = expandedId === session.id;
            return (
              <div
                key={session.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                    style={{ background: `${session.color}12`, border: `1px solid ${session.color}25` }}
                  >
                    {session.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-white/80 truncate">{session.label}</span>
                      {session.model && (
                        <span className="text-[9px] text-white/25 font-mono truncate">{session.model}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/25 font-mono truncate mt-0.5">
                      {session.outputSnippet.slice(0, 80).replace(/\n/g, ' ')}
                    </p>
                  </div>
                  <span className="text-[9px] text-white/20 font-mono shrink-0">{formatTime(session.startedAt)}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-white/[0.04]">
                    <pre className="mt-3 p-3 rounded-lg bg-white/[0.03] text-[10px] text-white/50 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                      {session.fullOutput || session.outputSnippet || '[empty session]'}
                    </pre>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => onRelaunch(session)}
                        className="px-3 py-1.5 rounded-lg bg-[linear-gradient(135deg,#e85d3f,#f2a33b)] text-[10px] font-bold text-white"
                      >
                        Relaunch
                      </button>
                      <button
                        onClick={() => copyOutput(session.fullOutput || session.outputSnippet)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-medium text-white/50 hover:text-white"
                      >
                        Copy Output
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="px-3 py-1.5 rounded-lg text-[10px] text-[#e85d3f]/60 hover:text-[#e85d3f] hover:bg-[#e85d3f]/10 ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper to save a session when a tab closes
export function saveSessionToHistory(record: SessionRecord) {
  window.systalog?.store.get('sessionHistory').then((data) => {
    const history = Array.isArray(data) ? (data as SessionRecord[]) : [];
    const cleanOutput = sanitizeTerminalTranscript(record.fullOutput || record.outputSnippet || '');
    const cleanSnippet = sanitizeTerminalTranscript(record.outputSnippet || cleanOutput).slice(0, 2000);
    const normalizedRecord: SessionRecord = {
      ...record,
      outputSnippet: cleanSnippet,
      fullOutput: cleanOutput,
    };
    // Keep last 100 sessions
    const updated = [normalizedRecord, ...history].slice(0, 100);
    window.systalog?.store.set('sessionHistory', updated);
  });
}
