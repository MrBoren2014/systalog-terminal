# SYSTALOG Terminal

SYSTALOG Terminal is a standalone Electron app for managing AI coding sessions, local terminal workflows, screenshots, model launch presets, skills, and config surfaces from one desktop hub.

## What it does

- Launches Claude Code, Codex, Z.AI, Ollama Cloud, OpenClaw, and shell sessions from one UI.
- Provides in-app editors for skills and config files.
- Captures screenshots, crops them, copies them, and saves them locally.
- Detects machine-specific setup at runtime instead of baking personal settings into the app.

## Privacy and machine-specific behavior

- No API keys are bundled with the app.
- No local user home paths are hardcoded into the distributable.
- Per-user settings are stored in the app user-data directory created by Electron on each machine.
- Local paths such as `~/.claude`, `~/.codex`, `~/.openclaw`, and `~/Pictures/SYSTALOG` are resolved dynamically on the user’s computer.

## Development

```bash
npm install
npm run electron:dev
```

## Build

```bash
npm run build
```

The packaged macOS artifacts are written to `dist/`.

## Distribution note

This project can be packaged locally, but public macOS distribution still requires Apple code signing and notarization before frictionless download/install for other users.

