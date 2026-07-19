// ─── Project Detection Types ─────────────────────────────────────────────────

export interface DetectedProject {
  /** Project root directory */
  rootDir: string;
  /** Project name from manifest */
  name: string;
  /** Detected languages */
  languages: Language[];
  /** Detected frameworks */
  frameworks: Framework[];
  /** Package manager */
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  /** Build tool */
  buildTool?: string;
  /** Test framework */
  testFramework?: string;
  /** Linter */
  linter?: string;
  /** Formatter */
  formatter?: string;
  /** Directory structure summary */
  structure: ProjectStructure;
  /** Key dependencies grouped by purpose */
  dependencies: {
    production: string[];
    development: string[];
  };
}

export interface Language {
  name: string;
  version?: string;
  files: string[];
  confidence: number; // 0-1
}

export interface Framework {
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'library' | 'cli' | 'mobile' | 'other';
  version?: string;
  confidence: number;
}

export interface ProjectStructure {
  hasSrcDir: boolean;
  hasTestsDir: boolean;
  hasDocsDir: boolean;
  hasCiConfig: boolean;
  hasDockerConfig: boolean;
  topLevelDirs: string[];
  sourceDirs: string[];
}

// ─── Context Generation Types ─────────────────────────────────────────────────

export interface ContextSection {
  id: string;
  title: string;
  content: string;
  priority: number; // 1-10, higher = more important
}

export interface GeneratedContext {
  project: DetectedProject;
  sections: ContextSection[];
  /** Full CLAUDE.md content */
  claudeMd: string;
  /** Full .cursorrules content */
  cursorRules: string;
  /** Score 0-100 indicating how well the context covers the project */
  coverageScore: number;
  /** Suggestions for improving context coverage */
  suggestions: ContextSuggestion[];
  /** When this context was generated */
  generatedAt: string;
  /** Context file format version */
  version: string;
}

export interface ContextSuggestion {
  severity: 'high' | 'medium' | 'low';
  category: 'missing' | 'incomplete' | 'optimize';
  message: string;
  details?: string;
}

// ─── Template Types ──────────────────────────────────────────────────────────

export interface ContextTemplate {
  /** Template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Which frameworks this template targets */
  targets: string[];
  /** Template content with {{variables}} */
  content: string;
  /** Required variables that must be filled */
  requiredVariables: string[];
  /** Optional variables with defaults */
  optionalVariables: Record<string, string>;
  /** Priority score for auto-matching */
  priority: number;
}

// ─── Analysis Types ──────────────────────────────────────────────────────────

export interface ContextAnalysis {
  /** Path to the context file */
  filePath: string;
  /** Which tool this file is for */
  toolType: 'claude-code' | 'cursor' | 'cline' | 'aider' | 'custom';
  /** File size in bytes */
  fileSize: number;
  /** Line count */
  lineCount: number;
  /** Completeness score 0-100 */
  completenessScore: number;
  /** Coverage areas detected */
  coverage: {
    projectDescription: boolean;
    techStack: boolean;
    commands: boolean;
    architecture: boolean;
    conventions: boolean;
    guardrails: boolean;
    references: boolean;
  };
  /** Missing important sections */
  missingSections: string[];
  /** Readability score */
  readabilityScore: number;
  /** Improvement suggestions */
  suggestions: ContextSuggestion[];
}

// ─── Taste Profile Types ──────────────────────────────────────────────────────

/**
 * Represents your personal coding taste — learned from your projects, git history,
 * and config files. Gets baked into every context file so AI tools code YOUR way.
 */
