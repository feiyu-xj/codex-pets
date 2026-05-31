# Codex Pets Skill

`codex-pets` helps create and refine Codex desktop pet spritesheets.

It supports:

- generating a multi-pose source sheet prompt
- converting source art into the Codex `1536x1872` / `8x9` pet atlas
- transparent background cleanup for alpha, green-screen, and checkerboard sources
- edge cleanup and missing-frame fallback
- optional upload-ready zip packaging after confirmation

## Install

Install the skill from this repository path:

```powershell
python C:\Users\123\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py --repo feiyu-xj/codex-pets --path skills/codex-pets
```

Restart Codex after installing.
