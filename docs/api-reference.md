# 📚 OpenTaste API Reference

## CLI Commands

### `ctx init [path]`

Generate AI context files for your project.

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <id>` | Template ID (e.g., `react-spa`, `nextjs-app`) | auto-detect |
| `--no-claude` | Skip CLAUDE.md generation | false |
| `--no-cursor` | Skip .cursorrules generation | false |
| `--all` | Generate for all supported tools | false |
| `--dry-run` | Preview without writing files | false |
| `--json` | Output as JSON | false |

### `ctx analyze [path]`

Analyze existing context files for quality.

| Option | Description |
|--------|-------------|
| `--json` | Output results as JSON |
| `--fix` | Apply suggested fixes automatically |

### `ctx watch [path]`

Watch project for changes and auto-update context.

| Option | Description | Default |
|--------|-------------|---------|
| `--debounce <ms>` | Debounce time in milliseconds | 2000 |
| `--no-initial` | Skip initial generation | false |

### `ctx dashboard`

Launch the web dashboard.

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Dashboard port | 4040 |
| `--no-open` | Don't open browser | false |

## Core Package

### `scanProject(rootDir: string): Promise<DetectedProject>`

Scans a project directory and detects:
- Languages (TypeScript, Python, Go, etc.)
- Frameworks (React, Next.js, Express, etc.)
- Build tools, test frameworks, linters
- Directory structure
- Package manager

### `generateContext(project: DetectedProject): GeneratedContext`

Generates optimized context content:
- `claudeMd` — Full CLAUDE.md content
- `cursorRules` — Full .cursorrules content
- `coverageScore` — Quality score (0-100)
- `suggestions` — Improvement suggestions
- `sections` — Individual context sections

### `analyzeContextFile(filePath: string): ContextAnalysis`

Analyzes an existing context file:
- Completeness score
- Coverage per section type
- Readability score
- Actionable suggestions

### `TemplateEngine`

Built-in template system:
- `get(id)` — Get template by ID
- `findBestMatch(frameworks)` — Auto-match best template
- `applyTemplate(template, variables)` — Fill template variables

## Templates

| ID | Name | Targets |
|----|------|---------|
| `react-spa` | React SPA | React, Vite, TypeScript |
| `nextjs-app` | Next.js App Router | Next.js, React, TypeScript |
| `node-api` | Node.js API Server | Express, Fastify, NestJS |
| `python-api` | Python API Server | FastAPI, Flask, Django |
| `typescript-lib` | TypeScript Library | TypeScript |
