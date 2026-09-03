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

## Conventions

- Style with Tailwind utilities inline. Extract to a component when used 3+ times.
- Server-rendered by default. Mark client islands explicitly and minimally.
- No new `any` types. Existing ones are tracked in `TODO-types.md`.

## Don't

- Add a dependency without checking `package.json` for an existing equivalent.
- Write tests.

## When unsure

Ask. A 30-second clarifying question is cheaper than a 30-minute revert.
