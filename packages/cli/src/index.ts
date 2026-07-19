#!/usr/bin/env node

import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerAnalyzeCommand } from './commands/analyze.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerDashboardCommand } from './commands/dashboard.js';
import { registerDemoCommand } from './commands/demo.js';

const program = new Command()
  .name('ctx')
  .description('🧠 ContextPilot — AI Context Management Platform')
  .version('0.1.0')
  .usage('<command> [options]')
  .addHelpText('after', `
Examples:
  $ ctx init                          Generate context for current project
  $ ctx init --template react-spa     Use a specific template
  $ ctx analyze                       Analyze existing context quality
  $ ctx watch                         Watch files and auto-update context
  $ ctx dashboard                     Launch the web dashboard
  $ ctx demo                          Run ContextPilot on itself (self-demo)
  `);

registerInitCommand(program);
registerAnalyzeCommand(program);
registerWatchCommand(program);
registerDashboardCommand(program);
registerDemoCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
