const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const CELL_W = 192;
const CELL_H = 208;
const COLS = 8;
const ROWS = 9;
const ATLAS_W = CELL_W * COLS;
const ATLAS_H = CELL_H * ROWS;
const ROW_COUNTS = [6, 8, 8, 4, 5, 8, 6, 6, 6];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function rect(x, y, w, h) {
  return {
    left: Math.round(x),
    top: Math.round(y),
    width: Math.round(w),
    height: Math.round(h),
  };
}

function isLightCheckerPixel(r, g, b, a) {
  if (a < 8) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  return avg > 230 && max - min < 18;
}

function isGreenBackgroundPixel(r, g, b, a) {
  if (a < 8) return true;
  return g > 90 && g > r * 1.35 && g > b * 1.25;
}

function isMagentaBackgroundPixel(r, g, b, a) {
  if (a < 8) return true;
  return r > 120 && b > 100 && r > g * 1.45 && b > g * 1.35;
}

function isGreenResiduePixel(r, g, b, a) {
  if (a < 8) return true;
  return g > 45 && g > r * 1.15 && g > b * 1.08 && (g - r > 8 || g - b > 8);
}

function isMagentaResiduePixel(r, g, b, a) {
  if (a < 8) return true;
  return r > 70 && b > 60 && r > g * 1.18 && b > g * 1.12 && (r - g > 10 || b - g > 10);
}

function sampleBackgroundMode(data, info, requestedMode) {
  if (requestedMode && requestedMode !== "auto") return requestedMode;

  const w = info.width;
  const h = info.height;
  const total = w * h;
  let alphaPixels = 0;
  let greenPixels = 0;
  let magentaPixels = 0;
  let lightPixels = 0;
  let borderGreen = 0;
  let borderMagenta = 0;
  let borderLight = 0;
  let borderCount = 0;

  for (let p = 0; p < total; p++) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 245) alphaPixels++;
    if (isGreenBackgroundPixel(r, g, b, a)) greenPixels++;
    if (isMagentaBackgroundPixel(r, g, b, a)) magentaPixels++;
    if (isLightCheckerPixel(r, g, b, a)) lightPixels++;
  }

  const borderWidth = Math.max(2, Math.round(Math.min(w, h) * 0.025));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= borderWidth && x < w - borderWidth && y >= borderWidth && y < h - borderWidth) continue;
      const i = (y * w + x) * 4;
      borderCount++;
      if (isGreenBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) borderGreen++;
      if (isMagentaBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) borderMagenta++;
      if (isLightCheckerPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) borderLight++;
    }
  }

  if (alphaPixels / total > 0.2) return "alpha";
  if (borderGreen / borderCount > 0.45 || greenPixels / total > 0.2) return "green";
  if (borderMagenta / borderCount > 0.45 || magentaPixels / total > 0.2) return "magenta";
  if (borderLight / borderCount > 0.45 || lightPixels / total > 0.25) return "checker";
  return "border";
}

function isBackgroundPixelForMode(r, g, b, a, mode) {
  if (a < 8) return true;
  if (mode === "green") return isGreenBackgroundPixel(r, g, b, a);
  if (mode === "magenta") return isMagentaBackgroundPixel(r, g, b, a);
  if (mode === "checker") return isLightCheckerPixel(r, g, b, a);
  return isLightCheckerPixel(r, g, b, a) || isGreenBackgroundPixel(r, g, b, a) || isMagentaBackgroundPixel(r, g, b, a);
}

async function removeConnectedBackground(source, outFile, requestedMode = "auto") {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const mode = sampleBackgroundMode(data, info, requestedMode);

  if (mode === "alpha") {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
    await sharp(data, { raw: info }).png().toFile(outFile);
    return { width: w, height: h, backgroundMode: mode };
  }

  const seen = new Uint8Array(w * h);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * 4;
    if (!isBackgroundPixelForMode(data[i], data[i + 1], data[i + 2], data[i + 3], mode)) return;
    seen[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }
  for (let q = 0; q < queue.length; q++) {
    const p = queue[q];
    const x = p % w;
    const y = Math.floor(p / w);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const globallyRemovableChroma =
      (mode === "green" && isGreenBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) ||
      (mode === "magenta" && isMagentaBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3]));
    if (!seen[p] && !globallyRemovableChroma) continue;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 0;
  }

  await sharp(data, { raw: info }).png().toFile(outFile);
  return { width: w, height: h, backgroundMode: mode };
}

async function findComponents(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const seen = new Uint8Array(w * h);
  const components = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const alpha = (idx) => data[idx * 4 + 3];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (seen[idx] || alpha(idx) < 20) continue;
      const stack = [idx];
      seen[idx] = 1;
      let minx = x;
      let maxx = x;
      let miny = y;
      let maxy = y;
      let count = 0;

      while (stack.length) {
        const p = stack.pop();
        count++;
        const px = p % w;
        const py = Math.floor(p / w);
        if (px < minx) minx = px;
        if (px > maxx) maxx = px;
        if (py < miny) miny = py;
        if (py > maxy) maxy = py;

        for (const [dx, dy] of dirs) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (!seen[ni] && alpha(ni) >= 20) {
            seen[ni] = 1;
            stack.push(ni);
          }
        }
      }

      if (count > 1000) {
        components.push(rect(minx, miny, maxx - minx + 1, maxy - miny + 1));
      }
    }
  }

  return components.sort((a, b) => a.top - b.top || a.left - b.left);
}

