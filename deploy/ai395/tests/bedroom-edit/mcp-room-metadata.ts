import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSceneFromSvg} from './assertions';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {bedroomPartitionCandidates,applyBedroomPartition} from '/app/lib/ai/bedroom-edit-geometry';
import {beginFloorplanScene,setFloorStructure,getPascalSession,setOpenings,populateBasicFurniture} from '/app/services/pascal-mcp/session-store';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
const svg=readFileSync('/workspace/public/preset/svg-v2/one/option-01.svg','utf8'),original=svgToStructure(svg);
const candidate=bedroomPartitionCandidates(svg,{region:'upper'})[0];assert.ok(candidate);
const edited=applyBedroomPartition(svg,candidate.id,{region:'upper'}),st=edited.structure;
for(const mode of ['schema-stripped','forged-client-label']){
 const sessionId='metadata-'+mode,sourceImageHash='metadata-test-hash';
 const start=beginFloorplanScene({sessionId,sourceImageHash,sourceImage:'/confirmed.svg'});
 const rooms=st.rooms.map(({id,name,semantic,polygon,expectedArea,color,sourceArea})=>({id,name,semantic,polygon,expectedArea,color,sourceArea,...(mode==='forged-client-label'?{sourceLabel:{id:'forged'}}:{})}));
 const structure=setFloorStructure({sessionId,sourceImageHash,revision:start.revision,geometrySource:'svg-deterministic/v1',sourceSvg:edited.svg,outerPolygon:st.outerPolygon,walls:st.walls,rooms,scaleMethod:'drawing-dimensions'});
 const opened=setOpenings({sessionId,sourceImageHash,revision:structure.revision,doors:st.doors,windows:st.windows});
 const furnished=populateBasicFurniture({sessionId,sourceImageHash,revision:opened.revision});
 const items=(scene:any)=>Object.values(scene.nodes).filter((n:any)=>n.type==='item').map((n:any)=>({id:n.id,position:n.position,rotation:n.rotation,scale:n.scale}));
 assert.deepEqual(items(furnished.scene),items(buildSceneFromSvg(edited.svg,sessionId,'direct').scene),'MCP defaults must equal verified SVG defaults even when client labels are stripped or forged');
 assertBedroomSceneUsable(furnished.scene,original,candidate.targetRoomId,edited.validation.newRoomId);
 console.log('PASS',mode);
}
console.log('PROGRAMMATIC_MCP_SCHEMA_REGRESSION_NO_AI');
