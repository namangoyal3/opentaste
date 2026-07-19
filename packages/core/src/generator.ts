import type {
  DetectedProject,
  GeneratedContext,
  ContextSection,
  ContextSuggestion,
} from './types.js';
import { TemplateEngine } from './templates.js';
import { applyTasteToSection, loadTasteProfile, createDefaultTaste } from './taste.js';
import { existsSync } from 'fs';
import { join } from 'path';

// ─── Context Section Generators ─────────────────────────────────────────────

function generateProjectOverview(project: DetectedProject): ContextSection {
  const lines: string[] = [
    `# ${project.name}`,
    '',
  ];

  // Describe what the project does based on detected frameworks
  const frameworkNames = project.frameworks.map(f => f.name);
  const langNames = project.languages.map(l => l.name).join(', ');
  const desc = frameworkNames.length > 0
    ? `${frameworkNames.join(' + ')} project built with ${langNames}`
    : `Project built with ${langNames}`;

  lines.push(desc);

  if (project.packageManager) {
    lines.push(`Package manager: \`${project.packageManager}\``);
  }

  return {
    id: 'project-overview',
    title: 'Project Overview',
    content: lines.join('\n'),
    priority: 10,
  };
}

function generateTechStack(project: DetectedProject): ContextSection {
  const lines: string[] = [
    '## Tech Stack',
    '',
  ];

  for (const lang of project.languages) {
    const pct = Math.round(lang.confidence * 100);
    lines.push(`- **${lang.name}** — ${pct}% of codebase`);
  }

  lines.push('');
  lines.push('### Frameworks');

  for (const fw of project.frameworks) {
    lines.push(`- **${fw.name}** — ${fw.type}${fw.version ? ` (v${fw.version})` : ''}`);
  }

  if (project.buildTool) {
    lines.push('');
    lines.push(`**Build Tool:** ${project.buildTool}`);
  }
  if (project.testFramework) {
    lines.push(`**Test Framework:** ${project.testFramework}`);
  }
  if (project.linter) {
    lines.push(`**Linter:** ${project.linter}`);
  }
  if (project.formatter) {
    lines.push(`**Formatter:** ${project.formatter}`);
  }

  return {
    id: 'tech-stack',
    title: 'Tech Stack',
    content: lines.join('\n'),
    priority: 9,
  };
}

function generateCommands(project: DetectedProject): ContextSection {
  const lines: string[] = [
    '## Commands',
    '',
    '### Development',
  ];

  // Common commands based on framework
  if (project.frameworks.some(f => ['Next.js', 'Vite', 'React', 'Vue', 'Svelte', 'Angular', 'Nuxt', 'Astro'].includes(f.name))) {
    lines.push('- `npm run dev` — Start development server');
    lines.push('- `npm run build` — Build for production');
  } else if (project.frameworks.some(f => ['Express', 'NestJS', 'Fastify', 'Hono'].includes(f.name))) {
    lines.push('- `npm run dev` — Start dev server with hot reload');
    lines.push('- `npm run build` — Compile TypeScript');
    lines.push('- `npm start` — Start production server');
  } else {
    lines.push('- `npm run dev` — Start development mode');
    lines.push('- `npm run build` — Build the project');
  }

  lines.push('');
  lines.push('### Testing');
  lines.push('- `npm test` — Run tests');
  lines.push('- `npm run test:watch` — Run tests in watch mode');
  lines.push('- `npm run test:coverage` — Run tests with coverage');

  lines.push('');
  lines.push('### Code Quality');
  lines.push('- `npm run typecheck` — Check TypeScript types');
  lines.push('- `npm run lint` — Lint the codebase');
  lines.push('- `npm run format` — Format code');

  return {
    id: 'commands',
    title: 'Commands',
    content: lines.join('\n'),
    priority: 8,
  };
}

function generateArchitecture(project: DetectedProject): ContextSection {
  const lines: string[] = [
    '## Architecture',
    '',
    '### Directory Structure',
    '```',
  ];

  // Generate directory tree
  lines.push(`${project.name}/`);
  if (project.structure.hasSrcDir) lines.push('├── src/          # Source code');
  if (project.structure.hasTestsDir) lines.push('├── tests/        # Test files');
  if (project.structure.hasDocsDir) lines.push('├── docs/         # Documentation');
  if (project.structure.hasCiConfig) lines.push('├── .github/      # CI/CD configuration');
  if (project.structure.hasDockerConfig) lines.push('├── Dockerfile   # Container configuration');

  // Add top-level dirs
  for (const dir of project.structure.topLevelDirs.slice(0, 10)) {
    if (!['src', 'tests', 'docs', '.github', 'node_modules', '.git', 'dist', 'build'].includes(dir)) {
      lines.push(`├── ${dir}/`);
    }
  }

  lines.push('```');

  if (project.structure.sourceDirs.length > 0) {
    lines.push('');
    lines.push('### Source Organization');
    lines.push('');
    for (const dir of project.structure.sourceDirs.slice(0, 10)) {
      lines.push(`- \`src/${dir}/\` — ${describeSourceDir(dir)}`);
    }
  }

  return {
    id: 'architecture',
    title: 'Architecture',
    content: lines.join('\n'),
    priority: 7,
  };
}