export interface TasteProfile {
  /** Schema version */
  version: string;
  /** When this profile was last updated */
  lastUpdated: string;
  /** Projects taste was learned from */
  sourceProjects: string[];
  /** Naming conventions */
  naming: TasteNaming;
  /** Import style preferences */
  imports: TasteImports;
  /** Component architecture preferences */
  components: TasteComponents;
  /** Styling approach */
  styling: TasteStyling;
  /** TypeScript strictness */
  typescript: TasteTypeScript;
  /** Formatting preferences */
  formatting: TasteFormatting;
  /** Testing preferences */
  testing: TasteTesting;
  /** Personal guardrails (things you tell AI to avoid) */
  guardrails: string[];
  /** Libraries and tools you prefer */
  favoritePatterns: string[];
  /** Specific patterns learned from your codebase */
  learnedPatterns: LearnedPattern[];
  /** Your typical command patterns */
  commandPreferences: TasteCommands;
  /** How confident we are in each learned preference */
  confidence: TasteConfidence;
}

export interface TasteNaming {
  files: 'kebab-case' | 'camelCase' | 'snake_case' | 'PascalCase';
  functions: 'camelCase' | 'snake_case' | 'PascalCase';
  types: 'PascalCase' | 'camelCase';
  constants: 'UPPER_CASE' | 'camelCase';
  components: 'PascalCase' | 'kebab-case';
}

export interface TasteImports {
  style: 'named' | 'default' | 'mixed';
  groupExternal: boolean;
  absoluteImports: boolean;
}

export interface TasteComponents {
  pattern: 'functional' | 'class';
  colocateTests: boolean;
  colocateStyles: boolean;
  propsInterface: boolean;
}

export interface TasteStyling {
  approach: 'tailwind' | 'css-modules' | 'styled-components' | 'inline' | 'sass' | 'vanilla-css' | 'unknown';
}

export interface TasteTypeScript {
  strict: boolean;
  avoidAny: boolean;
}

export interface TasteFormatting {
  semi: boolean;
  singleQuote: boolean;
  trailingComma: boolean;
  tabWidth: number;
  bracketSpacing: boolean;
}

export interface TasteTesting {
  framework: string;
  pattern: 'co-located' | 'separate-dir' | 'unknown';
}

export interface TasteCommands {
  dev: string;
  build: string;
  test: string;
  lint: string;
  typecheck: string;
}

export interface TasteConfidence {
  naming: number;
  imports: number;
  components: number;
  styling: number;
  typescript: number;
  formatting: number;
  testing: number;
  overall: number;
}

export interface LearnedPattern {
  pattern: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface TasteLearnOptions {
  /** Whether to analyze git history for patterns */
  gitHistory: boolean;
  /** Whether to read config files (tsconfig, eslint, prettier) */
  configFiles: boolean;
  /** Whether to analyze project structure naming */
  projectStructure: boolean;
  /** Whether to analyze package.json for preferences */
  packageAnalysis: boolean;
}

export const DEFAULT_TASTE_OPTIONS: TasteLearnOptions = {
  gitHistory: true,
  configFiles: true,
  projectStructure: true,
  packageAnalysis: true,
};

// ─── Code Analysis Types ─────────────────────────────────────────────────────

/**
 * Detailed analysis of source code patterns in a project.
 * This is the deep code analysis that goes beyond config files.
 */
export interface CodeAnalysisResult {
  /** Number of source files analyzed */
  totalFilesAnalyzed: number;
  
  /** Import pattern analysis */
  imports: ImportAnalysis;
  
  /** Function style analysis */
  functions: FunctionAnalysis;
  
  /** TypeScript pattern analysis */
  typescript: TypeScriptCodeAnalysis;
  
  /** Component pattern analysis (React/Vue/Svelte) */
  components: ComponentCodeAnalysis;
  
  /** Error handling pattern analysis */
  errorHandling: ErrorHandlingAnalysis;
  
  /** Testing pattern analysis */
  testing: TestingCodeAnalysis;
  
  /** API pattern analysis */
  api: ApiAnalysis;
  
