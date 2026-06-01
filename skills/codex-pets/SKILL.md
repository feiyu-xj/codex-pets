---
name: codex-pets
description: Create and refine Codex desktop pet spritesheets. Use when the user wants a custom Codex pet, a character-inspired pet, standard 8x9 Codex pet atlas generation, transparent-background cleanup, white-edge residue removal, smoother animation rows, quick fine-tuning of an existing pet spritesheet, or an optional upload-ready pet zip after user confirmation.
---

# Codex Pets

## Workflow

Use this skill for creating and refining Codex desktop pet spritesheets. Keep custom pets compatible with the Codex app contract:

- Atlas size: `1536x1872`
- Grid: `8` columns x `9` rows
- Cell: `192x208`
- Background: transparent
- Main output: `spritesheet.webp`
- Optional package: upload-ready zip containing `pet.json` and `spritesheet.webp`

When creating character-inspired pets, make an original chibi/cartoon interpretation instead of copying official art exactly. Preserve recognizable broad traits only when the user asks for them.

## Standard Process

1. Generate a multi-pose source sheet with `$imagegen`.
   - Use the prompt pattern in `references/source-generation.md`.
   - Prefer a flat pure chroma background, usually `#00ff00`, for light-haired or white-clothed characters. Avoid green only when the character itself is green; then use magenta or request true transparency and process manually.
   - Ask for separated full-body poses with generous spacing.
   - Include idle, walking right, walking left, waving/hover greeting, jumping, failed/sleeping, waiting, working, and review/thinking poses.
   - Vary poses according to the character: mages can cast, read, hold crystals, meditate, sleep, and review; warriors can guard, ready weapons, train, rest, and inspect; animals and non-human mascots can sit, trot, hop, paw-wave, curl up, sniff, perk ears, listen, and use tail/ear/antenna motion instead of human gestures.
   - For known character-inspired pets, make rows 2, 5, 6, and 8 reflect the character's story, combat style, habits, props, and personality instead of using generic actions.
   - Request no text, no watermark, no scenery, no visible grid, no shadows, and no pose overlap.

2. Repair and convert the source sheet.
   - Use `scripts/build_codex_pet_atlas.js` when the generated sheet has many separated poses similar to the Rin Chibi workflow.
   - The script analyzes the source and chooses a background strategy automatically: `alpha`, `green`, `magenta`, `checker`, or border-connected cleanup.
   - The script extracts pose components, clusters source poses into rows by actual vertical position, fills missing row frames by reusing nearby suitable poses, arranges them into the Codex 8x9 atlas, clears unused cells, normalizes transparent RGB values, and writes `spritesheet.webp`.
   - Use `--background green`, `--background magenta`, `--background checker`, or `--background alpha` only when auto mode picks the wrong strategy.
   - Use `--clarity crisp` for cleaner downscaling on smooth generated sticker art; use `--clarity pixel` when preserving chunky pixel-art edges matters more.
   - White/light subject pixels are preserved on chroma backgrounds; broad light-pixel cleanup is only for checker/border cleanup so white mascots and white clothes are not erased.

3. Install the pet.
   - Put `pet.json` and `spritesheet.webp` under `${CODEX_HOME:-$HOME/.codex}/pets/<pet-id>/`.
   - Set `[desktop].selected-avatar-id = "custom:<pet-id>"` in `config.toml` only when the user wants the pet enabled.

4. Validate before finishing.
   - Confirm `spritesheet.webp` is `1536x1872`.
   - Confirm unused cells are fully transparent.
   - Read the build JSON diagnostics: `sourceComponentCount`, `sourceRowCount`, `sourceRows`, cell coverage, and `warnings`.
   - Treat diagnostics warnings as a cue to inspect or regenerate the source, especially when source rows are missing, cells touch frame edges, or a used cell has very low coverage.
   - Visually inspect the atlas for cropped characters, checkerboard residue, white edge residue, and rows that do not match the intended state.
   - If a preview shows large colored blocks but validation reports transparent unused cells, inspect `spritesheet.png`; hidden RGB on transparent pixels may be normalized already and not visible in the app.

5. Optionally package for upload.
   - Only do this after the user explicitly asks for an upload zip or confirms they want one.
   - Use `scripts/package_pet_zip.ps1`.
   - The zip root must contain exactly `pet.json` and `spritesheet.webp`.
   - The packager rewrites `pet.json` as UTF-8 without BOM so strict upload validators do not reject it.
   - Keep the zip under `5MB`.

## Row Contract

Read `references/pet-format.md` when exact row counts or state meanings are needed.

## Useful Command

Build an atlas from a generated source sheet:

```powershell
& 'C:\Program Files\nodejs\node.exe' .agents\skills\codex-pets\scripts\build_codex_pet_atlas.js `
  --source C:\path\to\generated.png `
  --out-dir C:\path\to\pet-output `
  --pet-id rin-chibi `
  --display-name "Rin Chibi" `
  --description "An original chibi mage-girl Codex pet." `
  --background auto `
  --clarity crisp
```

After user confirmation, create an upload zip:

```powershell
powershell -ExecutionPolicy Bypass -File .agents\skills\codex-pets\scripts\package_pet_zip.ps1 `
  -PetDir C:\Users\123\.codex\pets\rin-chibi `
  -OutZip C:\Users\123\Documents\Codex\outputs\rin-chibi-upload.zip
```

## Notes

- Do not store credentials or petscodex passwords in this skill.
- Prefer editing or repairing the current pet files instead of regenerating everything when the user likes the current version.
- If a generated PNG contains fake checkerboard transparency, treat it as opaque source art and remove the background before composing the atlas.
- Treat upload zip creation as a final optional action, not part of the default spritesheet generation flow.
- If the first source image creates difficult background cleanup, regenerate once with a pure chroma background before hand-tuning the script. This is usually faster and cleaner.
