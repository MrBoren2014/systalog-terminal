import React, { useEffect, useRef, useCallback } from 'react';
import type { TerminalTab } from '../types';

// xterm loaded via dynamic import only
let Terminal: any = null;
let FitAddon: any = null;
let WebLinksAddon: any = null;
let xtermCssLoaded = false;

interface TerminalPaneProps {
  tab: TerminalTab;
  isActive: boolean;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({ tab, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<InstanceType<typeof import('xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('xterm-addon-fit').FitAddon> | null>(null);
  const initialized = useRef(false);

  const initTerminal = useCallback(async () => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    // Dynamic imports for renderer context
    if (!Terminal) {
      const mod = await import('xterm');
      Terminal = mod.Terminal;
    }
    if (!xtermCssLoaded) {
      await import('xterm/css/xterm.css');
      xtermCssLoaded = true;
    }
    if (!FitAddon) {
      const mod = await import('xterm-addon-fit');
      FitAddon = mod.FitAddon;
    }
    if (!WebLinksAddon) {
      const mod = await import('xterm-addon-web-links');
      WebLinksAddon = mod.WebLinksAddon;
    }

    if (!Terminal || !FitAddon || !WebLinksAddon) {
      console.error('xterm modules failed to load');
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: "'IBM Plex Mono', 'SF Mono', Menlo, monospace",
      lineHeight: 1.4,
      letterSpacing: 0,
      theme: {
        background: '#07111f',
        foreground: '#d4d4d8',
        cursor: '#e85d3f',
        cursorAccent: '#07111f',
        selectionBackground: 'rgba(232, 93, 63, 0.25)',
        selectionForeground: '#ffffff',
        black: '#0b1424',
        red: '#e85d3f',
        green: '#14b8a6',
        yellow: '#f2a33b',
        blue: '#38bdf8',
        magenta: '#7c3aed',
        cyan: '#22d3ee',
        white: '#d4d4d8',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#67e8f9',
        brightWhite: '#f9fafb',
      },
      allowTransparency: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Create PTY process
    const cols = term.cols;
    const rows = term.rows;

    await window.systalog.terminal.create({
      id: tab.id,
      cwd: tab.cwd,
      command: tab.command,
      env: tab.envOverrides,
    });

    // Resize after creation
    window.systalog.terminal.resize({ id: tab.id, cols, rows });

    // Terminal input → PTY
    term.onData((data: string) => {
      window.systalog.terminal.write({ id: tab.id, data });
    });

    // Handle paste with images
    containerRef.current.addEventListener('paste', async (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Check for images
      for (const item of clipboardData.items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const result = await window.systalog.clipboard.readImage();
          if (result.success && result.dataUrl) {
            // Write notification to terminal
            term.write('\r\n\x1b[33m[Image pasted from clipboard]\x1b[0m\r\n');
          }
          return;
        }
      }
    });

    // PTY output → terminal
    const removeDataListener = window.systalog.terminal.onData(({ id, data }) => {
      if (id === tab.id) {
        term.write(data);
      }
    });

    // PTY exit
    const removeExitListener = window.systalog.terminal.onExit(({ id, exitCode }) => {
      if (id === tab.id) {
        term.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && containerRef.current) {
        try {
          fitAddonRef.current.fit();
          if (termRef.current) {
            window.systalog.terminal.resize({
              id: tab.id,
              cols: termRef.current.cols,
              rows: termRef.current.rows,
            });
          }
        } catch {
          // ignore
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      removeDataListener();
      removeExitListener();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [tab.id, tab.cwd, tab.command, tab.envOverrides]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    initTerminal().then((nextCleanup) => {
      if (disposed) {
        nextCleanup?.();
        return;
      }
      cleanup = nextCleanup;
    }).catch(() => {
      initialized.current = false;
    });

    return () => {
      disposed = true;
      cleanup?.();
      initialized.current = false;
    };
  }, [initTerminal]);

  // Refit when tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          if (termRef.current) {
            window.systalog.terminal.resize({
              id: tab.id,
              cols: termRef.current.cols,
              rows: termRef.current.rows,
            });
          }
          termRef.current?.focus();
        } catch {
          // ignore
        }
      }, 50);
    }
  }, [isActive, tab.id]);

  return (
    <div className="h-full w-full bg-sys-bg">
      {/* Tab type indicator */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${tab.color}, transparent)` }}
      />
      <div ref={containerRef} className="h-[calc(100%-2px)] w-full" />
    </div>
  );
};
