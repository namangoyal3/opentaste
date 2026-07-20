import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { scanProject, generateContext } from '@contextpilot/core';
import chalk from 'chalk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerDemoCommand(program: Command): void {
  program
    .command('demo')
    .description('Run OpenTaste on itself to demonstrate capabilities')
    .option('-o, --output <path>', 'Output directory for demo artifacts', 'demo-output')
    .option('--dry-run', 'Show output without writing files', false)
    .action(async (opts: { output: string; dryRun: boolean }) => {
      logger.section('OpenTaste — Self-Demonstration');

      // Find the opentaste project root
      const projectRoot = resolve(__dirname, '..', '..', '..', '..');
      const outputDir = resolve(process.cwd(), opts.output);

      logger.info(`Scanning OpenTaste itself at: ${chalk.bold(projectRoot)}`);
      logger.raw('');

      // Step 1: Scan
      const project = await scanProject(projectRoot);

      logger.success('Project scan complete!');
      logger.raw('');
      logger.raw(`  ${chalk.bold('Project:')}     ${project.name}`);
      logger.raw(`  ${chalk.bold('Languages:')}   ${project.languages.map(l => chalk.cyan(l.name)).join(', ')}`);
      logger.raw(`  ${chalk.bold('Frameworks:')}  ${project.frameworks.length > 0 ? project.frameworks.map(f => chalk.green(f.name)).join(', ') : chalk.dim('none')}`);
      logger.raw(`  ${chalk.bold('Package:')}     ${chalk.yellow(project.packageManager || 'unknown')}`);
      logger.raw(`  ${chalk.bold('Build:')}       ${chalk.magenta(project.buildTool || 'unknown')}`);
      logger.raw('');

      // Step 2: Generate
      const context = generateContext(project);

      logger.success(`Context generated! Coverage score: ${chalk.bold(context.coverageScore)}/100`);
      logger.raw('');

      // Show section breakdown
      logger.info('Context sections generated:');
      for (const section of context.sections) {
        const icon = section.priority >= 8 ? chalk.green('✓') : chalk.blue('✓');
        const priorityStars = '⭐'.repeat(Math.ceil(section.priority / 3));
        logger.raw(`  ${icon} ${chalk.bold(section.title)} ${chalk.dim(priorityStars)}`);
      }
      logger.raw('');

      // Show suggestions
      if (context.suggestions.length > 0) {
        logger.info('Improvement suggestions:');
        for (const s of context.suggestions) {
          const icon = s.severity === 'high' ? chalk.red('⚠') : s.severity === 'medium' ? chalk.yellow('ⓘ') : chalk.blue('ℹ');
          logger.raw(`  ${icon} ${s.message}`);
        }
        logger.raw('');
      }

      // Show CLAUDE.md preview
      logger.section('Generated CLAUDE.md Preview');
      const previewLines = context.claudeMd.split('\n').slice(0, 20);
      for (const line of previewLines) {
        logger.raw(`  ${line}`);
      }
      if (context.claudeMd.split('\n').length > 20) {
        logger.raw(`  ${chalk.dim('... and more')}`);
      }
      logger.raw('');        // Write output files if requested
      if (!opts.dryRun) {
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        writeFileSync(join(outputDir, 'CLAUDE.md'), context.claudeMd, 'utf-8');
        writeFileSync(join(outputDir, '.cursorrules'), context.cursorRules, 'utf-8');
        writeFileSync(
          join(outputDir, 'report.json'),
          JSON.stringify(
            {
              project: {
                name: project.name,
                languages: project.languages.map((l: any) => l.name),
                frameworks: project.frameworks.map((f: any) => f.name),
                packageManager: project.packageManager,
              },
              coverageScore: context.coverageScore,
              sections: context.sections.map((s: any) => ({
                title: s.title,
                priority: s.priority,
              })),
              suggestions: context.suggestions,
              generatedAt: context.generatedAt,
            },
            null,
            2
          ),
          'utf-8'
        );

        logger.success(`Demo artifacts written to: ${chalk.bold(outputDir)}`);
        logger.raw(`  ${join(outputDir, 'CLAUDE.md')}`);
        logger.raw(`  ${join(outputDir, '.cursorrules')}`);
        logger.raw(`  ${join(outputDir, 'report.json')}`);
      }

      // Summary
      logger.section('Demo Complete');
      logger.raw('');
      logger.raw(`  ${chalk.bold('OpenTaste')} just analyzed itself and generated:`);
      logger.raw(`  ${chalk.green('✓')} ${context.sections.length} context sections`);
      logger.raw(`  ${chalk.green('✓')} ${context.claudeMd.split('\n').length} lines of CLAUDE.md`);
      logger.raw(`  ${chalk.green('✓')} ${context.cursorRules.split('\n').length} lines of .cursorrules`);
      logger.raw(`  ${chalk.green('✓')} Coverage score: ${context.coverageScore}/100`);
      logger.raw(`  ${chalk.green('✓')} ${context.suggestions.length} improvement suggestions`);
      logger.raw('');
      logger.success(`OpenTaste works! Run ${chalk.cyan('ctx init')} on your own project to get started.`);
    });
}
