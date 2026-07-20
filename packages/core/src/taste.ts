import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, basename, extname } from 'path';
import { collectWorkspaceDeps } from './scanner.js';
import { homedir } from 'os';
import type {
  TasteProfile,
  TasteNaming,
  TasteImports,
  TasteComponents,
  TasteStyling,
  TasteTypeScript,
  TasteFormatting,
  TasteTesting,
  TasteCommands,
  TasteConfidence,
  LearnedPattern,
  TasteLearnOptions,
  DetectedProject,
  ContextSection,
} from './types.js';
import { DEFAULT_TASTE_OPTIONS } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const TASTE_DIR = join(homedir(), '.config', 'opentaste');
const TASTE_FILE = join(TASTE_DIR, 'taste.json');

const CURRENT_VERSION = '1.0.0';

// ─── Default Taste Profile ───────────────────────────────────────────────────

export function createDefaultTaste(): TasteProfile {
  return {
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
    sourceProjects: [],
    naming: {
      files: 'kebab-case',
      functions: 'camelCase',
      types: 'PascalCase',
      constants: 'UPPER_CASE',
      components: 'PascalCase',
    },
    imports: {
      style: 'named',
      groupExternal: true,
      absoluteImports: false,
    },
    components: {
      pattern: 'functional',
      colocateTests: false,
      colocateStyles: false,
      propsInterface: true,
    },
    styling: {
      approach: 'unknown',
    },
    typescript: {
      strict: true,
      avoidAny: true,
    },
    formatting: {
      semi: true,
      singleQuote: true,
      trailingComma: true,
      tabWidth: 2,
      bracketSpacing: true,
    },
    testing: {
      framework: 'unknown',
      pattern: 'unknown',
    },
    guardrails: [],
    favoritePatterns: [],
    learnedPatterns: [],
    commandPreferences: {
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint',
      typecheck: 'npm run typecheck',
    },
    confidence: {
      naming: 0,
      imports: 0,
      components: 0,
      styling: 0,
      typescript: 0,
      formatting: 0,
      testing: 0,
      overall: 0,
    },
  };
}

// ─── Taste Profile Storage ───────────────────────────────────────────────────

export function loadTasteProfile(): TasteProfile {
  try {
    if (!existsSync(TASTE_DIR)) {
      mkdirSync(TASTE_DIR, { recursive: true });
    }
    if (!existsSync(TASTE_FILE)) {
      const defaultTaste = createDefaultTaste();
      writeFileSync(TASTE_FILE, JSON.stringify(defaultTaste, null, 2), 'utf-8');
      return defaultTaste;
    }
    const raw = readFileSync(TASTE_FILE, 'utf-8');
    const profile = JSON.parse(raw) as TasteProfile;
    // Ensure all fields exist (handle schema upgrades)
    return { ...createDefaultTaste(), ...profile };
  } catch {
    return createDefaultTaste();
  }
}

export function saveTasteProfile(profile: TasteProfile): void {
  if (!existsSync(TASTE_DIR)) {
    mkdirSync(TASTE_DIR, { recursive: true });
  }
  profile.lastUpdated = new Date().toISOString();
  writeFileSync(TASTE_FILE, JSON.stringify(profile, null, 2), 'utf-8');
}

// ─── Taste Learner ───────────────────────────────────────────────────────────

/**
 * Learn coding taste from a project by analyzing:
 * 1. Git history — commit message patterns, file naming
 * 2. Config files — tsconfig, eslint, prettier, biome
 * 3. Project structure — naming conventions used in existing code
 * 4. Package.json — preferred tools and libraries
 */
