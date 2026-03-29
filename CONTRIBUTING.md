# Contributing

## Setup

```bash
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
- Test both dev mode and packaged mode before opening a PR.

## Release notes

Public macOS releases should be signed and notarized before broad distribution.
