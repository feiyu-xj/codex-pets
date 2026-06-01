# Source Generation Prompt Pattern

Use this reference when generating the source sheet before atlas conversion.

## Prompt Template

```text
Create one complete desktop-pet sprite source sheet, about 1136 x 1385 pixels, with a single flat pure chroma <background-color> background across the whole canvas. Do not use checkerboard transparency, gradients, shadows, scenery, labels, text, watermark, borders, or grid lines.

Subject: an original chibi anime <character archetype> inspired by <source>, not a direct copy of official art. Key traits: <hair>, <eyes>, <outfit>, <signature prop or motif>. Cute pixel-art / sticker sprite style, readable at small size, consistent character design across every pose.

Arrange many separated full-body poses with generous spacing:
Row 1: front idle, blink, smile, cheerful, wave, calm, confident.
Row 2: character-specific standing action poses: <magic/weapon/tool/prop/action>.
Row 3: side walking frames facing right.
Row 4: side walking frames facing left.
Row 5: sitting, waiting, holding a character-appropriate prop, surprised, happy jump, kneeling.
Row 6: sleeping/failed/resting poses.
Row 7: back-view poses.
Row 8: review/thinking/working poses using character-appropriate props.

Important: every pose must be a complete isolated character, not cropped, not overlapping neighboring poses. Keep effects attached to the character. Avoid detached sparkles, motion streaks, dust, floor shadows, and loose icons.
```

## Background Choice

- Use `#00ff00` for most characters, especially white hair, white clothes, pale colors, blue, red, purple, black, and brown designs.
- Avoid green background when the character has green hair, green clothes, leaves, grass, slime, or other important green areas. Use magenta and adapt processing manually, or request true transparency if available.
- Avoid checkerboard backgrounds for light-haired characters; fake transparency is harder to separate from white/silver hair.

## Pose Diversity

Match the action row and working/review rows to the character:

- Mage: cast, hold crystal, read grimoire, meditate, summon small attached magic effect.
- Warrior: guard stance, weapon ready, salute, inspect weapon, rest.
- Student/scholar: read, write, laptop/book, think, ask for help.
- Animal/mascot: sit, trot, paw-wave, curl up, sniff, perk ears, sleep.
- Musician/artist: hold instrument/tool, sketch, listen, practice, bow.
- Ninja/assassin: hand signs, crouched landing, sprint start, scroll reading, tool-ready pose, exhausted training rest.
- Swordsman: draw stance, guard, blade inspection, polishing, breathing/focus pose, respectful kneel.
- Magical girl: wand raise, transformation twirl, heroic pointing, charm pose, sparkle greeting, tired-after-magic rest.
- Martial artist: guard stance, power-up, palm blast, training stretch, hungry snack pose, exhausted training sleep.
- Commander/tactician: arms crossed, tactical pointing, report writing, gear inspection, stern thinking, tea/cleaning habit.

Do not force every character into the same magic poses.

For character-inspired pets, tie at least three rows to the character's story/personality:

- Row 2 should contain signature action language, not generic standing poses.
- Row 5 should include a personality-specific sitting/waiting prop or reaction.
- Row 6 should reflect how the character would rest or fail.
- Row 8 should use story-relevant work/review props such as maps, mission notes, weapons, tools, books, food, or devices.

Keep signature props small and attached to the character silhouette so the atlas extractor does not treat them as stray components.
