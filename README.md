# SYSTALOG Terminal

SYSTALOG Terminal is a standalone Electron app for managing AI coding sessions, local terminal workflows, screenshots, model launch presets, skills, and config surfaces from one desktop hub.

## What it does

- Launches Claude Code, Codex, Z.AI, Ollama Cloud via OpenCode, OpenClaw, A-Evolve tools, and shell sessions from one UI.
- Provides in-app editors for skills and config files.
- Embeds local dashboards like OpenClaw directly inside the app.
- Includes a workspace browser so you can inspect changed files and jump into editors quickly.
- Includes an Evolution Lab for bootstrapping and managing A-Evolve workspaces.
- Captures screenshots, crops them, copies them, and saves them locally.
- Detects machine-specific setup at runtime instead of baking personal settings into the app.

## Clone and run

```bash
git clone https://github.com/MrBoren2014/systalog-terminal.git
cd systalog-terminal
npm install
npm run electron:dev
```

## Packaged build

```bash
npm run build
```

The packaged macOS artifacts are written to `dist/`.

## Provider setup

### Claude Code

- Install the Claude CLI
- Sign in through the CLI once

### Z.AI / GLM

- Get a key from [z.ai/subscribe](https://z.ai/subscribe)
- Save it in the app settings or configure Claude Code for Z.AI directly

### Ollama Cloud + OpenCode

- Install Ollama from [ollama.com/download/mac](https://ollama.com/download/mac)
- Run `ollama signin`
- Install OpenCode:

```bash
curl -fsSL https://opencode.ai/install | bash
```

- Run first-time setup once:

```bash
ollama launch opencode --config
```

- After that, launch Ollama Cloud models from the SYSTALOG sidebar
- The app currently mirrors the live OpenCode + Ollama list detected on the host instead of inventing cloud model codes

### A-Evolve

- SYSTALOG exposes A-Evolve through the in-app `A-Evolve Lab`
- A-Evolve itself requires Python `3.11+`
- Recommended bootstrap flow:

```bash
git clone https://github.com/A-EVO-Lab/a-evolve.git ~/Developer/a-evolve
cd ~/Developer/a-evolve
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[all,dev]"
```

- Use the lab to scaffold a workspace contract under `~/A-Evolve Workspaces/`
- The lab links directly to the upstream repo and paper:
  - [A-Evolve repo](https://github.com/A-EVO-Lab/a-evolve)
  - [A-Evolve paper](https://arxiv.org/abs/2602.00359)

### OpenClaw

- Install and configure OpenClaw on the machine
- Use the built-in dashboard/config/channel actions in SYSTALOG

## How the app stays machine-safe

- No API keys are bundled with the app.
- No local user home paths are hardcoded into the distributable.
- Per-user settings are stored in the Electron user-data directory on each machine.
- Local paths such as `~/.claude`, `~/.codex`, `~/.openclaw`, `~/Pictures/SYSTALOG`, and `~/A-Evolve Workspaces` are resolved dynamically.

## Distribution note

This project can be packaged locally, but public macOS distribution still requires Apple code signing and notarization before frictionless download/install for other users.
