import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const cache = new Map();
function loadTs(rel) {
  const file = path.resolve(root, rel.endsWith(".ts") ? rel : `${rel}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true }, fileName: file }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localRequire = (id) => {
    if (!id.startsWith(".")) return require(id);
    const resolved = path.resolve(path.dirname(file), id);
    if (resolved.endsWith(".json") && fs.existsSync(resolved)) return JSON.parse(fs.readFileSync(resolved, "utf8"));
    for (const candidate of [resolved, `${resolved}.ts`, path.join(resolved, "index.ts")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return loadTs(path.relative(root, candidate));
    }
    throw new Error(`Cannot resolve ${id} from ${file}`);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, file, path.dirname(file));
  return mod.exports;
}

const { pascalV2Catalog, compilePascalV2Floorplan, validatePascalV2Spec } = loadTs("lib/floorplans/pascal-v2/index.ts");
const { assertPascalSceneIntegrity } = loadTs("lib/pascal/scene-integrity.ts");
const issues = [];
for (const spec of pascalV2Catalog) {
  const validation = validatePascalV2Spec(spec);
  if (!validation.valid) issues.push(`${spec.id}: ${validation.issues.join("；")}`);
  try {
    const scene = compilePascalV2Floorplan(spec);
    const integrity = assertPascalSceneIntegrity(scene);
    if (!integrity.valid) issues.push(`${spec.id}: Pascal 场景 ${integrity.issues.join("；")}`);
    if (scene.nodes.building_house?.metadata?.floorplanVersion) issues.push(`${spec.id}: compiler unexpectedly set viewer version`);
  } catch (error) {
    issues.push(`${spec.id}: 编译失败：${error.message}`);
  }
}
if (pascalV2Catalog.length !== 24) issues.push(`V2 户型数量为 ${pascalV2Catalog.length}，应为 24`);
if (issues.length) {
  console.error(`Pascal V2 validation failed (${issues.length} issues):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`Pascal V2 validation passed: ${pascalV2Catalog.length}/24 specs compiled through Pascal.`);
