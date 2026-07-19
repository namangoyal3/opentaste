import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename, extname, relative } from 'path';
import type {
  CodeAnalysisResult,
  CodeSuggestion,
} from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo',
  'coverage', '.cache', '.vscode', '.idea', '__pycache__',
  '.venv', 'venv', 'env', '.env', 'target', 'bin', 'obj',
  'cdk.out', '.serverless', '.vercel', '.netlify',
]);

// Extensions to analyze for code patterns
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.vue', '.svelte',
]);

// ─── Main Analyzer ───────────────────────────────────────────────────────────

/**
 * Deeply analyze source code files in a project to understand real coding patterns.
 * This is the "much better than Command Code" feature — it reads your actual code
 * to learn preferences, not just config files.
 */
export function analyzeSourceCode(rootDir: string): CodeAnalysisResult {
  const files: string[] = [];
  collectSourceFiles(rootDir, files, 0);

  // Aggregated counters
  const importStats = {
    totalImports: 0,
    namedImports: 0,
    defaultImports: 0,
    typeImports: 0,
    absoluteImports: 0,
    externalFirstFiles: 0,
    filesWithImports: 0,
  };

  const functionStats = {
    arrowFunctions: 0,
    declarations: 0,
    asyncFunctions: 0,
    namedFunctions: 0,
    anonymousFunctions: 0,
    returnTypes: 0,
    filesWithFunctions: 0,
  };

  const tsStats = {
    interfaces: 0,
    typeAliases: 0,
    anyCount: 0,
    genericCount: 0,
    asCastCount: 0,
    optionalChaining: 0,
    nullishCoalescing: 0,
    filesWithTs: 0,
  };

  const componentStats = {
    functionalComponents: 0,
    classComponents: 0,
    typedProps: 0,
    untypedProps: 0,
    hookUsage: 0,
    colocatedStyles: 0,
    componentFiles: 0,
  };

  const errorStats = {
    tryCatch: 0,
    catchChain: 0,
    earlyReturns: 0,
    customErrors: 0,
    filesWithErrors: 0,
  };

  const testStats = {
    describeIt: 0,
    testBlocks: 0,
    expectCalls: 0,
    mockCalls: 0,
    testFiles: 0,
  };

  const apiStats = {
    fetchCalls: 0,
    httpClientCalls: 0,
    apiRouteRefs: 0,
    dataFetchingHooks: 0,
    filesWithApi: 0,
  };

  const orgStats = {
    barrelFiles: 0,
    totalLines: 0,
    testFilesNextToSource: 0,
    hasDedicatedTypesDir: existsSync(join(rootDir, 'types')) || existsSync(join(rootDir, 'src', 'types')),
  };

  // Per-file import tracking for grouping analysis
  let externalImportCount = 0;
  let internalImportCount = 0;

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const ext = extname(filePath).toLowerCase();
    const fileName = basename(filePath);

    // Track file length
    orgStats.totalLines += lines.length;

    // ── Import Analysis ──
    const imports = analyzeImports(content, lines);
    importStats.totalImports += imports.total;
    importStats.namedImports += imports.named;
    importStats.defaultImports += imports.default;
    importStats.typeImports += imports.type;
    importStats.absoluteImports += imports.absolute;
    externalImportCount += imports.external;
    internalImportCount += imports.internal;
    if (imports.total > 0) importStats.filesWithImports++;

    // Check if external imports come first (grouped)
    if (imports.hasGroupedImports) importStats.externalFirstFiles++;

    // ── Function Analysis ──
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      const funcs = analyzeFunctions(content, lines);
      functionStats.arrowFunctions += funcs.arrows;
      functionStats.declarations += funcs.declarations;
      functionStats.asyncFunctions += funcs.async;
      functionStats.namedFunctions += funcs.named;
      functionStats.anonymousFunctions += funcs.anonymous;
      functionStats.returnTypes += funcs.returnTypes;
      if (funcs.total > 0) functionStats.filesWithFunctions++;
    }

    // ── TypeScript Analysis ──
    if (['.ts', '.tsx', '.mts', '.cts'].includes(ext)) {
      const ts = analyzeTypeScript(content, lines);
      tsStats.interfaces += ts.interfaces;
      tsStats.typeAliases += ts.typeAliases;
      tsStats.anyCount += ts.any;
      tsStats.genericCount += ts.generics;
      tsStats.asCastCount += ts.asCast;
      tsStats.optionalChaining += ts.optionalChaining;
      tsStats.nullishCoalescing += ts.nullishCoalescing;
      tsStats.filesWithTs++;
    }

    // ── Component Analysis ──
    if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) {
      const comps = analyzeComponents(content, lines);
      componentStats.functionalComponents += comps.functional;
      componentStats.classComponents += comps.classBased;
      componentStats.typedProps += comps.typedProps;
      componentStats.untypedProps += comps.untypedProps;
      componentStats.hookUsage += comps.hooks;
      componentStats.colocatedStyles += comps.colocatedStyles;
      if (comps.total > 0) componentStats.componentFiles++;
    }

    // ── Error Handling Analysis ──
    const errors = analyzeErrorHandling(content, lines);
    errorStats.tryCatch += errors.tryCatch;
    errorStats.catchChain += errors.catchChain;
    errorStats.earlyReturns += errors.earlyReturns;
    errorStats.customErrors += errors.customErrors;
    if (errors.total > 0) errorStats.filesWithErrors++;

    // ── Testing Analysis ──
    if (fileName.includes('.test.') || fileName.includes('.spec.') || fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts') || fileName.endsWith('.test.tsx')) {
      testStats.testFiles++;
      const tests = analyzeTesting(content, lines);
      testStats.describeIt += tests.describeIt;
      testStats.testBlocks += tests.testBlocks;
      testStats.expectCalls += tests.expect;
      testStats.mockCalls += tests.mocks;
    }

    // ── API Analysis ──
    const api = analyzeApiUsage(content, lines);
    apiStats.fetchCalls += api.fetch;
    apiStats.httpClientCalls += api.httpClient;
    apiStats.apiRouteRefs += api.apiRoutes;
    apiStats.dataFetchingHooks += api.dataFetchingHooks;
    if (api.total > 0) apiStats.filesWithApi++;

    // ── Organization Analysis ──
    if (fileName === 'index.ts' || fileName === 'index.js') {
      // Check if it's a barrel file (re-exports from other files)
      if (content.includes('export') && (content.includes('from') || content.includes('./'))) {
        orgStats.barrelFiles++;
      }
    }

    // Check if test file is co-located with source
    const dir = relative(rootDir, filePath).split('/').slice(0, -1).join('/');
    const testPattern = /\.(test|spec)\./;
    const sourcePattern = /\.(ts|tsx|js|jsx)$/;
    if (testPattern.test(fileName)) {
      // Look for a matching source file in the same directory
      const sourceName = fileName.replace(/\.(test|spec)\./, '.');
      const dirPath = join(rootDir, dir);
      if (existsSync(join(dirPath, sourceName)) || existsSync(join(dirPath, fileName.replace(/\.(test|spec)\..+$/, '.ts')))) {
        orgStats.testFilesNextToSource++;
      }
    }
  }

  // ── Build Results ──
  const totalComponentFiles = componentStats.componentFiles || 1;
  const totalTestFiles = testStats.testFiles || 1;

  return {
    totalFilesAnalyzed: files.length,

    imports: {
      namedVsDefault: importStats.totalImports > 0
        ? importStats.namedImports / (importStats.namedImports + importStats.defaultImports)
        : 0.5,
      usesAbsoluteImports: importStats.absoluteImports > Math.max(importStats.totalImports * 0.05, 1),
      usesTypeImports: importStats.typeImports > 0,
      avgImportsPerFile: importStats.filesWithImports > 0
        ? importStats.totalImports / importStats.filesWithImports
        : 0,
      hasGroupedImports: importStats.externalFirstFiles > importStats.filesWithImports * 0.5,
    },

    functions: {
      arrowVsDeclaration: (functionStats.arrowFunctions + functionStats.declarations) > 0
        ? functionStats.arrowFunctions / (functionStats.arrowFunctions + functionStats.declarations)
        : 0.5,
      asyncPercentage: functionStats.asyncFunctions > 0
        ? functionStats.asyncFunctions / (functionStats.arrowFunctions + functionStats.declarations)
        : 0,
      prefersNamedFunctions: functionStats.namedFunctions > functionStats.anonymousFunctions,
      hasReturnTypes: functionStats.returnTypes > functionStats.filesWithFunctions * 0.3,
    },

    typescript: {
      interfaceVsType: (tsStats.interfaces + tsStats.typeAliases) > 0
        ? tsStats.interfaces / (tsStats.interfaces + tsStats.typeAliases)
        : 0.5,
      anyUsage: tsStats.filesWithTs > 0
        ? tsStats.anyCount / tsStats.filesWithTs
        : 0,
      usesGenerics: tsStats.genericCount > tsStats.filesWithTs * 0.3,
      usesAsCasting: tsStats.asCastCount > tsStats.filesWithTs * 0.2,
      usesOptionalChaining: tsStats.optionalChaining > tsStats.filesWithTs * 0.3,
      usesNullishCoalescing: tsStats.nullishCoalescing > tsStats.filesWithTs * 0.3,
    },

    components: {
      usesFunctionalComponents: componentStats.functionalComponents > componentStats.classComponents,
      hasTypedProps: componentStats.typedProps > componentStats.untypedProps,
      usesHooks: componentStats.hookUsage > componentStats.componentFiles * 0.5,
      colocatedStyles: componentStats.colocatedStyles > componentStats.componentFiles * 0.3,
    },

    errorHandling: {
      usesTryCatch: errorStats.tryCatch > errorStats.filesWithErrors * 0.3,
      usesCatchChain: errorStats.catchChain > 0,
      usesEarlyReturns: errorStats.earlyReturns > errorStats.filesWithErrors * 0.3,
      hasCustomErrors: errorStats.customErrors > 0,
    },

    testing: {
      usesDescribeIt: testStats.describeIt > testStats.testBlocks,
      usesExpect: testStats.expectCalls > 0,
      usesMocks: testStats.mockCalls > 0,
      assertionsPerTest: totalTestFiles > 0 ? testStats.expectCalls / totalTestFiles : 0,
    },

    api: {
      usesFetch: apiStats.fetchCalls > apiStats.httpClientCalls,
      usesHttpClient: apiStats.httpClientCalls > apiStats.fetchCalls,
      usesApiRoutes: apiStats.apiRouteRefs > 0,
      usesDataFetching: apiStats.dataFetchingHooks > 0,
    },

    organization: {
      usesBarrelFiles: orgStats.barrelFiles > 0,
      avgFileLength: files.length > 0 ? orgStats.totalLines / files.length : 0,
      coLocatedTests: orgStats.testFilesNextToSource > totalTestFiles * 0.3,
      dedicatedTypesDir: orgStats.hasDedicatedTypesDir,
    },
  };
}

