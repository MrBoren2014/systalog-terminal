# Contributing

## Setup

```bash
git clone https://github.com/MrBoren2014/systalog-terminal.git
cd systalog-terminal
npm install
npm run electron:dev
```

## Build

```bash
npm run build
```

## Guidelines

- Keep the app standalone and machine-agnostic.
- Do not commit API keys, auth tokens, or populated user-data files.
- Preserve local-first behavior where user paths are resolved at runtime.
- Keep OpenClaw and Ollama flows usable for first-time users from inside the app UI.
- Keep the A-Evolve lab honest about prerequisites: Python 3.11+, repo bootstrap, and filesystem-contract workspaces.
- Test both dev mode and packaged mode before opening a PR.

## Release notes

Public macOS releases should be signed and notarized before broad distribution.