function describeSourceDir(dir: string): string {
  const descriptions: Record<string, string> = {
    'components': 'Reusable UI components',
    'pages': 'Page-level components and routing',
    'app': 'Application-level code',
    'features': 'Feature-specific modules',
    'hooks': 'Custom React hooks',
    'utils': 'Utility functions',
    'lib': 'Library code and configurations',
    'api': 'API routes and handlers',
    'routes': 'Route definitions',
    'controllers': 'Request handlers',
    'models': 'Data models and schemas',
    'services': 'Business logic services',
    'middleware': 'Express/Next.js middleware',
    'styles': 'CSS and style files',
    'assets': 'Static assets (images, fonts)',
    'public': 'Public assets',
    'types': 'TypeScript type definitions',
    'constants': 'Constants and enums',
    'config': 'Configuration files',
    'db': 'Database migrations and schemas',
    'schemas': 'Validation schemas',
    'stores': 'State management stores',
    'state': 'State management',
    'layouts': 'Layout components',
    'providers': 'Context providers',
    'helpers': 'Helper functions',
    'errors': 'Error handling',
    'validators': 'Input validation',
  };
  return descriptions[dir] || `${dir} module`;
}

function generateConventions(project: DetectedProject): ContextSection {
  const lines: string[] = [
    '## Coding Conventions',
    '',
  ];

  // Language-specific conventions
  if (project.languages.some(l => l.name === 'TypeScript')) {
    lines.push('- **TypeScript:** Strict mode enabled. Use explicit types. Avoid `any`.');
    lines.push('- **Exports:** Prefer named exports over default exports.');
    lines.push('- **Imports:** Group imports: external → internal → types. Use absolute imports.');
  }

  // Framework-specific conventions
  if (project.frameworks.some(f => ['React', 'Next.js'].includes(f.name))) {
    lines.push('- **Components:** Functional components with hooks. No class components.');
    lines.push('- **Props:** Define interfaces for all component props. Use `interface Props`.');
    lines.push('- **State:** Use server state for API data. Keep UI state minimal.');
    lines.push('- **Styling:** Use Tailwind CSS utility classes. Avoid inline styles.');
  }

  if (project.frameworks.some(f => f.name === 'Express' || f.name === 'NestJS')) {
    lines.push('- **API Design:** RESTful endpoints. Use versioned routes (`/api/v1/`).');
    lines.push('- **Validation:** Validate all inputs with Zod or Joi schemas.');
    lines.push('- **Error Handling:** Centralized error handler middleware.');
  }

  lines.push('');
  lines.push('- **File Naming:** `kebab-case` for files, `PascalCase` for components, `camelCase` for functions/variables.');
  lines.push('- **Testing:** Unit tests alongside source files. Integration tests in `tests/` directory.');
  lines.push('- **Commits:** Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).');

  return {
    id: 'conventions',
    title: 'Coding Conventions',
    content: lines.join('\n'),
    priority: 6,
  };
}

function generateGuardrails(project: DetectedProject): ContextSection {
  const lines: string[] = [
    '## Guardrails',
    '',
    '### DO NOT:',
  ];

  lines.push('- Add new dependencies without explicit approval');
  lines.push('- Modify configuration files without user confirmation');
  lines.push('- Use `any` type without explanatory comment');
  lines.push('- Remove existing tests');
  lines.push('- Refactor code outside the scope of the current task');
  lines.push('- Leave console.log statements in production code');
  lines.push('- Use deprecated APIs or packages');

  if (project.frameworks.some(f => f.type === 'backend')) {
    lines.push('- Expose sensitive data (API keys, secrets) in responses');
    lines.push('- Implement authentication/authorization bypasses');
  }

  return {
    id: 'guardrails',
    title: 'Guardrails',
    content: lines.join('\n'),
    priority: 9,
  };
}

