import fs from "fs";
import path from "path";

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function defaultPaths(baseDir) {
  return {
    baseDir,
    inbox: path.join(baseDir, "inbox"),
    outbox: path.join(baseDir, "outbox"),
    done: path.join(baseDir, "done"),
    failed: path.join(baseDir, "failed"),
    logs: path.join(baseDir, "logs"),
    tmp: path.join(baseDir, "tmp")
  };
}

export function ensureAllDirs(p) {
  ensureDir(p.inbox);
  ensureDir(p.outbox);
  ensureDir(p.done);
  ensureDir(p.failed);
  ensureDir(p.logs);
  ensureDir(p.tmp);
}