export function learnTasteFromProject(
  rootDir: string,
  options: TasteLearnOptions = DEFAULT_TASTE_OPTIONS
): Partial<TasteProfile> {
  const learned: Partial<TasteProfile> = {};
  const evidence: string[] = [];

  // 1. Analyze package.json for tooling preferences
  if (options.packageAnalysis) {
    const pkg = readPackageJson(rootDir);
    if (pkg) {
      evidence.push('package.json analyzed');
      Object.assign(learned, analyzePackagePreferences(pkg, rootDir));
    }
  }

  // 2. Analyze config files
  if (options.configFiles) {
    const configEvidence: string[] = [];
    const configTaste = analyzeConfigFiles(rootDir);
    if (configTaste) {
      Object.assign(learned, configTaste);
      configEvidence.push('config files analyzed');
      evidence.push(...configEvidence);
    }
  }

  // 3. Analyze project structure naming
  if (options.projectStructure) {
    const structureTaste = analyzeProjectStructure(rootDir);
    if (structureTaste) {
      Object.assign(learned, structureTaste);
      evidence.push('project structure analyzed');
    }
  }

  // 4. Analyze git history
  if (options.gitHistory) {
    const gitTaste = analyzeGitHistory(rootDir);
    if (gitTaste) {
      Object.assign(learned, gitTaste);
      evidence.push('git history analyzed');
    }
  }

  // Add source project
  const projectName = basename(rootDir);
  learned.sourceProjects = [projectName];
  learned.learnedPatterns = (learned.learnedPatterns || []).map((p: LearnedPattern) => ({
    ...p,
    evidence: [...p.evidence, ...evidence],
  }));

  return learned;
}

// ─── Package Analysis ────────────────────────────────────────────────────────

function readPackageJson(rootDir: string): Record<string, any> | null {
  const pkgPath = join(rootDir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

function analyzePackagePreferences(pkg: Record<string, any>, rootDir: string): Partial<TasteProfile> {
  // Include nested workspace package.json deps so a monorepo's test/styling
  // tooling (e.g. vitest, tailwind in packages/*) is detected, not just root.
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...collectWorkspaceDeps(rootDir),
  };
  const scripts = pkg.scripts || {};
  const learned: Partial<TasteProfile> = {};

  // Detect testing framework
  const testing = analyzeTestingPreference(allDeps);
  if (testing) learned.testing = testing;

  // Detect styling approach
  const styling = analyzeStylingPreference(allDeps);
  if (styling) learned.styling = styling;

  // Detect TypeScript strictness from tsconfig
  const tsconfig = readTsConfig(rootDir);
  if (tsconfig) {
    learned.typescript = {
      strict: tsconfig.strict !== false,
      avoidAny: tsconfig.noImplicitAny !== false,
    };
  }

  // Detect command preferences from scripts
  learned.commandPreferences = {
    dev: findScriptCommand(scripts, ['dev', 'start', 'serve']) || 'npm run dev',
    build: findScriptCommand(scripts, ['build', 'compile', 'prod']) || 'npm run build',
    test: findScriptCommand(scripts, ['test', 'test:run', 'spec']) || 'npm test',
    lint: findScriptCommand(scripts, ['lint', 'check', 'validate']) || 'npm run lint',
    typecheck: findScriptCommand(scripts, ['typecheck', 'type-check', 'types', 'tsc']) || 'npm run typecheck',
  };

  // Detect favorite patterns (popular libraries)
  const patterns: string[] = [];
  for (const dep of Object.keys(allDeps)) {
    if (isFavoritePattern(dep)) patterns.push(dep);
  }
  if (patterns.length > 0) learned.favoritePatterns = patterns;

  return learned;
}

function findScriptCommand(scripts: Record<string, string>, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (scripts[candidate]) return `npm run ${candidate}`;
  }
  // Check if any script contains the candidate command
  for (const [name, cmd] of Object.entries(scripts)) {
    for (const candidate of candidates) {
      if (cmd.includes(candidate)) return `npm run ${name}`;
    }
  }
  return undefined;
}

function analyzeTestingPreference(deps: Record<string, string>): TasteTesting | undefined {
  if (deps['vitest']) return { framework: 'Vitest', pattern: 'co-located' };
  if (deps['jest']) return { framework: 'Jest', pattern: 'separate-dir' };
  if (deps['@playwright/test']) return { framework: 'Playwright', pattern: 'separate-dir' };
  if (deps['cypress']) return { framework: 'Cypress', pattern: 'separate-dir' };
  if (deps['mocha']) return { framework: 'Mocha', pattern: 'separate-dir' };
  if (deps['ava']) return { framework: 'AVA', pattern: 'co-located' };
  return undefined;
}

function analyzeStylingPreference(deps: Record<string, string>): TasteStyling | undefined {
  if (deps['tailwindcss']) return { approach: 'tailwind' };
  if (deps['styled-components']) return { approach: 'styled-components' };
  if (deps['@emotion/react']) return { approach: 'inline' };
  if (deps['sass'] || deps['node-sass']) return { approach: 'sass' };
  if (deps['css-modules'] || deps['@teamsupercell/typings-for-css-modules-loader']) {
    return { approach: 'css-modules' };
  }
  return undefined;
}

