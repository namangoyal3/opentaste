import { Command } from "commander";
import { logger } from "../utils/logger.js";
import chalk from "chalk";
import { spawn } from "child_process";
import { resolve, join, dirname, sep } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerDashboardCommand(program: Command): void {
  program
    .command("dashboard")
    .description("Launch the OpenTaste web dashboard")
    .option("-p, --port <port>", "Port to serve the dashboard", "4040")
    .option("--no-open", "Do not open browser automatically")
    .action(async (opts: { port: string; open: boolean }) => {
      const port = Number(opts.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        logger.error(`Invalid port: ${opts.port}`);
        process.exitCode = 1;
        return;
      }

      logger.section("OpenTaste — Dashboard");

      // Find the dashboard package
      const dashboardDir = resolve(__dirname, "..", "..", "..", "dashboard");
      const { existsSync, statSync, readFileSync } = await import("fs");
      const { createServer } = await import("http");
      const { extname } = await import("path");

      // Check if dashboard is built
      const distDir = join(dashboardDir, "dist");
      const hasBuild = existsSync(distDir) && statSync(distDir).isDirectory();

      if (!hasBuild) {
        if (!existsSync(dashboardDir)) {
          logger.error(
            "Dashboard files are not installed. Run this command from the OpenTaste repository.",
          );
          process.exitCode = 1;
          return;
        }
        logger.info("Dashboard not built. Starting dev server...");
        const viteArgs = ["vite", "--port", String(port)];
        if (opts.open) viteArgs.push("--open");
        const vite = spawn("npx", viteArgs, {
          cwd: dashboardDir,
          stdio: "inherit",
        });

        process.on("SIGINT", () => {
          vite.kill();
          process.exit(0);
        });

        await new Promise(() => {}); // Keep running
      } else {
        // Serve the built dashboard
        logger.info(
          `Starting dashboard on ${chalk.cyan(`http://localhost:${opts.port}`)}`,
        );

        const mimeTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".svg": "image/svg+xml",
        };

        const server = createServer((req, res) => {
          let pathname: string;
          try {
            pathname = decodeURIComponent(
              new URL(req.url || "/", "http://localhost").pathname,
            );
          } catch {
            res.writeHead(400);
            res.end("Bad request");
            return;
          }
          const fileName = pathname === "/" ? "/index.html" : pathname;
          const filePath = resolve(distDir, `.${fileName}`);
          if (
            filePath !== join(distDir, "index.html") &&
            !filePath.startsWith(`${distDir}${sep}`)
          ) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
          }
          const ext = extname(filePath);
          const contentType = mimeTypes[ext] || "application/octet-stream";

          try {
            const content = readFileSync(filePath);
            res.writeHead(200, { "Content-Type": contentType });
            res.end(content);
          } catch {
            if (ext) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
            // SPA fallback
            try {
              const content = readFileSync(join(distDir, "index.html"));
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(content);
            } catch {
              res.writeHead(404);
              res.end("Not found");
            }
          }
        });

        server.listen(port, () => {
          const url = `http://localhost:${port}`;
          logger.success(`Dashboard running at ${chalk.cyan(url)}`);

          if (opts.open) {
            const command =
              process.platform === "darwin"
                ? "open"
                : process.platform === "win32"
                  ? "cmd"
                  : "xdg-open";
            const args =
              process.platform === "win32" ? ["/c", "start", "", url] : [url];
            spawn(command, args, { stdio: "ignore", detached: true }).unref();
          }
        });
      }
    });
}
