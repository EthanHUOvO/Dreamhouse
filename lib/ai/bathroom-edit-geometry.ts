import {svgToStructure,polygonArea,pointInPolygon} from './svg-geometry';
import {partitionCandidates,applySvgEdits,type Addition} from './svg-edit-geometry';
import {circulation,preservedOpenings} from './bedroom-edit-geometry';

export type BathroomRegion='upper'|'lower'|'left'|'right'|'upper-left'|'upper-right'|'lower-left'|'lower-right'|'any'|'unspecified';
const instruction='在主卧内新增卫生间';
const corners:Record<string,{position:BathroomRegion;directions:BathroomRegion[]}>= {
 'corner-east-north':{position:'upper-right',directions:['upper','right','upper-right']},
 'corner-west-north':{position:'upper-left',directions:['upper','left','upper-left']},
 'corner-east-south':{position:'lower-right',directions:['lower','right','lower-right']},
 'corner-west-south':{position:'lower-left',directions:['lower','left','lower-left']},
};
// Ray directions are image axes: north is decreasing SVG y, not inferred geographic north.
function checked(svg:string,additions:Addition[]){
 const before=svgToStructure(svg),target=before.rooms.find(r=>r.semantic==='master_bedroom');
 if(!target)throw new Error('BATHROOM_MASTER_NOT_FOUND');
 const edited=applySvgEdits(svg,instruction,additions),next=edited.structure;
 const retained=next.rooms.find(r=>r.id===target.id),bath=next.rooms.find(r=>!before.rooms.some(o=>o.id===r.id));
 if(!retained||!bath||bath.semantic!=='bathroom')throw new Error('BATHROOM_TOPOLOGY_INVALID');
 const grid=Math.max(next.coordinates.metersPerUnitX,next.coordinates.metersPerUnitY)*next.coordinates.gridUnit;
 const cell=next.coordinates.metersPerUnitX*next.coordinates.metersPerUnitY*next.coordinates.gridUnit**2;
 if(JSON.stringify(before.outerPolygon)!==JSON.stringify(next.outerPolygon))throw new Error('BATHROOM_OUTER_BOUNDARY_CHANGED');
 if(Math.abs(polygonArea(retained.polygon)+polygonArea(bath.polygon)-polygonArea(target.polygon))>2*cell)throw new Error('BATHROOM_AREA_NOT_CONSERVED');
 for(const old of before.rooms.filter(r=>r.id!==target.id)){
  const current=next.rooms.find(r=>r.id===old.id);
  if(!current||current.name!==old.name||JSON.stringify(current.polygon)!==JSON.stringify(old.polygon))throw new Error('BATHROOM_UNRELATED_ROOM_CHANGED:'+old.id);
 }
 const xs=bath.polygon.map(p=>p[0]),ys=bath.polygon.map(p=>p[1]);
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),inset=.12+grid;
 if(right-left<=2*inset||bottom-top<=2*inset)throw new Error('BATHROOM_RECTANGLE_TOO_NARROW');
 for(let x=0;x<=12;x++)for(let y=0;y<=12;y++)if(!pointInPolygon([left+inset+(right-left-2*inset)*x/12,top+inset+(bottom-top-2*inset)*y/12],bath.polygon))throw new Error('BATHROOM_RECTANGLE_NOT_ENCLOSED');
 const door=preservedOpenings(before,next,target,bath.id),routes=circulation(before,next,target);
 return {...edited,validation:{...edited.validation,newRoomId:bath.id,newDoorId:door.id,...routes,checks:[...edited.validation.checks,'preserved-room-polygons','area-conservation','original-opening-position-and-adjacency','entrance-circulation','corner-rectangle']}};
}
export function bathroomPartitionCandidates(svg:string,region:BathroomRegion='any'){
 if(!['upper','lower','left','right','upper-left','upper-right','lower-left','lower-right','any','unspecified'].includes(region))throw new Error('BATHROOM_REGION_INVALID');
 return partitionCandidates(svg,instruction).flatMap(candidate=>{
  const corner=corners[candidate.id];if(!corner||!['any','unspecified'].includes(region)&&!corner.directions.includes(region))return [];
  try{const result=checked(svg,candidate.additions);return[{...candidate,position:corner.position,targetRoomId:result.validation.targetRoomId,newAreaM2:result.structure.rooms.find(r=>r.id===result.validation.newRoomId)!.expectedArea,remainingAreaM2:result.structure.rooms.find(r=>r.id===result.validation.targetRoomId)!.expectedArea}];}catch{return [];}
 });
}
export function applyBathroomPartition(svg:string,candidateId:string,region:BathroomRegion='any'){
 const candidate=bathroomPartitionCandidates(svg,region).find(c=>c.id===candidateId);
 if(!candidate)throw new Error('BATHROOM_CANDIDATE_INVALID');
 return {...checked(svg,candidate.additions),candidate};
}
