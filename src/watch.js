import fs from "fs";
import path from "path";
import chokidar from "chokidar";

import { convertZip } from "./convert.js";

function isZip(p) {
  return p.toLowerCase().endsWith(".zip");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Vänta tills filen "stabiliserats" (inte växer längre) för att undvika att vi plockar den mitt i kopiering.
async function waitForStableFile(filePath, attempts = 25, delayMs = 400) {
  let last = -1;
  for (let i = 0; i < attempts; i++) {
    const s = fs.statSync(filePath).size;
    if (s === last && s > 0) return;
    last = s;
    await sleep(delayMs);
  }
}

export async function startWatch(paths, log) {
  const processing = new Set();

  async function handleZip(zipPath) {
    if (!isZip(zipPath)) return;
    if (processing.has(zipPath)) return;
    processing.add(zipPath);

    const fileName = path.basename(zipPath);

    try {
      log(`\n==> Found: ${fileName}`);
      await waitForStableFile(zipPath);

      await convertZip(zipPath, paths.outbox, log);

      const dest = path.join(paths.done, fileName);
      fs.renameSync(zipPath, dest);
      log(`==> DONE: moved to done/${fileName}`);
    } catch (e) {
      log(`!! FAILED: ${fileName}\n${e?.stack || e}`);

      try {
        const dest = path.join(paths.failed, fileName);
        fs.renameSync(zipPath, dest);
        log(`==> moved to failed/${fileName}`);
      } catch {}
    } finally {
      processing.delete(zipPath);
    }
  }

  // Process existing zips first
  const existing = fs.readdirSync(paths.inbox).map(f => path.join(paths.inbox, f)).filter(isZip);
  for (const z of existing) await handleZip(z);

  // Watch for new ones
  const watcher = chokidar.watch(paths.inbox, {
    ignoreInitial: true,
    awaitWriteFinish: false
  });

  watcher.on("add", handleZip);

  log(`Watching inbox: ${paths.inbox}`);
  log(`Drop *.zip (SketchUp OBJ/MTL/textures) into inbox and wait for outbox results.`);
}
