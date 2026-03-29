# Security

## Project posture

SYSTALOG Terminal is a local desktop tool that can:

- launch shell sessions
- execute CLI tools
- read and write user-owned config files
- capture screenshots when the user explicitly requests it

This is intentional product behavior, not a sandboxed consumer app model.

## What is not bundled

- No API keys are committed in source control.
- No user-specific auth tokens are included in the distributable.
- No hardcoded home-directory paths are baked into the app bundle.

Per-user state is stored by Electron in the user data directory on each machine.

## Safe distribution expectations

- Review code before distributing modified builds.
- Prefer signed and notarized builds for public macOS distribution.
- Document the app's shell/file/screenshot capabilities clearly for users.
- Do not redistribute builds with personal config files or populated user-data directories.

## Reporting

If you find a security issue in the codebase, open a private report with the maintainer before publishing a full exploit write-up.

