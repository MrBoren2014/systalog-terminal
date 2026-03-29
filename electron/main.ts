import { app, BrowserWindow, ipcMain, screen, desktopCapturer, clipboard, shell, globalShortcut, Menu, MenuItem, nativeImage } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

// node-pty is a native module
let pty: any = null;
try {
  pty = require('node-pty');
} catch (e) {
  console.error('node-pty load failed:', e);
}

const isDev = !app.isPackaged;
const STORE_PATH = path.join(app.getPath('userData'), 'systalog-store.json');

let mainWindow: BrowserWindow | null = null;
const terminals = new Map<string, any>();

// --- JSON store ---
function readStore(): Record<string, unknown> {
  try { if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')); } catch {}
  return {};
}
function writeStore(data: Record<string, unknown>) {
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2)); } catch {}
}

function getShell(): string { return process.env.SHELL || '/bin/zsh'; }

let fullPath: string | null = null;
function getUserPath(): string {
  try {
    return execSync(`${getShell()} -ilc 'echo $PATH'`, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch { return process.env.PATH || '/usr/local/bin:/usr/bin:/bin'; }
}

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function matchesBaseUrl(value: unknown, expected: string): boolean {
  if (!hasValue(value)) return false;
  return normalizeUrl(value) === normalizeUrl(expected);
}

function readClaudeSettingsEnv(): Record<string, string> {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const env = raw?.env;
    if (!env || typeof env !== 'object') return {};
    return Object.fromEntries(
      Object.entries(env).filter((entry): entry is [string, string] => hasValue(entry[0]) && hasValue(entry[1])),
    );
  } catch {
    return {};
  }
}

function readLoginShellEnv(): Record<string, string> {
  try {
    const output = execSync(`${getShell()} -ilc 'env'`, {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, PATH: fullPath || getUserPath() },
    });
    const vars: Record<string, string> = {};
    for (const line of output.split(/\r?\n/)) {
      const index = line.indexOf('=');
      if (index <= 0) continue;
      const key = line.slice(0, index);
      if (!['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'OLLAMA_API_KEY'].includes(key)) continue;
      vars[key] = line.slice(index + 1);
    }
    return vars;
  } catch {
    return {};
  }
}

function detectCloudProviderStatus(
  appKey: unknown,
  expectedBaseUrl: string,
  claudeSettingsEnv: Record<string, string>,
  loginShellEnv: Record<string, string>,
) {
  if (hasValue(appKey)) {
    return { configured: true, source: 'app-key' as const };
  }

  if (
    hasValue(claudeSettingsEnv.ANTHROPIC_AUTH_TOKEN) &&
    matchesBaseUrl(claudeSettingsEnv.ANTHROPIC_BASE_URL, expectedBaseUrl)
  ) {
    return { configured: true, source: 'claude-settings' as const };
  }

  if (
    hasValue(loginShellEnv.ANTHROPIC_AUTH_TOKEN) &&
    matchesBaseUrl(loginShellEnv.ANTHROPIC_BASE_URL, expectedBaseUrl)
  ) {
    return { configured: true, source: 'shell-env' as const };
  }

  return { configured: false, source: 'missing' as const };
}

function commandExists(command: string): boolean {
  try {
    execSync(`${getShell()} -ilc 'command -v ${command}'`, {
      stdio: 'ignore',
      timeout: 5000,
      env: { ...process.env, PATH: fullPath || getUserPath() },
    });
    return true;
  } catch {
    return false;
  }
}

function ensureScreenshotDir(): string {
  const dir = path.join(os.homedir(), 'Pictures', 'SYSTALOG');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveDataUrlToFile(dataUrl: string): string {
  const image = nativeImage.createFromDataURL(dataUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(ensureScreenshotDir(), `systalog-capture-${timestamp}.png`);
  fs.writeFileSync(filePath, image.toPNG());
  return filePath;
}

function listWorkspaceEntries(rootPath: string, depth = 2) {
  if (depth < 0) return [];
  try {
    return fs.readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 80)
      .map((entry) => {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
          return {
            path: fullPath,
            name: entry.name,
            kind: 'directory' as const,
            children: depth > 0 ? listWorkspaceEntries(fullPath, depth - 1) : [],
          };
        }
        return {
          path: fullPath,
          name: entry.name,
          kind: 'file' as const,
        };
      });
  } catch {
    return [];
  }
}

function getWorkspaceSnapshot(targetPath: string) {
  const normalizedPath = hasValue(targetPath) ? path.resolve(targetPath) : os.homedir();
  const resolvedRoot = fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isDirectory()
    ? normalizedPath
    : path.dirname(normalizedPath);

  let gitRoot: string | undefined;
  let changedFiles: Array<{ path: string; status: string }> = [];

  try {
    gitRoot = execSync(`git -C ${JSON.stringify(resolvedRoot)} rev-parse --show-toplevel`, {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, PATH: fullPath || getUserPath() },
    }).trim();

    const statusOutput = execSync(`git -C ${JSON.stringify(resolvedRoot)} status --short --untracked-files=all`, {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, PATH: fullPath || getUserPath() },
    });

    changedFiles = statusOutput
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => {
        const status = line.slice(0, 2).trim() || '??';
        const relativePath = line.slice(3).trim().replace(/^"|"$/g, '');
        return {
          status,
          path: gitRoot ? path.join(gitRoot, relativePath) : path.join(resolvedRoot, relativePath),
        };
      });
  } catch {}

  return {
    rootPath: resolvedRoot,
    entries: listWorkspaceEntries(resolvedRoot, 2),
    gitRoot,
    changedFiles,
  };
}

