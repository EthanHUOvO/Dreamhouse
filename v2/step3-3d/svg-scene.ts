import { withPascalMcp, callPascalTool } from "./pascal-mcp-client";
import { svgToStructure } from "./svg-geometry";
export { svgToStructure } from "./svg-geometry";
export type SvgStructure = ReturnType<typeof svgToStructure>;

/** SVG 输入 → 确定性生成 Pascal 场景（跳过 LLM 视觉识别）。 */
export async function generateSceneFromSvg(input: {
  sessionId: string;
  sourceImageHash: string;
  sourceImage: string;
  sourceSvg: string;
  signal?: AbortSignal;
  onEvent?: (event: any) => void;
}) {
  input.signal?.throwIfAborted();
  const structure = svgToStructure(input.sourceSvg);
  input.onEvent?.({ type: "geometry-check", ok: true, issues: [], warnings: structure.warnings, coordinates: structure.coordinates });
  return withPascalMcp(async (mcp) => {
    let revision = 0;
    let index = 0;
    const call = async (name: string, args: Record<string, any>) => {
      input.signal?.throwIfAborted();
      index += 1;
      args.sessionId = input.sessionId;
      args.sourceImageHash = input.sourceImageHash;
      if (name === "begin_floorplan_scene") args.sourceImage = input.sourceImage;
      else args.revision = revision;
      input.onEvent?.({ type: "tool", name, args, index, status: "started" });
      const result = await callPascalTool(mcp, name, args, { signal: input.signal });
      revision = Number(result.revision || revision);
      input.onEvent?.({ type: "tool", name, args, index, status: "complete", result: { revision, status: String(result.status || ""), validation: result.validation } });
      if (result.scene) input.onEvent?.({ type: "scene", stage: result.status, revision, scene: result.scene, validation: result.validation });
      return result;
    };
    await call("begin_floorplan_scene", {});
    await call("set_floor_structure", { name: "SVG 户型", outerPolygon: structure.outerPolygon, walls: structure.walls, rooms: structure.rooms, scaleMethod: "drawing-dimensions", geometrySource: "svg-deterministic/v1", sourceSvg: input.sourceSvg });
    await call("set_openings", { doors: structure.doors, windows: structure.windows });
    await call("populate_basic_furniture", {});
    const validated = await call("validate_scene", {});
    if (!validated.validation?.valid) throw new Error(`SVG_PASCAL_VALIDATION_FAILED:${JSON.stringify(validated.validation)}`);
    input.onEvent?.({type:"validation",revision,validation:validated.validation});
    const result = await call("commit_scene", {});
    if (!result.scene || !result.validation?.valid) throw new Error("SVG_COMMIT_INVALID");
    input.onEvent?.({type:"complete",result});
    return result;
  }, { signal: input.signal });
}
