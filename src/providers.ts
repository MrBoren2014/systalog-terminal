import type { ProviderConfig, ModelOption } from './types';

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    icon: '🤖',
    color: '#e85d3f',
    description: 'Anthropic models via Claude Code CLI',
    authType: 'cli-login',
    setupCommand: 'claude',
    docUrl: 'https://docs.anthropic.com/claude-code',
  },
  {
    id: 'zai',
    label: 'Z.AI / GLM',
    icon: '🧠',
    color: '#14b8a6',
    description: 'Zhipu GLM models through Claude Code — z.ai/subscribe',
    authType: 'api-key',
    authEnvVar: 'ANTHROPIC_AUTH_TOKEN',
    baseUrlEnvVar: 'ANTHROPIC_BASE_URL',
    defaultBaseUrl: 'https://api.z.ai/api/anthropic',
    setupCommand: 'npx @z_ai/coding-helper',
    docUrl: 'https://z.ai/subscribe',
  },
  {
    id: 'ollama',
    label: 'Ollama Cloud',
    icon: '🦙',
    color: '#f2a33b',
    description: 'Ollama launch workflow for OpenCode + cloud models',
    authType: 'cli-login',
    setupCommand: 'ollama launch opencode --config',
    docUrl: 'https://ollama.com/cloud',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    icon: '⚡',
    color: '#38bdf8',
    description: 'OpenAI coding models through Codex CLI',
    authType: 'cli-login',
    setupCommand: 'codex',
    docUrl: 'https://developers.openai.com/codex',
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    icon: '🦀',
    color: '#ef4444',
    description: 'OpenClaw gateway, routing, channels, and ops',
    authType: 'none',
    setupCommand: 'openclaw',
  },
  {
    id: 'aevolve',
    label: 'A-Evolve',
    icon: '🧬',
    color: '#8b5cf6',
    description: 'Self-improving agent workspace and evolution control',
    authType: 'none',
    setupCommand: 'python3.11 -m pip install -e ".[all,dev]"',
    docUrl: 'https://github.com/A-EVO-Lab/a-evolve',
  },
  {
    id: 'shell',
    label: 'Shell',
    icon: '💻',
    color: '#7c3aed',
    description: 'Terminal session',
    authType: 'none',
  },
];

// ---- ALL CLOUD MODELS ----
// Each model specifies the exact command + env vars needed to launch it.
// The terminal will pass these env vars into the PTY process.
export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    provider: 'claude',
    description: 'Feb 2026 · default Claude Code workhorse',
    command: 'claude --model claude-sonnet-4-6',
  },
  {
    id: 'claude-opus-4.6',
    name: 'Claude Opus 4.6',
    provider: 'claude',
    description: 'Feb 2026 · deepest reasoning and review',
    command: 'claude --model claude-opus-4-6',
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'claude',
    description: 'Fast fallback for lightweight tasks',
    command: 'claude --model claude-haiku-4-5-20251001',
  },

  {
    id: 'glm-5-turbo',
    name: 'GLM-5 Turbo',
    provider: 'zai',
    description: 'Current Z.AI coding-plan default',
    command: 'claude',
    envOverrides: {
      ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5-turbo',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5-turbo',
    },
  },
  {
    id: 'glm-5.1',
    name: 'GLM-5.1',
    provider: 'zai',
    description: 'Manual high-end Z.AI switch from official docs',
    command: 'claude',
    envOverrides: {
      ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5.1',
    },
  },

  // Curated from Ollama's OpenCode launcher and cloud launches.
  {
    id: 'ollama-minimax-m2.7',
    name: 'MiniMax M2.7 (Cloud)',
    provider: 'ollama',
    description: 'Recommended in the live OpenCode Ollama picker',
    command: 'ollama launch opencode --yes --model minimax-m2.7:cloud',
  },
  {
    id: 'ollama-glm-5',
    name: 'GLM-5 (Ollama Cloud)',
    provider: 'ollama',
    description: 'Recommended in the live OpenCode Ollama picker',
    command: 'ollama launch opencode --yes --model glm-5:cloud',
  },
  {
    id: 'ollama-kimi-k2.5',
    name: 'Kimi K2.5 (Ollama Cloud)',
    provider: 'ollama',
    description: 'Recommended in the live OpenCode Ollama picker',
    command: 'ollama launch opencode --yes --model kimi-k2.5:cloud',
  },
  {
    id: 'codex-gpt-5.4',
    name: 'GPT-5.4',
    provider: 'codex',
    description: 'Current OpenAI flagship for Codex work',
    command: 'codex --model gpt-5.4',
  },
  {
    id: 'codex-gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: 'codex',
    description: 'Stable coding-oriented Codex model',
    command: 'codex --model gpt-5.3-codex',
  },
  {
    id: 'codex-gpt-5.3-codex-spark',
    name: 'GPT-5.3 Codex Spark',
    provider: 'codex',
    description: 'Faster Spark variant for lighter coding loops',
    command: 'codex --model gpt-5.3-codex-spark',
  },

  {
    id: 'openclaw-dashboard',
    name: 'OpenClaw Dashboard',
    provider: 'openclaw',
    description: 'Open the installed OpenClaw control UI',
    command: 'openclaw dashboard',
  },
  {
    id: 'openclaw-configure',
    name: 'OpenClaw Configure',
    provider: 'openclaw',
    description: 'Open config + channel setup',
    command: 'openclaw configure',
  },
  {
    id: 'openclaw-channels',
    name: 'OpenClaw Channels',
    provider: 'openclaw',
    description: 'Manage Reddit, X, and other channels',
    command: 'openclaw configure --section channels',
  },
  {
    id: 'openclaw-doctor',
    name: 'OpenClaw Doctor',
    provider: 'openclaw',
    description: 'Run health checks and setup diagnostics',
    command: 'openclaw doctor',
  },
  {
    id: 'aevolve-lab',
    name: 'A-Evolve Lab',
    provider: 'aevolve',
    description: 'Manage evolution workspaces, bootstrap the framework, and inspect the contract',
    command: '',
  },
];

export function getProviderConfig(id: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModelsForProvider(provider: string): ModelOption[] {
  return DEFAULT_MODELS.filter((m) => m.provider === provider);
}
