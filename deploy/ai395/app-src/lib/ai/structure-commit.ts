import type { SceneGraph } from "../types";

/** Compensate a store write that throws after partially updating its state. */
export function commitStructureScene(previous: SceneGraph, next: SceneGraph, write: (scene: SceneGraph) => void) {
  try { write(next); return { ok: true, issue: "" }; }
  catch (error: any) {
    try { write(previous); }
    catch (rollback: any) { throw new Error(`场景提交失败且恢复失败：${error.message}；${rollback.message}`); }
    return { ok: false, issue: `场景提交失败，已恢复原场景：${error.message}` };
  }
}
