import React, { useEffect, useMemo, useState } from 'react';
import type { AppInfo, Provider, TerminalTab } from '../types';

interface ToolStatus {
  label: string;
  value: string;
  ok: boolean;
}

interface EvolutionPaneProps {
  tab: TerminalTab;
  isActive: boolean;
  onLaunchCommand: (label: string, command: string, provider?: Provider) => void;
  onOpenBrowserTab: (url: string, label?: string, provider?: Provider) => void;
  onOpenFileEditor: (filePath: string, label?: string) => void;
  onOpenWorkspace: (rootPath: string, label?: string, focusPath?: string) => void;
}

const CONTRACT_DIRS = [
  ['manifest.yaml', 'Identity, entrypoint, and evolvable layers'],
  ['prompts/', 'Base system prompt and fragments'],
  ['skills/', 'SKILL.md files the evolver can mutate'],
  ['tools/', 'Tool registry and runtime helpers'],
  ['memory/', 'Append-only episodic or semantic memory'],
  ['evolution/', 'Observations, history, and cycle artifacts'],
] as const;

const ALGORITHMS = [
  ['adaptive_evolve', 'Claim-by-claim feedback analysis and meta-learning'],
  ['adaptive_skill', 'LLM-driven workspace mutation with bash access'],
  ['skillforge', 'EGL-gated workspace mutation for skill evolution'],
  ['guided_synth', 'Memory-first synthesis with guided interventions'],
] as const;

const BENCHMARKS = [
  ['swe-verified', 'GitHub issue solving on real repos'],
  ['mcp-atlas', 'Tool-calling across MCP servers'],
  ['terminal-bench', 'Terminal and CLI reliability'],
  ['skill-bench', 'Skill discovery and task routing'],
] as const;

