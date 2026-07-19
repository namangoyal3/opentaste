import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { basename, join } from "path";
import type { ContextAnalysis, ContextSuggestion } from "./types.js";

// ─── Context File Analyzer ───────────────────────────────────────────────────

const IMPORTANT_SECTIONS = [
  {
    id: "projectDescription",
    patterns: ["project", "overview", "# ", "## "],
    weight: 15,
  },
  {
    id: "techStack",
    patterns: ["tech stack", "technology", "stack", "framework", "language"],
    weight: 15,
  },
  {
    id: "commands",
    patterns: ["command", "npm run", "yarn", "pnpm", "script", "build", "test"],
    weight: 15,
  },
  {
    id: "architecture",
    patterns: ["architecture", "structure", "directory", "folder", "src/"],
    weight: 15,
  },
  {
    id: "conventions",
    patterns: ["convention", "style", "guideline", "pattern", "naming"],
    weight: 15,
  },
  {
    id: "guardrails",
    patterns: ["guardrail", "don't", "do not", "avoid", "never", "forbidden"],
    weight: 15,
  },
  {
    id: "references",
    patterns: ["reference", "docs/", "see also", "further"],
    weight: 10,
  },
];

export function analyzeContextFile(filePath: string): ContextAnalysis {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const lowerContent = content.toLowerCase();
  const stat = statSync(filePath);

  // Determine tool type from file name
  const fileName = basename(filePath);
  const toolType = detectToolType(fileName);

  // Detect coverage
  const coverage: ContextAnalysis["coverage"] = {
    projectDescription: false,
    techStack: false,
    commands: false,
    architecture: false,
    conventions: false,
    guardrails: false,
    references: false,
  };

  const missingSections: string[] = [];

  for (const section of IMPORTANT_SECTIONS) {
    const found = section.patterns.some((p) => lowerContent.includes(p));
    (coverage as Record<string, boolean>)[section.id] = found;
    if (!found) {
      missingSections.push(section.id);
    }
  }

  // Calculate completeness score
  let score = 0;
  for (const section of IMPORTANT_SECTIONS) {
    if ((coverage as Record<string, boolean>)[section.id]) {
      score += section.weight;
    }
  }

  // Calculate readability score
  const readabilityScore = calculateReadability(content, lines);

  // Generate suggestions
  const suggestions = generateAnalysisSuggestions(
    coverage,
    lines.length,
    content,
  );

  return {
    filePath,
    toolType,
    fileSize: stat.size,
    lineCount: lines.length,
    completenessScore: score,
    coverage,
    missingSections,
    readabilityScore,
    suggestions,
  };
}

function detectToolType(fileName: string): ContextAnalysis["toolType"] {
  const name = fileName.toLowerCase();
  if (name === "claude.md" || name === "claude") return "claude-code";
  if (name === ".cursorrules") return "cursor";
  if (name.endsWith(".mdc")) return "cursor";
  if (name.includes("aider")) return "aider";
  if (name.includes("cline")) return "cline";
  return "custom";
}

function calculateReadability(content: string, lines: string[]): number {
  let score = 100;

  // Penalize very long lines
  const longLines = lines.filter((l) => l.length > 120).length;
  score -= longLines * 2;

  // Penalize excessive empty lines
  const emptyLines = lines.filter((l) => l.trim() === "").length;
  if (emptyLines > lines.length * 0.3) score -= 10;

  // Penalize too few sections (less than 3 identifiable sections)
  let sectionCount = 0;
  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("### ")) sectionCount++;
  }
  if (sectionCount < 3) score -= 15;
  if (sectionCount >= 7) score += 5;

  // Bonus for including code examples
  if (content.includes("```")) score += 5;

  // Bonus for including a table
  if (content.includes("| ---")) score += 5;

  // Penalize very short files
  if (lines.length < 10) score -= 20;
  if (lines.length > 200) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function generateAnalysisSuggestions(
  coverage: ContextAnalysis["coverage"],
  lineCount: number,
  content: string,
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];

  if (!coverage.projectDescription) {
    suggestions.push({
      severity: "high",
      category: "missing",
      message: "Missing project description",
      details:
        "Add a brief description of what the project does and who it's for.",
    });
  }

  if (!coverage.techStack) {
    suggestions.push({
      severity: "high",
      category: "missing",
      message: "Missing tech stack information",
      details: "List your languages, frameworks, and key dependencies.",
    });
  }

  if (!coverage.commands) {
    suggestions.push({
      severity: "high",
      category: "missing",
      message: "Missing development commands",
      details: "Add common commands (dev, build, test, lint, typecheck).",
    });
  }

  if (!coverage.architecture) {
    suggestions.push({
      severity: "medium",
      category: "missing",
      message: "Missing architecture overview",
      details: "Describe your directory structure and component organization.",
    });
  }

  if (!coverage.conventions) {
    suggestions.push({
      severity: "medium",
      category: "missing",
      message: "Missing coding conventions",
      details:
        "Specify naming conventions, component patterns, and style preferences.",
    });
  }

  if (!coverage.guardrails) {
    suggestions.push({
      severity: "high",
      category: "missing",
      message: "Missing guardrails",
      details: "Add explicit rules about what the AI should NOT do.",
    });
  }

  if (lineCount > 200) {
    suggestions.push({
      severity: "medium",
      category: "optimize",
      message: "Context file is very long (>200 lines)",
      details:
        "Consider splitting into multiple files or removing redundant information.",
    });
  }

  if (lineCount < 15) {
    suggestions.push({
      severity: "high",
      category: "incomplete",
      message: "Context file is too short to be useful",
      details:
        "Aim for at least 30-50 lines covering project overview, tech stack, and conventions.",
    });
  }

  return suggestions;
}

/**
 * Detect existing context files in a project
 */
export function detectContextFiles(
  rootDir: string,
): Array<{ path: string; type: string }> {
  const files: Array<{ path: string; type: string }> = [];
  const candidates = [
    { name: "CLAUDE.md", type: "claude-code" },
    { name: ".claude/claude.md", type: "claude-code" },
    { name: ".cursorrules", type: "cursor" },
    { name: ".clinerules", type: "cline" },
    { name: ".aider.conf.yml", type: "aider" },
    { name: "CONVENTIONS.md", type: "custom" },
  ];

  for (const candidate of candidates) {
    const fullPath = join(rootDir, candidate.name);
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      files.push({ path: fullPath, type: candidate.type });
    }
  }

  const cursorRulesDir = join(rootDir, ".cursor", "rules");
  if (existsSync(cursorRulesDir) && statSync(cursorRulesDir).isDirectory()) {
    for (const name of readdirSync(cursorRulesDir)
      .filter((name) => name.endsWith(".mdc"))
      .sort()) {
      files.push({ path: join(cursorRulesDir, name), type: "cursor" });
    }
  }

  return files;
}
