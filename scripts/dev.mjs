import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextCli = path.join(root, "node_modules/next/dist/bin/next");
const args = process.argv.slice(2);
const prefix = process.env.PREFIX;
const termux =
  process.platform === "android" &&
  typeof prefix === "string" &&
  prefix.includes("/com.termux/files/usr");
const chrootCommand = prefix && path.join(prefix, "bin/termux-chroot");

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

let command;
let commandArgs;
let cwd = root;

if (termux && chrootCommand && fs.existsSync(chrootCommand)) {
  const home = process.env.HOME;
  const relative = home ? path.relative(home, root) : "..";
  if (!home || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    console.error("KromaLab: el proyecto debe estar dentro de $HOME en Termux.");
    process.exit(1);
  }

  const chrootRoot = path.posix.join(
    "/home",
    ...relative.split(path.sep).filter(Boolean)
  );
  const chrootNext = path.posix.join(chrootRoot, "node_modules/next/dist/bin/next");
  const nextArgs = ["dev", "--webpack", ...args].map(shellQuote).join(" ");
  command = chrootCommand;
  commandArgs = [
    `cd ${shellQuote(chrootRoot)} && /usr/bin/node ${shellQuote(chrootNext)} ${nextArgs}`,
  ];
  // Proot presents the project under /home, whose ancestors it can inspect;
  // Next/Watchpack never need to watch Android's protected /data/data parents.
  cwd = home;
} else {
  command = process.execPath;
  commandArgs = [nextCli, "dev", "--webpack", ...args];
}

const child = spawn(command, commandArgs, { cwd, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(`No se pudo iniciar Next.js: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
