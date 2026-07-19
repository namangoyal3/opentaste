import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, relative, basename, extname, resolve } from "path";
import type {
  DetectedProject,
  Language,
  Framework,
  ProjectStructure,
} from "./types.js";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
  ".vscode",
  ".idea",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "target",
  "bin",
  "obj",
]);

// ─── Framework Detection Heuristics ──────────────────────────────────────────

interface FrameworkDetector {
  name: string;
  type: Framework["type"];
  deps: string[];
  files?: string[];
  priority: number;
}

const FRAMEWORK_DETECTORS: FrameworkDetector[] = [
  // Frontend
  {
    name: "Next.js",
    type: "fullstack",
    deps: ["next"],
    files: ["next.config.js", "next.config.ts", "next.config.mjs"],
    priority: 90,
  },
  {
    name: "React",
    type: "frontend",
    deps: ["react", "react-dom"],
    priority: 50,
  },
  { name: "Vue", type: "frontend", deps: ["vue"], priority: 50 },
  { name: "Nuxt", type: "fullstack", deps: ["nuxt"], priority: 80 },
  { name: "Svelte", type: "frontend", deps: ["svelte"], priority: 50 },
  {
    name: "SvelteKit",
    type: "fullstack",
    deps: ["@sveltejs/kit"],
    priority: 80,
  },
  { name: "Angular", type: "frontend", deps: ["@angular/core"], priority: 50 },
  { name: "Astro", type: "frontend", deps: ["astro"], priority: 70 },
  {
    name: "Remix",
    type: "fullstack",
    deps: ["@remix-run/react"],
    priority: 70,
  },
  { name: "Gatsby", type: "frontend", deps: ["gatsby"], priority: 50 },
  {
    name: "Vite",
    type: "frontend",
    deps: ["vite"],
    files: ["vite.config.ts", "vite.config.js"],
    priority: 40,
  },

  // Backend
  { name: "Express", type: "backend", deps: ["express"], priority: 50 },
  { name: "NestJS", type: "backend", deps: ["@nestjs/core"], priority: 60 },
  { name: "Fastify", type: "backend", deps: ["fastify"], priority: 50 },
  { name: "Hono", type: "backend", deps: ["hono"], priority: 50 },
  { name: "Koa", type: "backend", deps: ["koa"], priority: 40 },
  { name: "tRPC", type: "backend", deps: ["@trpc/server"], priority: 60 },
  {
    name: "Prisma",
    type: "backend",
    deps: ["prisma", "@prisma/client"],
    priority: 40,
  },
  { name: "Drizzle", type: "backend", deps: ["drizzle-orm"], priority: 40 },

  // Full-stack
  { name: "Meteor", type: "fullstack", deps: ["meteor"], priority: 50 },
  {
    name: "Redwood",
    type: "fullstack",
    deps: ["@redwoodjs/core"],
    priority: 60,
  },

  // Testing
  {
    name: "Vitest",
    type: "library",
    deps: ["vitest"],
    files: ["vitest.config.ts", "vitest.config.js"],
    priority: 50,
  },
  { name: "Jest", type: "library", deps: ["jest"], priority: 40 },
  {
    name: "Playwright",
    type: "library",
    deps: ["@playwright/test"],
    priority: 40,
  },
  { name: "Cypress", type: "library", deps: ["cypress"], priority: 40 },
];

// ─── Language Detectors ──────────────────────────────────────────────────────

const LANGUAGE_DETECTORS: Array<{
  name: string;
  extensions: string[];
  manifestFiles: string[];
  versionField?: string;
}> = [
  {
    name: "TypeScript",
    extensions: [".ts", ".tsx"],
    manifestFiles: ["tsconfig.json"],
  },
  {
    name: "JavaScript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    manifestFiles: [],
  },
  {
    name: "Python",
    extensions: [".py"],
    manifestFiles: [
      "requirements.txt",
      "pyproject.toml",
      "Pipfile",
      "setup.py",
    ],
  },
  { name: "Go", extensions: [".go"], manifestFiles: ["go.mod", "go.sum"] },
  { name: "Rust", extensions: [".rs"], manifestFiles: ["Cargo.toml"] },
  {
    name: "Java",
    extensions: [".java"],
    manifestFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
  },
  { name: "Ruby", extensions: [".rb"], manifestFiles: ["Gemfile"] },
  { name: "PHP", extensions: [".php"], manifestFiles: ["composer.json"] },
  { name: "C#", extensions: [".cs"], manifestFiles: ["*.csproj"] },
  { name: "Swift", extensions: [".swift"], manifestFiles: ["Package.swift"] },
  { name: "Kotlin", extensions: [".kt", ".kts"], manifestFiles: [] },
  { name: "Dart", extensions: [".dart"], manifestFiles: ["pubspec.yaml"] },
  {
    name: "CSS",
    extensions: [".css", ".scss", ".less", ".tailwind"],
    manifestFiles: [],
  },
];

