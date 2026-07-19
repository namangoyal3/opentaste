import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerDashboardCommand(program: Command): void {
  program
    .command('dashboard')
    .description('Launch the ContextPilot web dashboard')
    .option('-p, --port <port>', 'Port to serve the dashboard', '4040')
    .option('--no-open', 'Do not open browser automatically', false)
    .action(async (opts: { port: string; open: boolean }) => {
      logger.section('ContextPilot — Dashboard');

      // Find the dashboard package
      const dashboardDir = resolve(__dirname, '..', '..', '..', 'dashboard');
      const { existsSync, statSync, readFileSync } = await import('fs');
      const { createServer } = await import('http');
      const { extname } = await import('path');

      // Check if dashboard is built
      const distDir = join(dashboardDir, 'dist');
      const hasBuild = existsSync(distDir) && statSync(distDir).isDirectory();

      if (!hasBuild) {
        logger.info('Dashboard not built. Starting dev server...');
        const vite = spawn('npx', ['vite', '--port', opts.port, '--open'], {
          cwd: dashboardDir,
          stdio: 'inherit',
          shell: true,
        });

        process.on('SIGINT', () => {
          vite.kill();
          process.exit(0);
        });

        await new Promise(() => {}); // Keep running
      } else {
        // Serve the built dashboard
        logger.info(`Starting dashboard on ${chalk.cyan(`http://localhost:${opts.port}`)}`);

        const mimeTypes: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpg',
          '.svg': 'image/svg+xml',
        };

        const server = createServer((req, res) => {
          const fileName = req.url === '/' ? 'index.html' : (req.url || '');
          const filePath = join(distDir, fileName);
          const ext = extname(filePath);
          const contentType = mimeTypes[ext] || 'application/octet-stream';

          try {
            const content = readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
          } catch {
            // SPA fallback
            try {
              const content = readFileSync(join(distDir, 'index.html'));
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content);
            } catch {
              res.writeHead(404);
              res.end('Not found');
            }
          }
        });

        server.listen(parseInt(opts.port), () => {
          const url = `http://localhost:${opts.port}`;
          logger.success(`Dashboard running at ${chalk.cyan(url)}`);
          
          if (opts.open) {
            spawn('open', [url]);
          }
        });
      }
    });
}