function isFavoritePattern(dep: string): boolean {
  const PATTERNS = new Set([
    'zod', 'zod-validation-error',
    'react-hook-form', 'react-query', '@tanstack/react-query',
    'zustand', 'valtio', 'jotai', 'recoil',
    'axios', 'ky', 'ofetch', 'swr',
    'dayjs', 'date-fns', 'luxon',
    'lodash', 'lodash-es', 'ramda',
    'prettier', 'eslint', 'biome',
    'husky', 'lint-staged', 'commitlint',
    'prisma', 'drizzle-orm', 'typeorm',
    'next-auth', 'clerk', '@auth/core',
    'trpc', '@trpc/server', '@trpc/client',
    'tailwind-merge', 'clsx', 'class-variance-authority',
    'framer-motion', 'gsap', 'animejs',
    'react-router', 'wouter', 'tanstack-router',
    'react-hook-form', '@hookform/resolvers',
    'pino', 'winston', 'consola',
    'playwright', 'cypress', 'vitest',
    'storybook', '@storybook/react',
    'radix-ui', '@radix-ui', 'shadcn',
    'uploadthing', 'uploadcare',
    'next-intl', 'react-i18next',
    'tiptap', 'slate',
    'react-dropzone', 'react-hot-toast', 'sonner',
    'react-icons', 'lucide-react',
    'cmdk', 'vaul', 'dialog',
  ]);
  return PATTERNS.has(dep);
}

// ─── Config File Analysis ────────────────────────────────────────────────────

function readTsConfig(rootDir: string): Record<string, any> | null {
  const candidates = ['tsconfig.json', 'tsconfig.base.json'];
  for (const candidate of candidates) {
    const path = join(rootDir, candidate);
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf-8'));
      } catch { /* continue */ }
    }
  }
  return null;
}

function analyzeConfigFiles(rootDir: string): Partial<TasteProfile> | null {
  const learned: Partial<TasteProfile> = {};
  let foundAny = false;

  // Prettier config
  const prettierConfig = findPrettierConfig(rootDir);
  if (prettierConfig) {
    learned.formatting = prettierConfig as TasteFormatting;
    foundAny = true;
  }

  // ESLint config
  const eslintConfig = findEslintConfig(rootDir);
  if (eslintConfig) {
    learned.imports = { ...(learned.imports || {}), ...(eslintConfig.imports || {}) } as TasteImports;
    foundAny = true;
  }

  // Biome config
  const biomeConfig = findBiomeConfig(rootDir);
  if (biomeConfig) {
    learned.formatting = { ...(learned.formatting || {}), ...(biomeConfig.formatting || {}) } as TasteFormatting;
    foundAny = true;
  }

  return foundAny ? learned : null;
}

function findPrettierConfig(rootDir: string): Partial<TasteFormatting> | null {
  const candidates = [
    '.prettierrc', '.prettierrc.json', '.prettierrc.yaml',
    '.prettierrc.yml', '.prettierrc.js', '.prettierrc.toml',
    'prettier.config.js',
  ];
  for (const candidate of candidates) {
    const path = join(rootDir, candidate);
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8');
        // Handle JSON and JS configs
        const config = content.trim().startsWith('{')
          ? JSON.parse(content)
          : extractJsonFromJs(content);
        if (config) {
          return {
            semi: config.semi !== false,
            singleQuote: config.singleQuote !== false,
            trailingComma: config.trailingComma !== 'none',
            tabWidth: config.tabWidth || 2,
            bracketSpacing: config.bracketSpacing !== false,
          };
        }
      } catch { /* continue */ }
    }
  }
  return null;
}

function findEslintConfig(rootDir: string): { imports?: Partial<TasteImports> } | null {
  const candidates = [
    '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.yaml',
    '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs',
  ];
  for (const candidate of candidates) {
    if (existsSync(join(rootDir, candidate))) {
      // ESLint doesn't directly tell us import preferences,
      // but if they have eslint-plugin-import, they care about imports
      const pkg = readPackageJson(rootDir);
      if (pkg && (pkg.dependencies?.['eslint-plugin-import'] || pkg.devDependencies?.['eslint-plugin-import'])) {
        return { imports: { style: 'named', groupExternal: true, absoluteImports: false } };
      }
    }
  }
  return null;
}

