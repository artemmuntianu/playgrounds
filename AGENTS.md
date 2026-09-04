# Project

Astro 5, TypeScript strict, npm.

## Commands

```sh
npm install
npm dev          # local dev server
npm build        # production build
npm lint --fix  # lint with autofix
npm typecheck   # tsc --noEmit
```

## Shell / commands (Windows PowerShell 5.1)

The terminal is **Windows PowerShell 5.1**, not bash/cmd. These rules prevent common stumbles:

- Do **not** use `&&` to chain commands — PowerShell 5.1 rejects it. Separate commands with `;`.
- Prefer PowerShell-native commands over cmd.exe aliases:
  - `dir` → `Get-ChildItem`; `dir /b` / `dir /s` → `Get-ChildItem -Name` / `-Recurse`. A bare `/b` gets parsed as a path (`D:\b`) and errors.
  - `mkdir` → `New-Item -ItemType Directory`; `rm`/`del` → `Remove-Item`; `cp` → `Copy-Item`; `mv` → `Move-Item`.
- `npm` / `npx` are blocked by the Execution Policy (their `.ps1` shim cannot load). Run them through cmd, or call the local binary directly:
  - `cmd /c "npm run <script>"`
  - `cmd /c "node_modules\.bin\tsc.cmd --noEmit"`
- Long-running commands (build, typecheck) sometimes return no output through the shell wrapper. Redirect to a file, then read it back:
  `cmd /c "npm run build > out.txt 2>&1"`
- Always quote paths (`cd "d:\Work\play-model-portal"`) and never chain with `&&`.

## Conventions

- Style with Tailwind utilities inline. Extract to a component when used 3+ times.
- Server-rendered by default. Mark client islands explicitly and minimally.
- No new `any` types. Existing ones are tracked in `TODO-types.md`.

## Don't

- Add a dependency without checking `package.json` for an existing equivalent.
- Write tests.

## When unsure

Ask. A 30-second clarifying question is cheaper than a 30-minute revert.
