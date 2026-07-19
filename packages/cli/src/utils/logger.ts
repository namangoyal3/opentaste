import chalk from "chalk";

const PREFIX = chalk.cyan("[ctx]");
let quiet = false;

export const logger = {
  setQuiet: (value: boolean) => {
    quiet = value;
  },
  info: (...args: unknown[]) => {
    if (!quiet) console.log(PREFIX, chalk.blue("ℹ"), ...args);
  },
  success: (...args: unknown[]) => {
    if (!quiet) console.log(PREFIX, chalk.green("✔"), ...args);
  },
  warn: (...args: unknown[]) => {
    if (!quiet) console.log(PREFIX, chalk.yellow("⚠"), ...args);
  },
  error: (...args: unknown[]) => console.error(PREFIX, chalk.red("✖"), ...args),
  debug: (...args: unknown[]) => {
    if (!quiet && process.env.DEBUG)
      console.log(PREFIX, chalk.gray("🐛"), ...args);
  },
  raw: (...args: unknown[]) => {
    if (!quiet) console.log(...args);
  },
  section: (title: string) => {
    if (quiet) return;
    console.log("");
    console.log(chalk.bold.cyan(` ┌─ ${title}`));
    console.log(chalk.cyan(" └" + "─".repeat(Math.max(0, 50 - title.length))));
  },
};
