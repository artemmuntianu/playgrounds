# Project

Astro SSR (version authoritative in `package.json`, currently `^7.2.9`), TypeScript strict, npm.
**Read `CONSTITUTION.md` and the per-layer `AGENTS.md` files before changing anything** — this stops
each agent from re-discovering the design.

## Architecture map (read first)

- **`CONSTITUTION.md`** — canonical architecture, invariants, legacy/dead code, known discrepancies.
- **`src/types/AGENTS.md`** — domain types.
- **`src/lib/AGENTS.md`** — the shadow/rendering engine (lib) — shadows only.
- **`src/lib/playgroundStorage/AGENTS.md`** — persistence (Supabase metadata + FS images).
- **`src/pages/api/AGENTS.md`** — API/backend endpoints.
- **`src/components/annotation/AGENTS.md`** — annotation tooling.
- **`src/components/viewer/AGENTS.md`** — public viewer (single renderer).
- **`src/components/admin/AGENTS.md`** — admin flow.

## Commands

```sh
npm install
npm dev          # local dev server
npm build        # production build
npm lint --fix  # lint with autofix
npm typecheck   # tsc --noEmit
```

## Shell / commands (Windows PowerShell 5.1)

The terminal is **Windows PowerShell 5.1**, not bash/cmd. The single most-common mistake is
chaining commands with `&` / `&&`. **In PowerShell 5.1 both are reserved operators and fail when
used as "run A then B"**. The ONLY correct separator is a semicolon `;`.

- **NEVER** join two commands with `&&` or with a bare `&`. Always use `;`.
  - Wrong (errors): `cmd /c "dir /b src > a.txt" & cmd /c "dir /b data > b.txt"`
  - Right: `cmd /c "dir /b src > a.txt"; cmd /c "dir /b data > b.txt"`
- Inside a `cmd /c "..."` string, `&` / `&&` are fine — that string is handed **verbatim** to
  cmd.exe. The problem is only the `&` **between** two `cmd /c "..."` invocations (PowerShell
  parses that one).
- Prefer PowerShell-native commands over cmd.exe aliases:
  - `dir` → `Get-ChildItem`; `dir /b` / `dir /s` → `Get-ChildItem -Name` / `-Recurse`. A bare `/b`
    gets parsed as a path (`D:\b`) and errors.
  - `mkdir` → `New-Item -ItemType Directory`; `rm`/`del` → `Remove-Item`; `cp` → `Copy-Item`;
    `mv` → `Move-Item`.
- `npm` / `npx` are blocked by the Execution Policy (their `.ps1` shim cannot load). Run them
  through cmd, or call the local binary directly:
  - `cmd /c "npm run <script>"`  ·  `cmd /c "node_modules\.bin\tsc.cmd --noEmit"`
- Long-running commands (build, typecheck) sometimes return no output and report `exit code 1`
  through the shell wrapper even on success. Redirect to a file and read it back:
  `cmd /c "npm run build > out.txt 2>&1"`. **Do not treat a non-zero wrapper exit as failure —
  verify the actual log/artifact instead.**
- Always quote paths (`cd "d:\Work\play-model-portal"`).

## Conventions

- **Output language**: always respond in English, even if the user writes in another language.
- Style with Tailwind utilities inline. Extract to a component when used 3+ times.
- Server-rendered by default. Mark client islands explicitly and minimally.
- No new `any` types. Existing ones are tracked in `TODO-types.md`.

## Don't

- Add a dependency without checking `package.json` for an existing equivalent.
- Write tests.

## When unsure

Ask. A 30-second clarifying question is cheaper than a 30-minute revert.
