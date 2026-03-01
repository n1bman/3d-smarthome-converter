import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import obj2gltf from "obj2gltf";

import { extractZip, findLargestObj } from "./zip.js";
import { ensureDir } from "./paths.js";
import { PROFILES } from "./profiles.js";
import { analyzeGlb, shouldFallbackToBlender, optimizeToProfile } from "./optimize.js";

function blenderAvailable() {
  try {
    execFileSync("blender", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// När vi kör pkg: python-scriptet följer med som asset i "src/blender_convert.py".
// Vi kopierar ut det till en riktig fil i tmp så Blender kan köra det.
function materializeBlenderScript(tmpDir) {
  const srcPath = path.join(process.cwd(), "src", "blender_convert.py");
  const fallbackPath = path.join(path.dirname(process.execPath), "src", "blender_convert.py");

  let scriptContent = null;
  if (fs.existsSync(srcPath)) scriptContent = fs.readFileSync(srcPath);
  else if (fs.existsSync(fallbackPath)) scriptContent = fs.readFileSync(fallbackPath);
  else {
    // pkg kan också lägga assets i snapshot; i praktiken brukar någon av ovan funka.
    throw new Error("Could not locate blender_convert.py (asset).");
  }

  const outPath = path.join(tmpDir, "blender_convert.py");
  fs.writeFileSync(outPath, scriptContent);
  return outPath;
}

async function convertLite(objPath, rawGlbPath) {
  const glb = await obj2gltf(objPath, { binary: true, embed: true });
  fs.writeFileSync(rawGlbPath, Buffer.from(glb));
}

function convertBlender(objPath, rawGlbPath, tmpDir) {
  const scriptPath = materializeBlenderScript(tmpDir);
  execFileSync(
    "blender",
    ["-b", "--noaudio", "--python", scriptPath, "--", "--in", objPath, "--out", rawGlbPath],
    { stdio: "inherit" }
  );
}

export async function convertZip(zipPath, outboxDir, logFn = console.log) {
  const baseName = path.basename(zipPath).replace(/\.zip$/i, "");
  const jobOutDir = path.join(outboxDir, baseName);
  ensureDir(jobOutDir);

  // temp workspace
  const tmpBase = path.join(process.cwd(), "tmp");
  ensureDir(tmpBase);
  const workDir = fs.mkdtempSync(path.join(tmpBase, `job-${baseName}-`));
  const inDir = path.join(workDir, "in");
  const rawGlbPath = path.join(workDir, `${baseName}.raw.glb`);
  ensureDir(inDir);

  // unzip
  await extractZip(zipPath, inDir);

  const objPath = findLargestObj(inDir);
  if (!objPath) {
    throw new Error(`No .obj found in zip: ${zipPath}`);
  }

  // 1) lite -> analyze -> optional blender
  let engineUsed = "lite";
  await convertLite(objPath, rawGlbPath);

  let analysis = await analyzeGlb(rawGlbPath);
  logFn(`[${baseName}] lite: meshes=${analysis.meshes} mats=${analysis.materials} tex=${analysis.textures} size=${analysis.size}`);

  if (shouldFallbackToBlender(analysis)) {
    if (blenderAvailable()) {
      logFn(`[${baseName}] lite looks weak -> Blender fallback...`);
      convertBlender(objPath, rawGlbPath, workDir);
      engineUsed = "blender";

      analysis = await analyzeGlb(rawGlbPath);
      logFn(`[${baseName}] blender: meshes=${analysis.meshes} mats=${analysis.materials} tex=${analysis.textures} size=${analysis.size}`);
    } else {
      logFn(`[${baseName}] Blender not found in PATH -> staying on lite (install Blender for HQ fallback).`);
    }
  }

  // 2) optimize profiles
  const results = {};
  for (const [profileName, cfg] of Object.entries(PROFILES)) {
    const outGlbPath = path.join(jobOutDir, `${baseName}.${profileName}.glb`);
    const opt = await optimizeToProfile(rawGlbPath, outGlbPath, cfg.maxTexture);
    results[profileName] = opt;
    logFn(`[${baseName}] wrote ${path.basename(outGlbPath)} (${Math.round(opt.sizeBytes / 1024)} KB)`);
  }

  // metadata
  const metadata = {
    name: baseName,
    inputZip: zipPath,
    engineUsed,
    analysis,
    profiles: results,
    outputs: {
      tablet: `${baseName}.tablet.glb`,
      balanced: `${baseName}.balanced.glb`,
      ultra: `${baseName}.ultra.glb`
    }
  };

  fs.writeFileSync(path.join(jobOutDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  // cleanup workspace (men lämna tmp/ om du vill felsöka — vi rensar aggressivt)
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}

  return { baseName, jobOutDir, metadata };
}
