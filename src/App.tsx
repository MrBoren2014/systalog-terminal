import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { TerminalTab, AppInfo, CustomLaunch, ModelOption, Provider, ProviderAuthSnapshot } from './types';
import { PROVIDERS, DEFAULT_MODELS } from './providers';
import { TabBar } from './components/TabBar';
import { Sidebar } from './components/Sidebar';
import { TerminalPane } from './components/TerminalPane';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { CaptureStudio } from './components/CaptureStudio';
import { EditorPane } from './components/EditorPane';
import type { SessionRecord } from './components/HistoryPanel';

let tabCounter = 0;
function newId() { return `tab-${Date.now()}-${++tabCounter}`; }
const DEFAULT_PROVIDER_AUTH: ProviderAuthSnapshot = {
  zai: { configured: false, source: 'checking' },
  ollama: { configured: false, source: 'checking' },
};

export default function App() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [customLaunches, setCustomLaunches] = useState<CustomLaunch[]>([]);
  const [savedKeys, setSavedKeys] = useState<{ zaiKey?: string }>({});
  const [providerAuth, setProviderAuth] = useState<ProviderAuthSnapshot>(DEFAULT_PROVIDER_AUTH);
  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);

  const shouldIgnoreDuplicateLaunch = useCallback((key: string) => {
    const now = Date.now();
    if (lastLaunchRef.current && lastLaunchRef.current.key === key && now - lastLaunchRef.current.at < 750) {
      return true;
    }
    lastLaunchRef.current = { key, at: now };
    return false;
  }, []);

  const loadSavedKeys = useCallback(async () => {
    try {
      const [zai, ollama] = await Promise.all([
        window.systalog?.store.get('zaiApiKey'),
        Promise.resolve(undefined),
      ]);
      const next = {
        zaiKey: typeof zai === 'string' && zai.trim() ? zai : undefined,
      };
      setSavedKeys(next);
      return next;
    } catch {
      return {};
    }
  }, []);

  const refreshProviderAuth = useCallback(async () => {
    try {
      const next = await window.systalog?.app.getAuthState();
      if (next) {
        setProviderAuth(next);
        return next;
      }
    } catch {}
    return DEFAULT_PROVIDER_AUTH;
  }, []);

  // Load app info + saved custom launches + API keys
  useEffect(() => {
    window.systalog?.app.getInfo().then(setAppInfo).catch(() => {});
    window.systalog?.store.get('customLaunches').then((data) => {
      if (Array.isArray(data)) setCustomLaunches(data as CustomLaunch[]);
    }).catch(() => {});
    loadSavedKeys();
    refreshProviderAuth();
  }, [loadSavedKeys, refreshProviderAuth]);

  // Save custom launches when they change
  useEffect(() => {
    if (customLaunches.length > 0) {
      window.systalog?.store.set('customLaunches', customLaunches);
    }
  }, [customLaunches]);

  // Check if a provider needs first-time setup
  const needsSetup = useCallback((providerId: Provider, authSnapshot: ProviderAuthSnapshot): boolean => {
    if (providerId === 'zai') return !authSnapshot.zai.configured;
    if (providerId === 'ollama') return !authSnapshot.ollama.configured;
    // claude and codex handle their own auth via CLI login
    return false;
  }, []);

  // Launch a first-time setup tab for a provider
  const launchSetup = useCallback((providerId: string) => {
    const id = newId();
    const provider = PROVIDERS.find((p) => p.id === providerId);

    if (providerId === 'zai') {
      // Z.AI: run the interactive coding helper wizard
      const tab: TerminalTab = {
        id,
        label: 'Z.AI Setup',
        icon: '🧠',
        color: '#14b8a6',
        command: 'echo "\\n\\033[1;33m=== Z.AI GLM Coding Plan Setup ===\\033[0m\\n\\nThis will configure Claude Code to use Z.AI models.\\nYou need a Z.AI API key from https://z.ai/subscribe\\n\\nStarting setup wizard...\\n" && npx @z_ai/coding-helper',
        isRunning: true,
        provider: 'zai',
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
    } else if (providerId === 'ollama') {
      // Ollama Cloud: install/sign in via CLI, then launch Claude through Ollama
      const tab: TerminalTab = {
        id,
        label: 'Ollama Cloud Setup',
        icon: '🦙',
        color: '#f2a33b',
        command: 'echo "\\n\\033[1;33m=== Ollama Claude Setup ===\\033[0m\\n\\nThis app needs the Ollama CLI installed on this Mac.\\n\\n1. Download/install Ollama from https://ollama.com/download/mac\\n2. Run: ollama signin\\n3. Run: ollama launch claude --model minimax-m2.7:cloud\\n\\nChecking current install...\\n" && (ollama --version || echo "\\nOllama CLI is not installed yet.\\n")',
        isRunning: true,
        provider: 'ollama',
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
    }
  }, []);

  const launchModel = useCallback(async (model: ModelOption, cwd?: string) => {
    const launchKey = `model:${model.id}:${cwd || ''}`;
    if (shouldIgnoreDuplicateLaunch(launchKey)) return;

    const authSnapshot = model.provider === 'zai' || model.provider === 'ollama'
      ? await refreshProviderAuth()
      : providerAuth;

    if (needsSetup(model.provider, authSnapshot)) {
      launchSetup(model.provider);
      return;
    }

    const id = newId();
    const provider = PROVIDERS.find((p) => p.id === model.provider);

    // Build env overrides — inject saved API keys for the provider
    const env: Record<string, string> = { ...(model.envOverrides || {}) };

    if (model.provider === 'zai' && savedKeys.zaiKey) {
      env.ANTHROPIC_AUTH_TOKEN = savedKeys.zaiKey;
    }
    const tab: TerminalTab = {
      id,
      label: model.name,
      icon: provider?.icon || '💻',
      color: provider?.color || '#7c3aed',
      cwd: cwd || undefined,
      command: model.command,
      envOverrides: Object.keys(env).length > 0 ? env : undefined,
      isRunning: true,
      provider: model.provider,
      model: model.id,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(id);
  }, [savedKeys, providerAuth, needsSetup, launchSetup, refreshProviderAuth, shouldIgnoreDuplicateLaunch]);

  const launchShell = useCallback((cwd?: string) => {
    const launchKey = `shell:${cwd || ''}`;
    if (shouldIgnoreDuplicateLaunch(launchKey)) return;

    const id = newId();
    setTabs((prev) => [...prev, {
      id, label: 'Shell', icon: '💻', color: '#7c3aed',
      cwd, isRunning: true, provider: 'shell',
    }]);
    setActiveTabId(id);
  }, [shouldIgnoreDuplicateLaunch]);

  const launchCustom = useCallback((item: CustomLaunch) => {
    const launchKey = `custom:${item.id}`;
    if (shouldIgnoreDuplicateLaunch(launchKey)) return;

    const id = newId();
    setTabs((prev) => [...prev, {
      id, label: item.label, icon: item.icon, color: item.color,
      cwd: item.cwd, command: item.command, envOverrides: item.envOverrides,
      isRunning: true, provider: item.provider,
    }]);
    setActiveTabId(id);
  }, [shouldIgnoreDuplicateLaunch]);

  const launchCommand = useCallback((label: string, command: string, provider: Provider = 'custom') => {
    const id = newId();
    const providerConfig = PROVIDERS.find((item) => item.id === provider);
    setTabs((prev) => [...prev, {
      id,
      label,
      icon: providerConfig?.icon || '⚙️',
      color: providerConfig?.color || '#7c3aed',
      command,
      isRunning: true,
      provider,
    }]);
    setActiveTabId(id);
  }, []);

  const openFileEditor = useCallback((filePath: string, label?: string) => {
    const existing = tabs.find((tab) => tab.kind === 'editor' && tab.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const id = newId();
    setTabs((prev) => [...prev, {
      id,
      label: label || filePath.split('/').pop() || 'Editor',
      icon: '📝',
      color: '#38bdf8',
      kind: 'editor',
      filePath,
      isRunning: false,
      provider: 'custom',
    }]);
    setActiveTabId(id);
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    window.systalog?.terminal.kill({ id });
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, [activeTabId]);

  const renameTab = useCallback((id: string, label: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  }, []);

  const addCustomLaunch = useCallback((item: CustomLaunch) => {
    setCustomLaunches((prev) => [...prev, item]);
  }, []);

  const removeCustomLaunch = useCallback((id: string) => {
    setCustomLaunches((prev) => {
      const next = prev.filter((c) => c.id !== id);
      window.systalog?.store.set('customLaunches', next);
      return next;
    });
  }, []);

  const handleInsertCapturePath = useCallback((filePath: string) => {
    if (!activeTabId) return;
    window.systalog?.terminal.write({
      id: activeTabId,
      data: `${filePath}`,
    });
  }, [activeTabId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-sys-bg text-white font-display overflow-hidden select-none">
      {/* Title bar */}
      <div className="drag-region h-11 flex items-center justify-between px-4 border-b border-white/[0.06] bg-sys-bg/90 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 pl-[76px]">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#e85d3f] to-[#f2a33b] flex items-center justify-center">
            <span className="text-[8px] font-extrabold text-white">S</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 font-mono">
            SYSTALOG Terminal
          </span>
        </div>
        <div className="flex items-center gap-1.5 no-drag">
          <button onClick={() => setCaptureOpen(true)} className="px-2.5 py-1 rounded-md text-[10px] text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all font-mono" title="Capture Studio">
            Capture
          </button>
          <button onClick={() => setHistoryOpen(true)} className="px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all font-mono" title="Session History">
            📋
          </button>
          <button onClick={() => setSettingsOpen(true)} className="px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all font-mono">
            ⚙
          </button>
          <button onClick={() => setSidebarOpen((p) => !p)} className="px-2 py-1 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all font-mono">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId} onClose={closeTab} onRename={renameTab} onNewTab={launchShell} />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <Sidebar
            providers={PROVIDERS}
            models={DEFAULT_MODELS}
            customLaunches={customLaunches}
            onLaunchModel={launchModel}
            onLaunchShell={launchShell}
            onLaunchCustom={launchCustom}
            onAddCustom={addCustomLaunch}
            onRemoveCustom={removeCustomLaunch}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        <div className="flex-1 relative">
          {tabs.length === 0 ? (
            <WelcomeScreen
              providers={PROVIDERS}
              models={DEFAULT_MODELS}
              onLaunchModel={launchModel}
              onLaunchShell={launchShell}
            />
          ) : (
            tabs.map((tab) => (
              <div key={tab.id} className={`absolute inset-0 ${tab.id === activeTabId ? 'z-10 visible' : 'z-0 invisible'}`}>
                {tab.kind === 'editor' ? (
                  <EditorPane tab={tab} isActive={tab.id === activeTabId} />
                ) : (
                  <TerminalPane tab={tab} isActive={tab.id === activeTabId} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 flex items-center justify-between px-4 border-t border-white/[0.06] bg-sys-surface/60 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-white/25 font-mono">{appInfo?.username}@{appInfo?.hostname}</span>
          <span className="text-[9px] text-white/15">|</span>
          <span className="text-[9px] text-white/25 font-mono">{tabs.length} session{tabs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]" />
          <span className="text-[9px] text-white/25 font-mono">ready</span>
        </div>
      </div>

      {/* Settings overlay */}
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          providerAuth={providerAuth}
          onProviderConfigChange={() => {
            loadSavedKeys();
            refreshProviderAuth();
          }}
          onLaunchCommand={launchCommand}
          onOpenCapture={() => setCaptureOpen(true)}
          onOpenFileEditor={openFileEditor}
        />
      )}

      {captureOpen && (
        <CaptureStudio
          onClose={() => setCaptureOpen(false)}
          onInsertPath={activeTabId ? handleInsertCapturePath : undefined}
        />
      )}

      {/* History overlay */}
      {historyOpen && (
        <HistoryPanel
          onClose={() => setHistoryOpen(false)}
          onRelaunch={(record: SessionRecord) => {
            // Find the matching model and relaunch it
            const model = DEFAULT_MODELS.find((m) => m.id === record.model);
            if (model) {
              launchModel(model);
            } else {
              // Fallback to shell with the same label
              launchShell();
            }
            setHistoryOpen(false);
          }}
        />
      )}
    </div>
  );
}
