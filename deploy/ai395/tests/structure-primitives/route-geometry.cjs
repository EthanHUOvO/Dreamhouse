const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const repo=path.resolve(__dirname,'../..');
let ts;for(const p of [process.env.TYPESCRIPT_PATH,'typescript','/app/node_modules/typescript',path.resolve(repo,'../../structure-edit-20261013/deps/typescript.js')].filter(Boolean)){try{ts=require(p);break}catch{}}
if(!ts)throw new Error('Set TYPESCRIPT_PATH to an existing TypeScript runtime.');
const cache=new Map(),external={},runtimeBySource=new Map(),sourceByRuntime=new Map();
for(const line of fs.readFileSync(path.join(repo,'Dockerfile.web.rocm'),'utf8').split('\n')){const m=/^COPY\s+(\S+\.tsx?)\s+(\/app\/\S+\.tsx?)\s*$/.exec(line);if(m){const source=path.resolve(repo,m[1]);runtimeBySource.set(source,m[2]);sourceByRuntime.set(m[2],source);}}
function load(file){const key=path.resolve(repo,file);if(cache.has(key))return cache.get(key);const exports={};cache.set(key,exports);const code=ts.transpileModule(fs.readFileSync(key,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(code.diagnostics.length,0);const runtime=runtimeBySource.get(key)||('/app/'+path.relative(path.join(repo,'app-src'),key).replace(/\\/g,'/'));vm.runInNewContext(code.outputText,{exports,require:n=>{if(n in external)return external[n];if(n.startsWith('node:'))return require(n);if(n.startsWith('.')){const destination=path.posix.resolve(path.posix.dirname(runtime),n+'.ts');const target=sourceByRuntime.get(destination)||path.join(repo,'app-src',destination.slice('/app/'.length));return load(path.relative(repo,target));}assert.fail(n)},console,Date,JSON,Math,Number,Set,Map,Array,Object,Error,AbortSignal});return exports;}

const runtimeModule=(source,runtime)=>process.env.STRUCTURE_TEST_RUNTIME_ROOT?require(path.join(process.env.STRUCTURE_TEST_RUNTIME_ROOT,runtime+'.ts')):load(source);
const geometry=runtimeModule('v2/step3-3d/structure-primitives.ts','lib/ai/structure-primitives');
const intent=runtimeModule('v2/step2-edit/floorplan-edit-intent.ts','lib/ai/floorplan-edit-intent');
const svgGeometry=runtimeModule('v2/step3-3d/svg-geometry.ts','lib/ai/svg-geometry');
const bedroom=runtimeModule('v2/step3-3d/bedroom-edit-geometry.ts','lib/ai/bedroom-edit-geometry');
const svgEdit=runtimeModule('v2/step3-3d/svg-edit-geometry.ts','lib/ai/svg-edit-geometry');
const source=fs.readFileSync(path.join(repo,'public/preset/svg-v2/one/option-01.svg'),'utf8');
const context=geometry.structureEditContext(source),living=context.rooms.find(r=>r.semantic==='living_room'),master=context.rooms.find(r=>r.semantic==='master_bedroom');
const balcony=context.rooms.find(r=>r.semantic==='balcony'&&context.sharedBoundaries.some(b=>b.roomIds.includes(r.id)&&b.roomIds.includes(master.id)));
assert.ok(balcony,'one01 must have master-adjacent balcony');
let parsedPlan,modelCalls=0,passed=0;
const response=(name,args)=>({model:'CONTROLLED-STUB-NOT-REAL-AI',id:'stub-'+modelCalls,choices:[{finish_reason:'tool_calls',message:{tool_calls:[{type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
Object.assign(external,{'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},'@/lib/ai/qwen-client':{qwenChatCompletion:async body=>{modelCalls++;if(body.tool_choice.function.name==='parse_floorplan_intent')return response('parse_floorplan_intent',parsedPlan);const payload=JSON.parse(body.messages[1].content);assert.ok(payload.candidates.length>0);return response('select_floorplan_candidate',{candidateId:payload.candidates[0].id,unmetRequirements:[],reason:'控制模型选择已验证真实几何候选'});}},'@/lib/ai/floorplan-edit-intent':intent,'@/lib/ai/structure-primitives':geometry,'@/lib/ai/bedroom-edit-geometry':bedroom,'@/lib/ai/svg-edit-geometry':svgEdit});
const route=load('v2/step2-edit/svg-edit-route.ts');
const makePlan=operations=>({status:'execute',operations,protectedRoomIds:context.rooms.filter(r=>!operations.some(op=>intent.operationRoomIds(op).includes(r.id))).map(r=>r.id),preserveEntrance:true,preserveOtherRooms:true,unhandledRequirements:[],summary:'真实几何与受控模型接口集成',message:'改造'});
const merge={id:'op1',type:'merge_rooms',roomIds:[master.id,balcony.id],resultName:null,resultSemantic:null};
const move={id:'op1',type:'move_boundary',targetRoomId:master.id,adjacentRoomId:living.id,mode:'expand',distanceM:.2,direction:null};
const study={id:'op1',type:'split_room',targetRoomId:living.id,direction:'upper',newRoomName:'书房',newRoomSemantic:'study',minAreaM2:null,entryFromRoomId:living.id};
const classic={...study,targetRoomId:living.id,entryFromRoomId:living.id,newRoomName:'卧室',newRoomSemantic:'bedroom'};
const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
async function run(operations){modelCalls=0;parsedPlan=makePlan(operations);return route.POST({json:async()=>({svgText:source,instruction:'按给定完整概念要求改造，保留入户和厨卫，家具在Step3手动调整'}),signal:new AbortController().signal});}
(async()=>{
for(const [name,ops]of [['merge master balcony',[merge]],['move shared boundary',[move]],['split study upper',[study]],['classic upper bedroom',[classic]],['merge then move',[merge,{...move,id:'op2'}]]]){const r=await run(ops);check(name,()=>{assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.validation.valid,true);assert.equal(r.body.validation.operations.length,ops.length);assert.equal(modelCalls,1+ops.length);assert.notEqual(r.body.svg,source);const after=svgGeometry.svgToStructure(r.body.svg);assert.equal(after.rooms.length,context.rooms.length+ops.filter(o=>o.type==='split_room').length-ops.filter(o=>o.type==='merge_rooms').length);for(const id of parsedPlan.protectedRoomIds){const before=context.rooms.find(r=>r.id===id),next=after.rooms.find(r=>r.id===id);assert.equal(JSON.stringify(next.polygon),JSON.stringify(before.polygon));}if(ops.some(o=>o.type==='merge_rooms'))assert.equal(r.body.validation.roomIdMap[balcony.id],master.id);assert.equal(fs.readFileSync(path.join(repo,'public/preset/svg-v2/one/option-01.svg'),'utf8'),source);});}
let r=await run([merge,{...move,id:'op2',distanceM:99}]);check('real geometry second-step infeasible rolls whole plan back',()=>{assert.equal(r.status,422,JSON.stringify(r.body));assert.equal(r.body.completedOperationCount,1);assert.equal(r.body.svg,undefined);assert.equal(r.body.rolledBack,true);assert.equal(modelCalls,2);});
const boundary=context.sharedBoundaries.find(b=>b.roomIds.includes(master.id)&&b.roomIds.includes(living.id));const correct=boundary.targetExpandDirection[master.id],opposite={upper:'lower',lower:'upper',left:'right',right:'left'}[correct];r=await run([{...move,direction:opposite}]);check('explicit move direction mismatch rejected by real geometry',()=>{assert.equal(r.status,422,JSON.stringify(r.body));assert.equal(r.body.svg,undefined);assert.equal(modelCalls,1);});
console.log(JSON.stringify({kind:'REAL_GEOMETRY_CONTROLLED_MODEL_NOT_REAL_AI',passed}));
})().catch(e=>{console.error(e);process.exitCode=1});
