# `tools/` — type-aware analysis & codemod CLI

`analyze.mjs` is a [ts-morph](https://ts-morph.com) (TypeScript-compiler-API) CLI for the questions
that text search answers badly: *who references this symbol?*, *what is actually dead?*, *who imports
this module?*, *move these declarations and rewire the imports*.

It is **not part of the app**: `tools/package.json` is a private sandbox, so the app's
`package.json` / `package-lock.json` stay untouched and the Vercel build is unaffected.

## Install (once per clone)

```sh
cmd /c "cd /d tools && npm install"     # installs ts-morph into tools/node_modules (gitignored)
```

## Usage

```sh
node tools/analyze.mjs <command> [args]
```

| Command | What it does |
|---|---|
| `outline <file>` | Declaration map: kind, name, line range, first JSDoc line. Cheap way to read a big file. |
| `dead-exports [--all]` | Exports with no reference outside their own file, split into: fully dead / framework-resolved / used outside the TS program / internal-only. |
| `refs <Symbol> [--file <path>]` | **Real** reference resolution via the language service: file + line list, or "no references". |
| `imports <module>` | Every importer of a module with the exact names it pulls, plus re-exports. |
| `typecheck` | tsc diagnostics (fast sanity check; `tsc --noEmit` stays authoritative). |
| `move-symbols --from a.ts --to b.ts --names f,g [--write]` | Codemod: moves top-level declarations, rewires every importer, and reports the follow-up imports. **Dry run by default.** |

Examples

```sh
node tools/analyze.mjs outline src/lib/shadowProjection.ts
node tools/analyze.mjs refs computeSunLightTarget           # symbol with a unique name
node tools/analyze.mjs refs getMask --file src/lib/segMasks.ts  # --file narrows a duplicated name
node tools/analyze.mjs imports src/lib/segRenderer
node tools/analyze.mjs move-symbols --from src/lib/segMasks.ts --to src/lib/segRenderer.ts --names getMask
node tools/analyze.mjs move-symbols --from … --to … --names getMask --write && node tools/analyze.mjs typecheck
```

The path argument may omit the extension (`src/lib/segRenderer`, `src/lib` → `index.ts`).

## Reading the `dead-exports` output

The tool only sees the **TS program**, so it classifies carefully instead of crying wolf:

* **fully dead** — no reference in TS, no `.astro`/JS reference, not a framework export. Safe
  candidate for deletion (the report notes if a `.md` merely *mentions* it).
* **framework-resolved** — `GET`/`POST`/`PUT`/… and `prerender`: Astro calls these by name, they are
  never imported. Never dead.
* **used outside the TS program** — imported by a `.astro` page/layout (or a plain JS script), which
  the TS program does not include. The report names the exact file, so the verdict is checkable.
* **internal-only** — used inside its own module: the `export` keyword is redundant, the code is live.

## Workflow rules

1. Prefer `refs` / `imports` over grep for reference questions — grep counts matches in comments and
   strings and cannot see the symbol graph.
2. `move-symbols` is **dry-run by default**. Read the plan (especially the `TARGET needs …` and
   `SOURCE may now need a back-import …` lines), then `--write`, then `typecheck`.
3. After any `--write`, `tsc --noEmit` (or `analyze.mjs typecheck`) must be clean before continuing.

## Windows notes

* Run it from anywhere: the repo root is resolved from the script's own path.
* To capture output, redirect to a file and read it back — piping node output inside PowerShell 5.1
  is unreliable here: `cmd /c "cd /d <repo> && node tools\analyze.mjs dead-exports > out.txt 2>&1"`.