function byX(items) {
  return items.slice().sort((a, b) => a.left - b.left);
}

function componentCenterY(component) {
  return component.top + component.height / 2;
}

function groupComponentsBySourceRows(components) {
  const usableComponents = components.filter((c) => c.width >= 24 && c.height >= 24);
  const sorted = usableComponents
    .slice()
    .sort((a, b) => componentCenterY(a) - componentCenterY(b) || a.left - b.left);
  const groups = [];
  const rowGap = 80;

  for (const component of sorted) {
    const centerY = componentCenterY(component);
    const previous = groups[groups.length - 1];
    if (!previous || centerY - previous.centerY > rowGap) {
      groups.push({ centerY, items: [component] });
    } else {
      previous.items.push(component);
      previous.centerY =
        previous.items.reduce((sum, item) => sum + componentCenterY(item), 0) / previous.items.length;
    }
  }

  return groups.map((group) => byX(group.items));
}

function pickRows(components) {
  const usableComponents = components.filter((c) => c.width >= 24 && c.height >= 24);
  const sourceRows = groupComponentsBySourceRows(usableComponents);
  const band = (minY, maxY) => byX(usableComponents.filter((c) => c.top >= minY && c.top < maxY));
  const top = sourceRows[0] || band(0, 240);
  const action = sourceRows[1] || band(240, 450);
  const walkRight = sourceRows[2] || band(450, 625);
  const walkLeft = sourceRows[3] || band(625, 790);
  const sit = sourceRows[4] || band(790, 985);
  const sleep = sourceRows[5] || band(985, 1145);
  const back = sourceRows[6] || sit;
  const work = sourceRows[7] || action;

  const frontFallback = [...top, ...sit, ...action];
  const sideFallback = [...walkRight, ...walkLeft, ...top];
  const sleepFallback = [...sleep, ...sit, ...top];
  const backFallback = [...back, ...top, ...sit];
  const workFallback = [...work, ...action, ...sit, ...top];

  const rows = [
    top.slice(0, 6),
    [...walkRight, walkRight[0]].slice(0, 8),
    [...walkLeft, walkLeft[0]].slice(0, 8),
    [top[0], top[4], top[5], top[4]],
    [sit[0], sit[1], sit[2], sit[3], sit[4]],
    [...sleep, sit[4], sleep[2], sleep[4]].slice(0, 8),
    back.slice(0, 6),
    work.slice(0, 6),
    [work[0], work[1], work[2], action[0], action[1], action[2]],
  ];

  return rows.map((row, rowIndex) => {
    const usable = row.filter(Boolean);
    const fallback =
      rowIndex === 1 || rowIndex === 2
        ? sideFallback
        : rowIndex === 5
          ? sleepFallback
          : rowIndex === 6
            ? backFallback
            : rowIndex === 7 || rowIndex === 8
              ? workFallback
              : frontFallback;
    for (const candidate of fallback) {
      if (usable.length >= ROW_COUNTS[rowIndex]) break;
      if (candidate) usable.push(candidate);
    }
    if (usable.length === 0) return usable;
    while (usable.length < ROW_COUNTS[rowIndex]) {
      usable.push(usable[usable.length - 1] || usable[0]);
    }
    return usable.slice(0, ROW_COUNTS[rowIndex]);
  });
}

function clampCrop(crop, meta) {
  const pad = 8;
  const left = Math.max(0, Math.min(meta.width - 1, crop.left - pad));
  const top = Math.max(0, Math.min(meta.height - 1, crop.top - pad));
  const right = Math.max(left + 1, Math.min(meta.width, crop.left + crop.width + pad));
  const bottom = Math.max(top + 1, Math.min(meta.height, crop.top + crop.height + pad));
  return rect(left, top, right - left, bottom - top);
}

async function cleanSpriteEdges(buffer, backgroundMode) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const originalAlpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) originalAlpha[i] = data[i * 4 + 3];
  const shouldRemoveLightResidue = backgroundMode === "checker" || backgroundMode === "border";

  const isOuterResidue = (idx) => {
    const i = idx * 4;
    if (data[i + 3] < 20) return true;
    if (isGreenResiduePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) return true;
    if (isMagentaResiduePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) return true;
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    return shouldRemoveLightResidue && max - min < 18 && avg > 238;
  };

  const seen = new Uint8Array(w * h);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (seen[p] || !isOuterResidue(p)) return;
    seen[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }
  for (let q = 0; q < queue.length; q++) {
    const p = queue[q];
    const x = p % w;
    const y = Math.floor(p / w);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let p = 0; p < w * h; p++) {
    if (seen[p] && originalAlpha[p] >= 20) {
      const i = p * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: info }).trim({ background: "#00000000" }).png().toBuffer();
}

