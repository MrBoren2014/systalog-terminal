import React, { useEffect, useMemo, useState } from 'react';
import type { AppInfo, Provider, ProviderAuthSnapshot, ProviderSetupStatus, SkillInfo } from '../types';

interface SettingsPanelProps {
  onClose: () => void;
  providerAuth: ProviderAuthSnapshot;
  onProviderConfigChange: () => void;
  onLaunchCommand: (label: string, command: string, provider?: Provider) => void;
  onOpenCapture: () => void;
  onOpenFileEditor: (filePath: string, label?: string) => void;
}

type PanelTab = 'hub' | 'auth' | 'skills' | 'updates';

interface ClaudeForm {
  model: string;
  effortLevel: string;
  defaultMode: string;
  apiTimeoutMs: string;
  disableTraffic: boolean;
}

interface CodexForm {
  model: string;
  reasoningEffort: string;
  trustLevel: string;
}

interface OpenClawForm {
  gatewayPort: string;
  gatewayMode: string;
  gatewayBind: string;
  nativeSkills: string;
  restartEnabled: boolean;
  primaryModel: string;
}

function providerStatusLabel(status: ProviderSetupStatus): string {
  switch (status.source) {
    case 'app-key':
      return 'configured in app';
    case 'claude-settings':
      return 'configured in Claude';
    case 'shell-env':
      return 'configured in shell';
    case 'cli':
      return 'ollama cli detected';
    case 'checking':
      return 'checking...';
    default:
      return 'needs setup';
  }
}

function providerStatusClasses(status: ProviderSetupStatus): string {
  if (status.source === 'checking') return 'bg-white/10 text-white/50';
  if (status.configured) return 'bg-[#14b8a6]/10 text-[#14b8a6]';
  return 'bg-[#f2a33b]/10 text-[#f2a33b]';
}

function readTomlValue(source: string, key: string): string {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match ? match[1] : '';
}

function readProjectTrustLevel(source: string, projectPath: string): string {
  const escapedPath = projectPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const section = source.match(new RegExp(`\\[projects\\."${escapedPath}"\\]([\\s\\S]*?)(?:\\n\\[|$)`));
  const trustMatch = section?.[1].match(/trust_level\s*=\s*"([^"]*)"/);
  return trustMatch ? trustMatch[1] : '';
}

function upsertTomlValue(source: string, key: string, value: string): string {
  if (new RegExp(`^${key}\\s*=`, 'm').test(source)) {
    return source.replace(new RegExp(`^${key}\\s*=\\s*"[^"]*"`, 'm'), `${key} = "${value}"`);
  }
  return `${source.trimEnd()}\n${key} = "${value}"\n`;
}

