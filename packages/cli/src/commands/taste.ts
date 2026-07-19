import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import {
  learnTasteFromProject,
  loadTasteProfile,
  saveTasteProfile,
  mergeTasteProfile,
  createDefaultTaste,
  formatTasteProfile,
  analyzeSourceCode,
  formatCodeAnalysis,
  generateCodeSuggestions,
  formatCodeSuggestions,
} from '@contextpilot/core';
import chalk from 'chalk';
import { resolve, join, basename } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import ora from 'ora';

export function registerTasteCommand(program: Command): void {
  const taste = program
    .command('taste')
    .description('🧠 OpenTaste — Learn and manage your personal coding taste');

  taste
    .command('learn')
    .description('Learn your coding taste from a project')
    .argument('[path]', 'Path to the project to analyze', '.')
    .option('--no-git', 'Skip git history analysis')
    .option('--no-config', 'Skip config file analysis')
    .option('--no-structure', 'Skip project structure analysis')
    .option('--no-packages', 'Skip package.json analysis')
    .option('--merge', 'Merge with existing taste profile instead of replacing', true)
    .action(async (projectPath: string, opts: {
      git: boolean;
      config: boolean;
      structure: boolean;
      packages: boolean;
      merge: boolean;
    }) => {
      const rootDir = resolve(projectPath);

      if (!existsSync(rootDir)) {
        logger.error(`Directory not found: ${rootDir}`);
        process.exit(1);
      }

      logger.section('OpenTaste — Learning Your Coding Taste');
      logger.info(`Analyzing project: ${chalk.bold(rootDir)}`);
      logger.raw('');

      // Show what we're analyzing
      const analyses: string[] = [];
      if (opts.git) analyses.push('git history');
      if (opts.config) analyses.push('config files');
      if (opts.structure) analyses.push('project structure');
      if (opts.packages) analyses.push('package.json');
      logger.info(`Analyzing: ${analyses.map(a => chalk.cyan(a)).join(', ')}`);
      logger.raw('');

      // Learn taste
      const spinner = ora('Learning your coding taste...').start();
      try {
        const learned = learnTasteFromProject(rootDir, {
          gitHistory: opts.git,
          configFiles: opts.config,
          projectStructure: opts.structure,
          packageAnalysis: opts.packages,
        });

        // Load existing profile
        const existing = loadTasteProfile();

        // Merge or replace
        const updated = opts.merge
          ? mergeTasteProfile(existing, learned)
          : { ...createDefaultTaste(), ...learned };

        // Save
        saveTasteProfile(updated);

        spinner.succeed('Taste learned!');

        // Show what was learned
        logger.raw('');
        logger.success('Here\'s what I learned about your coding taste:');
        logger.raw('');

        // Formatting preferences
        if (learned.formatting) {
          const f = learned.formatting;
          logger.raw(`  ${chalk.bold('✏️  Formatting:')}`);
          logger.raw(`     Semicolons:       ${f.semi ? chalk.green('yes') : chalk.red('no')}`);
          logger.raw(`     Quotes:           ${f.singleQuote ? chalk.green('single') : chalk.blue('double')}`);
          logger.raw(`     Trailing commas:  ${f.trailingComma ? chalk.green('yes') : chalk.red('no')}`);
          logger.raw(`     Tab width:        ${chalk.yellow(String(f.tabWidth))}`);
          logger.raw('');
        }

        // Styling
        if (learned.styling && learned.styling.approach !== 'unknown') {
          logger.raw(`  ${chalk.bold('🎨 Styling:')}       ${chalk.cyan(learned.styling.approach)}`);
        }

        // Testing
        if (learned.testing && learned.testing.framework !== 'unknown') {
          logger.raw(`  ${chalk.bold('🧪 Testing:')}       ${chalk.cyan(learned.testing.framework)}`);
          logger.raw(`  ${chalk.bold('   Pattern:')}       ${chalk.cyan(learned.testing.pattern)}`);
          logger.raw('');
        }

        // Commands
        if (learned.commandPreferences) {
          const c = learned.commandPreferences;
          logger.raw(`  ${chalk.bold('⚡ Commands:')}`);
          logger.raw(`     Dev:    ${chalk.cyan(c.dev)}`);
          logger.raw(`     Build:  ${chalk.cyan(c.build)}`);
          logger.raw(`     Test:   ${chalk.cyan(c.test)}`);
          logger.raw(`     Lint:   ${chalk.cyan(c.lint)}`);
          logger.raw('');
        }

        // Naming
        if (learned.naming) {
          const n = learned.naming;
          logger.raw(`  ${chalk.bold('📁 Naming:')}`);
          logger.raw(`     Files:       ${chalk.cyan(n.files)}`);
          logger.raw(`     Components:  ${chalk.cyan(n.components)}`);
          logger.raw('');
        }

        // Learned patterns
        if (learned.learnedPatterns && learned.learnedPatterns.length > 0) {
          logger.raw(`  ${chalk.bold('🔍 Learned Patterns:')}`);
          for (const p of learned.learnedPatterns) {
            const bar = chalk.green('█'.repeat(Math.round(p.confidence * 10)));
            const empty = chalk.gray('░'.repeat(10 - Math.round(p.confidence * 10)));
            logger.raw(`     ${bar}${empty} ${p.description}`);
          }
          logger.raw('');
        }

        // Favorite patterns
        if (learned.favoritePatterns && learned.favoritePatterns.length > 0) {
          logger.raw(`  ${chalk.bold('⭐ Preferred Libraries:')}`);
          logger.raw(`     ${learned.favoritePatterns.slice(0, 8).map(p => chalk.cyan(p)).join(', ')}`);
          logger.raw('');
        }

        logger.success(`Taste profile saved! ${chalk.bold(`~/.config/contextpilot/taste.json`)}`);
        logger.raw('');
        logger.info(`Run ${chalk.cyan('ctx taste profile')} to see your full taste profile.`);
        logger.info(`Run ${chalk.cyan('ctx init')} to generate context files with your taste baked in.`);

      } catch (err) {
        spinner.fail('Learning failed');
        logger.error(err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
      }
    });

  taste
    .command('profile')
    .description('Show your current taste profile')
    .option('--json', 'Output as JSON', false)
    .action((opts: { json: boolean }) => {
      const profile = loadTasteProfile();

      if (opts.json) {
        logger.raw(JSON.stringify(profile, null, 2));
        return;
      }

      logger.raw(formatTasteProfile(profile));

      if (profile.sourceProjects.length === 0 || profile.confidence.overall < 0.1) {
        logger.raw('');
        logger.info(`No taste learned yet. Run ${chalk.cyan('ctx taste learn <project-path>')} to start.`);
      }

      logger.raw('');
      logger.raw(`   Profile location: ${chalk.dim(join(homedir(), '.config', 'contextpilot', 'taste.json'))}`);
    });

  taste
    .command('reset')
    .description('Reset your taste profile to defaults')
    .option('--force', 'Skip confirmation', false)
    .action((opts: { force: boolean }) => {
      if (!opts.force) {
        const profile = loadTasteProfile();
        if (profile.sourceProjects.length > 0) {
          logger.warn('This will erase all learned taste preferences.');
          logger.warn(`Source projects: ${profile.sourceProjects.join(', ')}`);
          logger.raw('');
          logger.info('Use --force to confirm:');
          logger.info(`  ${chalk.cyan('ctx taste reset --force')}`);
          return;
        }
      }

      const defaultTaste = createDefaultTaste();
      saveTasteProfile(defaultTaste);
      logger.success('Taste profile reset to defaults.');
    });

  taste
    .command('code')
    .description('Deep code analysis — learn taste from your actual source code patterns')
    .argument('[path]', 'Path to the project to analyze', '.')
    .option('--json', 'Output as JSON', false)
    .option('--merge', 'Merge analysis into taste profile', true)
    .action(async (projectPath: string, opts: {
      json: boolean;
      merge: boolean;
    }) => {
      const rootDir = resolve(projectPath);

      if (!existsSync(rootDir)) {
        logger.error(`Directory not found: ${rootDir}`);
        process.exit(1);
      }

      logger.section('OpenTaste — Deep Code Analysis');
      logger.info(`Analyzing source code: ${chalk.bold(rootDir)}`);
      logger.raw('');

      const spinner = ora('Reading source files and analyzing patterns...').start();

      try {
        const analysis = analyzeSourceCode(rootDir);

        spinner.succeed(`Analyzed ${chalk.bold(String(analysis.totalFilesAnalyzed))} source files`);
        logger.raw('');

        // Show the analysis
        logger.raw(formatCodeAnalysis(analysis));
        logger.raw('');

        // Generate and show improvement suggestions
        const suggestions = generateCodeSuggestions(analysis);
        const highCount = suggestions.filter(s => s.severity === 'high').length;
        const medCount = suggestions.filter(s => s.severity === 'medium').length;
        const lowCount = suggestions.filter(s => s.severity === 'low').length;

        logger.raw(formatCodeSuggestions(suggestions));
        logger.raw('');

        logger.info(`Patterns: ${chalk.green(String(analysis.totalFilesAnalyzed))} files analyzed`);
        if (suggestions.length > 0) {
          logger.info(`Suggestions: ${chalk.red(highCount.toString())} high, ${chalk.yellow(medCount.toString())} medium, ${chalk.green(lowCount.toString())} low priority`);
        }
        logger.raw('');

        // Merge into taste profile
        if (opts.merge) {
          const profile = loadTasteProfile();
          
          // Map code analysis to taste preferences
          const learned: Record<string, any> = {};
          
          // Import style
          learned.imports = {
            style: analysis.imports.namedVsDefault > 0.6 ? 'named' : analysis.imports.namedVsDefault < 0.3 ? 'default' : 'mixed',
            groupExternal: analysis.imports.hasGroupedImports,
            absoluteImports: analysis.imports.usesAbsoluteImports,
          };

          // Component style
          learned.components = {
            pattern: analysis.components.usesFunctionalComponents ? 'functional' : 'class',
            colocateTests: analysis.organization.coLocatedTests,
            colocateStyles: analysis.components.colocatedStyles,
            propsInterface: analysis.components.hasTypedProps,
          };

          // TypeScript preferences
          learned.typescript = {
            strict: analysis.typescript.anyUsage < 0.5,
            avoidAny: analysis.typescript.anyUsage < 0.3,
          };

          // Naming from analysis
          learned.naming = {
            files: profile.naming.files,
            functions: analysis.functions.arrowVsDeclaration > 0.7 ? 'camelCase' : 'camelCase',
            types: analysis.typescript.interfaceVsType > 0.6 ? 'PascalCase' : 'PascalCase',
            constants: 'UPPER_CASE',
            components: profile.naming.components,
          };

          // Testing from analysis
          learned.testing = {
            framework: profile.testing.framework,
            pattern: analysis.organization.coLocatedTests ? 'co-located' : 'separate-dir',
          };

          // Add learned patterns from code analysis
          const learnedPatterns = [];
          if (analysis.functions.asyncPercentage > 0.3) {
            learnedPatterns.push({
              pattern: 'async-heavy',
              description: `${Math.round(analysis.functions.asyncPercentage * 100)}% of functions are async — strong async usage`,
              confidence: analysis.functions.asyncPercentage,
              evidence: [`${analysis.totalFilesAnalyzed} source files analyzed`],
            });
          }
          if (analysis.typescript.usesOptionalChaining) {
            learnedPatterns.push({
              pattern: 'optional-chaining',
              description: 'Uses optional chaining (?.) for safe property access',
              confidence: 0.7,
              evidence: [`Detected in codebase`],
            });
          }
          if (analysis.typescript.usesGenerics) {
            learnedPatterns.push({
              pattern: 'generics-heavy',
              description: 'Actively uses TypeScript generics for type safety',
              confidence: 0.6,
              evidence: [`Detected in codebase`],
            });
          }
          if (analysis.typescript.anyUsage < 0.3) {
            learnedPatterns.push({
              pattern: 'no-any',
              description: 'Avoids `any` type — prefers strict type safety',
              confidence: 0.8,
              evidence: [`Low any usage detected (${Math.round(analysis.typescript.anyUsage * 100)}% of files)`],
            });
          }
          if (analysis.errorHandling.usesEarlyReturns) {
            learnedPatterns.push({
              pattern: 'early-returns',
              description: 'Prefers early returns over nested conditionals',
              confidence: 0.6,
              evidence: [`Detected in codebase`],
            });
          }
          if (analysis.errorHandling.hasCustomErrors) {
            learnedPatterns.push({
              pattern: 'custom-errors',
              description: 'Defines custom error classes for better error handling',
              confidence: 0.7,
              evidence: [`Detected in codebase`],
            });
          }
          if (analysis.api.usesDataFetching) {
            learnedPatterns.push({
              pattern: 'react-query-or-swr',
              description: 'Uses React Query or SWR for data fetching',
              confidence: 0.8,
              evidence: [`Detected in codebase`],
            });
          }

          // Merge into profile — mergeTasteProfile handles deduplication
          const merged = mergeTasteProfile(profile, {
            ...learned,
            learnedPatterns,
            sourceProjects: [basename(rootDir)],
          });
          saveTasteProfile(merged);

          logger.success('Code analysis merged into taste profile!');
          logger.raw('');
          logger.info(`New confidence: ${chalk.bold(Math.round(merged.confidence.overall * 100) + '%')}`);
          logger.info(`Run ${chalk.cyan('ctx taste profile')} to see the updated profile.`);
        }

        if (opts.json) {
          logger.raw(JSON.stringify(analysis, null, 2));
        }

      } catch (err) {
        spinner.fail('Code analysis failed');
        logger.error(err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
      }
    });

  taste
    .command('guardrail')
    .description('Add a personal guardrail (something AI should never do)')
    .argument('<rule>', 'The guardrail rule to add')
    .action((rule: string) => {
      const profile = loadTasteProfile();
      if (!profile.guardrails.includes(rule)) {
        profile.guardrails.push(rule);
        saveTasteProfile(profile);
        logger.success(`Guardrail added: "${rule}"`);
      } else {
        logger.warn('This guardrail already exists in your profile.');
      }
    });
}
