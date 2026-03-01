# 3D SmartHome Converter (Watch Mode)

Fristående converter-program för SketchUp-exporter (ZIP med OBJ/MTL/texturer).
Lägg `*.zip` i `inbox/` → få optimerade GLB-filer i `outbox/`.

## Mappar
Programmet skapar automatiskt:
- inbox/   (lägg *.zip här)
- outbox/  (resultat hamnar här)
- done/    (färdiga zip flyttas hit)
- failed/  (misslyckade zip flyttas hit)
- logs/    (loggar)
- tmp/     (temporärt)

## Output (per ZIP)
outbox/<namn>/
- <namn>.tablet.glb   (1024px)
- <namn>.balanced.glb (1536px)
- <namn>.ultra.glb    (2048px)
- metadata.json

## Blender HQ fallback (auto)
Programmet kör först "lite" (obj2gltf). Om analysen visar att resultatet verkar fel
(t.ex. 0 textures/material eller misstänkt liten fil), försöker den automatiskt köra Blender headless som fallback —
men bara om Blender finns installerat i PATH.

## Användning
Starta programmet (watch-mode default). Den processar även zip som redan finns i inbox.

### Windows
Ladda ner `3d-smarthome-converter-win.exe` från Releases och kör den.

### Linux
`chmod +x 3d-smarthome-converter-linux`
`./3d-smarthome-converter-linux`

### macOS
`chmod +x 3d-smarthome-converter-macos-x64` (Intel)
`chmod +x 3d-smarthome-converter-macos-arm64` (Apple Silicon)
Kör sedan filen.

## Bygga releases (för repo-owner)
1) Commit + push
2) Tagga:
   - git tag v0.1.0
   - git push --tags
GitHub Actions bygger och publicerar binärer i Releases.