function findBiomeConfig(rootDir: string): { formatting?: Partial<TasteFormatting> } | null {
  const candidates = ['biome.json', 'biome.jsonc'];
  for (const candidate of candidates) {
    const path = join(rootDir, candidate);
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8');
        const config = JSON.parse(content);
        const formatter = config.formatter || {};
        return {
          formatting: {
            semi: formatter.semi !== false,
            singleQuote: formatter.singleQuote !== false,
            trailingComma: formatter.trailingComma !== 'none',
            tabWidth: formatter.tabWidth || 2,
            bracketSpacing: formatter.bracketSpacing !== false,
          },
        };
      } catch { /* continue */ }
    }
  }
  return null;
}

// ─── Project Structure Analysis ─────────────────────────────────────────────

function analyzeProjectStructure(rootDir: string): Partial<TasteProfile> | null {
  const naming: Partial<TasteNaming> = {};
  let totalFiles = 0;
  let kebabCount = 0;
  let camelCount = 0;
  let snakeCount = 0;
  let pascalCount = 0;
  const componentFiles: string[] = [];

  function walk(dir: string, depth = 0) {
    if (depth > 4) return;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath, depth + 1);
          } else {
            totalFiles++;
            // Classify naming convention
            const name = entry.split('.').slice(0, -1).join('.');
            if (!name) continue;

            if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) kebabCount++;
            else if (/^[a-z][a-zA-Z0-9]*$/.test(name)) camelCount++;
            else if (/^[a-z]+(_[a-z0-9]+)*$/.test(name)) snakeCount++;
            else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) pascalCount++;

            // Track component files
            const ext = extname(entry).toLowerCase();
            if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) {
              componentFiles.push(name);
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  walk(rootDir);

  if (totalFiles === 0) return null;

  // Determine dominant file naming convention
  const maxCount = Math.max(kebabCount, camelCount, snakeCount, pascalCount);
  const totalNamed = kebabCount + camelCount + snakeCount + pascalCount;
  if (totalNamed > 0 && maxCount / totalNamed > 0.3) {
    if (maxCount === kebabCount) naming.files = 'kebab-case';
    else if (maxCount === camelCount) naming.files = 'camelCase';
    else if (maxCount === snakeCount) naming.files = 'snake_case';
    else if (maxCount === pascalCount) naming.files = 'PascalCase';
  }

  // Determine component naming
  if (componentFiles.length > 0) {
    const pascalComponents = componentFiles.filter(n => /^[A-Z][a-zA-Z0-9]*$/.test(n)).length;
    if (pascalComponents > componentFiles.length / 2) {
      naming.components = 'PascalCase';
    } else {
      naming.components = 'kebab-case';
    }
  }

  return Object.keys(naming).length > 0 ? { naming: naming as TasteNaming } : null;
}

// ─── Git History Analysis ────────────────────────────────────────────────────

function analyzeGitHistory(rootDir: string): Partial<TasteProfile> | null {
  const gitDir = join(rootDir, '.git');
  if (!existsSync(gitDir)) return null;

  try {
    const logOutput = execSync(
      'git log --oneline --format="%s" --max-count=100 2>/dev/null',
      { cwd: rootDir, encoding: 'utf-8', timeout: 5000 }
    ).toString();

    const commits = logOutput.split('\n').filter(Boolean);
    if (commits.length === 0) return null;

    // Analyze commit message patterns
    const patterns: LearnedPattern[] = [];
    const conventionalCount = commits.filter(c => /^(feat|fix|docs|refactor|test|chore|perf|style|build|ci|revert)(\(.+\))?:\s/.test(c)).length;

    if (conventionalCount > commits.length * 0.5) {
      patterns.push({
        pattern: 'conventional-commits',
        description: 'Uses Conventional Commits (feat:, fix:, chore:, etc.)',
        confidence: conventionalCount / commits.length,
        evidence: [`${conventionalCount}/${commits.length} commits use conventional format`],
      });
    }

    // Detect emoji usage
    const emojiCount = commits.filter(c => /[\u{1F300}-\u{1F9FF}]/u.test(c)).length;
    if (emojiCount > 3) {
      patterns.push({
        pattern: 'emoji-commits',
        description: 'Uses emoji in commit messages',
        confidence: emojiCount / commits.length,
        evidence: [`${emojiCount}/${commits.length} commits contain emoji`],
      });
    }

    // Detect scope usage in conventional commits
    const scopeCount = commits.filter(c => /\(.+\)/.test(c)).length;
    if (scopeCount > 3) {
      patterns.push({
        pattern: 'commit-scopes',
        description: 'Uses scoped commit messages (feat(api): ...)',
        confidence: scopeCount / commits.length,
        evidence: [`${scopeCount}/${commits.length} commits include scope`],
      });
    }

    return { learnedPatterns: patterns };
  } catch {
    return null;
  }
}

