import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

const cli = resolve("dist/index.js");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("CLI JSON output", () => {
  it("runs generation, analysis, and code inspection end to end", () => {
    const root = mkdtempSync(join(tmpdir(), "opentaste-cli-"));
    const configHome = mkdtempSync(join(tmpdir(), "opentaste-config-"));
    tempDirs.push(root, configHome);
    mkdirSync(join(root, "src"));
    mkdirSync(join(root, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "fixture" }),
    );
    writeFileSync(join(root, "src", "index.ts"), "export const value = 1;");
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Fixture\n\n## Commands\n\nRun `npm test`.",
    );
    writeFileSync(
      join(root, ".cursor", "rules", "base.mdc"),
      "# Rules\n\n## Guardrails\n\nDo not use any.",
    );
    const env = { ...process.env, NO_COLOR: "1", XDG_CONFIG_HOME: configHome };

    const generated = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, "init", root, "--dry-run", "--json"],
        { encoding: "utf8", env },
      ),
    );
    expect(generated.files).toHaveLength(2);

    const analyzed = JSON.parse(
      execFileSync(process.execPath, [cli, "analyze", root, "--json"], {
        encoding: "utf8",
        env,
      }),
    );
    expect(analyzed).toHaveLength(2);

    const code = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, "taste", "code", root, "--json", "--no-merge"],
        { encoding: "utf8", env },
      ),
    );
    expect(code.totalFilesAnalyzed).toBe(1);
  });

  it("fails when an analysis target does not exist", () => {
    const result = spawnSync(process.execPath, [
      cli,
      "analyze",
      "/definitely/missing",
      "--json",
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout.toString())).toEqual([]);
  });
});
