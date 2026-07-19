import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { scanProject, generateContext } from '@contextpilot/core';
import { writeFileSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import ora from 'ora';

export function registerWatchCommand(program: Command): void {
  program
    .command('watch')
    .description('Watch project for changes and auto-update context files')
    .argument('[path]', 'Path to the project', '.')
    .option('--debounce <ms>', 'Debounce time in milliseconds', '2000')
    .option('--no-initial', 'Skip initial context generation', false)
    .action(async (projectPath: string, opts: { debounce: string; initial: boolean }) => {
      const rootDir = resolve(projectPath);
      const debounceMs = parseInt(opts.debounce, 10);

      logger.section('ContextPilot — Watch Mode');
      logger.info(`Watching: ${chalk.bold(rootDir)}`);
      logger.raw(`  ${chalk.dim('Debounce:')} ${debounceMs}ms`);
      logger.raw(`  ${chalk.dim('Press Ctrl+C to stop')}`);
      logger.raw('');

      // Watch key config files
      const watchPatterns = [
        join(rootDir, 'package.json'),
        join(rootDir, 'tsconfig.json'),
        join(rootDir, 'src/**/*'),
        join(rootDir, '!node_modules/**'),
        join(rootDir, '!dist/**'),
        join(rootDir, '!.git/**'),
      ];

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const regenerate = async (reason: string) => {
        logger.info(`Change detected: ${chalk.dim(reason)}`);
        const spinner = ora('Regenerating context...');
        spinner.start();

        try {
          const project = await scanProject(rootDir);
          const context = generateContext(project);

          // Write updated context files
          writeFileSync(join(rootDir, 'CLAUDE.md'), context.claudeMd, 'utf-8');
          writeFileSync(join(rootDir, '.cursorrules'), context.cursorRules, 'utf-8');

          spinner.succeed(`Context updated — Score: ${context.coverageScore}/100`);
          logger.raw(`  ${chalk.dim('Files:')} CLAUDE.md, .cursorrules`);
        } catch (err) {
          spinner.fail(`Regeneration failed: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      };

      // Initial generation
      if (opts.initial) {
        await regenerate('initial setup');
      }

      // Set up file watcher
      const watcher = chokidar.watch(watchPatterns, {
        ignored: /(node_modules|dist|\.git|\.next|build|coverage)/,
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('all', (event, filePath) => {
        // Debounce regeneration
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          regenerate(`${event}: ${chalk.dim(filePath)}`);
        }, debounceMs);
      });

      // Handle cleanup
      process.on('SIGINT', () => {
        logger.info('\nShutting down watcher...');
        watcher.close();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        watcher.close();
        process.exit(0);
      });
    });
}