function parseSkillMeta(skillPath: string, source: 'codex' | 'agents') {
  const content = fs.readFileSync(skillPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  let name = path.basename(path.dirname(skillPath));
  let description = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('name:') && !description) {
      name = trimmed.slice(5).trim().replace(/^["']|["']$/g, '');
      continue;
    }
    if (trimmed.startsWith('description:')) {
      description = trimmed.slice(12).trim().replace(/^["']|["']$/g, '');
      continue;
    }
    if (!trimmed.startsWith('---') && !trimmed.startsWith('#') && !trimmed.startsWith('license:')) {
      description = description || trimmed;
      break;
    }
  }

  return {
    id: `${source}:${skillPath}`,
    name,
    description: description || 'Installed skill',
    path: skillPath,
    source,
  };
}

function walkSkillFiles(root: string, source: 'codex' | 'agents', depth = 0): Array<ReturnType<typeof parseSkillMeta>> {
  if (!fs.existsSync(root) || depth > 4) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const skills: Array<ReturnType<typeof parseSkillMeta>> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const skillFile = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        skills.push(parseSkillMeta(skillFile, source));
      }
      skills.push(...walkSkillFiles(fullPath, source, depth + 1));
    }
  }

  return skills;
}

function listInstalledSkills() {
  const codexRoot = path.join(os.homedir(), '.codex', 'skills');
  const agentsRoot = path.join(os.homedir(), '.agents', 'skills');
  const all = [
    ...walkSkillFiles(codexRoot, 'codex'),
    ...walkSkillFiles(agentsRoot, 'agents'),
  ];

  return all
    .filter((skill, index, arr) => arr.findIndex((entry) => entry.path === skill.path) === index)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function createPtyProcess(id: string, cwd?: string, envOverrides?: Record<string, string>, command?: string) {
  if (!pty) return null;
  if (!fullPath) fullPath = getUserPath();
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'en_US.UTF-8',
    PATH: fullPath!,
    ...(envOverrides || {}),
  };
  const shellArgs = command ? ['-ilc', command] : [];
  const term = pty.spawn(getShell(), shellArgs, {
    name: 'xterm-256color', cols: 120, rows: 30,
    cwd: cwd || os.homedir(), env,
  });
  term.onData((data: string) => { mainWindow?.webContents.send('terminal:data', { id, data }); });
  term.onExit(({ exitCode }: { exitCode: number }) => {
    mainWindow?.webContents.send('terminal:exit', { id, exitCode });
    terminals.delete(id);
  });
  return term;
}

// --- macOS Application Menu (REQUIRED for Cmd+C/V to work) ---
function buildAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- Right-click context menu ---
function setupContextMenu() {
  if (!mainWindow) return;
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();
    if (params.isEditable || params.selectionText) {
      if (params.selectionText) {
        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      }
      if (params.isEditable) {
        menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
        menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
      }
    } else {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
    }
    menu.popup();
  });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1440, width),
    height: Math.min(900, height),
    minWidth: 800, minHeight: 500,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#07111f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  setupContextMenu();
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load', { errorCode, errorDescription, validatedURL });
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('render-process-gone', details);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log('renderer-console', { level, message, line, sourceId });
  });
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('did-finish-load', mainWindow?.webContents.getURL());
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    for (const [, t] of terminals) t?.kill();
    terminals.clear();
  });
}

