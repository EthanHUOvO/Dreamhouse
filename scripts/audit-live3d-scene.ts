import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { inspectModel3dQuality } from '../lib/ai/model3d-quality';
import { assertPascalSceneIntegrity } from '../lib/pascal/scene-integrity';
import { sceneToFloorplanBlueprint,validateVariantBlueprint } from '../lib/floorplans/blueprint';
import { structureSceneSvg } from '../lib/floorplans/structure-preview';

async function main(){
 const file=process.argv[2], output=process.argv[3];if(!file||!output)throw new Error('scene JSON and output directory required');
 const session=JSON.parse(await readFile(file,'utf8')),scene=session.scene||session;
 const bp=sceneToFloorplanBlueprint(scene);
 const metadata=scene.nodes.building_house.metadata;
 // Round-tripping the scene derives polygon area; retain the model's recorded
 // labels for this independent area check instead of comparing area to itself.
 const recordedRooms=metadata.floorplanBlueprint?.rooms||[];
 bp.rooms=bp.rooms.map(r=>({...r,expectedArea:recordedRooms.find((v:any)=>v.id===r.id)?.expectedArea}));
 const openings={doors:bp.doors.map(d=>({...d,wallId:d.hostWallId,distance:d.offset+d.width/2})),windows:bp.windows.map(w=>({...w,wallId:w.hostWallId,distance:w.offset+w.width/2}))};
 const quality=inspectModel3dQuality(bp,openings,scene);
 const count=(type:string)=>Object.values(scene.nodes).filter((n:any)=>n.type===type).length;
 const area=(p:number[][])=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1]},0)/2);
 const report={sessionId:session.sessionId,status:session.status,revision:session.revision,source:scene.nodes.building_house.metadata.floorplanSource,model:scene.nodes.building_house.metadata.model,
  inputIdentityHash:scene.nodes.building_house.metadata.sourceImageHash,sourceDrawing:scene.nodes.building_house.metadata.sourceDrawing,
  scaleMethod:scene.nodes.building_house.metadata.scaleMethod,scaleEstimated:scene.nodes.building_house.metadata.scaleEstimated,
  generatedAt:scene.nodes.building_house.metadata.generatedAt,
  integrity:assertPascalSceneIntegrity(scene),blueprintValidation:validateVariantBlueprint(bp),quality,
  counts:{nodes:Object.keys(scene.nodes).length,rooms:count('zone'),walls:count('wall'),doors:count('door'),windows:count('window'),furniture:count('item')},
  rooms:bp.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygonAreaM2:area(r.polygon),expectedAreaM2:r.expectedArea})),
  bounds:{width:Math.max(...bp.outerPolygon.map(p=>p[0]))-Math.min(...bp.outerPolygon.map(p=>p[0])),depth:Math.max(...bp.outerPolygon.map(p=>p[1]))-Math.min(...bp.outerPolygon.map(p=>p[1]))},
  note:'This script makes no model calls. expectedArea comes from recorded model labels, not an independent OCR reading. Geometric gates do not establish complete source-image fidelity or furniture clearance.'};
 await mkdir(output,{recursive:true});await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 const svg=structureSceneSvg(scene);await writeFile(path.join(output,'scene.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(output,'scene.png'));
 console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1});