function generateReferences(project: DetectedProject): ContextSection {
  const lines: string[] = [
    '## References',
    '',
  ];

  if (project.frameworks.some(f => f.name === 'Next.js')) {
    lines.push('- @docs/api-routes.md — Read when building API endpoints');
    lines.push('- @docs/data-fetching.md — Read when fetching data');
  }
  if (project.frameworks.some(f => f.name === 'React')) {
    lines.push('- @docs/component-guidelines.md — Read when creating new components');
  }

  lines.push('');
  lines.push('Key files:');
  if (existsSync(join(project.rootDir, 'CONTRIBUTING.md'))) {
    lines.push('- `CONTRIBUTING.md` — Contribution guidelines');
  }
  if (existsSync(join(project.rootDir, 'CHANGELOG.md'))) {
    lines.push('- `CHANGELOG.md` — Version history');
  }

  return {
    id: 'references',
    title: 'References',
    content: lines.join('\n'),
    priority: 4,
  };
}

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generate context for a project.
 * If taste is enabled, personal preferences are baked into the output.
 */
export function generateContext(
  project: DetectedProject,
  options?: { taste?: boolean }
): GeneratedContext {
  let sections: ContextSection[] = [
    generateProjectOverview(project),
    generateTechStack(project),
    generateCommands(project),
    generateArchitecture(project),
    generateConventions(project),
    generateGuardrails(project),
    generateReferences(project),
  ].filter(Boolean);

  // Apply taste profile if enabled
  if (options?.taste !== false) {
    try {
      const tasteProfile = loadTasteProfile();
      if (tasteProfile.confidence.overall >= 0.1) {
        sections = sections.map(s => applyTasteToSection(s, tasteProfile));
      }
    } catch {
      // Taste profile not available — proceed without personalization
    }
  }

  // Generate CLAUDE.md format
  const claudeMd = generateClaudeMd(sections, project);

  // Generate .cursorrules format
  const cursorRules = generateCursorRules(sections, project);

  // Calculate coverage score
  const coverageScore = calculateCoverage(project);

  // Generate suggestions
  const suggestions = generateSuggestions(project, sections);

  return {
    project,
    sections,
    claudeMd,
    cursorRules,
    coverageScore,
    suggestions,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

function generateClaudeMd(sections: ContextSection[], project: DetectedProject): string {
  const lines: string[] = [];

  // Header with project info
  lines.push(`# ${project.name}`);
  lines.push('');
  lines.push(`> Auto-generated by **ContextPilot** — AI Context Management Platform`);
  lines.push(`> Generated: ${new Date().toLocaleDateString()}`);
  lines.push(`> Coverage Score: **${calculateCoverage(project)}/100**`);
  lines.push('');

  // Sort sections by priority and add them
  const sorted = [...sections].sort((a, b) => b.priority - a.priority);
  for (const section of sorted) {
    // Skip the project overview title since we already have the header
    const content = section.id === 'project-overview'
      ? section.content.split('\n').slice(2).join('\n').trim()
      : section.content;
    lines.push(content);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function generateCursorRules(sections: ContextSection[], project: DetectedProject): string {
  return generateClaudeMd(sections, project);
}

function calculateCoverage(project: DetectedProject): number {
  let score = 0;
  const checks = [
    project.languages.length > 0,              // +15
    project.frameworks.length > 0,              // +15
    project.buildTool,                          // +10
    project.testFramework,                      // +10
    project.linter,                             // +5
    project.formatter,                          // +5
    project.structure.hasSrcDir,                // +10
    project.structure.hasTestsDir,              // +10
    project.structure.hasDocsDir,               // +5
    project.structure.hasCiConfig,              // +5
    project.structure.hasDockerConfig,          // +5
    project.packageManager,                     // +5
  ];

  const weights = [15, 15, 10, 10, 5, 5, 10, 10, 5, 5, 5, 5];
  for (let i = 0; i < checks.length; i++) {
    if (checks[i]) score += weights[i];
  }

  return Math.min(score, 100);
}

function generateSuggestions(project: DetectedProject, sections: ContextSection[]): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];

  if (!project.structure.hasTestsDir) {
    suggestions.push({
      severity: 'medium',
      category: 'missing',
      message: 'No test directory detected',
      details: 'Add a tests directory and testing setup to improve code reliability.',
    });
  }

  if (!project.structure.hasDocsDir) {
    suggestions.push({
      severity: 'low',
      category: 'missing',
      message: 'No documentation directory',
      details: 'Consider adding a docs/ directory for architectural documentation.',
    });
  }

  if (!project.linter) {
    suggestions.push({
      severity: 'medium',
      category: 'missing',
      message: 'No linter configured',
      details: 'Add ESLint or Biome to maintain code quality standards.',
    });
  }

  if (!project.formatter) {
    suggestions.push({
      severity: 'low',
      category: 'missing',
      message: 'No formatter configured',
      details: 'Add Prettier or Biome for consistent code formatting.',
    });
  }

  if (project.dependencies.production.length > 50) {
    suggestions.push({
      severity: 'medium',
      category: 'optimize',
      message: 'Large number of production dependencies',
      details: 'Consider auditing unused dependencies to reduce bundle size.',
    });
  }

  return suggestions;
}