export const EvolutionPane: React.FC<EvolutionPaneProps> = ({
  tab,
  isActive,
  onLaunchCommand,
  onOpenBrowserTab,
  onOpenFileEditor,
  onOpenWorkspace,
}) => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [statuses, setStatuses] = useState<ToolStatus[]>([
    { label: 'python3', value: 'checking', ok: false },
    { label: 'python3.11', value: 'checking', ok: false },
    { label: 'uv', value: 'checking', ok: false },
    { label: 'git', value: 'checking', ok: false },
    { label: 'repo', value: 'checking', ok: false },
  ]);

  useEffect(() => {
    window.systalog?.app.getInfo().then(setAppInfo).catch(() => {});
  }, []);

  const recommendedPaths = useMemo(() => {
    const homedir = appInfo?.homedir || '~';
    return {
      repo: `${homedir}/Developer/a-evolve`,
      workspaces: `${homedir}/A-Evolve Workspaces`,
      starter: `${homedir}/A-Evolve Workspaces/systalog-agent`,
    };
  }, [appInfo]);

  useEffect(() => {
    if (!appInfo?.homedir) return;

    const checks: Array<[string, string]> = [
      ['python3', 'python3 --version 2>/dev/null'],
      ['python3.11', 'python3.11 --version 2>/dev/null'],
      ['uv', 'uv --version 2>/dev/null'],
      ['git', 'git --version 2>/dev/null'],
      ['repo', `[ -d ${JSON.stringify(recommendedPaths.repo)} ] && echo installed || echo missing`],
    ];

    Promise.all(checks.map(async ([label, command]) => {
      const result = await window.systalog?.shell.exec(command);
      const value = (result?.stdout || result?.stderr || 'missing').trim() || 'missing';
      return {
        label,
        value,
        ok: result?.success ? true : value === 'installed',
      };
    })).then(setStatuses).catch(() => {});
  }, [appInfo, recommendedPaths.repo]);

  const statusMap = useMemo(
    () => Object.fromEntries(statuses.map((status) => [status.label, status])),
    [statuses],
  );

  const openStarterWorkspace = () => {
    onOpenWorkspace(recommendedPaths.starter, 'A-Evolve Starter', `${recommendedPaths.starter}/manifest.yaml`);
  };

  const bootstrapCommand = [
    `mkdir -p ${JSON.stringify(`${appInfo?.homedir || '~'}/Developer`)}`,
    `cd ${JSON.stringify(`${appInfo?.homedir || '~'}/Developer`)}`,
    `[ -d a-evolve/.git ] || git clone https://github.com/A-EVO-Lab/a-evolve.git`,
    'cd a-evolve',
    'if command -v python3.11 >/dev/null 2>&1; then PYTHON_BIN=python3.11; else PYTHON_BIN=python3; fi',
    '$PYTHON_BIN -m venv .venv',
    'source .venv/bin/activate',
    'python -m pip install --upgrade pip',
    'python -m pip install -e ".[all,dev]"',
    `mkdir -p ${JSON.stringify(recommendedPaths.workspaces)}`,
    `echo "\\nA-Evolve bootstrap finished. Repo: ${recommendedPaths.repo}\\nWorkspaces: ${recommendedPaths.workspaces}\\n"`,
  ].join(' && ');

  const scaffoldCommand = [
    `mkdir -p ${JSON.stringify(`${recommendedPaths.starter}/prompts`)}`,
    `mkdir -p ${JSON.stringify(`${recommendedPaths.starter}/skills`)}`,
    `mkdir -p ${JSON.stringify(`${recommendedPaths.starter}/tools`)}`,
    `mkdir -p ${JSON.stringify(`${recommendedPaths.starter}/memory`)}`,
    `mkdir -p ${JSON.stringify(`${recommendedPaths.starter}/evolution`)}`,
    `test -f ${JSON.stringify(`${recommendedPaths.starter}/manifest.yaml`)} || cat <<'EOF' > ${JSON.stringify(`${recommendedPaths.starter}/manifest.yaml`)}
agent:
  name: systalog-agent
  entrypoint: your.module.Agent
evolvable_layers:
  - prompts
  - skills
  - memory
EOF`,
    `test -f ${JSON.stringify(`${recommendedPaths.starter}/prompts/system.md`)} || cat <<'EOF' > ${JSON.stringify(`${recommendedPaths.starter}/prompts/system.md`)}
# SYSTALOG Agent System Prompt

Define the base behavior for your evolvable agent here.
EOF`,
    `echo "\\nWorkspace scaffolded at ${recommendedPaths.starter}\\n"`,
  ].join(' && ');

  return (
    <div className={`h-full w-full bg-sys-bg ${isActive ? '' : 'pointer-events-none'}`}>
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(139,92,246,0.18),transparent)] px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4b5fd] font-mono">A-Evolve Lab</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">{tab.label}</h2>
              <p className="mt-2 max-w-3xl text-[12px] leading-6 text-white/55">
                A-Evolve treats the workspace as the interface: the agent reads it, the evolver mutates it, and git gates every accepted change. This panel turns that contract into something you can bootstrap and inspect inside SYSTALOG.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onOpenBrowserTab('https://github.com/A-EVO-Lab/a-evolve', 'A-Evolve Repo', 'aevolve')}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold text-white/75"
              >
                Open repo
              </button>
              <button
                onClick={() => onOpenBrowserTab('https://arxiv.org/abs/2602.00359', 'A-Evolve Paper', 'aevolve')}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold text-white/75"
              >
                Open paper
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4">
            {statuses.map((status) => (
              <div key={status.label} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">{status.label}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-mono ${status.ok ? 'bg-[#14b8a6]/10 text-[#14b8a6]' : 'bg-[#f2a33b]/10 text-[#f2a33b]'}`}>
                    {status.ok ? 'ready' : 'needs work'}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-white/45 font-mono break-all">{status.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4b5fd] font-mono">Bootstrap</p>
              <h3 className="mt-2 text-lg font-bold text-white">Install the framework and scaffold a workspace</h3>
              <p className="mt-2 text-[11px] leading-5 text-white/45">
                A-Evolve requires Python 3.11+ and is best managed as a local repo plus virtualenv. This workflow keeps it separate from SYSTALOG while making the contract visible here.
              </p>
              <div className="mt-4 space-y-3 rounded-[20px] border border-white/10 bg-[#020611]/40 p-4">
                <p className="text-[10px] text-white/30 font-mono">Repo path</p>
                <p className="text-[11px] text-white/65 font-mono break-all">{recommendedPaths.repo}</p>
                <p className="mt-2 text-[10px] text-white/30 font-mono">Workspace root</p>
                <p className="text-[11px] text-white/65 font-mono break-all">{recommendedPaths.workspaces}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onLaunchCommand('Bootstrap A-Evolve', bootstrapCommand, 'aevolve')}
                  className="rounded-2xl bg-[linear-gradient(135deg,#8b5cf6,#6366f1)] px-4 py-3 text-[11px] font-semibold text-white"
                >
                  Bootstrap framework
                </button>
                <button
                  onClick={() => onLaunchCommand('Scaffold A-Evolve Workspace', scaffoldCommand, 'aevolve')}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold text-white/75"
                >
                  Scaffold workspace
                </button>
                <button
                  onClick={openStarterWorkspace}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold text-white/75"
                >
                  Open starter workspace
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4b5fd] font-mono">Loop</p>
              <h3 className="mt-2 text-lg font-bold text-white">Solve, observe, evolve, gate, reload</h3>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {['Solve', 'Observe', 'Evolve', 'Gate', 'Reload'].map((phase) => (
                  <div key={phase} className="rounded-2xl border border-white/10 bg-[#020611]/40 px-3 py-4 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">{phase}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-5 text-white/45">
                Every accepted mutation should land in files you can open here: prompts, skills, memory, tools, and evolution logs. That makes the system auditable and lets SYSTALOG act as the control plane around the framework.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4b5fd] font-mono">Workspace contract</p>
              <div className="mt-4 space-y-3">
                {CONTRACT_DIRS.map(([name, detail]) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-[#020611]/40 p-4">
                    <p className="text-[11px] font-bold text-white font-mono">{name}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4b5fd] font-mono">Built-in algorithms</p>
              <div className="mt-4 space-y-3">
                {ALGORITHMS.map(([name, detail]) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-[#020611]/40 p-4">
                    <p className="text-[11px] font-bold text-white font-mono">{name}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4b5fd] font-mono">Adapters</p>
              <div className="mt-4 space-y-3">
                {BENCHMARKS.map(([name, detail]) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-[#020611]/40 p-4">
                    <p className="text-[11px] font-bold text-white font-mono">{name}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4b5fd] font-mono">Direct file access</p>
                <h3 className="mt-2 text-lg font-bold text-white">Jump straight into the contract files</h3>
              </div>
              <button
                onClick={() => onOpenWorkspace(recommendedPaths.workspaces, 'A-Evolve Workspaces')}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold text-white/75"
              >
                Open workspaces root
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <button
                onClick={() => onOpenFileEditor(`${recommendedPaths.starter}/manifest.yaml`, 'A-Evolve manifest')}
                className="rounded-2xl border border-white/10 bg-[#020611]/40 px-4 py-4 text-left text-[11px] font-semibold text-white/80"
              >
                Manifest
              </button>
              <button
                onClick={() => onOpenFileEditor(`${recommendedPaths.starter}/prompts/system.md`, 'A-Evolve system prompt')}
                className="rounded-2xl border border-white/10 bg-[#020611]/40 px-4 py-4 text-left text-[11px] font-semibold text-white/80"
              >
                System prompt
              </button>
              <button
                onClick={() => onOpenWorkspace(recommendedPaths.starter, 'A-Evolve Starter', `${recommendedPaths.starter}/skills`)}
                className="rounded-2xl border border-white/10 bg-[#020611]/40 px-4 py-4 text-left text-[11px] font-semibold text-white/80"
              >
                Skills and memory
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-white/40">
              This setup assumes the repo lives at <span className="font-mono text-white/60">{recommendedPaths.repo}</span> and your own evolvable workspaces live under <span className="font-mono text-white/60">{recommendedPaths.workspaces}</span>. If you move those, the lab still works, but the quick paths above will need to follow your new structure.
            </p>
          </div>

          {statusMap.python3?.ok && !statusMap['python3.11']?.ok && (
            <div className="rounded-[24px] border border-[#f2a33b]/20 bg-[#f2a33b]/[0.08] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#ffd79a] font-mono">Prereq gap</p>
              <p className="mt-2 text-[12px] leading-6 text-white/65">
                This Mac currently has {statusMap.python3.value} but not Python 3.11. A-Evolve declares <span className="font-mono">requires-python &gt;= 3.11</span>, so bootstrap will need a newer interpreter before the install can be considered healthy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
