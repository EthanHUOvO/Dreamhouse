import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const file = path.resolve(process.cwd(), "lib/session.ts");
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  fileName: file,
}).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", output)(require, mod, mod.exports);
const session = mod.exports;
const assert = (value, message) => { if (!value) throw new Error(message); };

function createStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const localStorage = createStorage();
const sessionStorage = createStorage();
globalThis.window = { localStorage, sessionStorage };

const sessionA = session.startSession(true);
const sessionB = session.createSessionId();
assert(sessionA.startsWith("session-") && sessionB.startsWith("session-"), "Session IDs must use the session UUID format");
assert(sessionA !== sessionB, "Each public-terminal session must have a unique ID");
assert(session.getActiveSessionId() === sessionA, "The active session must be stored in sessionStorage");

const aDesignKey = session.sessionStorageKey(sessionA, "design");
const aBudgetKey = session.sessionStorageKey(sessionA, "budget:test");
const bDesignKey = session.sessionStorageKey(sessionB, "design");
localStorage.setItem(aDesignKey, "A-design");
localStorage.setItem(aBudgetKey, "A-budget");
localStorage.setItem(bDesignKey, "B-design");
sessionStorage.setItem(session.sessionStorageKey(sessionA, "temporary"), "A-temp");

session.clearSessionStorage(sessionA);
assert(localStorage.getItem(aDesignKey) === null && localStorage.getItem(aBudgetKey) === null, "Reset must clear all Session A local data");
assert(sessionStorage.getItem(session.sessionStorageKey(sessionA, "temporary")) === null, "Reset must clear Session A temporary data");
assert(localStorage.getItem(bDesignKey) === "B-design", "Resetting Session A must not clear Session B");
assert(session.getActiveSessionId() === null, "Reset must remove the active Session A pointer");

console.log("Public-terminal session isolation test: PASS");
console.log(JSON.stringify({ sessionA, sessionB, sessionBRetained: localStorage.getItem(bDesignKey) === "B-design" }, null, 2));
