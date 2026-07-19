import { Command } from "commander";
import { logger } from "../utils/logger.js";
import {
  scanProject,
  generateContext,
  TemplateEngine,
  loadTasteProfile,
} from "@contextpilot/core";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import chalk from "chalk";
import ora from "ora";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Generate AI context files for your project")
    .argument("[path]", "Path to the project", ".")
    .option(
      "-t, --template <id>",
      "Template ID to use (e.g., react-spa, nextjs-app)",
    )
    .option("--no-claude", "Skip CLAUDE.md generation")
    .option("--no-cursor", "Skip .cursorrules generation")
    .option("--no-taste", "Skip personal taste profile")
    .option("--all", "Generate for all supported AI tools", false)
    .option("--dry-run", "Preview without writing files", false)
    .option("--json", "Output as JSON", false)
    .action(
      async (
        projectPath: string,
        opts: {
          template?: string;
          claude: boolean;
          cursor: boolean;
          all: boolean;
          dryRun: boolean;
          json: boolean;
          taste: boolean;
        },
      ) => {
        const rootDir = resolve(projectPath);
        logger.setQuiet(opts.json);

        if (!existsSync(rootDir)) {
          logger.error(`Directory not found: ${rootDir}`);
          process.exit(1);
        }

        logger.section("ContextPilot — Context Generator");
        logger.info(`Project: ${chalk.bold(rootDir)}`);

        // Scan project
        const scanSpinner = ora({
          text: "Scanning project...",
          isSilent: opts.json,
        }).start();
        let project;
        try {
          project = await scanProject(rootDir);
          scanSpinner.succeed(`Project detected: ${chalk.bold(project.name)}`);
        } catch (err) {
          scanSpinner.fail("Scan failed");
          logger.error(err instanceof Error ? err.message : "Unknown error");
          process.exit(1);
        }

        // Print detection results
        if (!opts.json) {
          logger.raw("");
          logger.info(chalk.dim("Detected:"));
          logger.raw(
            `  Languages:  ${project.languages.map((l) => chalk.cyan(l.name)).join(", ")}`,
          );
          logger.raw(
            `  Frameworks: ${project.frameworks.length > 0 ? project.frameworks.map((f) => chalk.green(f.name)).join(", ") : chalk.dim("none detected")}`,
          );
          if (project.packageManager)
            logger.raw(`  Package:    ${chalk.yellow(project.packageManager)}`);
          if (project.buildTool)
            logger.raw(`  Build:      ${chalk.magenta(project.buildTool)}`);
          if (project.testFramework)
            logger.raw(`  Tests:      ${chalk.blue(project.testFramework)}`);
          if (project.linter)
            logger.raw(`  Linter:     ${chalk.cyan(project.linter)}`);
        }

        // Load taste profile for personalization
        if (opts.taste) {
          try {
            const taste = loadTasteProfile();
            if (taste.confidence.overall >= 0.1) {
              logger.info(
                `🧠 Taste profile applied (${chalk.bold(Math.round(taste.confidence.overall * 100) + "%")} confidence)`,
              );
            }
          } catch {
            /* taste not available */
          }
        }

        // Generate context
        const genSpinner = ora({
          text: "Generating context...",
          isSilent: opts.json,
        }).start();
        const context = generateContext(project, { taste: opts.taste });
        genSpinner.succeed("Context generated");
        genSpinner.succeed(
          `Coverage score: ${chalk.bold(context.coverageScore)}/100`,
        );

        // Apply template if specified
        let templateContent: string | null = null;
        if (opts.template) {
          const engine = new TemplateEngine();
          const template = engine.get(opts.template);
          if (template) {
            templateContent = engine.applyTemplate(template, {
              projectName: project.name,
              projectDescription: `${project.frameworks.map((f) => f.name).join(" + ")} project`,
            });
            logger.info(`Applied template: ${chalk.cyan(template.name)}`);
          } else {
            logger.warn(
              `Template "${opts.template}" not found. Using auto-generated context.`,
            );
          }
        }

        // Write files
        const filesToWrite: Array<{
          path: string;
          content: string;
          label: string;
        }> = [];
        const genClaude = opts.claude || opts.all;
        const genCursor = opts.cursor || opts.all;

        if (genClaude) {
          filesToWrite.push({
            path: join(rootDir, "CLAUDE.md"),
            content: templateContent || context.claudeMd,
            label: "CLAUDE.md",
          });
        }
        if (genCursor) {
          filesToWrite.push({
            path: join(rootDir, ".cursorrules"),
            content: templateContent || context.cursorRules,
            label: ".cursorrules",
          });
        }

        if (opts.dryRun) {
          logger.raw("");
          logger.info(chalk.yellow("── Dry Run ──"));
          logger.raw(
            `Would write ${chalk.bold(filesToWrite.length.toString())} file(s):`,
          );
          for (const file of filesToWrite) {
            logger.raw(`  ${chalk.cyan(file.label)} → ${file.path}`);
          }
          if (opts.json) {
            console.log(
              JSON.stringify(
                {
                  files: filesToWrite.map((f) => ({
                    path: f.path,
                    label: f.label,
                  })),
                },
                null,
                2,
              ),
            );
          }
          return;
        }

        // Write files
        const errors: string[] = [];
        for (const file of filesToWrite) {
          try {
            writeFileSync(file.path, file.content, "utf-8");
            logger.success(`Created ${chalk.cyan(file.label)}`);
          } catch (err) {
            const message = `Failed to write ${file.label}: ${err instanceof Error ? err.message : "Unknown error"}`;
            errors.push(message);
            logger.error(message);
          }
        }

        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                files: filesToWrite.map((f) => ({
                  path: f.path,
                  label: f.label,
                })),
                errors,
              },
              null,
              2,
            ),
          );
        }
        if (errors.length > 0) process.exitCode = 1;

        // Print suggestions
        if (context.suggestions.length > 0 && !opts.json) {
          logger.raw("");
          logger.info(chalk.dim("Suggestions:"));
          for (const s of context.suggestions) {
            const icon =
              s.severity === "high"
                ? chalk.red("⚠")
                : s.severity === "medium"
                  ? chalk.yellow("ⓘ")
                  : chalk.blue("ℹ");
            logger.raw(`  ${icon} ${s.message}`);
            if (s.details) logger.raw(`    ${chalk.dim(s.details)}`);
          }
        }

        logger.raw("");
        logger.success(
          `Context generated! Your AI tools now have optimal project understanding.`,
        );
      },
    );
}