// ─── Scanner Logic ───────────────────────────────────────────────────────────

export async function scanProject(rootDir: string): Promise<DetectedProject> {
  const absRoot = resolvePath(rootDir);

  if (!existsSync(absRoot)) {
    throw new Error(`Directory not found: ${absRoot}`);
  }

  // Detect languages by scanning files
  const languages = await detectLanguages(absRoot);

  // Parse manifest files
  const manifest = parseManifest(absRoot);

  // Detect frameworks from dependencies
  const frameworks = detectFrameworks(absRoot, manifest);

  // Analyze structure
  const structure = analyzeStructure(absRoot);

  // Determine package manager
  const packageManager = detectPackageManager(absRoot);

  // Detect build tool, test framework, linter
  const buildTool = detectBuildTool(absRoot, manifest);
  const testFramework = frameworks.find((f) =>
    ["Vitest", "Jest", "Playwright", "Cypress"].includes(f.name),
  )?.name;
  const linter = detectLinter(absRoot);
  const formatter = detectFormatter(absRoot);

  return {
    rootDir: absRoot,
    name: manifest.name || basename(absRoot),
    languages,
    frameworks,
    packageManager,
    buildTool,
    testFramework,
    linter,
    formatter,
    structure,
    dependencies: {
      production: Object.keys(manifest.dependencies || {}),
      development: Object.keys(manifest.devDependencies || {}),
    },
  };
}

function resolvePath(p: string): string {
  return resolve(p);
}

async function detectLanguages(rootDir: string): Promise<Language[]> {
  const fileCounts: Record<string, { count: number; files: string[] }> = {};
  let totalFiles = 0;

  function walk(dir: string, depth = 0) {
    if (depth > 5) return; // Limit depth
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (IGNORED_DIRS.has(entry)) continue;
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath, depth + 1);
          } else {
            const ext = extname(entry);
            if (!fileCounts[ext]) fileCounts[ext] = { count: 0, files: [] };
            fileCounts[ext].count++;
            fileCounts[ext].files.push(relative(rootDir, fullPath));
            totalFiles++;
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip */
    }
  }

  walk(rootDir);

  const languages: Language[] = [];
  for (const detector of LANGUAGE_DETECTORS) {
    let count = 0;
    const files: string[] = [];
    for (const ext of detector.extensions) {
      if (fileCounts[ext]) {
        count += fileCounts[ext].count;
        files.push(...fileCounts[ext].files);
      }
    }
    // Also check manifest files
    for (const mf of detector.manifestFiles) {
      const found = mf.startsWith("*")
        ? readdirSync(rootDir).some((file) => file.endsWith(mf.slice(1)))
        : existsSync(join(rootDir, mf));
      if (found) {
        count = Math.max(count, 1);
      }
    }
    if (count > 0) {
      languages.push({
        name: detector.name,
        files: files.slice(0, 20), // Limit to first 20 files
        confidence: Math.min((count / Math.max(totalFiles, 1)) * 10, 1),
      });
    }
  }

  return languages.sort((a, b) => b.confidence - a.confidence);
}

interface Manifest {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

function parseManifest(rootDir: string): Manifest {
  const manifest: Manifest = {};

  // Try package.json first
  const pkgPath = join(rootDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      return JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
      /* ignore */
    }
  }

  // Try pyproject.toml
  const pyprojectPath = join(rootDir, "pyproject.toml");
  if (existsSync(pyprojectPath)) {
    manifest.name = basename(rootDir);
  }

  // Try Cargo.toml
  const cargoPath = join(rootDir, "Cargo.toml");
  if (existsSync(cargoPath)) {
    manifest.name = basename(rootDir);
  }

  // Try go.mod
  const goPath = join(rootDir, "go.mod");
  if (existsSync(goPath)) {
    manifest.name = basename(rootDir);
  }

  return manifest;
}