async function extractSprite(source, crop, meta, mirror = false) {
  const safeCrop = clampCrop(crop, meta);
  const extracted = await sharp(source).extract(safeCrop).png().toBuffer();
  let img = sharp(extracted).trim({ background: "#00000000" });
  if (mirror) img = img.flop();
  return cleanSpriteEdges(await img.png().toBuffer(), meta.backgroundMode);
}

async function placeFrame(inputBuffer, row, col, offset = { x: 0, y: 0 }, clarity = "pixel") {
  const meta = await sharp(inputBuffer).metadata();
  const maxW = row === 5 ? 170 : 150;
  const maxH = row === 5 ? 104 : 158;
  const scale = Math.min(1, maxW / meta.width, maxH / meta.height);
  const width = Math.max(1, Math.round(meta.width * scale));
  const height = Math.max(1, Math.round(meta.height * scale));
  const kernel = clarity === "crisp" ? sharp.kernel.lanczos3 : sharp.kernel.nearest;
  let resizedImage = sharp(inputBuffer).resize(width, height, { fit: "contain", kernel });
  if (clarity === "crisp") {
    resizedImage = resizedImage.sharpen({ sigma: 0.6 });
  }
  const resized = await resizedImage.png().toBuffer();

  return {
    input: resized,
    left: col * CELL_W + Math.round((CELL_W - width) / 2) + (offset.x || 0),
    top: row * CELL_H + Math.round((CELL_H - height) / 2) + (row === 5 ? 20 : 0) + (offset.y || 0),
  };
}

async function validateAtlas(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let unusedNonTransparentCells = 0;
  let usedEmptyCells = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let alphaSum = 0;
      for (let y = r * CELL_H; y < (r + 1) * CELL_H; y++) {
        for (let x = c * CELL_W; x < (c + 1) * CELL_W; x++) {
          alphaSum += data[(y * info.width + x) * 4 + 3];
        }
      }
      if (c >= ROW_COUNTS[r] && alphaSum > 0) unusedNonTransparentCells++;
      if (c < ROW_COUNTS[r] && alphaSum === 0) usedEmptyCells++;
    }
  }

  return { width: info.width, height: info.height, unusedNonTransparentCells, usedEmptyCells };
}

async function normalizeTransparentPixels(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  await sharp(data, { raw: info }).png().toFile(file);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.source || !args["out-dir"]) {
    throw new Error("Usage: node build_codex_pet_atlas.js --source source.png --out-dir output-dir [--pet-id id --display-name name --description text]");
  }

  fs.mkdirSync(args["out-dir"], { recursive: true });
  const transparentSource = path.join(args["out-dir"], "transparent-source.png");
  const atlasPng = path.join(args["out-dir"], "spritesheet.png");
  const atlasWebp = path.join(args["out-dir"], "spritesheet.webp");

  const meta = await removeConnectedBackground(args.source, transparentSource, args.background || "auto");
  const components = await findComponents(transparentSource);
  const rowDefs = pickRows(components);
  const clarity = args.clarity === "crisp" ? "crisp" : "pixel";

  for (let r = 0; r < ROWS; r++) {
    if (!rowDefs[r] || rowDefs[r].length < ROW_COUNTS[r]) {
      throw new Error(`Not enough source poses for row ${r}; found ${rowDefs[r]?.length || 0}`);
    }
  }

  const blank = await sharp({
    create: {
      width: ATLAS_W,
      height: ATLAS_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const overlays = [];
  const rowOffsets = {
    3: [{ y: 2 }, { y: 0 }, { y: -4 }, { y: 0 }],
    4: [{ y: 10 }, { y: 4 }, { y: -10 }, { y: 4 }, { y: 10 }],
    6: [{ y: 2 }, { y: 0 }, { y: 1 }, { y: 0 }, { y: 1 }, { y: 2 }],
    8: [{ y: 1 }, { y: 0 }, { y: 1 }, { y: 0 }, { y: 1 }, { y: 0 }],
  };

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < ROW_COUNTS[row]; col++) {
      const sprite = await extractSprite(transparentSource, rowDefs[row][col], meta, false);
      overlays.push(await placeFrame(sprite, row, col, rowOffsets[row]?.[col], clarity));
    }
  }

  await sharp(blank).composite(overlays).png().toFile(atlasPng);
  await normalizeTransparentPixels(atlasPng);
  await sharp(atlasPng).webp({ lossless: true, quality: 100 }).toFile(atlasWebp);

  if (args["pet-id"]) {
    const petJson = {
      id: args["pet-id"],
      displayName: args["display-name"] || args["pet-id"],
      description: args.description || "A custom Codex desktop pet.",
      spritesheetPath: "spritesheet.webp",
    };
    fs.writeFileSync(path.join(args["out-dir"], "pet.json"), JSON.stringify(petJson, null, 2) + "\n");
  }

  console.log(JSON.stringify({ webp: atlasWebp, backgroundMode: meta.backgroundMode, validation: await validateAtlas(atlasWebp) }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