// ─── Merge Taste Profiles ────────────────────────────────────────────────────

/**
 * Merge a learned taste profile into the user's existing profile.
 * New learnings are weighted and blended with existing preferences.
 */
export function mergeTasteProfile(existing: TasteProfile, learned: Partial<TasteProfile>): TasteProfile {
  const merged = { ...existing };

  if (learned.naming) merged.naming = learned.naming;
  if (learned.imports) merged.imports = learned.imports;
  if (learned.components) merged.components = learned.components;
  if (learned.styling) merged.styling = learned.styling;
  if (learned.typescript) merged.typescript = learned.typescript;
  if (learned.formatting) merged.formatting = learned.formatting;
  if (learned.testing) merged.testing = learned.testing;
  if (learned.commandPreferences) merged.commandPreferences = learned.commandPreferences;

  // Merge guardrails (deduplicate)
  if (learned.guardrails) {
    const existingGuardrails = new Set(merged.guardrails);
    for (const g of learned.guardrails) {
      existingGuardrails.add(g);
    }
    merged.guardrails = Array.from(existingGuardrails);
  }

  // Merge favorite patterns (deduplicate)
  if (learned.favoritePatterns) {
    const existingPatterns = new Set(merged.favoritePatterns);
    for (const p of learned.favoritePatterns) {
      existingPatterns.add(p);
    }
    merged.favoritePatterns = Array.from(existingPatterns);
  }

  // Merge learned patterns (deduplicate by pattern name)
  if (learned.learnedPatterns) {
    const existingPatterns = new Map(merged.learnedPatterns.map(p => [p.pattern, p]));
    for (const p of learned.learnedPatterns) {
      if (existingPatterns.has(p.pattern)) {
        // Update confidence with new evidence
        const existing = existingPatterns.get(p.pattern)!;
        existing.confidence = Math.max(existing.confidence, p.confidence);
        existing.evidence = [...new Set([...existing.evidence, ...p.evidence])];
      } else {
        existingPatterns.set(p.pattern, p);
      }
    }
    merged.learnedPatterns = Array.from(existingPatterns.values());
  }

  // Merge source projects
  if (learned.sourceProjects) {
    const projects = new Set(merged.sourceProjects);
    for (const p of learned.sourceProjects) {
      projects.add(p);
    }
    merged.sourceProjects = Array.from(projects);
  }

  // Recalculate confidence
  merged.confidence = calculateConfidence(merged);

  return merged;
}

function calculateConfidence(profile: TasteProfile): TasteConfidence {
  // Confidence grows with each project analyzed and each concrete signal detected.
  // Even default-matching preferences are valuable because they confirm your style.
  const projectCount = profile.sourceProjects.length;
  const projectFactor = Math.min(projectCount * 0.18, 0.7); // ~18% per project, cap at 70%

  // Concrete signals that raise confidence in specific areas
  const hasStyling = profile.styling.approach !== 'unknown';
  const hasTesting = profile.testing.framework !== 'unknown';

  const conf: TasteConfidence = {
    naming: projectFactor,
    imports: projectFactor * 0.8,
    components: projectFactor * 0.8,
    styling: hasStyling ? 0.5 : 0,
    typescript: projectFactor * 0.9,
    formatting: projectFactor * 0.9,
    testing: hasTesting ? 0.6 : 0,
    overall: 0,
  };

  // Compute overall as average of the 7 category values (excluding overall itself)
  const categoryValues = [conf.naming, conf.imports, conf.components, conf.styling, conf.typescript, conf.formatting, conf.testing];
  conf.overall = categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length;

  return conf;
}

// ─── Taste-Enhanced Context Generation ───────────────────────────────────────

