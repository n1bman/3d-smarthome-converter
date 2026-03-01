import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import { ensureDir } from "./paths.js";

export async function extractZip(zipPath, destDir) {
  ensureDir(destDir);
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: destDir }))
    .promise();
}

export function findLargestObj(rootDir) {
  let best = null;
  let bestSize = -1;

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".obj")) {
        const s = fs.statSync(p).size;
        if (s > bestSize) { best = p; bestSize = s; }
      }
    }
  }
  walk(rootDir);
  return best;
}