function upsertProjectTrustLevel(source: string, projectPath: string, trustLevel: string): string {
  const escapedPath = projectPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionRegex = new RegExp(`(\\[projects\\."${escapedPath}"\\][\\s\\S]*?)(?=\\n\\[|$)`);
  if (sectionRegex.test(source)) {
    return source.replace(sectionRegex, (section) => {
      if (/trust_level\s*=/.test(section)) {
        return section.replace(/trust_level\s*=\s*"[^"]*"/, `trust_level = "${trustLevel}"`);
      }
      return `${section.trimEnd()}\ntrust_level = "${trustLevel}"\n`;
    });
  }
  return `${source.trimEnd()}\n\n[projects."${projectPath}"]\ntrust_level = "${trustLevel}"\n`;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  providerAuth,
  onProviderConfigChange,
  onLaunchCommand,
  onOpenCapture,
  onOpenFileEditor,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('hub');
  const [zaiKey, setZaiKey] = useState('');
  const [claudeStatus, setClaudeStatus] = useState<'checking' | 'installed' | 'missing'>('checking');
  const [codexStatus, setCodexStatus] = useState<'checking' | 'installed' | 'missing'>('checking');
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'running' | 'stopped' | 'missing'>('checking');
  const [openclawStatus, setOpenclawStatus] = useState<'checking' | 'installed' | 'missing'>('checking');
  const [claudeVersion, setClaudeVersion] = useState('');
  const [codexVersion, setCodexVersion] = useState('');
  const [ollamaVersion, setOllamaVersion] = useState('');
  const [openclawVersion, setOpenclawVersion] = useState('');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [skillQuery, setSkillQuery] = useState('');
  const [skillSource, setSkillSource] = useState<'all' | 'codex' | 'agents'>('all');
  const [updateLog, setUpdateLog] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [claudeForm, setClaudeForm] = useState<ClaudeForm>({
    model: '',
    effortLevel: 'high',
    defaultMode: '',
    apiTimeoutMs: '',
    disableTraffic: false,
  });
  const [codexForm, setCodexForm] = useState<CodexForm>({
    model: '',
    reasoningEffort: 'high',
    trustLevel: 'trusted',
  });
  const [openClawForm, setOpenClawForm] = useState<OpenClawForm>({
    gatewayPort: '',
    gatewayMode: 'local',
    gatewayBind: 'loopback',
    nativeSkills: 'auto',
    restartEnabled: true,
    primaryModel: '',
  });

  useEffect(() => {
    window.systalog?.app.getInfo().then(setAppInfo).catch(() => {});
    window.systalog?.app.listSkills().then(setSkills).catch(() => setSkills([]));

    window.systalog?.shell.exec('claude --version 2>/dev/null').then((result) => {
      if (result.success && result.stdout) {
        setClaudeStatus('installed');
        setClaudeVersion(result.stdout.trim());
      } else {
        setClaudeStatus('missing');
      }
    });

    window.systalog?.shell.exec('codex --version 2>/dev/null').then((result) => {
      if (result.success && result.stdout) {
        setCodexStatus('installed');
        setCodexVersion(result.stdout.trim());
      } else {
        setCodexStatus('missing');
      }
    });

    window.systalog?.shell.exec('ollama --version 2>/dev/null').then((result) => {
      if (result.success && result.stdout) {
        setOllamaVersion(result.stdout.trim());
        window.systalog?.shell.exec('curl -s http://localhost:11434/api/tags 2>/dev/null').then((apiResult) => {
          setOllamaStatus(apiResult.success ? 'running' : 'stopped');
        });
      } else {
        setOllamaStatus('missing');
      }
    });

    window.systalog?.shell.exec('openclaw --version 2>/dev/null').then((result) => {
      if (result.success && result.stdout) {
        setOpenclawStatus('installed');
        setOpenclawVersion(result.stdout.trim());
      } else {
        setOpenclawStatus('missing');
      }
    });

    window.systalog?.store.get('zaiApiKey').then((value) => {
      if (typeof value === 'string') setZaiKey(value);
    });
  }, []);

  useEffect(() => {
    if (!appInfo?.homedir) return;

    window.systalog?.filesystem.readTextFile(`${appInfo.homedir}/.claude/settings.json`).then((result) => {
      if (!result?.success || !result.content) return;
      try {
        const data = JSON.parse(result.content);
        setClaudeForm({
          model: data.model || '',
          effortLevel: data.effortLevel || 'high',
          defaultMode: data.permissions?.defaultMode || '',
          apiTimeoutMs: data.env?.API_TIMEOUT_MS || '',
          disableTraffic: Boolean(data.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC),
        });
      } catch {}
    });

    window.systalog?.filesystem.readTextFile(`${appInfo.homedir}/.codex/config.toml`).then((result) => {
      if (!result?.success || !result.content) return;
      setCodexForm({
        model: readTomlValue(result.content, 'model') || 'gpt-5.4',
        reasoningEffort: readTomlValue(result.content, 'model_reasoning_effort') || 'high',
        trustLevel: readProjectTrustLevel(result.content, appInfo.homedir) || 'trusted',
      });
    });

    window.systalog?.filesystem.readTextFile(`${appInfo.homedir}/.openclaw/openclaw.json`).then((result) => {
      if (!result?.success || !result.content) return;
      try {
        const data = JSON.parse(result.content);
        setOpenClawForm({
          gatewayPort: String(data.gateway?.port || ''),
          gatewayMode: data.gateway?.mode || 'local',
          gatewayBind: data.gateway?.bind || 'loopback',
          nativeSkills: data.commands?.nativeSkills || 'auto',
          restartEnabled: Boolean(data.commands?.restart),
          primaryModel: data.agents?.defaults?.model?.primary || '',
        });
      } catch {}
    });
  }, [appInfo]);

  const configPaths = useMemo(() => {
    const homedir = appInfo?.homedir || '~';
    return [
      { label: 'Claude settings', path: `${homedir}/.claude/settings.json`, editable: true, product: 'Claude', note: 'Primary Claude Code config' },
      { label: 'Claude local overrides', path: `${homedir}/.claude/settings.local.json`, editable: true, product: 'Claude', note: 'Per-machine overrides' },
      { label: 'Codex config', path: `${homedir}/.codex/config.toml`, editable: true, product: 'Codex', note: 'Global Codex CLI settings' },
      { label: 'Codex AGENTS', path: `${homedir}/.codex/AGENTS.md`, editable: true, product: 'Codex', note: 'Shared behavior + instructions' },
      { label: 'OpenClaw config', path: `${homedir}/.openclaw/openclaw.json`, editable: true, product: 'OpenClaw', note: 'Gateway and runtime config' },
      { label: 'OpenClaw approvals', path: `${homedir}/.openclaw/exec-approvals.json`, editable: true, product: 'OpenClaw', note: 'Local approval memory' },
      { label: 'OpenClaw workspace AGENTS', path: `${homedir}/.openclaw/workspace/AGENTS.md`, editable: true, product: 'OpenClaw', note: 'Workspace instructions' },
      { label: 'Capture folder', path: `${homedir}/Pictures/SYSTALOG`, product: 'Systalog', note: 'Saved screenshot output' },
    ];
  }, [appInfo]);

  const configGroups = useMemo(() => {
    return [
      {
        title: 'Claude',
        tone: 'bg-[#e85d3f]/10 text-[#ffb29a]',
        items: configPaths.filter((item) => item.product === 'Claude'),
      },
      {
        title: 'Codex',
        tone: 'bg-[#38bdf8]/10 text-[#bdeafe]',
        items: configPaths.filter((item) => item.product === 'Codex'),
      },
      {
        title: 'OpenClaw',
        tone: 'bg-[#ef4444]/10 text-[#ffb4b4]',
        items: configPaths.filter((item) => item.product === 'OpenClaw'),
      },
      {
        title: 'Systalog',
        tone: 'bg-white/[0.08] text-white/75',
        items: configPaths.filter((item) => item.product === 'Systalog'),
      },
    ];
  }, [configPaths]);

  const curatedRadar = [
    { family: 'Claude Code', note: 'Sonnet 4.6 and Opus 4.6 are the current Anthropic anchors.' },
    { family: 'Z.AI', note: 'This hub now keeps only GLM-5 Turbo and GLM-5.1 for the coding plan.' },
    { family: 'Ollama Cloud', note: 'No official Ollama evidence was found for glm-5.1:cloud or glm-5-turbo:cloud, so they are not being faked in the catalog.' },
    { family: 'OpenClaw', note: 'The hub now exposes setup, config, channels, and health-check entry points.' },
  ];

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      if (skillSource !== 'all' && skill.source !== skillSource) return false;
      const haystack = `${skill.name} ${skill.description} ${skill.path}`.toLowerCase();
      return haystack.includes(skillQuery.toLowerCase());
    });
  }, [skills, skillQuery, skillSource]);

  const saveZaiKey = async () => {
    await window.systalog?.store.set('zaiApiKey', zaiKey.trim());
    onProviderConfigChange();
    setUpdateLog('Z.AI API key saved. New GLM sessions will use it automatically.');
  };

  const runUpdate = async (tool: string) => {
    setUpdateLog(`Updating ${tool}...`);
    let command = '';
    if (tool === 'claude') command = 'npm update -g @anthropic-ai/claude-code 2>&1';
    else if (tool === 'codex') command = 'npm update -g @openai/codex 2>&1';
    else if (tool === 'ollama') command = 'ollama update 2>&1 || brew upgrade ollama 2>&1';
    else if (tool === 'openclaw') command = 'npm update -g openclaw 2>&1';

    const result = await window.systalog?.shell.exec(command);
    setUpdateLog(result?.stdout || result?.stderr || 'Done');
  };

  const pullOllamaModel = async () => {
    if (!newModelName.trim()) return;
    setUpdateLog(`Pulling ${newModelName}...`);
    const result = await window.systalog?.shell.exec(`ollama pull ${newModelName} 2>&1`);
    setUpdateLog(result?.stdout || result?.stderr || 'Done');
    setNewModelName('');
  };

  const tabs: Array<{ id: PanelTab; label: string }> = [
    { id: 'hub', label: 'Control Room' },
    { id: 'auth', label: 'Auth & Models' },
    { id: 'skills', label: 'Skills' },
    { id: 'updates', label: 'Maintenance' },
  ];

  const launchOpenClaw = (label: string, command: string) => {
    onClose();
    onLaunchCommand(label, command, 'openclaw');
  };

  const launchCommandAndClose = (label: string, command: string, provider?: Provider) => {
    onClose();
    onLaunchCommand(label, command, provider);
  };

  const openFileEditorAndClose = (filePath: string, label?: string) => {
    onClose();
    onOpenFileEditor(filePath, label);
  };

  const saveClaudeSettings = async () => {
    if (!appInfo?.homedir) return;
    const path = `${appInfo.homedir}/.claude/settings.json`;
    const current = await window.systalog?.filesystem.readTextFile(path);
    if (!current?.success || !current.content) return;
    try {
      const data = JSON.parse(current.content);
      data.model = claudeForm.model;
      data.effortLevel = claudeForm.effortLevel;
      data.permissions = { ...(data.permissions || {}), defaultMode: claudeForm.defaultMode || undefined };
      data.env = {
        ...(data.env || {}),
        API_TIMEOUT_MS: claudeForm.apiTimeoutMs || undefined,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: claudeForm.disableTraffic,
      };
      const result = await window.systalog?.filesystem.writeTextFile(path, `${JSON.stringify(data, null, 2)}\n`);
      setUpdateLog(result?.success ? 'Saved Claude settings.' : (result?.error || 'Failed to save Claude settings.'));
    } catch (error) {
      setUpdateLog(String(error));
    }
  };

  const saveCodexSettings = async () => {
    if (!appInfo?.homedir) return;
    const path = `${appInfo.homedir}/.codex/config.toml`;
    const current = await window.systalog?.filesystem.readTextFile(path);
    if (!current?.success || typeof current.content !== 'string') return;
    let next = current.content;
    next = upsertTomlValue(next, 'model', codexForm.model);
    next = upsertTomlValue(next, 'model_reasoning_effort', codexForm.reasoningEffort);
    next = upsertProjectTrustLevel(next, appInfo.homedir, codexForm.trustLevel);
    const result = await window.systalog?.filesystem.writeTextFile(path, next.endsWith('\n') ? next : `${next}\n`);
    setUpdateLog(result?.success ? 'Saved Codex config.' : (result?.error || 'Failed to save Codex config.'));
  };

  const saveOpenClawSettings = async () => {
    if (!appInfo?.homedir) return;
    const path = `${appInfo.homedir}/.openclaw/openclaw.json`;
    const current = await window.systalog?.filesystem.readTextFile(path);
    if (!current?.success || !current.content) return;
    try {
      const data = JSON.parse(current.content);
      data.gateway = {
        ...(data.gateway || {}),
        port: Number(openClawForm.gatewayPort) || data.gateway?.port || 18789,
        mode: openClawForm.gatewayMode,
        bind: openClawForm.gatewayBind,
      };
      data.commands = {
        ...(data.commands || {}),
        nativeSkills: openClawForm.nativeSkills,
        restart: openClawForm.restartEnabled,
      };
      data.agents = {
        ...(data.agents || {}),
        defaults: {
          ...(data.agents?.defaults || {}),
          model: {
            ...(data.agents?.defaults?.model || {}),
            primary: openClawForm.primaryModel,
          },
        },
      };
      const result = await window.systalog?.filesystem.writeTextFile(path, `${JSON.stringify(data, null, 2)}\n`);
      setUpdateLog(result?.success ? 'Saved OpenClaw config.' : (result?.error || 'Failed to save OpenClaw config.'));
    } catch (error) {
      setUpdateLog(String(error));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/75 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-[min(1100px,94vw)] max-h-[92vh] rounded-[28px] border border-white/10 bg-[#07111f] shadow-[0_40px_120px_rgba(2,6,17,0.85)] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#f2a33b]/70 font-mono">Systalog Hub</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Central control for models, capture, skills, and ops</h2>
          </div>
          <button onClick={onClose} className="text-white/35 hover:text-white text-lg">×</button>
        </div>

        <div className="flex gap-1 px-7 pt-4 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[11px] font-semibold rounded-t-2xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white border-b-2 border-[#f2a33b]'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-7 overflow-y-auto max-h-[72vh] space-y-6">
          {activeTab === 'hub' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    onClose();
                    onOpenCapture();
                  }}
                  className="rounded-[24px] border border-[#38bdf8]/20 bg-[linear-gradient(135deg,rgba(56,189,248,0.22),rgba(2,6,17,0.05))] p-5 text-left"
                >
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#bdeafe] font-mono">Capture</p>
                  <h3 className="mt-2 text-lg font-bold text-white">Open Capture Studio</h3>
                  <p className="mt-2 text-[12px] leading-5 text-white/55">Capture the screen, drag a crop, copy the image, or save a clean PNG to your screenshot folder.</p>
                </button>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Current stack</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`text-[10px] px-3 py-1 rounded-full ${providerStatusClasses(providerAuth.zai)}`}>Z.AI: {providerStatusLabel(providerAuth.zai)}</span>
                    <span className={`text-[10px] px-3 py-1 rounded-full ${providerStatusClasses(providerAuth.ollama)}`}>Ollama: {providerStatusLabel(providerAuth.ollama)}</span>
                    <span className="text-[10px] px-3 py-1 rounded-full bg-white/[0.06] text-white/70">Claude: {claudeStatus === 'installed' ? claudeVersion || 'installed' : 'missing'}</span>
                    <span className="text-[10px] px-3 py-1 rounded-full bg-white/[0.06] text-white/70">Codex: {codexStatus === 'installed' ? codexVersion || 'installed' : 'missing'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#ef4444]/80 font-mono">OpenClaw</p>
                      <h3 className="mt-2 text-lg font-bold text-white">Ops quick actions</h3>
                    </div>
                    <span className={`text-[10px] px-3 py-1 rounded-full ${openclawStatus === 'installed' ? 'bg-[#14b8a6]/10 text-[#14b8a6]' : 'bg-[#f2a33b]/10 text-[#f2a33b]'}`}>
                      {openclawStatus === 'installed' ? openclawVersion || 'installed' : 'not detected'}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      ['Dashboard', 'openclaw dashboard'],
                      ['Configure', 'openclaw configure'],
                      ['Channels', 'openclaw configure --section channels'],
                      ['Doctor', 'openclaw doctor'],
                    ].map(([label, command]) => (
                      <button
                        key={label}
                        onClick={() => launchOpenClaw(label, command)}
                        className="rounded-2xl border border-white/10 bg-[#020611]/45 px-4 py-3 text-left text-[12px] font-semibold text-white/80"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Model radar</p>
                  <div className="mt-4 space-y-3">
                    {curatedRadar.map((item) => (
                      <div key={item.family} className="rounded-2xl border border-white/10 bg-[#020611]/40 p-4">
                        <p className="text-[11px] font-bold text-white">{item.family}</p>
                        <p className="mt-1 text-[11px] leading-5 text-white/50">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Settings workspace</p>
                    <h3 className="mt-2 text-lg font-bold text-white">Adjust real settings from controls first, files second</h3>
                  </div>
                  <button
                    onClick={() => appInfo?.homedir && openFileEditorAndClose(`${appInfo.homedir}/.claude/settings.json`, 'Claude settings')}
                    disabled={!appInfo?.homedir}
                    className="rounded-2xl border border-[#38bdf8]/15 bg-[#38bdf8]/10 px-4 py-3 text-[11px] font-semibold text-[#bdeafe]"
                  >
                    Open default config editor
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-4">
                  <div className="rounded-[24px] border border-white/10 bg-[#020611]/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-white">Claude Code</p>
                      <span className="rounded-full bg-[#e85d3f]/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#ffb29a]">Live</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="text-[10px] text-white/35">Default model</span>
                        <select value={claudeForm.model} onChange={(event) => setClaudeForm((state) => ({ ...state, model: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                          <option value="opus[1m]">Opus 1M</option>
                          <option value="sonnet">Sonnet</option>
                          <option value="haiku">Haiku</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Reasoning effort</span>
                        <select value={claudeForm.effortLevel} onChange={(event) => setClaudeForm((state) => ({ ...state, effortLevel: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Default mode</span>
                        <input value={claudeForm.defaultMode} onChange={(event) => setClaudeForm((state) => ({ ...state, defaultMode: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white" placeholder="acceptEdits" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">API timeout ms</span>
                        <input value={claudeForm.apiTimeoutMs} onChange={(event) => setClaudeForm((state) => ({ ...state, apiTimeoutMs: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white" placeholder="600000" />
                      </label>
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2">
                        <span className="text-[11px] text-white/70">Disable nonessential traffic</span>
                        <input type="checkbox" checked={claudeForm.disableTraffic} onChange={(event) => setClaudeForm((state) => ({ ...state, disableTraffic: event.target.checked }))} />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveClaudeSettings} className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#e85d3f,#f2a33b)] px-3 py-2 text-[11px] font-semibold text-white">Save</button>
                        <button onClick={() => appInfo?.homedir && openFileEditorAndClose(`${appInfo.homedir}/.claude/settings.json`, 'Claude settings')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Advanced</button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-[#020611]/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-white">Codex</p>
                      <span className="rounded-full bg-[#38bdf8]/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#bdeafe]">Live</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="text-[10px] text-white/35">Default model</span>
                        <input value={codexForm.model} onChange={(event) => setCodexForm((state) => ({ ...state, model: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white" placeholder="gpt-5.4" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Reasoning effort</span>
                        <select value={codexForm.reasoningEffort} onChange={(event) => setCodexForm((state) => ({ ...state, reasoningEffort: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Workspace trust</span>
                        <select value={codexForm.trustLevel} onChange={(event) => setCodexForm((state) => ({ ...state, trustLevel: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                          <option value="trusted">Trusted</option>
                          <option value="untrusted">Untrusted</option>
                        </select>
                      </label>
                      <div className="flex gap-2 pt-16">
                        <button onClick={saveCodexSettings} className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#0ea5e9)] px-3 py-2 text-[11px] font-semibold text-white">Save</button>
                        <button onClick={() => appInfo?.homedir && openFileEditorAndClose(`${appInfo.homedir}/.codex/config.toml`, 'Codex config')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Advanced</button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-[#020611]/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-white">OpenClaw</p>
                      <span className="rounded-full bg-[#ef4444]/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#ffb4b4]">Live</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] text-white/35">Gateway port</span>
                          <input value={openClawForm.gatewayPort} onChange={(event) => setOpenClawForm((state) => ({ ...state, gatewayPort: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] text-white/35">Bind</span>
                          <select value={openClawForm.gatewayBind} onChange={(event) => setOpenClawForm((state) => ({ ...state, gatewayBind: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                            <option value="loopback">Loopback</option>
                            <option value="all">All</option>
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Gateway mode</span>
                        <select value={openClawForm.gatewayMode} onChange={(event) => setOpenClawForm((state) => ({ ...state, gatewayMode: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                          <option value="local">Local</option>
                          <option value="lan">LAN</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Primary model</span>
                        <input value={openClawForm.primaryModel} onChange={(event) => setOpenClawForm((state) => ({ ...state, primaryModel: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white" placeholder="openai-codex/gpt-5.3-codex" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-white/35">Native skills mode</span>
                        <select value={openClawForm.nativeSkills} onChange={(event) => setOpenClawForm((state) => ({ ...state, nativeSkills: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white">
                          <option value="auto">Auto</option>
                          <option value="on">On</option>
                          <option value="off">Off</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2">
                        <span className="text-[11px] text-white/70">Enable restart command</span>
                        <input type="checkbox" checked={openClawForm.restartEnabled} onChange={(event) => setOpenClawForm((state) => ({ ...state, restartEnabled: event.target.checked }))} />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveOpenClawSettings} className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#ef4444,#f97316)] px-3 py-2 text-[11px] font-semibold text-white">Save</button>
                        <button onClick={() => appInfo?.homedir && openFileEditorAndClose(`${appInfo.homedir}/.openclaw/openclaw.json`, 'OpenClaw config')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Advanced</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  {configGroups.map((group) => (
                    <div key={group.title} className="rounded-[24px] border border-white/10 bg-[#020611]/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-white">{group.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] ${group.tone}`}>
                          {group.items.length} files
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {group.items.map((item) => (
                          <div key={item.path} className="rounded-2xl border border-white/10 bg-[#07111f]/70 p-4">
                            <p className="text-[11px] font-semibold text-white">{item.label}</p>
                            <p className="mt-1 text-[10px] text-white/35">{item.note}</p>
                            <p className="mt-2 text-[10px] text-white/25 font-mono break-all">{item.path}</p>
                            <div className="mt-3 flex gap-2">
                              {item.editable ? (
                                <button
                                  onClick={() => openFileEditorAndClose(item.path, item.label)}
                                  className="rounded-xl border border-[#38bdf8]/15 bg-[#38bdf8]/10 px-3 py-2 text-[10px] font-semibold text-[#bdeafe]"
                                >
                                  Edit in app
                                </button>
                              ) : (
                                <button
                                  onClick={() => window.systalog?.shell.openPath(item.path)}
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65"
                                >
                                  Open folder
                                </button>
                              )}
                              <button
                                onClick={() => window.systalog?.clipboard.writeText(item.path)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65"
                              >
                                Copy path
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'auth' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-white">Z.AI / GLM</p>
                      <p className="mt-1 text-[10px] text-white/35">Current state: {providerStatusLabel(providerAuth.zai)}</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${providerStatusClasses(providerAuth.zai)}`}>
                      {providerStatusLabel(providerAuth.zai)}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      type="password"
                      value={zaiKey}
                      onChange={(event) => setZaiKey(event.target.value)}
                      placeholder="Z.AI API key"
                      className="flex-1 rounded-2xl border border-white/10 bg-[#020611]/45 px-4 py-3 text-[11px] text-white outline-none"
                    />
                    <button onClick={saveZaiKey} className="rounded-2xl bg-[linear-gradient(135deg,#e85d3f,#f2a33b)] px-4 py-3 text-[11px] font-bold text-white">
                      Save
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => window.systalog?.shell.openExternal('https://z.ai/subscribe')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Billing</button>
                    <button onClick={() => launchCommandAndClose('Z.AI Setup', 'npx @z_ai/coding-helper', 'zai')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Run setup helper</button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-white">Ollama Cloud</p>
                      <p className="mt-1 text-[10px] text-white/35">Install the `ollama` CLI, run `ollama signin`, then launch Claude through `ollama launch claude`.</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${providerStatusClasses(providerAuth.ollama)}`}>
                      {providerStatusLabel(providerAuth.ollama)}
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#020611]/45 p-4">
                    <p className="text-[11px] text-white/70">Status</p>
                    <p className="mt-2 text-[11px] leading-5 text-white/45">
                      {ollamaStatus === 'missing'
                        ? 'Ollama is not installed on this Mac yet. Install the CLI first, then sign in to your Pro plan.'
                        : 'Ollama CLI is installed. Sign in once with `ollama signin`, then use the Ollama Cloud models from the sidebar.'}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => window.systalog?.shell.openExternal('https://ollama.com/download/mac')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Download Ollama</button>
                    <button onClick={() => window.systalog?.shell.openExternal('https://ollama.com/cloud')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Plan details</button>
                    <button onClick={() => launchCommandAndClose('Ollama Sign In', 'ollama signin', 'ollama')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Run `ollama signin`</button>
                    <button onClick={() => launchCommandAndClose('Ollama Claude', 'ollama launch claude', 'ollama')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Launch Claude via Ollama</button>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Local model maintenance</p>
                <div className="mt-4 flex gap-2">
                  <input
                    value={newModelName}
                    onChange={(event) => setNewModelName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && pullOllamaModel()}
                    placeholder="Pull a local Ollama model (e.g. qwen3.5-coder)"
                    className="flex-1 rounded-2xl border border-white/10 bg-[#020611]/45 px-4 py-3 text-[11px] text-white outline-none"
                  />
                  <button onClick={pullOllamaModel} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-semibold text-white/70">
                    Pull
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-white/40">Local Ollama status: <span className="font-mono">{ollamaStatus === 'running' ? `running (${ollamaVersion})` : ollamaStatus === 'stopped' ? `installed (${ollamaVersion})` : ollamaStatus}</span></p>
              </div>
            </>
          )}

          {activeTab === 'skills' && (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Installed skills</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{filteredSkills.length} of {skills.length} skills visible</h3>
                </div>
                <button onClick={() => window.systalog?.app.listSkills().then(setSkills)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">
                  Refresh
                </button>
              </div>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-[#020611]/35 p-4">
                <div className="flex items-center gap-3">
                  <input
                    value={skillQuery}
                    onChange={(event) => setSkillQuery(event.target.value)}
                    placeholder="Filter by name, description, or path"
                    className="flex-1 rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-[11px] text-white outline-none"
                  />
                  {(['all', 'codex', 'agents'] as const).map((source) => (
                    <button
                      key={source}
                      onClick={() => setSkillSource(source)}
                      className={`rounded-2xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        skillSource === source ? 'bg-white/[0.1] text-white' : 'text-white/35'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {filteredSkills.map((skill) => (
                  <div key={skill.id} className="rounded-2xl border border-white/10 bg-[#020611]/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold text-white">{skill.name}</p>
                      <span className={`text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${skill.source === 'codex' ? 'bg-[#38bdf8]/10 text-[#8ed8ff]' : 'bg-[#14b8a6]/10 text-[#90efe1]'}`}>
                        {skill.source}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-white/45">{skill.description}</p>
                    <p className="mt-3 text-[10px] text-white/25 font-mono break-all">{skill.path}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => openFileEditorAndClose(skill.path, skill.name)} className="rounded-xl border border-[#38bdf8]/15 bg-[#38bdf8]/10 px-3 py-2 text-[10px] font-semibold text-[#bdeafe]">Open editor</button>
                      <button onClick={() => window.systalog?.shell.openPath(skill.path)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Reveal</button>
                      <button onClick={() => window.systalog?.clipboard.writeText(skill.path)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65">Copy path</button>
                    </div>
                  </div>
                ))}
                {filteredSkills.length === 0 && (
                  <div className="col-span-2 rounded-2xl border border-dashed border-white/10 bg-[#020611]/35 p-8 text-center text-[12px] text-white/40">
                    No skills match the current filters.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'claude', label: 'Claude Code', version: claudeVersion, status: claudeStatus },
                  { id: 'codex', label: 'Codex CLI', version: codexVersion, status: codexStatus },
                  { id: 'ollama', label: 'Ollama', version: ollamaVersion, status: ollamaStatus === 'running' || ollamaStatus === 'stopped' ? 'installed' : ollamaStatus },
                  { id: 'openclaw', label: 'OpenClaw', version: openclawVersion, status: openclawStatus },
                ].map((tool) => (
                  <div key={tool.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-[11px] font-bold text-white">{tool.label}</p>
                    <p className="mt-2 text-[10px] text-white/30 font-mono">{tool.version || 'unknown version'}</p>
                    <p className="mt-1 text-[10px] text-white/30">{tool.status}</p>
                    <button
                      onClick={() => runUpdate(tool.id)}
                      disabled={tool.status === 'missing'}
                      className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-semibold text-white/70 disabled:opacity-30"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
              {updateLog && (
                <div className="rounded-[24px] border border-white/10 bg-[#020611]/45 p-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Console</p>
                  <pre className="mt-3 whitespace-pre-wrap break-all text-[11px] leading-5 text-white/55 font-mono">{updateLog}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