  /** Code organization analysis */
  organization: OrganizationAnalysis;
}

export interface ImportAnalysis {
  /** Percentage of named vs default imports (0-1, higher = more named) */
  namedVsDefault: number;
  /** Whether absolute imports are used (e.g., @/, ~/) */
  usesAbsoluteImports: boolean;
  /** Whether type-only imports are used (import type { ... }) */
  usesTypeImports: boolean;
  /** Average number of import statements per file */
  avgImportsPerFile: number;
  /** Whether imports appear grouped (external before internal) */
  hasGroupedImports: boolean;
}

export interface FunctionAnalysis {
  /** Percentage of arrow functions vs declarations (0-1, higher = more arrows) */
  arrowVsDeclaration: number;
  /** Percentage of async functions */
  asyncPercentage: number;
  /** Whether named functions are preferred over anonymous */
  prefersNamedFunctions: boolean;
  /** Whether functions have return type annotations */
  hasReturnTypes: boolean;
}

export interface TypeScriptCodeAnalysis {
  /** Ratio of interfaces to type aliases (0-1, higher = more interfaces) */
  interfaceVsType: number;
  /** Percentage of files using `any` type */
  anyUsage: number;
  /** Whether generics are commonly used */
  usesGenerics: boolean;
  /** Whether `as` casting is used vs `satisfies` */
  usesAsCasting: boolean;
  /** Whether optional chaining is preferred */
  usesOptionalChaining: boolean;
  /** Whether nullish coalescing is preferred */
  usesNullishCoalescing: boolean;
}

export interface ComponentCodeAnalysis {
  /** Whether functional components are used (vs class components) */
  usesFunctionalComponents: boolean;
  /** Whether props have interface/type annotations */
  hasTypedProps: boolean;
  /** Whether React hooks are used */
  usesHooks: boolean;
  /** Whether styles are co-located with components */
  colocatedStyles: boolean;
}

export interface ErrorHandlingAnalysis {
  /** Whether try-catch is the primary error handling pattern */
  usesTryCatch: boolean;
  /** Whether .catch() is used on promises */
  usesCatchChain: boolean;
  /** Whether early returns are preferred */
  usesEarlyReturns: boolean;
  /** Whether custom error classes are defined */
  hasCustomErrors: boolean;
}

export interface TestingCodeAnalysis {
  /** Whether describe/it blocks are used (vs test()) */
  usesDescribeIt: boolean;
  /** Whether expect() assertions are used */
  usesExpect: boolean;
  /** Whether mocks/spies are used */
  usesMocks: boolean;
  /** Average number of test assertions per test file */
  assertionsPerTest: number;
}

export interface ApiAnalysis {
  /** Whether fetch() is the primary API client */
  usesFetch: boolean;
  /** Whether axios/ky/ofetch is used */
  usesHttpClient: boolean;
  /** Whether API routes are in `/api/` pattern */
  usesApiRoutes: boolean;
  /** Whether React Query/SWR is used for data fetching */
  usesDataFetching: boolean;
}

export interface OrganizationAnalysis {
  /** Whether barrel files (index.ts) are used for exports */
  usesBarrelFiles: boolean;
  /** Average file length in lines */
  avgFileLength: number;
  /** Whether tests are co-located with source files */
  coLocatedTests: boolean;
  /** Whether types are in a dedicated types/ directory */
  dedicatedTypesDir: boolean;
}

// ─── Code Suggestion Types ──────────────────────────────────────────────────

/**
 * An actionable suggestion derived from code analysis.
 * These help improve code quality, consistency, and maintainability.
 */
export interface CodeSuggestion {
  /** Unique identifier for this suggestion */
  id: string;
  /** Category this suggestion belongs to */
  category: 'imports' | 'functions' | 'typescript' | 'components' | 'error-handling' | 'testing' | 'api' | 'organization' | 'general';
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Specific recommendation */
  recommendation: string;
  /** Supporting evidence from analysis */
  evidence: string;
  /** Icon for display */
  icon: string;
}

export type OutputFormat = 'claude-md' | 'cursor-rules' | 'cursor-mdc' | 'aider' | 'custom';

export interface OutputOptions {
  format: OutputFormat;
  outputPath?: string;
  includeScores?: boolean;
  minify?: boolean;
}
