import fs from "fs";
import path from "path";

import { defaultPaths, ensureAllDirs } from "./paths.js";
import { startWatch } from "./watch.js";

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function createLogger(logDir) {
  const logFile = path.join(logDir, `run_${timestamp()}.log`);
  return (msg) => {
    const line = typeof msg === "string" ? msg : JSON.stringify(msg);
    console.log(line);
    try { fs.appendFileSync(logFile, line + "\n", "utf-8"); } catch {}
  };
}

async function main() {
  const baseDir = process.cwd(); // kör i aktuell folder
  const paths = defaultPaths(baseDir);
  ensureAllDirs(paths);

  const log = createLogger(paths.logs);

  log("3D SmartHome Converter");
  log(`Base dir: ${baseDir}`);
  log(`Inbox:    ${paths.inbox}`);
  log(`Outbox:   ${paths.outbox}`);
  log(`Done:     ${paths.done}`);
  log(`Failed:   ${paths.failed}`);
  log("");

  await startWatch(paths, log);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
