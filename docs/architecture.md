# 🏛️ OpenTaste Architecture

## Overview

OpenTaste is organized as a monorepo with three packages:

```
opentaste/
├── packages/
│   ├── core/       # 🧠 Detection, analysis, and generation engine
│   ├── cli/        # ⌨️ Command-line interface
│   └── dashboard/  # 🎨 Web dashboard (React + Vite)
├── docs/           # 📖 Documentation
└── README.md
```

## Package Relationships

```
┌─────────────┐     ┌──────────────┐
│   CLI       │────▶│  Core        │
│ (commander) │     │ (engine)     │
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Dashboard   │
                    │  (React UI)  │
                    └──────────────┘
```

### Core Package (`@opentaste/core`)

The detection and generation engine:

| Module | Purpose |
|--------|---------|
| `scanner.ts` | Scans project structure, detects languages, frameworks, tools |
| `analyzer.ts` | Analyzes existing context files for quality and coverage |
| `generator.ts` | Generates optimized CLAUDE.md and .cursorrules content |
| `templates.ts` | Template engine with built-in templates for common stacks |
| `types.ts` | TypeScript type definitions |

### Detection Pipeline

```
Project Directory
      │
      ▼
┌─────────────┐
│  Scanner    │──▶ Languages, Frameworks, Tools
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Generator  │──▶ Context Sections (7 types)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Formatter  │──▶ CLAUDE.md, .cursorrules
└─────────────┘
```

### CLI Package (`@opentaste/cli`)

Commands:
- `ctx init` — Generate context files
- `ctx analyze` — Analyze existing context
- `ctx watch` — Auto-update on changes
- `ctx dashboard` — Launch web UI

## Design Principles

1. **Zero Configuration** — Works out of the box for most projects
2. **Intelligent Defaults** — Best practices for every framework
3. **Progressive Enhancement** — Simple for beginners, powerful for experts
4. **Tool Agnostic** — Works with Claude Code, Cursor, Cline, etc.
5. **Privacy First** — All analysis happens locally, no data leaves your machine
