import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

function patchFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  for (const [target, replacement] of transforms) {
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`[patch-embla] Successfully patched ${filePath}`);
  }
}

// 1. Patch embla-carousel
const emblaFiles = [
  path.join(projectRoot, "node_modules/embla-carousel/esm/embla-carousel.esm.js"),
  path.join(projectRoot, "node_modules/embla-carousel/cjs/embla-carousel.cjs.js"),
];

const emblaTransforms = [
  [
    "(isMouseEvent(evt, ownerWindow) ? evt : evt.touches[0])[coord]",
    "(isMouseEvent(evt, ownerWindow) ? evt : (evt?.touches?.[0] || evt?.changedTouches?.[0] || evt))?.[coord] || 0",
  ],
  [
    "function isMouseEvent(evt, ownerWindow) {\n  return typeof ownerWindow.MouseEvent !== 'undefined' && evt instanceof ownerWindow.MouseEvent;\n}",
    "function isMouseEvent(evt, ownerWindow) {\n  return (typeof ownerWindow.MouseEvent !== 'undefined' && evt instanceof ownerWindow.MouseEvent) || (Boolean(evt) && (String(evt.type).startsWith('mouse') || String(evt.type).startsWith('pointer') || ('clientX' in evt && !('touches' in evt))));\n}",
  ],
];

emblaFiles.forEach((file) => patchFile(file, emblaTransforms));

// 2. Patch embla-carousel-autoplay
const autoplayFiles = [
  path.join(projectRoot, "node_modules/embla-carousel-autoplay/esm/embla-carousel-autoplay.esm.js"),
  path.join(projectRoot, "node_modules/embla-carousel-autoplay/cjs/embla-carousel-autoplay.cjs.js"),
];

const autoplayTransforms = [
  [
    "delay[emblaApi.selectedScrollSnap()]",
    "((Array.isArray(delay) && typeof emblaApi?.selectedScrollSnap === 'function' && delay[emblaApi.selectedScrollSnap()]) || 4000)",
  ],
];

autoplayFiles.forEach((file) => patchFile(file, autoplayTransforms));

// 3. Clear Vite cache to force re-bundling
const viteCache = path.join(projectRoot, "node_modules/.vite");
if (fs.existsSync(viteCache)) {
  try {
    fs.rmSync(viteCache, { recursive: true, force: true });
    console.log("[patch-embla] Cleared Vite cache directory.");
  } catch (err) {
    console.warn("[patch-embla] Could not clear Vite cache:", err.message);
  }
}

console.log("[patch-embla] Done.");
