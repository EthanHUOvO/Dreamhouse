import {qwenChatCompletion} from './qwen-client';
import {readSingleToolCall} from './floorplan-edit-intent';
import type {svgToStructure} from './svg-geometry';

type Structure=ReturnType<typeof svgToStructure>;
const stages=['set_floor_structure','set_openings','populate_basic_furniture','validate_scene','commit_scene'];
export function validateSvgModelPlan(plan:any,structure:Structure){
 if(!plan||typeof plan!=='object'||Array.isArray(plan)||Object.keys(plan).some(k=>!['steps','rooms','walls','doors','windows'].includes(k)))throw new Error('SVG_AI_PLAN_INVALID');
 if(JSON.stringify(plan.steps)!==JSON.stringify(stages))throw new Error('SVG_AI_PLAN_STEPS_INVALID');
 for(const key of ['rooms','walls','doors','windows'] as const){
  const expected=structure[key].map(v=>v.id);
  if(!Array.isArray(plan[key])||plan[key].length!==expected.length||new Set(plan[key]).size!==expected.length||plan[key].some((id:any)=>typeof id!=='string'||!expected.includes(id)))throw new Error('SVG_AI_PLAN_COVERAGE_INVALID:'+key);
 }
 return plan as {steps:string[];rooms:string[];walls:string[];doors:string[];windows:string[]};
}

/** AI plans the actual Pascal transaction. SVG coordinates remain authoritative:
 * requesting new coordinates from a language model would silently remodel Step2. */
export async function planSvgModel(structure:Structure,sourceImageHash:string,signal?:AbortSignal,chat= qwenChatCompletion){
 signal?.throwIfAborted();
 const started=Date.now();
 const properties:Record<string,unknown>={steps:{type:'array',items:{type:'string',enum:stages}}};
 for(const key of ['rooms','walls','doors','windows'] as const)properties[key]={type:'array',items:{type:'string'}};
 const response=await chat({messages:[
  {role:'system',content:'你是 Pascal 三维户型建模规划器。输入是用户已确认 SVG 的精确结构，单位米。规划完整三维建模事务，必须覆盖全部真实房间、墙、门窗 ID，不能遗漏、重复或编造。steps 必须依次为 set_floor_structure、set_openings、populate_basic_furniture、validate_scene、commit_scene。坐标和房间类型已由 SVG 确定，禁止重新猜测。调用 plan_svg_scene，给出各类实体的构建清单。宿主会逐项核对，并用清单从原 SVG 结构选取实体执行 Pascal 工具；任一检查失败不提交。'},
  {role:'user',content:JSON.stringify({sourceImageHash,unit:'meter',rooms:structure.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,areaM2:r.expectedArea})),walls:structure.walls,doors:structure.doors,windows:structure.windows})},
 ],tools:[{type:'function',function:{name:'plan_svg_scene',description:'根据已确认 SVG 规划完整 Pascal 构建事务',parameters:{type:'object',additionalProperties:false,properties,required:['steps','rooms','walls','doors','windows']}}}],tool_choice:{type:'function',function:{name:'plan_svg_scene'}},temperature:0,max_tokens:5000},{stage:'svg-model3d-plan',signal,timeoutMs:120000});
 signal?.throwIfAborted();
 const plan=validateSvgModelPlan(readSingleToolCall(response,'plan_svg_scene'),structure);
 return {plan,provenance:{stage:'svg-model3d-plan',actualInference:true,sourceImageHash,model:response.model??null,responseId:response.id??null,usage:response.usage??null,elapsedMs:Date.now()-started,geometrySource:'confirmed-svg',role:'pascal-build-plan'}};
}
