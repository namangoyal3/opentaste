# 🚀 Getting Started with OpenTaste

## What is OpenTaste?

**OpenTaste** learns how YOU code — analyzing your source files, configs, and git history — then bakes that taste into context files (`CLAUDE.md`, `.cursorrules`, etc.). Your AI tools start every session knowing exactly how you code.

### Why Taste Matters

AI coding tools perform **dramatically better** when they know your personal coding style. Without OpenTaste, every session starts from scratch:
- Wrong naming conventions
- Incorrect import styles
- Missing personal guardrails
- Generic, unhelpful conventions

OpenTaste solves this by **learning your personal coding taste** automatically.

## Quick Start

### 1. Install

```bash
git clone https://github.com/namangoyal3/opentaste.git
cd opentaste
pnpm install && pnpm build
npm link packages/cli
```

### 2. Generate Context

```bash
cd your-project
ctx init
```

This will:
1. Scan your project structure and dependencies
2. Detect your tech stack (languages, frameworks, tools)
3. Generate `CLAUDE.md` and `.cursorrules` files
4. Score the context quality (0-100)

### 3. Analyze Quality

```bash
ctx analyze
```

See your context coverage score and get actionable suggestions for improvement.

### 4. Watch for Changes

```bash
ctx watch
```

Automatically updates your context files whenever your project changes.

## What You Get

After running `ctx init`, you'll have:

### CLAUDE.md (Claude Code)
Optimized context file with:
- Project overview and tech stack
- Development commands
- Architecture documentation
- Coding conventions
- Safety guardrails
- Reference links

### .cursorrules (Cursor)
Same comprehensive context in Cursor's expected format.

## Next Steps

- [Architecture Guide](./architecture.md)
- [CLI Reference](./api-reference.md)
- [Context Templates](../packages/core/src/templates.ts)