// ─── File Collection ─────────────────────────────────────────────────────────

function collectSourceFiles(dir: string, result: string[], depth: number): void {
  if (depth > 8) return;
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry) || entry.startsWith('.')) continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          collectSourceFiles(fullPath, result, depth + 1);
        } else {
          const ext = extname(entry).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            result.push(fullPath);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

// ─── Individual Analyzers ────────────────────────────────────────────────────

interface ImportCounts {
  total: number;
  named: number;
  default: number;
  type: number;
  absolute: number;
  external: number;
  internal: number;
  hasGroupedImports: boolean;
}

function analyzeImports(content: string, lines: string[]): ImportCounts {
  const counts: ImportCounts = {
    total: 0, named: 0, default: 0, type: 0,
    absolute: 0, external: 0, internal: 0,
    hasGroupedImports: true,
  };

  const importLines = lines.filter(l => /^import\s/.test(l.trim()) && !l.trim().startsWith('//'));
  counts.total = importLines.length;

  let lastWasExternal = undefined as boolean | undefined;

  for (const line of importLines) {
    const trimmed = line.trim();

    // Type imports
    if (/^import\s+type\s/.test(trimmed) || /import\s+\{[^}]*\btype\b/.test(trimmed)) {
      counts.type++;
    }

    // Named imports: import { X } or import { X, Y }
    if (/\{[^}]*\}/.test(trimmed) && !/^import\s+[\w$]+\s+from/.test(trimmed)) {
      counts.named++;
    }

    // Default imports: import X from or import X, { Y } from
    if (/^import\s+[\w$]+\s+from/.test(trimmed)) {
      counts.default++;
    }
    if (/^import\s+[\w$]+,\s*\{/.test(trimmed)) {
      counts.named++; // Also has named
    }

    // Absolute vs relative imports
    const match = trimmed.match(/from\s+['"]([^'"]+)['"]/);
    if (match) {
      const source = match[1];
      if (source.startsWith('@/') || source.startsWith('~/') || source.startsWith('src/') || source.startsWith('app/')) {
        counts.absolute++;
        counts.internal++;
        if (lastWasExternal === true) counts.hasGroupedImports = false;
        lastWasExternal = false;
      } else if (source.startsWith('.')) {
        counts.internal++;
        if (lastWasExternal === true) counts.hasGroupedImports = false;
        lastWasExternal = false;
      } else {
        counts.external++;
        lastWasExternal = true;
      }
    }
  }

  return counts;
}

interface FunctionCounts {
  total: number;
  arrows: number;
  declarations: number;
  async: number;
  named: number;
  anonymous: number;
  returnTypes: number;
}

function analyzeFunctions(content: string, lines: string[]): FunctionCounts {
  const counts: FunctionCounts = {
    total: 0, arrows: 0, declarations: 0,
    async: 0, named: 0, anonymous: 0, returnTypes: 0,
  };

  // Arrow functions: const name = (params) => OR const name: Type = (params) =>
  const arrowMatches = content.match(/(?:const|let|var)\s+\w+\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g);
  if (arrowMatches) {
    counts.arrows = arrowMatches.length;
    counts.total += counts.arrows;
    counts.named += counts.arrows;
  }

  // Anonymous arrows in callbacks: .then(() =>, .map(() =>, .filter(() =>
  const anonArrows = content.match(/\.\w+\(\([^)]*\)\s*=>/g);
  if (anonArrows) {
    counts.anonymous += anonArrows.length;
  }

  // Function declarations: function name(params)
  const declMatches = content.match(/(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g);
  if (declMatches) {
    counts.declarations = declMatches.length;
    counts.total += counts.declarations;
    counts.named += counts.declarations;
  }

  // Async functions
  const asyncMatches = content.match(/(?:async\s+(?:function|\(|=>))/g);
  if (asyncMatches) {
    counts.async = asyncMatches.length;
  }

  // Return types on functions
  const returnTypeMatches = content.match(/\):\s*(?:\w+\.?\w*|Promise<\w+>|string|number|boolean|void|any|never|unknown)\s*\{/g);
  if (returnTypeMatches) {
    counts.returnTypes = returnTypeMatches.length;
  }

  return counts;
}

interface TypeScriptCounts {
  interfaces: number;
  typeAliases: number;
  any: number;
  generics: number;
  asCast: number;
  optionalChaining: number;
  nullishCoalescing: number;
}

function analyzeTypeScript(content: string, lines: string[]): TypeScriptCounts {
  const counts: TypeScriptCounts = {
    interfaces: 0, typeAliases: 0, any: 0, generics: 0,
    asCast: 0, optionalChaining: 0, nullishCoalescing: 0,
  };

  // Interface declarations (not inside type literals)
  const interfaceMatches = content.match(/^(?:export\s+)?interface\s+\w+/gm);
  if (interfaceMatches) counts.interfaces = interfaceMatches.length;

  // Type aliases: type Foo = ... (not import type)
  const typeMatches = content.match(/^(?:export\s+)?type\s+\w+\s*=/gm);
  if (typeMatches) counts.typeAliases = typeMatches.length;

  // any usage (not in comments)
  const anyMatches = content.match(/:\s*any(\s|;|,|\)|\||&)/g);
  if (anyMatches) counts.any = anyMatches.length;

  // Generics: <T>, <T extends, <T, U>
  const genericMatches = content.match(/<(?:T|T\s+extends|T,\s*U|T\s*=\s*\w+)>/g);
  if (genericMatches) counts.generics = genericMatches.length;

  // As casting: as Type
  const asMatches = content.match(/\bas\s+[A-Z][a-zA-Z]+\b/g);
  if (asMatches) counts.asCast = asMatches.length;

  // Optional chaining: ?.
  const optionalChain = content.match(/\.\?\w+/g);
  if (optionalChain) counts.optionalChaining = optionalChain.length;

  // Nullish coalescing: ??
  const nullish = content.match(/\?\?/g);
  if (nullish) counts.nullishCoalescing = nullish.length;

  return counts;
}

interface ComponentCounts {
  total: number;
  functional: number;
  classBased: number;
  typedProps: number;
  untypedProps: number;
  hooks: number;
  colocatedStyles: number;
}

function analyzeComponents(content: string, lines: string[]): ComponentCounts {
  const counts: ComponentCounts = {
    total: 0, functional: 0, classBased: 0,
    typedProps: 0, untypedProps: 0, hooks: 0, colocatedStyles: 0,
  };

  // Functional components: const Component = (...) => OR function Component(...)
  const fcMatch = content.match(/(?:const|function)\s+[A-Z]\w+\s*(?::\s*[^=]+)?\s*(?:=|\().*\)\s*(?::\s*[^=]+)?\s*(?:=>|\{)/g);
  if (fcMatch) {
    counts.functional = fcMatch.length;
    counts.total += fcMatch.length;
  }

  // Class components: class Component extends
  const ccMatch = content.match(/class\s+[A-Z]\w+\s+extends\s+(?:Component|React\.Component)/g);
  if (ccMatch) {
    counts.classBased = ccMatch.length;
    counts.total += ccMatch.length;
  }

  // Typed props: interface Props, type Props, : Props
  const propsMatch = content.match(/(?:interface|type)\s+Props\b/g);
  if (propsMatch) counts.typedProps = propsMatch.length;

  // Bare props (no type annotation)
  const bareProps = content.match(/\(props\s*\)/g) || [];
  counts.untypedProps = bareProps.length;

  // Hooks usage
  const hooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue'];
  for (const hook of hooks) {
    const hookMatch = content.match(new RegExp(`\\b${hook}\\s*\\(`, 'g'));
    if (hookMatch) counts.hooks += hookMatch.length;
  }

  // Co-located styles: import styles from './Component.module.css' or import './Component.css'
  const styleImports = content.match(/import\s+(?:\w+\s+from\s+)?['"]\.\/[^'"]+\.(?:css|scss|less)['"]/g);
  if (styleImports) counts.colocatedStyles = styleImports.length;

  return counts;
}

interface ErrorCounts {
  total: number;
  tryCatch: number;
  catchChain: number;
  earlyReturns: number;
  customErrors: number;
}

function analyzeErrorHandling(content: string, lines: string[]): ErrorCounts {
  const counts: ErrorCounts = {
    total: 0, tryCatch: 0, catchChain: 0, earlyReturns: 0, customErrors: 0,
  };

  // Try-catch blocks
  const tryMatch = content.match(/try\s*\{/g);
  if (tryMatch) counts.tryCatch = tryMatch.length;

  // .catch() chains
  const catchChain = content.match(/\.catch\s*\(/g);
  if (catchChain) counts.catchChain = catchChain.length;

  // Early returns: if (...) return ... (not inside a function at end)
  const earlyReturn = content.match(/^\s+if\s*\([^)]*\)\s*\n\s+return\s/gm);
  if (earlyReturn) counts.earlyReturns = earlyReturn.length;

  // Custom error classes
  const errors = content.match(/(?:class\s+\w+(?:Error|Exception)\s+extends|new\s+\w+(?:Error|Exception)\s*\()/g);
  if (errors) counts.customErrors = errors.length;

  counts.total = counts.tryCatch + counts.catchChain + counts.earlyReturns + counts.customErrors;
  return counts;
}

interface TestCounts {
  describeIt: number;
  testBlocks: number;
  expect: number;
  mocks: number;
}

function analyzeTesting(content: string, lines: string[]): TestCounts {
  const counts: TestCounts = {
    describeIt: 0, testBlocks: 0, expect: 0, mocks: 0,
  };

  // describe() and it() blocks
  const describe = content.match(/\bdescribe\s*\(/g);
  if (describe) counts.describeIt = describe.length;
  const it = content.match(/\bit\s*\(/g);
  if (it) counts.describeIt += it.length;

  // test() blocks
  const test = content.match(/\btest\s*\(/g);
  if (test) counts.testBlocks = test.length;

  // expect() assertions
  const expect = content.match(/\bexpect\s*\(/g);
  if (expect) counts.expect = expect.length;

  // Mock calls
  const mocks = content.match(/\b(?:vi|jest)\.(?:mock|fn|spyOn)\s*\(/g);
  if (mocks) counts.mocks = mocks.length;
  const mockFn = content.match(/\bMock\s*\(/g);
  if (mockFn) counts.mocks += mockFn.length;

  return counts;
}

interface ApiCounts {
  total: number;
  fetch: number;
  httpClient: number;
  apiRoutes: number;
  dataFetchingHooks: number;
}

function analyzeApiUsage(content: string, lines: string[]): ApiCounts {
  const counts: ApiCounts = {
    total: 0, fetch: 0, httpClient: 0, apiRoutes: 0, dataFetchingHooks: 0,
  };

  // fetch() calls (not other uses of the word "fetch")
  const fetch = content.match(/\bfetch\s*\(['"`]/g);
  if (fetch) counts.fetch = fetch.length;

  // HTTP client calls
  const axios = content.match(/\baxios\.(?:get|post|put|delete|patch|request)\s*\(/g);
  if (axios) counts.httpClient += axios.length;
  const ky = content.match(/\bky\s*\(/g);
  if (ky) counts.httpClient += ky.length;
  const ofetch = content.match(/\bofetch\s*\(/g);
  if (ofetch) counts.httpClient += ofetch.length;

  // API route references
  const apiRoutes = content.match(/['"`]\/api\//g);
  if (apiRoutes) counts.apiRoutes = apiRoutes.length;

  // Data fetching hooks
  const rqHooks = ['useQuery', 'useMutation', 'useSuspenseQuery', 'useInfiniteQuery'];
  for (const hook of rqHooks) {
    const match = content.match(new RegExp(`\\b${hook}\\s*\\(`, 'g'));
    if (match) counts.dataFetchingHooks += match.length;
  }
  const swr = content.match(/\buseSWR\s*\(/g);
  if (swr) counts.dataFetchingHooks += swr.length;

  counts.total = counts.fetch + counts.httpClient + counts.apiRoutes + counts.dataFetchingHooks;
  return counts;
}

// ─── Suggestions Engine ─────────────────────────────────────────────────────

/**
 * Generate actionable improvement suggestions from deep code analysis.
 * Each suggestion is backed by specific data and includes a concrete recommendation.
 */
export function generateCodeSuggestions(analysis: CodeAnalysisResult): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];

  // ── Import Suggestions ──
  if (analysis.imports.namedVsDefault < 0.3 && analysis.imports.avgImportsPerFile > 0) {
    suggestions.push({
      id: 'import-default-heavy',
      category: 'imports',
      severity: 'medium',
      title: 'Prefer named imports over default imports',
      description: `Only ${fmtPct(analysis.imports.namedVsDefault)} of your imports use named style. Named imports enable better tree-shaking, IDE autocompletion, and explicit dependency tracking.`,
      recommendation: `Prefer \`import { X } from 'y'\` over \`import X from 'y'\`. Named exports/imports make dependencies explicit and help bundlers eliminate unused code.`,
      evidence: `${fmtPct(analysis.imports.namedVsDefault)} named vs ${fmtPct(1 - analysis.imports.namedVsDefault)} default`,
      icon: '📦',
    });
  }

  if (!analysis.imports.usesTypeImports && analysis.imports.avgImportsPerFile > 0) {
    suggestions.push({
      id: 'import-type-imports',
      category: 'imports',
      severity: 'low',
      title: 'Use import type for type-only imports',
      description: 'Type-only imports help bundlers eliminate unused type code and make dependencies clearer.' ,
      recommendation: `Use \`import type { X } from 'y'\` when importing only types. This lets bundlers safely remove the import at build time.`,
      evidence: 'No type imports detected',
      icon: '📦',
    });
  }

  if (!analysis.imports.hasGroupedImports && analysis.imports.avgImportsPerFile > 0) {
    suggestions.push({
      id: 'import-grouping',
      category: 'imports',
      severity: 'low',
      title: 'Group imports by source (external before internal)',
      description: 'Grouped imports improve readability by clearly separating external dependencies from your own code.' ,
      recommendation: 'Order imports: external packages first, then internal modules, then type imports. Use blank lines between groups.',
      evidence: 'Imports appear ungrouped',
      icon: '📦',
    });
  }

  if (!analysis.imports.usesAbsoluteImports && analysis.imports.avgImportsPerFile > 3) {
    suggestions.push({
      id: 'import-absolute',
      category: 'imports',
      severity: 'medium',
      title: 'Switch to absolute imports for cleaner paths',
      description: 'Deeply nested relative imports (../../../) are hard to read and fragile when moving files.',
      recommendation: `Configure a path alias in tsconfig (\`@/\` or \`~/\`) and use absolute imports like \`import { X } from '@/components/Button'\`. This makes refactoring safer.`,
      evidence: 'No absolute imports detected',
      icon: '📦',
    });
  }

  // ── Function Suggestions ──
  if (analysis.functions.arrowVsDeclaration < 0.2 && analysis.functions.arrowVsDeclaration > 0) {
    suggestions.push({
      id: 'func-arrow-more',
      category: 'functions',
      severity: 'low',
      title: 'Consider using more arrow functions',
      description: `Only ${fmtPct(analysis.functions.arrowVsDeclaration)} of your functions use arrow syntax. Arrow functions provide lexical \`this\` binding and are more concise.`,
      recommendation: 'Use arrow functions for callbacks, short functions, and when you need lexical scoping. Keep function declarations for hoisted utility functions.',
      evidence: `${fmtPct(analysis.functions.arrowVsDeclaration)} arrows vs ${fmtPct(1 - analysis.functions.arrowVsDeclaration)} declarations`,
      icon: '🔧',
    });
  }

  if (!analysis.functions.hasReturnTypes && analysis.functions.asyncPercentage > 0) {
    suggestions.push({
      id: 'func-return-types',
      category: 'functions',
      severity: 'high',
      title: 'Add return type annotations to your functions',
      description: 'AI tools and other developers rely on return types to understand what a function returns. Functions without return types are harder to reason about.',
      recommendation: 'Annotate all public functions with return types: `function getUser(id: string): Promise<User>`. This serves as documentation and catches errors.',
      evidence: 'Return types rarely annotated',
      icon: '🔧',
    });
  }

  if (analysis.functions.asyncPercentage < 0.1 && analysis.totalFilesAnalyzed > 5) {
    suggestions.push({
      id: 'func-async',
      category: 'functions',
      severity: 'low',
      title: 'Some operations could benefit from async/await',
      description: `Only ${fmtPct(analysis.functions.asyncPercentage)} of your functions use async/await. Modern JavaScript/TypeScript codebases commonly use async patterns for I/O.`,
      recommendation: 'Use async/await for any I/O operations (API calls, file reads, database queries). It improves readability over callback patterns.',
      evidence: `${fmtPct(analysis.functions.asyncPercentage)} async functions`,
      icon: '🔧',
    });
  }

  // ── TypeScript Suggestions ──
  if (analysis.typescript.anyUsage > 0.5 && analysis.typescript.anyUsage > 0) {
    suggestions.push({
      id: 'ts-any-usage',
      category: 'typescript',
      severity: 'high',
      title: 'Reduce usage of the `any` type',
      description: `\`any\` was found in ${fmtPct(analysis.typescript.anyUsage)} of TypeScript files. \`any\` disables type checking entirely, defeating the purpose of TypeScript.`,
      recommendation: 'Replace `any` with `unknown` (when type is truly unknown), proper types, or generics. `unknown` forces type checking before use, making code safer.',
      evidence: `\`any\` appears in ${Math.round(analysis.typescript.anyUsage)} files on average`,
      icon: '📐',
    });
  }

  if (analysis.typescript.interfaceVsType < 0.3 && analysis.typescript.interfaceVsType > 0) {
    suggestions.push({
      id: 'ts-interface-prefer',
      category: 'typescript',
      severity: 'low',
      title: 'Consider using interfaces for object shapes',
      description: `Only ${fmtPct(analysis.typescript.interfaceVsType)} of your type declarations use \`interface\`. Interfaces have better type-checking performance and support declaration merging.`,
      recommendation: 'Use `interface` for object shapes (props, configs, API responses) and `type` for unions, intersections, and mapped types.',
      evidence: `${fmtPct(analysis.typescript.interfaceVsType)} interfaces vs ${fmtPct(1 - analysis.typescript.interfaceVsType)} type aliases`,
      icon: '📐',
    });
  }

  if (analysis.typescript.usesAsCasting && analysis.typescript.anyUsage < 0.5) {
    suggestions.push({
      id: 'ts-as-casting',
      category: 'typescript',
      severity: 'medium',
      title: 'Prefer type guards over `as` casting',
      description: 'TypeScript `as` casts bypass type checking entirely, similar to `any`. Type guards are safer alternatives.',
      recommendation: 'Replace `value as Type` with type guard functions: `function isUser(value: unknown): value is User { ... }`. This keeps type safety intact.',
      evidence: '`as` casting detected in codebase',
      icon: '📐',
    });
  }

  if (!analysis.typescript.usesOptionalChaining && analysis.totalFilesAnalyzed > 5) {
    suggestions.push({
      id: 'ts-optional-chaining',
      category: 'typescript',
      severity: 'medium',
      title: 'Use optional chaining (?.) for safe property access',
      description: 'Optional chaining (?.) makes null/undefined checks cleaner and less error-prone than manual if-checks.',
      recommendation: 'Use `user?.address?.street` instead of `user && user.address && user.address.street`. It reads naturally and short-circuits on null/undefined.',
      evidence: 'Optional chaining not detected',
      icon: '📐',
    });
  }

  if (!analysis.typescript.usesNullishCoalescing && analysis.totalFilesAnalyzed > 5) {
    suggestions.push({
      id: 'ts-nullish-coalescing',
      category: 'typescript',
      severity: 'low',
      title: 'Use nullish coalescing (??) for default values',
      description: 'The `||` operator treats empty string, 0, and false as falsy. Nullish coalescing (`??`) only falls back for null/undefined.',
      recommendation: 'Use `const count = data ?? 0` instead of `const count = data || 0`. This handles 0 and empty string as valid values.',
      evidence: 'Nullish coalescing not detected',
      icon: '📐',
    });
  }

  // ── Component Suggestions ──
  if (!analysis.components.hasTypedProps && analysis.components.usesHooks) {
    suggestions.push({
      id: 'comp-typed-props',
      category: 'components',
      severity: 'high',
      title: 'Type your component props with interfaces',
      description: 'Untyped props miss the main benefit of TypeScript in React — catching prop errors at compile time.',
      recommendation: 'Define `interface Props { ... }` for every component and type the props parameter: `const Button = ({ variant }: Props) =>`.',
      evidence: 'Props are not explicitly typed',
      icon: '🧩',
    });
  }

  // ── Error Handling Suggestions ──
  if (!analysis.errorHandling.hasCustomErrors && analysis.errorHandling.usesTryCatch) {
    suggestions.push({
      id: 'error-custom-classes',
      category: 'error-handling',
      severity: 'medium',
      title: 'Define custom error classes for better error handling',
      description: 'Custom error classes let you distinguish between different error types and handle them appropriately.',
      recommendation: 'Create error classes like `class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }`. Then use `instanceof` to handle specific errors.',
      evidence: 'No custom error classes found',
      icon: '🛡️',
    });
  }

  if (!analysis.errorHandling.usesEarlyReturns && analysis.totalFilesAnalyzed > 5) {
    suggestions.push({
      id: 'error-early-returns',
      category: 'error-handling',
      severity: 'low',
      title: 'Use early returns to reduce nesting',
      description: 'Early returns make code more readable by handling edge cases first and reducing nested conditionals.',
      recommendation: 'Check invalid state first and return early: `if (!user) return null; if (!user.isActive) return null; // main logic`. This reduces indentation and complexity.',
      evidence: 'Early returns not common',
      icon: '🛡️',
    });
  }

  // ── Testing Suggestions ──
  if (analysis.testing.assertionsPerTest === 0 && analysis.totalFilesAnalyzed > 5) {
    suggestions.push({
      id: 'test-add-tests',
      category: 'testing',
      severity: 'high',
      title: 'Add tests to improve code reliability',
      description: 'No testing patterns were detected. Tests ensure your code works correctly and prevent regressions.',
      recommendation: 'Start with unit tests for critical business logic. Use Vitest or Jest. Aim for tests that cover edge cases, not just happy paths.',
      evidence: 'No test files or assertions found',
      icon: '🧪',
    });
  } else if (analysis.testing.assertionsPerTest < 2 && analysis.testing.assertionsPerTest > 0) {
    suggestions.push({
      id: 'test-more-assertions',
      category: 'testing',
      severity: 'medium',
      title: 'Add more assertions to your tests',
      description: `Your tests average only ${analysis.testing.assertionsPerTest.toFixed(1)} expect() calls each. More assertions mean better coverage of edge cases.`,
      recommendation: 'Each test should verify multiple aspects: the return value, side effects, error cases, and edge conditions. Consider property-based testing for complex logic.',
      evidence: `${analysis.testing.assertionsPerTest.toFixed(1)} assertions per test file`,
      icon: '🧪',
    });
  }

  if (!analysis.organization.coLocatedTests && analysis.testing.assertionsPerTest > 0) {
    suggestions.push({
      id: 'test-co-locate',
      category: 'testing',
      severity: 'low',
      title: 'Co-locate tests with source files',
      description: 'Tests in a separate directory are easier to overlook and harder to maintain alongside the code they test.',
      recommendation: 'Place test files next to the source files they test: `src/components/Button.tsx` → `src/components/Button.test.tsx`. This keeps related code together.',
      evidence: 'Tests are in a separate directory',
      icon: '🧪',
    });
  }

  // ── API Suggestions ──
  if (analysis.api.usesFetch && !analysis.api.usesDataFetching) {
    suggestions.push({
      id: 'api-data-fetching',
      category: 'api',
      severity: 'medium',
      title: 'Use React Query/SWR for data fetching',
      description: 'Raw fetch() calls lack caching, deduplication, retries, and loading state management that libraries provide.',
      recommendation: 'Adopt TanStack Query (React Query) or SWR for data fetching. They handle caching, background refetching, loading/error states, and request deduplication.',
      evidence: 'fetch() is primary HTTP method, no data fetching hooks detected',
      icon: '🌐',
    });
  }

  // ── Organization Suggestions ──
  if (analysis.organization.avgFileLength > 400 && analysis.totalFilesAnalyzed > 3) {
    suggestions.push({
      id: 'org-file-length',
      category: 'organization',
      severity: 'medium',
      title: 'Split large files into smaller modules',
      description: `Average file length is ${analysis.organization.avgFileLength.toFixed(0)} lines. Large files are harder to understand, test, and maintain.`,
      recommendation: 'Split files over 300 lines into smaller modules. Each module should have a single responsibility. This makes code easier to navigate and test.',
      evidence: `Avg ${analysis.organization.avgFileLength.toFixed(0)} lines per file`,
      icon: '📁',
    });
  }

  if (!analysis.organization.dedicatedTypesDir && analysis.typescript.interfaceVsType > 0 && analysis.totalFilesAnalyzed > 3) {
    suggestions.push({
      id: 'org-types-dir',
      category: 'organization',
      severity: 'low',
      title: 'Organize shared types in a dedicated directory',
      description: 'Scattering type definitions across files makes them hard to find and leads to duplication.',
      recommendation: 'Create a `types/` or `src/types/` directory for shared interfaces, types, and enums. Keep component-specific types co-located.',
      evidence: 'No dedicated types directory',
      icon: '📁',
    });
  }

  // ── General Suggestions ──
  if (analysis.totalFilesAnalyzed < 5 && analysis.totalFilesAnalyzed > 0) {
    suggestions.push({
      id: 'general-more-code',
      category: 'general',
      severity: 'low',
      title: 'Analyzed a small codebase — patterns will improve with more data',
      description: `Only ${analysis.totalFilesAnalyzed} source files were analyzed. More code = better pattern detection.`,
      recommendation: 'Run `ctx taste code` on larger projects for more accurate taste detection. The more code analyzed, the better your personal profile becomes.',
      evidence: `${analysis.totalFilesAnalyzed} files analyzed`,
      icon: '💡',
    });
  }

  // Sort by severity (high first, then medium, then low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Format suggestions for terminal display with severity coloring
 */
export function formatCodeSuggestions(suggestions: CodeSuggestion[]): string {
  if (suggestions.length === 0) {
    return '   ✨ Your patterns look great! No improvement suggestions at this time.';
  }

  const lines: string[] = [];
  lines.push('');
  lines.push('   ┌─ Improvement Suggestions ─────────────────────────────────');
  lines.push('');

  for (const s of suggestions) {
    const severityLabel = s.severity === 'high' ? '🔴 HIGH' : s.severity === 'medium' ? '🟡 MEDIUM' : '🟢 LOW';
    lines.push(`   ${s.icon}  ${s.title}`);
    lines.push(`   ${severityLabel} — ${s.category}`);
    lines.push(`      ${s.description}`);
    lines.push(`      ${'→'} ${s.recommendation}`);
    lines.push(`      ${'📊'} ${s.evidence}`);
    lines.push('');
  }

  lines.push(`   └${'─'.repeat(50)}`);
  lines.push(`   ${suggestions.length} suggestion(s) — ${suggestions.filter(s => s.severity === 'high').length} high, ${suggestions.filter(s => s.severity === 'medium').length} medium, ${suggestions.filter(s => s.severity === 'low').length} low`);

  return lines.join('\n');
}

// ─── Format Code Analysis for Display ───────────────────────────────────────

export function formatCodeAnalysis(analysis: CodeAnalysisResult): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('   ┌─ Deep Code Analysis ─────────────────────────────────────');
  lines.push('');

  // Import patterns
  lines.push(`   📦 Import Style`);
  lines.push(`      Named vs Default:  ${fmtBar(analysis.imports.namedVsDefault)} ${fmtPct(analysis.imports.namedVsDefault)} named`);
  lines.push(`      Type imports:      ${analysis.imports.usesTypeImports ? '✅ used' : '❌ not detected'}`);
  lines.push(`      Absolute imports:  ${analysis.imports.usesAbsoluteImports ? '✅ used' : '❌ not detected'}`);
  lines.push(`      Grouped imports:   ${analysis.imports.hasGroupedImports ? '✅ yes' : '❌ no'}`);
  lines.push(`      Avg/file:          ${analysis.imports.avgImportsPerFile.toFixed(1)} imports`);
  lines.push('');

  // Function patterns
  lines.push(`   🔧 Function Style`);
  lines.push(`      Arrow vs Decl:     ${fmtBar(analysis.functions.arrowVsDeclaration)} ${fmtPct(analysis.functions.arrowVsDeclaration)} arrows`);
  lines.push(`      Async:             ${fmtPct(analysis.functions.asyncPercentage)} of functions are async`);
  lines.push(`      Named functions:   ${analysis.functions.prefersNamedFunctions ? '✅ preferred' : '❌ anonymous common'}`);
  lines.push(`      Return types:      ${analysis.functions.hasReturnTypes ? '✅ annotated' : '❌ rarely annotated'}`);
  lines.push('');

  // TypeScript patterns
  lines.push(`   📐 TypeScript`);
  lines.push(`      Interface vs Type: ${fmtBar(analysis.typescript.interfaceVsType)} ${fmtPct(analysis.typescript.interfaceVsType)} interfaces`);
  lines.push(`      \`any\` usage:       ${fmtBar(1 - Math.min(analysis.typescript.anyUsage / 3, 1))} ${analysis.typescript.anyUsage < 0.5 ? '✅ low' : '⚠️ high'}`);
  lines.push(`      Generics:          ${analysis.typescript.usesGenerics ? '✅ used' : '❌ rarely'}`);
  lines.push(`      As casting:        ${analysis.typescript.usesAsCasting ? '⚠️ used' : '✅ avoided'}`);
  lines.push(`      Optional chain:    ${analysis.typescript.usesOptionalChaining ? '✅ used' : '❌ not detected'}`);
  lines.push(`      Nullish coalesce:  ${analysis.typescript.usesNullishCoalescing ? '✅ used' : '❌ not detected'}`);
  lines.push('');

  // Component patterns (only if component files found)
  if (analysis.totalFilesAnalyzed > 0) {
    lines.push(`   🧩 Components`);
    lines.push(`      Functional:       ${analysis.components.usesFunctionalComponents ? '✅ functional' : '⚠️ class-based'}`);
    lines.push(`      Typed props:       ${analysis.components.hasTypedProps ? '✅ yes' : '❌ no'}`);
    lines.push(`      Hooks:            ${analysis.components.usesHooks ? '✅ used' : '❌ not detected'}`);
    lines.push(`      Co-located styles: ${analysis.components.colocatedStyles ? '✅ yes' : '❌ no'}`);
    lines.push('');
  }

  // Error handling
  lines.push(`   🛡️  Error Handling`);
  lines.push(`      Try-catch:         ${analysis.errorHandling.usesTryCatch ? '✅ primary' : '❌ not primary'}`);
  lines.push(`      .catch chains:     ${analysis.errorHandling.usesCatchChain ? '✅ used' : '❌ not detected'}`);
  lines.push(`      Early returns:     ${analysis.errorHandling.usesEarlyReturns ? '✅ preferred' : '❌ not common'}`);
  lines.push(`      Custom errors:     ${analysis.errorHandling.hasCustomErrors ? '✅ defined' : '❌ not defined'}`);
  lines.push('');

  // Testing patterns (only if test files found)
  if (analysis.testing.assertionsPerTest > 0) {
    lines.push(`   🧪 Testing`);
    lines.push(`      Style:             ${analysis.testing.usesDescribeIt ? 'describe/it' : 'test()'}`);
    lines.push(`      Assertions/test:   ${analysis.testing.assertionsPerTest.toFixed(1)} expect() calls`);
    lines.push(`      Mocks:             ${analysis.testing.usesMocks ? '✅ used' : '❌ not detected'}`);
    lines.push('');
  }

  // API patterns
  if (analysis.api.usesFetch || analysis.api.usesHttpClient) {
    lines.push(`   🌐 API Patterns`);
    lines.push(`      HTTP client:       ${analysis.api.usesFetch ? 'fetch()' : 'axios/ky'}`);
    lines.push(`      API routes:        ${analysis.api.usesApiRoutes ? '✅ /api/ routes' : '❌ not detected'}`);
    lines.push(`      Data fetching:     ${analysis.api.usesDataFetching ? '✅ React Query/SWR' : '❌ raw'}`);
    lines.push('');
  }

  // Code organization
  lines.push(`   📁 Organization`);
  lines.push(`      Barrel files:      ${analysis.organization.usesBarrelFiles ? '✅ used' : '❌ not used'}`);
  lines.push(`      Avg file length:   ${analysis.organization.avgFileLength.toFixed(0)} lines`);
  lines.push(`      Test placement:    ${analysis.organization.coLocatedTests ? '✅ co-located' : '⚠️ separate dir'}`);
  lines.push(`      Types directory:   ${analysis.organization.dedicatedTypesDir ? '✅ yes' : '❌ no'}`);
  lines.push('');

  lines.push(`   └${'─'.repeat(50)}`);
  lines.push(`   Analyzed ${analysis.totalFilesAnalyzed} source files`);

  return lines.join('\n');
}

function fmtPct(val: number): string {
  return (val * 100).toFixed(0) + '%';
}

function fmtBar(val: number): string {
  const filled = Math.round(Math.min(val, 1) * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
