import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { detectContextFiles, scanProject } from "./index.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("project detection", () => {
  it("detects compound extensions, wildcard manifests, framework configs, and Cursor rules", async () => {
    const root = mkdtempSync(join(tmpdir(), "opentaste-core-"));
    tempDirs.push(root);
    mkdirSync(join(root, "src"));
    mkdirSync(join(root, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "fixture" }),
    );
    writeFileSync(
      join(root, "src", "example.test.ts"),
      "export const value = 1;",
    );
    writeFileSync(join(root, "fixture.csproj"), "<Project />");
    writeFileSync(join(root, "vite.config.ts"), "export default {};");
    writeFileSync(
      join(root, ".cursor", "rules", "typescript.mdc"),
      "# TypeScript rules",
    );
    writeFileSync(join(root, ".cursor", "rules", "notes.txt"), "ignore me");

    const project = await scanProject(root);

    expect(
      project.languages.find((language) => language.name === "TypeScript")
        ?.files,
    ).toContain(join("src", "example.test.ts"));
    expect(project.languages.some((language) => language.name === "C#")).toBe(
      true,
    );
    expect(
      project.frameworks.some((framework) => framework.name === "Vite"),
    ).toBe(true);
    expect(detectContextFiles(root).map((file) => file.path)).toEqual([
      join(root, ".cursor", "rules", "typescript.mdc"),
    ]);
  });
});
