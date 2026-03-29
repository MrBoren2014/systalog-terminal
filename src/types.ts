export type Provider = 'claude' | 'codex' | 'ollama' | 'zai' | 'openclaw' | 'shell' | 'custom';

export interface ProviderConfig {
  id: Provider;
  label: string;
  icon: string;
  color: string;
  description: string;
  authType: 'api-key' | 'cli-login' | 'local' | 'none';
  authEnvVar?: string;
  baseUrlEnvVar?: string;
  defaultBaseUrl?: string;
  setupCommand?: string;
  docUrl?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
  size?: string;
  description?: string;
  envOverrides?: Record<string, string>;
  command?: string;
}

export interface TerminalTab {
  id: string;
  label: string;
  icon: string;
  color: string;
  kind?: 'terminal' | 'editor';
  cwd?: string;
  command?: string;
  envOverrides?: Record<string, string>;
  isRunning: boolean;
  provider: Provider;
  model?: string;
  filePath?: string;
}

export interface SavedSession {
  id: string;
  name: string;
  tabs: Omit<TerminalTab, 'isRunning'>[];
  createdAt: number;
}

export interface CustomLaunch {
  id: string;
  label: string;
  icon: string;
  command: string;
  cwd?: string;
  color: string;
  provider: Provider;
  envOverrides?: Record<string, string>;
}

export interface AuthState {
  claudeApiKey?: string;
  claudeLoggedIn?: boolean;
  codexApiKey?: string;
  codexLoggedIn?: boolean;
  zaiApiKey?: string;
  ollamaRunning?: boolean;
}

export type ProviderSetupSource = 'checking' | 'app-key' | 'claude-settings' | 'shell-env' | 'cli' | 'missing';

export interface ProviderSetupStatus {
  configured: boolean;
  source: ProviderSetupSource;
}

export interface ProviderAuthSnapshot {
  zai: ProviderSetupStatus;
  ollama: ProviderSetupStatus;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  source: 'codex' | 'agents';
}

export interface AppInfo {
  homedir: string;
  platform: string;
  shell: string;
  hostname: string;
  username: string;
}

declare global {
  interface Window {
    systalog: {
      terminal: {
        create: (opts: { id: string; cwd?: string; command?: string; env?: Record<string, string> }) => Promise<{ success: boolean; error?: string }>;
        write: (opts: { id: string; data: string }) => Promise<{ success: boolean }>;
        resize: (opts: { id: string; cols: number; rows: number }) => Promise<{ success: boolean }>;
        kill: (opts: { id: string }) => Promise<{ success: boolean }>;
        onData: (cb: (payload: { id: string; data: string }) => void) => () => void;
        onExit: (cb: (payload: { id: string; exitCode: number }) => void) => () => void;
      };
      screenshot: {
        capture: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
        save: (dataUrl: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      };
      clipboard: {
        readImage: () => Promise<{ success: boolean; dataUrl?: string }>;
        writeText: (text: string) => Promise<{ success: boolean }>;
        writeImage: (dataUrl: string) => Promise<{ success: boolean; error?: string }>;
      };
      shell: {
        openExternal: (url: string) => Promise<{ success: boolean }>;
        openPath: (targetPath: string) => Promise<{ success: boolean; value?: string }>;
        exec: (command: string) => Promise<{ success: boolean; stdout?: string; stderr?: string }>;
      };
      filesystem: {
        readTextFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        writeTextFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      };
      app: {
        getInfo: () => Promise<AppInfo>;
        getAuthState: () => Promise<ProviderAuthSnapshot>;
        listSkills: () => Promise<SkillInfo[]>;
      };
      store: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
      };
    };
  }
}
