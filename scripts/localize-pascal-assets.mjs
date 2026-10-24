import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

// Fail the build if an SDK upgrade changes these integration points.
function replaceChecked(relativePath, before, after, expectedCount) {
  const path = join("node_modules", relativePath);
  const source = readFileSync(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== expectedCount) throw new Error(`${relativePath}: expected ${expectedCount} matches, found ${count}`);
  writeFileSync(path, source.split(before).join(after));
}

replaceChecked(
  "@pascal-app/viewer/dist/lib/asset-url.js",
  "    if (!url)\n        return null;",
  "    if (!url)\n        return null;\n    if (url.startsWith('/items/')) return url;\n    if (url.startsWith('https://editor.pascal.app/items/')) return url.slice('https://editor.pascal.app'.length);",
  2,
);
replaceChecked(
  "@pascal-app/nodes/dist/item/renderer.js",
  "https://www.gstatic.com/draco/versioned/decoders/1.5.5/",
  "/decoders/draco/",
  1,
);
replaceChecked(
  "@pascal-app/viewer/dist/lib/ktx2-loader.js",
  "https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/",
  "/decoders/basis/",
  1,
);
for (const [source, destination, files] of [
  ["draco/gltf", "draco", ["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"]],
  ["basis", "basis", ["basis_transcoder.js", "basis_transcoder.wasm"]],
]) {
  const directory = join("public/decoders", destination);
  mkdirSync(directory, { recursive: true });
  for (const file of files) copyFileSync(join("node_modules/three/examples/jsm/libs", source, file), join(directory, file));
}
console.log("Pascal furniture URLs and decoders use local static assets.");
