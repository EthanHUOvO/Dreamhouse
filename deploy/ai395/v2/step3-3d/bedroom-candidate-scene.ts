import {createFloorplanBlueprint,compileBlueprintToPascal,validateVariantBlueprint} from '../floorplans/blueprint';
import {assertBedroomSceneUsable} from './bedroom-scene-validation';
import type {svgToStructure} from './svg-geometry';

type Structure=ReturnType<typeof svgToStructure>;
/** Reuse the same Blueprint compiler/default furniture and final guard as MCP
 * to exclude unusable first-generation candidates before model selection.
 * The real MCP scene is independently checked again before Portal commits. */
export function checkBedroomDefaultScene(result:{structure:Structure;validation:{targetRoomId:string;newRoomId:string}},original:Structure){
  const spec={id:'bedroom-candidate-check',name:'卧室候选预检',factory:'PascalMCP/SVG-deterministic/v1',sourceImage:'',...result.structure};
  const blueprint=createFloorplanBlueprint(spec),validation=validateVariantBlueprint(blueprint);
  if(!validation.valid)throw new Error('BEDROOM_CANDIDATE_BLUEPRINT_INVALID');
  return assertBedroomSceneUsable(compileBlueprintToPascal(blueprint),original,result.validation.targetRoomId,result.validation.newRoomId);
}
