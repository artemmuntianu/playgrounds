# docs/ — Project documentation ownership map

This directory contains project-level documentation deep dives and reference copies of shared standards.

## Which document owns what

| Doc | Owns |
|---|---|
| `README.md` (root) | User-facing overview and setup |
| `CONSTITUTION.md` (root) | Canonical architecture, database & blob invariants, renderer rules, legacy code list |
| `AGENTS.md` (root) + per-layer `AGENTS.md` | Architectural map for LLM agents, command definitions, layer rules |
| `docs/AGENTS.md` | This file: documentation layer map |
| `docs/template_agents.md` | Reference copy of `CommonAgentSDK` layered-docs architecture standard |

## Rules

1. Keep project-specific docs inside this repo (`CONSTITUTION.md` and `docs/`). Do not write project-specific files into `CommonAgentSDK`.
2. When changing project architecture or persistence invariants, update `CONSTITUTION.md` and the relevant layer's `AGENTS.md` in the same change.