/**
 * Apply taste profile to generated context sections.
 * Modifies the conventions, guardrails, commands, and architecture sections
 * to reflect the user's personal coding taste.
 */
export function applyTasteToSection(
  section: ContextSection,
  taste: TasteProfile,
): ContextSection {
  if (section.id === 'project-overview') {
    // Add taste confidence to project overview
    const tasteLine = taste.confidence.overall > 0.3
      ? `\n> 🧠 Personal taste profile applied (${Math.round(taste.confidence.overall * 100)}% confidence)`
      : '';
    return {
      ...section,
      content: section.content + tasteLine,
    };
  }

  if (section.id === 'conventions') {
    return {
      ...section,
      content: enhanceConventionsWithTaste(section.content, taste),
    };
  }

  if (section.id === 'guardrails') {
    return {
      ...section,
      content: enhanceGuardrailsWithTaste(section.content, taste),
    };
  }

  if (section.id === 'commands') {
    return {
      ...section,
      content: enhanceCommandsWithTaste(section.content, taste),
    };
  }

  if (section.id === 'tech-stack') {
    return {
      ...section,
      content: enhanceTechStackWithTaste(section.content, taste),
    };
  }

  return section;
}

function enhanceConventionsWithTaste(content: string, taste: TasteProfile): string {
  const lines = content.split('\n');
  const newLines: string[] = [];

  // Add naming convention section
  newLines.push('');
  newLines.push('### Personal Naming Conventions');
  newLines.push(`- **Files:** \`${taste.naming.files}\` — auto-detected from your project`);
  newLines.push(`- **Functions:** \`${taste.naming.functions}\``);
  newLines.push(`- **Types/Interfaces:** \`${taste.naming.types}\``);
  newLines.push(`- **Constants:** \`${taste.naming.constants}\``);
  newLines.push(`- **Components:** \`${taste.naming.components}\``);
  newLines.push('');

  // Add import style preference
  if (taste.imports.style === 'named') {
    newLines.push('- **Imports:** Use named exports/imports (no default exports)');
  } else if (taste.imports.style === 'default') {
    newLines.push('- **Imports:** Use default exports for primary components');
  }
  if (taste.imports.groupExternal) {
    newLines.push('- **Import Order:** Group external dependencies first, then internal imports');
  }
  if (taste.imports.absoluteImports) {
    newLines.push('- **Import Paths:** Use absolute imports with `@/` prefix');
  }

  return lines.join('\n') + newLines.join('\n');
}

function enhanceGuardrailsWithTaste(content: string, taste: TasteProfile): string {
  if (taste.guardrails.length === 0) return content;

  const lines = content.split('\n');
  lines.push('');
  lines.push('### Personal Guardrails (Learned from Your Preferences)');

  for (const guardrail of taste.guardrails) {
    lines.push(`- ${guardrail}`);
  }

  // Add TypeScript preferences as guardrails
  if (taste.typescript.avoidAny) {
    lines.push('- Never use `any` type — use `unknown` or proper types');
  }
  if (taste.typescript.strict) {
    lines.push('- Keep TypeScript strict mode enabled — do not disable it');
  }

  // Add styling guardrails
  if (taste.styling.approach !== 'unknown') {
    lines.push(`- Use \`${taste.styling.approach}\` for styling — stick to what the project uses`);
  }

  // Add favorite library guardrails
  if (taste.favoritePatterns.length > 0) {
    const preferred = taste.favoritePatterns.slice(0, 5).join(', ');
    lines.push(`- Prefer these libraries when applicable: ${preferred}`);
  }

  return lines.join('\n');
}

function enhanceCommandsWithTaste(content: string, taste: TasteProfile): string {
  const lines = content.split('\n');
  const newLines: string[] = [];

  newLines.push('');
  newLines.push('### Your Personal Commands (from project scripts)');

  newLines.push(`- \`${taste.commandPreferences.dev}\` — Start development`);
  newLines.push(`- \`${taste.commandPreferences.build}\` — Build project`);
  newLines.push(`- \`${taste.commandPreferences.test}\` — Run tests`);
  newLines.push(`- \`${taste.commandPreferences.lint}\` — Lint code`);
  newLines.push(`- \`${taste.commandPreferences.typecheck}\` — TypeScript check`);
  newLines.push('');

  return lines.join('\n') + newLines.join('\n');
}

