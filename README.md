<div align="center">

# 🧠 OpenTaste

### *AI learns how YOU code, so tools code YOUR way.*

**Deep code analysis • Personal taste profiles • Smart context generation**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Made for AI Devs](https://img.shields.io/badge/Made%20for-AI%20Developers-blueviolet)](https://github.com/namangoyal3/opentaste)

**[Quick Start](#-quick-start)** • **[Features](#-features)** • **[Documentation](docs/)** • **[Contributing](CONTRIBUTING.md)**

</div>

---

## 🤔 The Problem

Every AI coding tool (Claude Code, Cursor, Cline) starts each session **knowing nothing about how you code.**

You tell it your preferences every single time:
- "Use named exports, not default"
- "Use interfaces, not types"
- "Add return types to functions"
- "No `any` — use proper types"

**OpenTaste changes that forever.** It learns how you code by analyzing your actual source files, configs, and git history — then bakes that taste into every context file. Your AI tools start every session knowing exactly how YOU code.

---

## 🎯 What Makes OpenTaste Different

| Other tools | **OpenTaste** |
|------------|---------------|
| ❌ Manual context files | **✅ AI learns your actual code** |
| ❌ Generic templates | **✅ Personal taste profiles** |
| ❌ Session-only memory | **✅ Persistent taste across projects** |
| ❌ Config file analysis only | **✅ Deep source code analysis** |
| ❌ No improvement suggestions | **✅ Actionable code coaching** |

---

## 🚀 Quick Start

```bash
# 1. Install
git clone https://github.com/namangoyal3/opentaste.git
cd opentaste
pnpm install && pnpm build
npm link packages/cli

# 2. Learn taste from your projects
cd your-project
ctx taste learn .           # Learn from configs, git, structure
ctx taste code .            # Deep source code analysis

# 3. Generate context files with YOUR taste baked in
ctx init

# 4. See your taste profile
ctx taste profile

# 5. Get improvement suggestions
ctx taste code .            # Shows suggestions too!
```

---

## ✨ Features

### 🧠 **OpenTaste — Personal Coding Taste**
Your AI learns how YOU code:

| Signal | What's Detected | From |
|--------|----------------|------|
| 📁 **Naming** | kebab-case, camelCase, PascalCase | File structure walk |
| ✨ **Formatting** | Semicolons, quotes, tab width | Prettier/Biome configs |
| ⚡ **Commands** | Your actual dev/build/test/lint scripts | package.json |
| 📦 **Imports** | Named vs default, absolute paths, type imports | **Source code analysis** |
| 🔧 **Functions** | Arrow vs declarations, async patterns | **Source code analysis** |
| 📐 **TypeScript** | Interfaces vs types, any usage, generics | **Source code analysis** |
| 🧩 **Components** | Functional, props typing, hooks | **Source code analysis** |
| 🛡️ **Error Handling** | Try-catch, early returns, custom errors | **Source code analysis** |
| 🧪 **Testing** | describe/it vs test(), mocks, assertions | **Source code analysis** |
| 🌐 **API Patterns** | fetch vs axios, React Query usage | **Source code analysis** |

### 💡 **Smart Improvement Suggestions**
The code analysis doesn't just describe — it **coaches**:

```
┌─ Improvement Suggestions ─────────────────────────────────
🔴  Reduce usage of the `any` type
    → Replace `any` with `unknown` or proper types
🔴  Add return type annotations to your functions
    → Annotate: function get(): Promise<T>
🟡  Switch to absolute imports (@/ → cleaner paths)
    → Configure tsconfig path aliases
🟡  Split large files (>300 lines → smaller modules)
    → Each module = single responsibility
🟢  Use optional chaining (?.) for safe property access
    → user?.address?.street instead of manual checks
└────────────────────────────────────────────────────────────
```

### 📝 **Context Generation**
Generates comprehensive context files with YOUR taste baked in:

| Section | What It Covers |
|---------|---------------|
| 📋 Project Overview | What the project does |
| 🛠️ Tech Stack | Languages, frameworks, tools |
| 💻 Commands | Your actual scripts (auto-detected) |
| 🏛️ Architecture | Directory structure, patterns |
| 📐 Conventions | **Your personal naming + import style** |
| 🛡️ Guardrails | **Your personal rules + preferences** |

### 🔍 **Smart Project Detection**
- **Languages** — TypeScript, Python, Go, Rust, Java, and 12+ more
- **Frameworks** — Next.js, React, Express, NestJS, and 25+ more
- **Build tools** — Vite, Webpack, esbuild, Turbopack
- **Testing** — Vitest, Jest, Playwright, Cypress
- **Architecture** — Directory structure, source organization

### 🔌 **Tool Integrations**

| Tool | File Generated |
|------|---------------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| Cline | `.clinerules` |
| Aider | `CONVENTIONS.md` |

---

## 📊 Taste Profile Example

```
🧠  OpenTaste Profile
   ────────────────────────────────────────
   Version: 1.0.0
   Source projects: my-app, my-api, my-lib
   Confidence: 43%

   📁 Naming Conventions
      Files:       kebab-case
      Components:  PascalCase

   ✨ Formatting
      Semicolons:       yes
      Quotes:           single
      Tab width:        2

   ⚡ Commands
      Dev:         npm run dev
      Build:       npm run build
      Test:        npm run test

   🔍 Learned Patterns
      ████████░░ Conventional Commits
      ███████░░░ Avoids `any` type
      ██████░░░░ Uses optional chaining
      █████░░░░░ Early returns preferred
```

---

## 🛠️ CLI Commands

```
Usage: ctx <command> [options]

Commands:
  init                      Generate context files with your taste baked in
  analyze                   Analyze existing context quality
  watch                     Watch files and auto-update context
  dashboard                 Launch the web dashboard
  demo                      Run OpenTaste on itself (self-demo)
  taste                     🧠 OpenTaste — Learn and manage your coding taste
    taste learn [path]      Learn taste from configs, git, structure
    taste code [path]       Deep source code analysis + suggestions
    taste profile           Show your full taste profile
    taste reset             Reset taste profile to defaults
    taste guardrail <rule>  Add a personal AI guardrail
```

---

## 🏗️ Project Structure

```
opentaste/
├── packages/
│   ├── core/          # 🧠 Analysis, detection, taste learning engine
│   ├── cli/           # ⌨️ CLI tool (ctx)
│   └── dashboard/     # 🎨 Web dashboard (React + Vite)
├── docs/              # 📖 Documentation
├── LICENSE            # 📄 MIT License
├── CONTRIBUTING.md    # 🤝 Contributing guide
├── SECURITY.md        # 🔒 Security policy
└── README.md          # This file
```

---

## 🛠️ Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev              # Watch mode for development
npm link packages/cli # Link CLI globally (makes `ctx` available)
```

---

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md).

**Ways to contribute:**
- 🐛 Report bugs via [Issues](https://github.com/namangoyal3/opentaste/issues)
- 💡 Suggest features
- 📝 Improve documentation
- 🛠️ Add new detectors for more frameworks
- 🌐 Add support for more languages (Python, Go, Rust analysis)

---

## 📄 License

[MIT](LICENSE) © [Naman Goyal](https://github.com/namangoyal3)

---

<div align="center">

**🧠 OpenTaste — AI learns how you code, so tools code YOUR way.**

⭐️ **Star this repo** if you want better AI coding! ⭐️

**[Quick Start](#-quick-start)** • **[Documentation](docs/)** • **[Report Bug](https://github.com/namangoyal3/opentaste/issues)**

</div>
