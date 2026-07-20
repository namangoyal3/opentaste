import { Command } from "commander";
import { logger } from "../utils/logger.js";
import { analyzeContextFile, detectContextFiles } from "@contextpilot/core";
import { resolve } from "path";
import { existsSync, statSync } from "fs";
import chalk from "chalk";
import ora from "ora";

export function registerAnalyzeCommand(program: Command): void {
  program
    .command("analyze")
    .description(
      "Analyze existing AI context files for quality and completeness",
    )
    .argument("[path]", "Path to a context file or project directory", ".")
    .option("--json", "Output results as JSON", false)
    .option("--fix", "Apply suggested fixes automatically", false)
    .action(
      async (targetPath: string, opts: { json: boolean; fix: boolean }) => {
        const resolvedPath = resolve(targetPath);
        logger.setQuiet(opts.json);

        logger.section("OpenTaste — Context Analyzer");

        // Check if path is a directory or file

        let files: Array<{ path: string; type: string }>;

        if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
          files = detectContextFiles(resolvedPath);
          logger.info(
            `Scanning ${chalk.bold(resolvedPath)} for context files...`,
          );
        } else {
          files = [{ path: resolvedPath, type: "custom" }];
        }

        if (files.length === 0) {
          logger.warn("No context files found.");
          logger.raw("");
          logger.info(
            "Run `ctx init` to generate context files for your project.",
          );
          if (opts.json) console.log("[]");
          return;
        }

        logger.info(
          `Found ${chalk.bold(files.length.toString())} context file(s)`,
        );
        logger.raw("");

        let overallScore = 0;
        const analyses = [];
        let failed = false;

        for (const file of files) {
          const spinner = ora({
            text: `Analyzing ${file.path}...`,
            isSilent: opts.json,
          }).start();

          try {
            const analysis = analyzeContextFile(file.path);
            spinner.stop();

            if (opts.json) {
              analyses.push(analysis);
              continue;
            }

            // Print analysis results
            const typeColor = (() => {
              switch (analysis.toolType) {
                case "claude-code":
                  return chalk.magenta;
                case "cursor":
                  return chalk.green;
                case "cline":
                  return chalk.blue;
                case "aider":
                  return chalk.yellow;
                default:
                  return chalk.white;
              }
            })();
            logger.raw(
              `  ${chalk.bold(file.path)} (${typeColor(analysis.toolType)})`,
            );

            // Score bar
            const score = analysis.completenessScore;
            const barWidth = 30;
            const filled = Math.round((score / 100) * barWidth);
            const bar =
              chalk.green("█".repeat(filled)) +
              chalk.gray("█".repeat(Math.max(0, barWidth - filled)));
            logger.raw(`  Score: ${score}/100 ${bar}`);

            // Coverage grid
            logger.raw("");
            logger.raw(`  ${chalk.dim("Coverage:")}`);
            const coverageEntries = Object.entries(analysis.coverage);
            for (const [key, covered] of coverageEntries) {
              const icon = covered ? chalk.green("✓") : chalk.red("✗");
              const label = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase());
              logger.raw(`    ${icon} ${label}`);
            }

            // Missing sections
            if (analysis.missingSections.length > 0) {
              logger.raw("");
              logger.raw(`  ${chalk.yellow("Missing:")}`);
              for (const section of analysis.missingSections) {
                logger.raw(
                  `    ${chalk.red("✗")} ${section.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}`,
                );
              }
            }

            // Suggestions
            if (analysis.suggestions.length > 0) {
              logger.raw("");
              logger.raw(`  ${chalk.dim("Suggestions:")}`);
              for (const s of analysis.suggestions) {
                const icon =
                  s.severity === "high"
                    ? chalk.red("⚠")
                    : s.severity === "medium"
                      ? chalk.yellow("ⓘ")
                      : chalk.blue("ℹ");
                logger.raw(`    ${icon} ${s.message}`);
              }
            }

            overallScore += score;
            logger.raw("");
          } catch (err) {
            failed = true;
            spinner.fail(
              `Failed to analyze: ${err instanceof Error ? err.message : "Unknown"}`,
            );
          }
        }

        if (opts.json) {
          console.log(
            JSON.stringify(
              analyses.length === 1 ? analyses[0] : analyses,
              null,
              2,
            ),
          );
          if (failed) process.exitCode = 1;
        }

        if (files.length > 0 && !opts.json) {
          const avgScore = Math.round(overallScore / files.length);
          logger.raw(`  ${chalk.bold("Average Score:")} ${avgScore}/100`);

          if (avgScore < 50) {
            logger.info("Run `ctx init` to regenerate with better coverage.");
          } else if (avgScore < 80) {
            logger.info(
              "Consider adding the missing sections for better AI context.",
            );
          } else {
            logger.success(
              "Great context coverage! Your AI tools will work optimally.",
            );
          }
        }
      },
    );
}
