import fs from "fs";
import { NodeIO } from "@gltf-transform/core";
import { prune, dedup, weld, instance, textureResize } from "@gltf-transform/functions";

export async function analyzeGlb(glbPath) {
  const io = new NodeIO();
  const doc = await io.read(glbPath);

  const root = doc.getRoot();
  const meshes = root.listMeshes().length;
  const materials = root.listMaterials().length;
  const textures = root.listTextures().length;
  const size = fs.statSync(glbPath).size;

  return { meshes, materials, textures, size };
}

export function shouldFallbackToBlender(a) {
  if (a.meshes === 0) return true;
  if (a.textures === 0 && a.materials === 0) return true;
  if (a.size < 50_000) return true; // 50KB: misstänkt litet
  return false;
}

export async function optimizeToProfile(rawGlbPath, outGlbPath, maxTexture) {
  const io = new NodeIO();
  const doc = await io.read(rawGlbPath);

  await doc.transform(
    dedup(),
    prune(),
    weld(),
    instance(),
    textureResize({ size: [maxTexture, maxTexture] })
  );

  await io.write(outGlbPath, doc);

  const root = doc.getRoot();
  return {
    meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    sizeBytes: fs.statSync(outGlbPath).size,
    maxTexture
  };
}
