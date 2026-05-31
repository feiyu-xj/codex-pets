# Codex Pet Format

Codex desktop pets use one fixed spritesheet atlas.

## Atlas

- Format: PNG or WebP
- Size: `1536x1872`
- Grid: `8` columns x `9` rows
- Cell: `192x208`
- Background: transparent
- Unused cells: fully transparent

## Rows

| Row | State | Used columns |
| --- | --- | ---: |
| 0 | idle | 0-5 |
| 1 | running-right | 0-7 |
| 2 | running-left | 0-7 |
| 3 | waving / hover greeting | 0-3 |
| 4 | jumping | 0-4 |
| 5 | failed / sad / sleeping | 0-7 |
| 6 | waiting | 0-5 |
| 7 | running / working | 0-5 |
| 8 | review / thinking | 0-5 |

## Package

Place files under `${CODEX_HOME:-$HOME/.codex}/pets/<pet-id>/`:

```text
pet.json
spritesheet.webp
```

`pet.json`:

```json
{
  "id": "pet-id",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

For petscodex upload, create a zip whose root contains only `pet.json` and `spritesheet.webp`.
