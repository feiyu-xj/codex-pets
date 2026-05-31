# Codex Pets Skill

`codex-pets` helps Codex create, refine, validate, and optionally package custom Codex desktop pet spritesheets.

It is designed for character-inspired chibi pets, mascot pets, and other small animated desktop companions that need to match the Codex pet atlas format.

## What It Does

- Generates production prompts for separated multi-pose source sheets.
- Converts source art into the Codex `1536x1872` / `8x9` pet atlas.
- Supports transparent, green-screen, magenta-screen, checkerboard, and border-connected background cleanup.
- Preserves white/light subjects on chroma backgrounds while still removing checkerboard-style white residue when needed.
- Uses adaptive source-row clustering so generated sheets with slightly different vertical spacing still map correctly.
- Provides `--clarity crisp` for cleaner downscaling and `--clarity pixel` for chunkier pixel-art preservation.
- Emits build diagnostics for source rows, component counts, cell coverage, edge touching, and warnings.
- Creates upload-ready zip packages containing exactly `pet.json` and `spritesheet.webp`, with `pet.json` written as strict UTF-8 JSON without BOM.

## Install

Install the skill from this repository path:

```powershell
python C:\Users\123\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py --repo feiyu-xj/codex-pets --path skills/codex-pets
```

Restart Codex after installing.

## Typical Workflow

1. Generate a multi-pose source sheet on a flat chroma background.
2. Build the Codex pet atlas:

```powershell
& 'C:\Program Files\nodejs\node.exe' .agents\skills\codex-pets\scripts\build_codex_pet_atlas.js `
  --source C:\path\to\source.png `
  --out-dir C:\path\to\pet-output `
  --pet-id my-pet `
  --display-name "My Pet" `
  --description "A custom Codex desktop pet." `
  --background auto `
  --clarity crisp
```

3. Inspect the JSON diagnostics and preview `spritesheet.png`.
4. Install the output under `$HOME\.codex\pets\<pet-id>`.
5. Only after confirmation, package for upload:

```powershell
powershell -ExecutionPolicy Bypass -File .agents\skills\codex-pets\scripts\package_pet_zip.ps1 `
  -PetDir C:\Users\123\.codex\pets\my-pet `
  -OutZip C:\path\to\my-pet-upload.zip
```

## Validation Coverage

The skill has been iteratively tested against difficult cases including:

- white mascots and white clothing on chroma backgrounds
- teal/green hair requiring magenta background removal
- long hair and back-view rows
- wide hats, weapons, staffs, and handheld props
- small mascots with short limbs
- smooth generated sticker art that benefits from crisper downscaling

The current build script reports diagnostics so future generations can catch source-layout or cropping problems earlier.
