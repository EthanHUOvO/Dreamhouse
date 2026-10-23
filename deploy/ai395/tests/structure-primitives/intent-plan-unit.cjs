const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const repo=path.resolve(__dirname,'../..');
let ts;for(const p of [process.env.TYPESCRIPT_PATH,'typescript','/app/node_modules/typescript',path.resolve(repo,'../../structure-edit-20261013/deps/typescript.js')].filter(Boolean)){try{ts=require(p);break}catch{}}
if(!ts)throw new Error('Set TYPESCRIPT_PATH to an existing TypeScript runtime; this test does not install dependencies.');
const load=(file,imports={})=>{const result=ts.transpileModule(fs.readFileSync(path.join(repo,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(result.diagnostics.length,0);const exports={};vm.runInNewContext(result.outputText,{exports,require:n=>{assert.ok(n in imports,n);return imports[n]},console,Date,JSON,Math,Number,Set,Array,Object,Error,AbortSignal});return exports;};
const intent=load('v2/step2-edit/floorplan-edit-intent.ts');
const rooms=[{id:'living',name:'客餐厅',semantic:'living_room'},{id:'kitchen',name:'厨房',semantic:'kitchen'},{id:'bath',name:'卫生间',semantic:'bathroom'},{id:'master',name:'主卧',semantic:'master_bedroom'},{id:'balcony',name:'阳台',semantic:'balcony'},{id:'study',name:'书房',semantic:'study'}];
const split={id:'op1',type:'split_room',targetRoomId:'living',direction:'upper',newRoomName:'卧室',newRoomSemantic:'bedroom',minAreaM2:null,entryFromRoomId:'living'};
const merge={id:'op1',type:'merge_rooms',roomIds:['master','balcony'],resultName:null,resultSemantic:null};
const move={id:'op1',type:'move_boundary',targetRoomId:'master',adjacentRoomId:'living',mode:'expand',distanceM:.3};
const clone=v=>JSON.parse(JSON.stringify(v));
const makePlan=(operations=[split],more={})=>({status:'execute',operations:clone(operations),protectedRoomIds:rooms.filter(r=>!operations.some(op=>intent.operationRoomIds(op).includes(r.id))).map(r=>r.id),preserveEntrance:true,preserveOtherRooms:true,unhandledRequirements:[],summary:'用户的完整结构需求',message:'执行结构改造',...more});
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
const rejects=(name,plan,code)=>check(name,()=>assert.throws(()=>intent.validateFloorplanPlan(plan,rooms),e=>e.code===code));
for(const op of [split,merge,move,{id:'op1',type:'add_bathroom',targetRoomId:'master',entryFromRoomId:'master'},{id:'op1',type:'add_sliding_door',targetRoomId:'living',adjacentRoomId:'balcony'}])check('schema accepts '+op.type,()=>assert.equal(intent.validateFloorplanPlan(makePlan([op]),rooms).operations[0].type,op.type));
for(const direction of ['upper','lower','left','right','any'])check('split direction '+direction,()=>assert.equal(intent.validateFloorplanPlan(makePlan([{...split,direction}]),rooms).operations[0].direction,direction));
for(const semantic of ['bedroom','study','storage'])check('new room semantic '+semantic,()=>assert.equal(intent.validateFloorplanPlan(makePlan([{...split,newRoomSemantic:semantic}]),rooms).operations[0].newRoomSemantic,semantic));
rejects('extra plan property',makePlan([split],{ignoreValidation:true}),'EDIT_PLAN_SCHEMA_INVALID');
rejects('extra operation coordinate',makePlan([{...split,x:20}]),'EDIT_PLAN_OPERATION_INVALID');
rejects('unknown room IDs',makePlan([{...split,targetRoomId:'invented'}]),'EDIT_INTENT_UNKNOWN_ROOM');
rejects('missing protected room',makePlan([split],{protectedRoomIds:['kitchen','bath']}),'EDIT_PROTECTED_ROOMS_INCOMPLETE');
rejects('affected room marked protected',makePlan([split],{protectedRoomIds:rooms.map(r=>r.id)}),'EDIT_PROTECTED_ROOMS_INCOMPLETE');
rejects('wet room split forbidden',makePlan([{...split,targetRoomId:'kitchen',entryFromRoomId:'kitchen'}]),'EDIT_PROTECTED_WET_ROOM');
rejects('wet room merge forbidden',makePlan([{...merge,roomIds:['master','bath']}]),'EDIT_PROTECTED_WET_ROOM');
rejects('wet room boundary forbidden',makePlan([{...move,adjacentRoomId:'bath'}]),'EDIT_PROTECTED_WET_ROOM');
rejects('entrance preservation required',makePlan([split],{preserveEntrance:false}),'EDIT_PROTECTION_REQUIRED');
rejects('other-room preservation required',makePlan([split],{preserveOtherRooms:false}),'EDIT_PROTECTION_REQUIRED');
rejects('furniture compound requirement atomic rejection',makePlan([split],{unhandledRequirements:['把沙发向右移一米']}),'EDIT_REQUIREMENTS_UNSUPPORTED');
rejects('self merge forbidden',makePlan([{...merge,roomIds:['master','master']}]),'EDIT_OPERATION_SELF_REFERENCE');
rejects('same-room boundary forbidden',makePlan([{...move,adjacentRoomId:'master'}]),'EDIT_OPERATION_SELF_REFERENCE');
rejects('negative boundary distance forbidden',makePlan([{...move,distanceM:-.2}]),'EDIT_MOVE_BOUNDARY_INVALID');
const nonfinite=makePlan([split]);nonfinite.operations[0].minAreaM2=Infinity;rejects('nonfinite area forbidden',nonfinite,'EDIT_SPLIT_ROOM_INVALID');
rejects('wrong split entry forbidden',makePlan([{...split,entryFromRoomId:'master'}]),'EDIT_SPLIT_ROOM_INVALID');
rejects('mismatched merged purpose forbidden',makePlan([{...merge,resultName:'书房'}]),'EDIT_MERGE_SEMANTIC_INVALID');
rejects('unsupported new semantic forbidden',makePlan([{...split,newRoomSemantic:'kitchen'}]),'EDIT_SPLIT_ROOM_INVALID');
rejects('no_change cannot sneak in operations',makePlan([split],{status:'no_change'}),'EDIT_PLAN_NONEXECUTABLE_OPERATIONS');
rejects('execute cannot have empty plan',makePlan([]),'EDIT_PLAN_EMPTY');
rejects('operation IDs unique',makePlan([merge,{...move,id:merge.id}]),'EDIT_PLAN_OPERATION_INVALID');
rejects('at most four operations',makePlan(Array.from({length:5},(_,i)=>({...move,id:'op'+i}))),'EDIT_PLAN_SCHEMA_INVALID');
rejects('cannot reference a merged-away room',makePlan([merge,{...split,id:'op2',targetRoomId:'balcony',entryFromRoomId:'balcony'}]),'EDIT_PLAN_REMOVED_ROOM_REFERENCE');
for(const status of ['no_change','clarification','unsupported'])check('nonexecute status '+status,()=>assert.equal(intent.validateFloorplanPlan(makePlan([],{status}),rooms).status,status));
check('valid compound merge then expand existing target',()=>assert.equal(intent.validateFloorplanPlan(makePlan([merge,{...move,id:'op2'}]),rooms).operations.length,2));
const explicitPlan=(operations,explicitProtectedRoomIds=[])=>{const p=makePlan(operations);delete p.protectedRoomIds;return{...p,explicitProtectedRoomIds}};
check('new model may omit all default protections because host derives them',()=>{const p=intent.validateFloorplanPlan(explicitPlan([move]),rooms);assert.deepEqual([...p.protectedRoomIds].sort(),['kitchen','bath','balcony','study'].sort());assert.deepEqual([...p.explicitProtectedRoomIds],[]);});
check('explicit wet-room protection plus full host defaults preserved',()=>{const p=intent.validateFloorplanPlan(explicitPlan([move],['kitchen','bath']),rooms);assert.deepEqual([...p.protectedRoomIds].sort(),['kitchen','bath','balcony','study'].sort());assert.deepEqual([...p.explicitProtectedRoomIds],['kitchen','bath']);});
rejects('explicit affected-room protection cannot be silently filtered',explicitPlan([move],['living']),'EDIT_EXPLICIT_PROTECTION_CONFLICT');
rejects('unknown explicitly protected ID rejected',explicitPlan([move],['not-real']),'EDIT_INTENT_UNKNOWN_ROOM');
rejects('new explicit schema cannot also carry legacy defaults',{...explicitPlan([move]),protectedRoomIds:[]},'EDIT_PLAN_SCHEMA_INVALID');
check('current tool exposes plan and primitives',()=>{const tool=intent.planTool.function.parameters;assert.ok(tool.properties.operations.items.oneOf.some(s=>s.properties.type.const==='merge_rooms'));assert.ok(!('action' in tool.properties));assert.ok(!intent.planSystemPrompt.includes('当前不支持合并房间'));});

const response=(name,args)=>({model:'CONTROLLED-STUB-NOT-REAL-AI',id:'stub-'+name,choices:[{finish_reason:'tool_calls',message:{tool_calls:[{type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
let calls=[],applied=[],svgRooms,replyPlan,selectionQueue,failApplyId,noCandidateId,budgetFailure,abortOnApply,activeController;
const geometry={
 structureEditContext:svg=>({unit:'meter',axes:'x right, y down',rooms:clone(svgRooms.get(svg)||rooms),sharedBoundaries:[]}),
 generateStructureCandidates:(svg,op)=>{if(budgetFailure)throw new Error('SPLIT_SEARCH_BUDGET_EXCEEDED');return{candidates:op.id===noCandidateId?[]:[{id:'candidate-'+op.id,summary:'已校验真实几何候选',distanceM:op.distanceM,svg:'PRIVATE-SVG-MUST-NOT-ENTER-PROMPT',structure:{private:true},additions:[{x1:1}]}],diagnostics:{stage:'controlled-stub-not-geometry'}}},
 applyStructureCandidate:(svg,id,op)=>{assert.equal(id,'candidate-'+op.id);applied.push({svg,id,op});if(failApplyId===op.id)throw new Error('STRUCTURE_CONTROLLED_GEOMETRY_FAILURE');const old=clone(svgRooms.get(svg)||rooms);let next=old;if(op.type==='merge_rooms')next=old.filter(r=>r.id!==op.roomIds[1]);if(op.type==='split_room')next=[...old,{id:'new-'+op.id,name:op.newRoomName,semantic:op.newRoomSemantic}];const output=svg+'|'+op.id;svgRooms.set(output,next);if(abortOnApply)activeController.abort();return{svg:output,structure:{rooms:next},validation:{valid:true,affectedRoomIds:intent.operationRoomIds(op),checks:['controlled-stub-only'],warnings:['合规未验证'],roomIdMap:op.type==='merge_rooms'?{[op.roomIds[1]]:op.roomIds[0]}:{},removedOpeningIds:op.type==='merge_rooms'?['removed-door']:[]}};},
};
const bedroom={bedroomPartitionCandidates:(_svg,c)=>[{id:'bedroom-existing-validated',newAreaM2:6.06,remainingAreaM2:11.28,entranceClearanceM:.9}],applyBedroomPartition:(svg,id,c)=>{applied.push({svg,id,c});const output=svg+'|bedroom';const next=[...rooms,{id:'new-bedroom',name:'卧室',semantic:'bedroom'}];svgRooms.set(output,next);return{svg:output,structure:{rooms:next},validation:{valid:true,targetRoomId:c.targetRoomId,newRoomId:'new-bedroom',checks:['entrance-circulation']}};}};
const route=load('v2/step2-edit/svg-edit-route.ts',{
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
 '@/lib/ai/qwen-client':{qwenChatCompletion:async(body,options)=>{calls.push({body,options});if(body.tool_choice.function.name==='parse_floorplan_intent')return response('parse_floorplan_intent',replyPlan);const data=JSON.parse(body.messages[1].content);const chosen=selectionQueue.shift();if(chosen instanceof Error)throw chosen;return response('select_floorplan_candidate',chosen||{candidateId:data.candidates[0].id,unmetRequirements:[],reason:'受控模型选择候选'});}},
 '@/lib/ai/svg-edit-geometry':{},'@/lib/ai/bedroom-edit-geometry':bedroom,
 '@/lib/ai/structure-primitives':geometry,'@/lib/ai/floorplan-edit-intent':intent,
});
async function run(plan,options={}){calls=[];applied=[];svgRooms=new Map([['original-svg',rooms]]);replyPlan=clone(plan);selectionQueue=options.selections||[];failApplyId=options.failApplyId;noCandidateId=options.noCandidateId;budgetFailure=options.budgetFailure;abortOnApply=options.abortOnApply;activeController=new AbortController();return route.POST({json:async()=>({svgText:'original-svg',instruction:options.instruction||'将主卧旁阳台并入主卧，再扩大主卧保留厨卫和入户通道'}),signal:activeController.signal});}
(async()=>{
let r=await run(makePlan([merge,{...move,id:'op2'}]));check('two operations parse once and select each candidate',()=>{assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(calls.length,3);assert.equal(applied.length,2);assert.equal(applied[1].svg,'original-svg|op1');assert.equal(r.body.svg,'original-svg|op1|op2');assert.equal(r.body.validation.operations.length,2);assert.equal(r.body.provenance.inference.length,3);assert.equal(r.body.validation.transaction,'all-operations-validated');assert.ok(r.body.validation.removedRoomIds.includes('balcony'));assert.equal(r.body.intent.action,'structure_plan');});
check('candidate prompt excludes raw geometry internals',()=>{const payload=JSON.parse(calls[1].body.messages[1].content);assert.ok(!('svg' in payload.candidates[0]));assert.ok(!('structure' in payload.candidates[0]));assert.ok(!('additions' in payload.candidates[0]));assert.equal(payload.operation.id,'op1');assert.equal(payload.plan.operations.length,2);});
r=await run(makePlan([merge,{...move,id:'op2'}]),{failApplyId:'op2'});check('second-step validation failure exposes no partial SVG',()=>{assert.equal(r.status,422);assert.equal(r.body.rolledBack,true);assert.equal(r.body.svg,undefined);assert.equal(r.body.failedOperationId,'op2');assert.equal(r.body.completedOperationCount,1);assert.equal(r.body.error,'STRUCTURE_CONTROLLED_GEOMETRY_FAILURE');});
const mergeChain=[merge,{id:'op2',type:'merge_rooms',roomIds:['living','master'],resultName:null,resultSemantic:null}];
r=await run(makePlan(mergeChain));check('room mappings compose through A to B to C and keep initial keys',()=>{assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.validation.roomIdMap.balcony,'living');assert.equal(r.body.validation.roomIdMap.master,'living');assert.equal(r.body.validation.roomIdMap.living,'living');assert.deepEqual(Object.keys(r.body.validation.roomIdMap).sort(),rooms.map(r=>r.id).sort());});
r=await run(makePlan(mergeChain),{failApplyId:'op2'});check('failed merge chain exposes neither partial mapping nor SVG',()=>{assert.equal(r.status,422);assert.equal(r.body.svg,undefined);assert.equal(r.body.validation,undefined);assert.equal(r.body.roomIdMap,undefined);assert.equal(r.body.rolledBack,true);});
r=await run(makePlan([merge,{...move,id:'op2'}]),{noCandidateId:'op2'});check('second-step no candidates rolls back without another inference',()=>{assert.equal(r.status,422);assert.equal(calls.length,2);assert.equal(applied.length,1);assert.equal(r.body.svg,undefined);assert.equal(r.body.rolledBack,true);});
r=await run(makePlan([merge]),{budgetFailure:true});check('bounded geometry search failure reports useful rollback message',()=>{assert.equal(r.status,422);assert.equal(r.body.error,'SPLIT_SEARCH_BUDGET_EXCEEDED');assert.match(r.body.message,/安全计算预算/);assert.equal(r.body.rolledBack,true);assert.equal(r.body.svg,undefined);assert.equal(applied.length,0);});
r=await run(makePlan([merge]),{selections:[{candidateId:'invented',unmetRequirements:[],reason:'bad'}]});check('unknown candidate rolls back',()=>{assert.equal(r.status,422);assert.equal(r.body.error,'EDIT_CANDIDATE_UNKNOWN');assert.equal(applied.length,0);});
r=await run(makePlan([merge]),{selections:[{candidateId:'candidate-op1',unmetRequirements:['必须新增采光窗尚未满足'],reason:'cannot satisfy'}]});check('selection catches omitted user requirements atomically',()=>{assert.equal(r.status,422);assert.equal(r.body.error,'EDIT_REQUIREMENTS_UNSATISFIED');assert.equal(applied.length,0);});
for(const status of ['no_change','clarification','unsupported']){r=await run(makePlan([],{status}));check('route '+status+' skips geometry and selection',()=>{assert.equal(r.status,422);assert.equal(calls.length,1);assert.equal(applied.length,0);assert.equal(r.body.svg,undefined);});}
r=await run(makePlan([merge,{...move,id:'op2'}]),{abortOnApply:true});check('abort after first apply does not leak candidate',()=>{assert.equal(r.status,499);assert.equal(r.body.svg,undefined);assert.equal(r.body.rolledBack,true);assert.equal(applied.length,1);});
r=await run(makePlan([merge,{...move,id:'op2'}]),{selections:[undefined,Object.assign(new Error('provider response hidden'),{name:'QwenRequestError'})]});check('provider failure after first operation rolls back and hides internals',()=>{assert.equal(r.status,502);assert.equal(r.body.svg,undefined);assert.equal(r.body.completedOperationCount,1);assert.ok(!JSON.stringify(r.body).includes('provider response hidden'));});
r=await run(explicitPlan([move],['kitchen','bath']));check('route host fills every unaffected default protection',()=>{assert.equal(r.status,200);assert.deepEqual([...r.body.intent.protectedRoomIds].sort(),['kitchen','bath','balcony','study'].sort());assert.deepEqual([...r.body.intent.explicitProtectedRoomIds],['kitchen','bath']);});
r=await run(makePlan([split]));check('one01 classic upper-bedroom retains existing validated engine',()=>{assert.equal(r.status,200);assert.equal(applied[0].id,'bedroom-existing-validated');assert.equal(r.body.validation.newRoomIds[0],'new-bedroom');assert.equal(calls.length,2);});
r=await run(makePlan([{...split,direction:'lower',newRoomName:'书房',newRoomSemantic:'study'}]));check('new direction and study route use generic geometry',()=>{assert.equal(r.status,200);assert.equal(applied[0].id,'candidate-op1');assert.equal(r.body.validation.newRoomIds[0],'new-op1');});
console.log(JSON.stringify({kind:'CONTROLLED_STUB_ONLY_NOT_REAL_AI_OR_GEOMETRY',passed}));
})().catch(e=>{console.error(e);process.exitCode=1});