// --- IPC handlers ---
ipcMain.handle('terminal:create', (_e, { id, cwd, command, env }: { id: string; cwd?: string; command?: string; env?: Record<string, string> }) => {
  const term = createPtyProcess(id, cwd, env, command);
  if (term) { terminals.set(id, term); return { success: true }; }
  return { success: false, error: 'node-pty not available' };
});
ipcMain.handle('terminal:write', (_e, { id, data }: { id: string; data: string }) => { terminals.get(id)?.write(data); return { success: true }; });
ipcMain.handle('terminal:resize', (_e, { id, cols, rows }: { id: string; cols: number; rows: number }) => { try { terminals.get(id)?.resize(cols, rows); } catch {} return { success: true }; });
ipcMain.handle('terminal:kill', (_e, { id }: { id: string }) => { const t = terminals.get(id); if (t) { t.kill(); terminals.delete(id); } return { success: true }; });

ipcMain.handle('screenshot:capture', async () => {
  try {
    const primary = screen.getPrimaryDisplay();
    const scaleFactor = primary.scaleFactor || 1;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.floor(primary.size.width * scaleFactor),
        height: Math.floor(primary.size.height * scaleFactor),
      },
    });
    const primarySource = sources.find((source) => source.display_id === String(primary.id)) || sources[0];
    if (primarySource) return { success: true, dataUrl: primarySource.thumbnail.toDataURL() };
    return { success: false, error: 'No screen' };
  } catch (err) { return { success: false, error: String(err) }; }
});
ipcMain.handle('screenshot:save', (_e, dataUrl: string) => {
  try {
    const filePath = saveDataUrlToFile(dataUrl);
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('clipboard:readImage', () => { const img = clipboard.readImage(); return img.isEmpty() ? { success: false } : { success: true, dataUrl: img.toDataURL() }; });
ipcMain.handle('clipboard:writeText', (_e, text: string) => { clipboard.writeText(text); return { success: true }; });
ipcMain.handle('clipboard:writeImage', (_e, dataUrl: string) => {
  try {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('shell:exec', (_e, command: string) => {
  try {
    if (!fullPath) fullPath = getUserPath();
    const stdout = execSync(command, { encoding: 'utf-8', timeout: 10000, env: { ...process.env, PATH: fullPath } });
    return { success: true, stdout };
  } catch (err: any) { return { success: false, stderr: err?.stderr || String(err) }; }
});
ipcMain.handle('shell:openExternal', (_e, url: string) => { shell.openExternal(url); return { success: true }; });
ipcMain.handle('shell:openPath', (_e, targetPath: string) => shell.openPath(targetPath).then((value) => ({ success: value === '', value })));
ipcMain.handle('filesystem:readTextFile', (_e, filePath: string) => {
  try {
    return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
ipcMain.handle('filesystem:writeTextFile', (_e, { filePath, content }: { filePath: string; content: string }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
ipcMain.handle('filesystem:getWorkspaceSnapshot', (_e, rootPath: string) => {
  try {
    return { success: true, snapshot: getWorkspaceSnapshot(rootPath) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('app:getInfo', () => ({
  homedir: os.homedir(), platform: os.platform(), shell: getShell(),
  hostname: os.hostname(), username: os.userInfo().username,
}));
ipcMain.handle('app:getAuthState', () => {
  const store = readStore();
  const claudeSettingsEnv = readClaudeSettingsEnv();
  const loginShellEnv = readLoginShellEnv();

  return {
    zai: detectCloudProviderStatus(
      store.zaiApiKey,
      'https://api.z.ai/api/anthropic',
      claudeSettingsEnv,
      loginShellEnv,
    ),
    ollama: commandExists('ollama') && commandExists('opencode')
      ? { configured: true, source: 'cli' as const }
      : { configured: false, source: 'missing' as const },
  };
});
ipcMain.handle('app:listSkills', () => listInstalledSkills());

ipcMain.handle('store:get', (_e, key: string) => { const s = readStore(); return s[key] ?? null; });
ipcMain.handle('store:set', (_e, { key, value }: { key: string; value: unknown }) => { const s = readStore(); s[key] = value; writeStore(s); });

// --- App lifecycle ---
app.whenReady().then(() => {
  buildAppMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); for (const [, t] of terminals) t?.kill(); });
