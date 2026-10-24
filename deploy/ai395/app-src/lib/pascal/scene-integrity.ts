import type { SceneGraph, SceneNode } from "@/lib/types";
export type SceneIntegrityReport = {
  valid: boolean;
  issues: string[];
  undefinedTypeNodes: string[];
  duplicateIds: string[];
};
export function assertPascalSceneIntegrity(
  scene: SceneGraph,
): SceneIntegrityReport {
  const issues: string[] = [],
    undefinedTypeNodes: string[] = [],
    duplicateIds: string[] = [],
    seen = new Set<string>();
  for (const [key, node] of Object.entries(scene?.nodes || {})) {
    const n: any = node;
    if (seen.has(key) || seen.has(n.id)) duplicateIds.push(key);
    seen.add(key);
    if (!n.id) issues.push(`node ${key} missing id`);
    if (!Object.prototype.hasOwnProperty.call(n, "parentId"))
      issues.push(`node ${key} missing parentId`);
    if (typeof n.type !== "string" || !n.type.trim())
      undefinedTypeNodes.push(key);
    if (n.parentId != null && !scene.nodes[n.parentId])
      issues.push(`node ${key} parent ${n.parentId} missing`);
    for (const child of Array.isArray(n.children) ? n.children : [])
      if (!scene.nodes[child])
        issues.push(`node ${key} child ${child} missing`);
  }
  if (undefinedTypeNodes.length)
    issues.push(`nodes with undefined type: ${undefinedTypeNodes.join(", ")}`);
  if (duplicateIds.length)
    issues.push(`duplicate node ids: ${duplicateIds.join(", ")}`);
  const report = {
    valid: issues.length === 0,
    issues,
    undefinedTypeNodes,
    duplicateIds,
  };
  if (!report.valid) console.error("[Pascal] Scene integrity failed", report);
  return report;
}