function enhanceTechStackWithTaste(content: string, taste: TasteProfile): string {
  const lines = content.split('\n');
  const newLines: string[] = [];

  // Add styling info if detected
  if (taste.styling.approach !== 'unknown') {
    newLines.push('');
    newLines.push(`**Styling:** ${capitalize(taste.styling.approach)}`);
  }

  // Add testing info if detected
  if (taste.testing.framework !== 'unknown') {
    newLines.push(`**Testing:** ${taste.testing.framework}`);
  }

  // Add formatting info if detected
  const fmt = taste.formatting;
  if (fmt.semi !== undefined) {
    newLines.push(`**Formatting:** Semicolons: ${fmt.semi ? 'yes' : 'no'}, Quotes: ${fmt.singleQuote ? 'single' : 'double'}, Tab: ${fmt.tabWidth} spaces`);
  }

  // Show confidence
  if (taste.confidence.overall > 0.3) {
    newLines.push('');
    newLines.push(`> 🧠 Taste confidence: ${Math.round(taste.confidence.overall * 100)}% — more projects = better taste`);
  }

  return lines.join('\n') + newLines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function extractJsonFromJs(content: string): Record<string, any> | null {
  // Simple JSON extraction from JS config files (module.exports = { ... })
  try {
    const match = content.match(/(?:module\.exports\s*=\s*|export\s+default\s+)(\{[\s\S]*\})/);
    if (match) {
      return JSON.parse(match[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":'));
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

export function formatTasteProfile(profile: TasteProfile): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`🧠  OpenTaste Profile`);
  lines.push(`   ${'─'.repeat(40)}`);
  lines.push(`   Version: ${profile.version}`);
  lines.push(`   Last updated: ${profile.lastUpdated.slice(0, 10)}`);
  lines.push(`   Source projects: ${profile.sourceProjects.join(', ') || 'none yet'}`);
  lines.push(`   Confidence: ${Math.round(profile.confidence.overall * 100)}%`);
  lines.push('');

  // Naming
  lines.push(`   📁 Naming Conventions`);
  lines.push(`      Files:       ${profile.naming.files}`);
  lines.push(`      Functions:   ${profile.naming.functions}`);
  lines.push(`      Types:       ${profile.naming.types}`);
  lines.push(`      Constants:   ${profile.naming.constants}`);
  lines.push(`      Components:  ${profile.naming.components}`);
  lines.push('');

  // Formatting
  lines.push(`   ✨ Formatting`);
  lines.push(`      Semicolons:       ${profile.formatting.semi ? 'yes' : 'no'}`);
  lines.push(`      Quotes:           ${profile.formatting.singleQuote ? 'single' : 'double'}`);
  lines.push(`      Trailing commas:  ${profile.formatting.trailingComma ? 'yes' : 'no'}`);
  lines.push(`      Tab width:        ${profile.formatting.tabWidth}`);
  lines.push(`      Bracket spacing:  ${profile.formatting.bracketSpacing ? 'yes' : 'no'}`);
  lines.push('');

  // Styling & Testing
  lines.push(`   🎨 Styling:        ${profile.styling.approach === 'unknown' ? 'not detected' : profile.styling.approach}`);
  lines.push(`   🧪 Testing:        ${profile.testing.framework === 'unknown' ? 'not detected' : profile.testing.framework}`);
  lines.push('');

  // Commands
  lines.push(`   ⚡ Commands`);
  lines.push(`      Dev:         ${profile.commandPreferences.dev}`);
  lines.push(`      Build:       ${profile.commandPreferences.build}`);
  lines.push(`      Test:        ${profile.commandPreferences.test}`);
  lines.push(`      Lint:        ${profile.commandPreferences.lint}`);
  lines.push(`      Typecheck:   ${profile.commandPreferences.typecheck}`);
  lines.push('');

  // Guardrails
  if (profile.guardrails.length > 0) {
    lines.push(`   🛡️  Personal Guardrails`);
    for (const g of profile.guardrails) {
      lines.push(`      • ${g}`);
    }
    lines.push('');
  }

  // Learned patterns
  if (profile.learnedPatterns.length > 0) {
    lines.push(`   🔍 Learned Patterns`);
    for (const p of profile.learnedPatterns) {
      const bar = Math.round(p.confidence * 10);
      lines.push(`      ${'█'.repeat(bar)}${'░'.repeat(10 - bar)} ${p.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