function detectFrameworks(rootDir: string, manifest: Manifest): Framework[] {
  const frameworks: Framework[] = [];
  const allDeps = { ...manifest.dependencies, ...manifest.devDependencies };

  for (const detector of FRAMEWORK_DETECTORS) {
    const hasDeps = detector.deps.every((d) => allDeps[d]);
    const hasFile =
      detector.files?.some((file) => existsSync(join(rootDir, file))) ?? false;
    if (hasDeps || hasFile) {
      frameworks.push({
        name: detector.name,
        type: detector.type,
        confidence: detector.priority / 100,
      });
    }
  }

  // Sort by confidence descending
  return frameworks.sort((a, b) => b.confidence - a.confidence);
}

function analyzeStructure(rootDir: string): ProjectStructure {
  const entries = readdirSync(rootDir).filter((e) => !IGNORED_DIRS.has(e));

  const topLevelDirs: string[] = [];
  const sourceDirs: string[] = [];

  for (const entry of entries) {
    try {
      const fullPath = join(rootDir, entry);
      if (statSync(fullPath).isDirectory()) {
        topLevelDirs.push(entry);
      }
    } catch {
      /* skip */
    }
  }

  // Check for common source directories
  for (const srcDir of ["src", "app", "lib", "source", "server", "client"]) {
    const srcPath = join(rootDir, srcDir);
    if (existsSync(srcPath) && statSync(srcPath).isDirectory()) {
      try {
        const srcEntries = readdirSync(srcPath);
        sourceDirs.push(
          ...srcEntries.filter((e) => {
            return (
              statSync(join(srcPath, e)).isDirectory() && !IGNORED_DIRS.has(e)
            );
          }),
        );
      } catch {
        /* skip */
      }
    }
  }

  return {
    hasSrcDir:
      existsSync(join(rootDir, "src")) || existsSync(join(rootDir, "app")),
    hasTestsDir: topLevelDirs.some(
      (d) => d.startsWith("test") || d.startsWith("__test"),
    ),
    hasDocsDir: topLevelDirs.includes("docs"),
    hasCiConfig:
      existsSync(join(rootDir, ".github")) ||
      existsSync(join(rootDir, ".gitlab-ci.yml")),
    hasDockerConfig:
      existsSync(join(rootDir, "Dockerfile")) ||
      existsSync(join(rootDir, "docker-compose.yml")),
    topLevelDirs,
    sourceDirs,
  };
}

function detectPackageManager(
  rootDir: string,
): "npm" | "pnpm" | "yarn" | "bun" | undefined {
  if (existsSync(join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(rootDir, "bun.lock"))) return "bun";
  if (existsSync(join(rootDir, "yarn.lock"))) return "yarn";
  if (existsSync(join(rootDir, "package-lock.json"))) return "npm";
  return undefined;
}

function detectBuildTool(
  rootDir: string,
  manifest: Manifest,
): string | undefined {
  const scripts = manifest.scripts || {};
  const scriptValues = Object.values(scripts).join(" ");

  if (scriptValues.includes("vite")) return "Vite";
  if (scriptValues.includes("webpack")) return "Webpack";
  if (scriptValues.includes("esbuild")) return "esbuild";
  if (scriptValues.includes("tsc") || scriptValues.includes("ts-node"))
    return "TypeScript";
  if (scriptValues.includes("rollup")) return "Rollup";
  if (scriptValues.includes("parcel")) return "Parcel";
  if (scriptValues.includes("turbopack")) return "Turbopack";

  const deps = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  } as Record<string, string>;
  if (deps["next"]) return "Next.js";
  if (deps["vite"]) return "Vite";

  return undefined;
}

function detectLinter(rootDir: string): string | undefined {
  const files = readdirSync(rootDir);
  for (const file of files) {
    if (file.startsWith(".eslint")) return "ESLint";
    if (file.startsWith(".biome")) return "Biome";
    if (file.startsWith("pylint") || file === ".pylintrc") return "Pylint";
    if (file.endsWith("flake8") || file.startsWith(".flake8")) return "Flake8";
  }
  return undefined;
}

function detectFormatter(rootDir: string): string | undefined {
  const files = readdirSync(rootDir);
  for (const file of files) {
    if (file.startsWith(".prettier")) return "Prettier";
    if (file.startsWith(".biome")) return "Biome";
    if (file === "rustfmt.toml") return "rustfmt";
    if (file === ".gofmt") return "gofmt";
  }
  return undefined;
}
