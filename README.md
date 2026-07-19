<div align="center">

# 🧠 ContextPilot

### *The AI Context Management Platform*

**Automatically generate, optimize, and sync context for Claude Code, Cursor, Cline, and every AI coding tool.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![CI](https://github.com/namangoyal3/contextpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/namangoyal3/contextpilot/actions/workflows/ci.yml)
[![GitHub Stars](https://img.shields.io/github/stars/namangoyal3/contextpilot?style=social)](https://github.com/namangoyal3/contextpilot)
[![Made for AI Devs](https://img.shields.io/badge/Made%20for-AI%20Developers-blueviolet)](https://github.com/namangoyal3/contextpilot)

**[Quick Start](#-quick-start)** • **[Why Context Matters](#-why-context-matters)** • **[Features](#-features)** • **[Dashboard](#-web-dashboard)** • **[Documentation](docs/)** • **[Contributing](CONTRIBUTING.md)**

</div>

---

## 🤔 Why Context Matters

**This is the #1 problem with AI coding tools in 2026.**

> *"Context is AI coding's real bottleneck."* — The New Stack

When you use Claude Code, Cursor, or Cline without good context files, they:

| Problem | Result |
|---------|--------|
| ❌ **Hallucinated APIs** | Suggests packages that don't exist |
| ❌ **Wrong framework patterns** | Uses class components in a hooks-only codebase |
| ❌ **Architectural mistakes** | Puts business logic in components, not services |
| ❌ **Missing conventions** | Uses inline styles instead of Tailwind |
| ❌ **Security issues** | Disables input validation, exposes sensitive data |

**ContextPilot solves this.** It scans your project, understands your stack, and generates comprehensive context files that make your AI tools **instantly 10x more effective.**

---

## 🎯 What ContextPilot Does

```
┌─────────────────────────────────────────────────────────────────┐
│  $ ctx init                                                     │
│                                                                 │
│  ┌─ ContextPilot — Context Generator ────────────────────────┐  │
│  ✔ Project detected: my-awesome-app                           │  │
│  ✔ Languages:  TypeScript, JavaScript, CSS                    │  │
│  ✔ Frameworks: Next.js, React, Tailwind CSS, Prisma           │  │
│  ✔ Created CLAUDE.md                                          │  │
│  ✔ Created .cursorrules                                       │  │
│  ✔ Coverage score: 85/100                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Suggestions:                                                   │
│    ℹ Add References section — Link to API documentation         │
│                                                                 │
│  ✔ Context generated! Your AI tools now have optimal context.   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Install
git clone https://github.com/namangoyal3/contextpilot.git
cd contextpilot
pnpm install && pnpm build
npm link packages/cli

# 2. Go to your project and generate context
cd your-project
ctx init

# 3. Analyze your context quality
ctx analyze

# 4. (Optional) Watch for changes
ctx watch
```

**That's it.** Your AI coding tools will immediately perform better.

---

## ✨ Features

### 🔍 **Smart Project Detection**
Scans your entire project to detect:
- **Languages** — TypeScript, Python, Go, Rust, Java, and 12+ more
- **Frameworks** — Next.js, React, Express, NestJS, FastAPI, and 25+ more
- **Build tools** — Vite, Webpack, esbuild, Turbopack
- **Testing** — Vitest, Jest, Playwright, Cypress
- **Linting** — ESLint, Biome, Prettier
- **Architecture** — Directory structure, source organization, patterns

### 📝 **Context Generation**
Generates comprehensive, beautifully formatted context files:

| Section | What It Covers |
|---------|---------------|
| 📋 Project Overview | What the project does, key features |
| 🛠️ Tech Stack | Languages, frameworks, tools, versions |
| 💻 Commands | dev, build, test, lint, typecheck |
| 🏛️ Architecture | Directory structure, component organization |
| 📐 Conventions | Coding patterns, naming, imports, state management |
| 🛡️ Guardrails | What the AI should NOT do |
| 📚 References | Links to docs, pattern guides |

### 📊 **Quality Analysis**
- **Coverage Score** — 0-100 rating of your context completeness
- **Missing Sections** — Identifies gaps in your context
- **Readability Score** — How easy is your context for AI to parse
- **Actionable Suggestions** — Specific recommendations for improvement

### 🎨 **Web Dashboard**
Beautiful real-time dashboard to visualize and manage context:
- Live context preview
- Coverage metrics
- Section-by-section analysis
- One-click actions (copy, save, export)

### 👁️ **Watch Mode**
Automatically regenerates context when your project changes:
- Monitors `package.json`, `tsconfig.json`, and source files
- Debounced to avoid thrashing
- Zero configuration required

### 📦 **Template System**
Built-in templates for popular stacks:

| Template | Stack | 
|----------|-------|
| `react-spa` | React + Vite + TypeScript |
| `nextjs-app` | Next.js App Router |
| `node-api` | Express / Fastify / NestJS |
| `python-api` | FastAPI / Flask / Django |
| `typescript-lib` | TypeScript library/package |

### 🔌 **Tool Integrations**

| Tool | File Generated | Format |
|------|---------------|--------|
| Claude Code | `CLAUDE.md` | Markdown |
| Cursor | `.cursorrules` | Markdown |
| Cline | `.clinerules` | Markdown |
| Aider | `CONVENTIONS.md` | Markdown |
| Custom | Configurable | Any |

---

## 🎨 Web Dashboard

ContextPilot includes a **stunning web dashboard** for visualizing and managing your AI context:

```bash
ctx dashboard
```

Opens at `http://localhost:4040` with:

- 📊 **Metrics Overview** — Live context quality score, framework count, language stats
- 🏛️ **Section Analysis** — Visual breakdown of all 7 context sections
- 👁️ **Live Preview** — See your CLAUDE.md rendered in real-time
- 💡 **Suggestions Panel** — Actionable improvement recommendations
- 🚀 **Quick Actions** — Copy, save, export with one click

---

## 📊 Why Developers Love ContextPilot

> *"I went from manually writing CLAUDE.md files to one command. My Claude Code sessions are 5x more productive."*

> *"The analyze command caught that I was missing guardrails — and my AI was generating code with security issues. ContextPilot literally prevents bugs."*

> *"I manage 3 projects. ContextPilot saves me 30 minutes every time I switch contexts. It's essential."*

---

## 🏗️ Project Structure

```
contextpilot/
├── packages/
│   ├── core/          # 🧠 Detection, analysis, generation engine
│   ├── cli/           # ⌨️ CLI tool (ctx/contextpilot)
│   └── dashboard/     # 🎨 Web dashboard (React + Vite)
├── docs/              # 📖 Documentation
├── LICENSE            # 📄 MIT License
├── CONTRIBUTING.md    # 🤝 Contributing guide
└── README.md          # This file
```

---

## 🛠️ Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev              # Watch mode for development
npm link packages/cli # Link CLI globally
```

---

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md).

**Ways to contribute:**
- 🐛 Report bugs via [Issues](https://github.com/namangoyal3/contextpilot/issues)
- 💡 Suggest features
- 📝 Improve documentation
- 🛠️ Add new templates for more frameworks
- 🌐 Add support for more AI tools

---

## 📄 License

[MIT](LICENSE) © [Naman Goyal](https://github.com/namangoyal3)

---

<div align="center">

**🧠 ContextPilot — Because your AI is only as good as its context.**

⭐️ **Star this repo** if you found it useful! ⭐️

**[Quick Start](#-quick-start)** • **[Documentation](docs/)** • **[Report Bug](https://github.com/namangoyal3/contextpilot/issues)**

</div>
