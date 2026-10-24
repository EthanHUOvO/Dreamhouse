const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const repo=path.resolve(__dirname,'../..');
// Reuse an existing runtime. No network request or package installation.
const typescriptPaths=[process.env.TYPESCRIPT_PATH,'typescript','/app/node_modules/typescript',path.resolve(repo,'../../structure-edit-20261013/deps/typescript.js')].filter(Boolean);
let ts;
for(const p of typescriptPaths){try{ts=require(p);break;}catch{}}
if(!ts)throw new Error('Existing TypeScript runtime not found; set TYPESCRIPT_PATH. See README.md.');
function load(file,imports={}){const source=fs.readFileSync(repo+'/'+file,'utf8');const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(result.diagnostics.length,0);const exports={};vm.runInNewContext(result.outputText,{exports,require:n=>{assert.ok(n in imports,n);return imports[n]},console,Date,JSON,Math,Number,Set,Array,Object,Error,AbortSignal});return exports;}
const intent=load('v2/step2-edit/floorplan-edit-intent.ts');
const rooms=[{id:'living',name:'客餐厅',semantic:'living_room'},{id:'kitchen',name:'厨房',semantic:'kitchen'},{id:'bath',name:'卫生间',semantic:'bathroom'},{id:'master',name:'主卧',semantic:'master_bedroom'}];
const base={action:'add_bedroom',targetRoomId:'living',region:'upper',roomCount:1,minAreaM2:null,protectedRoomIds:['kitchen','bath','master'],preserveEntrance:true,preserveOtherRooms:true,entryFromRoomId:'living',unhandledRequirements:[],summary:'客餐厅上侧新增卧室，保留通道厨卫',message:'新增卧室'};
let assertions=0;
function check(name,fn){fn();assertions++;console.log('PASS',name)}
check('accept valid single-bedroom constraints',()=>assert.equal(intent.validateFloorplanIntent(base,rooms).action,'add_bedroom'));
for(const [name,changes,code] of [
['unknown room',{targetRoomId:'missing'},'EDIT_INTENT_UNKNOWN_ROOM'],['missing protected room',{protectedRoomIds:['bath']},'EDIT_PROTECTED_ROOMS_INCOMPLETE'],['blocked entrance',{preserveEntrance:false},'EDIT_PROTECTION_REQUIRED'],['unsupported exact width',{unhandledRequirements:['新卧室必须长4米宽3米']},'EDIT_REQUIREMENTS_UNSUPPORTED'],['two bedrooms',{roomCount:2},'EDIT_BEDROOM_SCOPE_UNSUPPORTED'],['wrong entry',{entryFromRoomId:'kitchen'},'EDIT_BEDROOM_SCOPE_UNSUPPORTED'],['unknown property',{ignoreValidation:true},'EDIT_INTENT_SCHEMA_INVALID'],['invalid min area',{minAreaM2:Infinity},'EDIT_INTENT_SCHEMA_INVALID']])check(name,()=>assert.throws(()=>intent.validateFloorplanIntent({...base,...changes},rooms),e=>e.code===code));
for(const region of ['upper','lower','left','right','any','unspecified'])check('accept bedroom region '+region,()=>assert.equal(intent.validateFloorplanIntent({...base,region},rooms).region,region==='unspecified'?'any':region));
for(const region of ['upper','lower','left','right','upper-left','upper-right','lower-left','lower-right','any'])check('bathroom direction '+region,()=>assert.equal(intent.validateFloorplanIntent({...base,action:'add_bathroom',targetRoomId:'master',entryFromRoomId:'master',protectedRoomIds:['living','kitchen','bath'],region},rooms).region,region));
const response=(name,args)=>({model:'CONTROL-STUB-NOT-AI',id:'stub',choices:[{finish_reason:'tool_calls',message:{tool_calls:[{id:'call1',type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
check('reject multiple tool calls',()=>{const r=response('parse_floorplan_intent',base);r.choices[0].message.tool_calls.push(r.choices[0].message.tool_calls[0]);assert.throws(()=>intent.readSingleToolCall(r,'parse_floorplan_intent'),e=>e.code==='LLM_TOOL_RESPONSE_INCOMPLETE')});
let aiCalls=[],applies=0,replyQueue=[],candidateList=[{id:'upper-1',newAreaM2:6,remainingAreaM2:10}],seenConstraints;
const route=load('v2/step2-edit/svg-edit-route.ts',{
'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
'@/lib/ai/qwen-client':{qwenChatCompletion:async(body,options)=>{aiCalls.push({body,options});const r=replyQueue.shift();assert.ok(r,'unexpected inference');return r;}},
'@/lib/ai/svg-edit-geometry':{},
'@/lib/ai/bathroom-edit-geometry':{},
'@/lib/ai/bedroom-edit-geometry':{bedroomEditContext:()=>({rooms,unit:'meter'}),bedroomPartitionAnalysis:(_s,c)=>{seenConstraints=c;return {candidates:candidateList,diagnostics:{searchLimited:false}}},applyBedroomPartition:(svg,id,c)=>{assert.equal(svg,'original svg');assert.equal(id,'upper-1');assert.deepEqual(c,seenConstraints);applies++;return{svg:'validated new svg',structure:{rooms:[]},validation:{valid:true}}}},
'@/lib/ai/floorplan-edit-intent':intent,
});
async function run(instruction,parsed,selection={candidateId:'upper-1',unmetRequirements:[],reason:'满足上侧及通道条件'}){aiCalls=[];applies=0;replyQueue=[response('parse_floorplan_intent',parsed),response('select_floorplan_candidate',selection)];return route.POST({json:async()=>({svgText:'original svg',instruction}),signal:new AbortController().signal});}
(async()=>{
let r=await run('在客餐厅上侧新增一个卧室',base);check('route performs parse then candidate selection and validates once',()=>{assert.equal(r.status,200);assert.equal(aiCalls.length,2);assert.equal(aiCalls[0].body.tool_choice.function.name,'parse_floorplan_intent');assert.equal(aiCalls[1].body.tool_choice.function.name,'select_floorplan_candidate');assert.equal(applies,1);assert.equal(r.body.svg,'validated new svg');assert.equal(r.body.provenance.inference.length,2);});
for(const [label,action]of [['negation','no_change'],['delete instead of add','unsupported'],['furniture edit','unsupported'],['ambiguous position','clarification']]){r=await run(label,{...base,action});check(label+' returns unchanged after semantic parse',()=>{assert.equal(r.status,422);assert.equal(aiCalls.length,1);assert.equal(applies,0);assert.equal(r.body.rolledBack,true);assert.equal(r.body.svg,undefined);});}
r=await run('同时移动沙发',{...base,unhandledRequirements:['沙发右移']});check('compound requirement is not partially applied',()=>{assert.equal(r.status,422);assert.equal(applies,0);assert.equal(aiCalls.length,1);});
candidateList=[];r=await run('在客餐厅上侧新增一个卧室',base);check('no feasible geometry skips selection and rolls back',()=>{assert.equal(r.body.error,'EDIT_NO_FEASIBLE_BEDROOM');assert.equal(aiCalls.length,1);assert.equal(applies,0)});
candidateList=[{id:'upper-1'}];r=await run('在客餐厅上侧新增一个卧室',base,{candidateId:'invented',unmetRequirements:[],reason:'invalid'});check('unknown model candidate rejected',()=>{assert.equal(r.body.error,'EDIT_CANDIDATE_UNKNOWN');assert.equal(applies,0)});
r=await run('上侧新增卧室，必须采光窗',base,{candidateId:'upper-1',unmetRequirements:['缺少采光窗'],reason:'unsatisfied'});check('selection rechecks omitted requirements',()=>{assert.equal(r.body.error,'EDIT_REQUIREMENTS_UNSATISFIED');assert.equal(applies,0)});
candidateList=Array.from({length:36},(_,i)=>({id:`upper-${i+1}`,newAreaM2:6+i*.1,remainingAreaM2:12-i*.1,position:'upper',entranceClearanceM:.9,svg:'must-not-send',structure:{secret:'must-not-send'},additions:[{x1:1}]}));
r=await run('上侧新增卧室',base);check('candidate prompt is bounded and contains only decision metadata',()=>{const payload=JSON.parse(aiCalls[1].body.messages[1].content);assert.equal(payload.candidates.length,6);assert.equal(payload.candidates[0].newAreaM2,6);assert.equal(payload.candidates[0].entranceClearanceM,.9);assert.ok(!('svg' in payload.candidates[0]));assert.ok(!('structure' in payload.candidates[0]));assert.ok(!('additions' in payload.candidates[0]));});

// Integration of actual parser, partition geometry and route. Only model and
// NextResponse are controlled test doubles; no external request is possible.
const actualRoot=process.env.BEDROOM_ACTUAL_RUNTIME_ROOT;
const svgGeometry=actualRoot?require(actualRoot+'/lib/ai/svg-geometry.ts'):load('v2/step3-3d/svg-geometry.ts');
const svgEdit=actualRoot?require(actualRoot+'/lib/ai/svg-edit-geometry.ts'):load('v2/step3-3d/svg-edit-geometry.ts',{'./svg-geometry':svgGeometry});
const bedroomGeometry=actualRoot?require(actualRoot+'/lib/ai/bedroom-edit-geometry.ts'):load('v2/step3-3d/bedroom-edit-geometry.ts',{'./svg-geometry':svgGeometry,'./svg-edit-geometry':svgEdit});
const original=fs.readFileSync(path.join(repo,'public/preset/svg-v2/one/option-01.svg'),'utf8');
const actualContext=bedroomGeometry.bedroomEditContext(original),living=actualContext.rooms.find(r=>r.semantic==='living_room');
const actualIntent={...base,targetRoomId:living.id,entryFromRoomId:living.id,protectedRoomIds:actualContext.rooms.filter(r=>r.id!==living.id).map(r=>r.id)};
let realModelCalls=0;
const actualRoute=load('v2/step2-edit/svg-edit-route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
  '@/lib/ai/qwen-client':{qwenChatCompletion:async(body)=>{realModelCalls++;if(body.tool_choice.function.name==='parse_floorplan_intent')return response('parse_floorplan_intent',actualIntent);const p=JSON.parse(body.messages[1].content);assert.ok(p.candidates.length>0&&p.candidates.length<=6);return response('select_floorplan_candidate',{candidateId:p.candidates[0].id,unmetRequirements:[],reason:'控制桩选中几何程序的首个合法候选'});}},
  '@/lib/ai/bathroom-edit-geometry':{},
  '@/lib/ai/svg-edit-geometry':svgEdit,'@/lib/ai/bedroom-edit-geometry':bedroomGeometry,'@/lib/ai/floorplan-edit-intent':intent,
});
const realResult=await actualRoute.POST({json:async()=>({svgText:original,instruction:'在客餐厅上侧新增一个卧室，保留入户通道和厨卫位置'}),signal:new AbortController().signal});
if(realResult.status!==200)console.error('Actual geometry diagnostics',bedroomGeometry.bedroomPartitionAnalysis(original,{targetRoomId:living.id,region:'upper',protectedRoomIds:actualIntent.protectedRoomIds,preserveEntrance:true}).diagnostics);
check('actual one-option-01 geometry and route integrate',()=>{assert.equal(realResult.status,200,JSON.stringify(realResult.body));assert.equal(realModelCalls,2);assert.equal(realResult.body.validation.valid,true);assert.notEqual(realResult.body.svg,original);const after=svgGeometry.svgToStructure(realResult.body.svg);assert.equal(after.rooms.length,actualContext.rooms.length+1);const before=svgGeometry.svgToStructure(original);for(const old of before.rooms.filter(r=>r.id!==living.id)){const next=after.rooms.find(r=>r.id===old.id);assert.equal(JSON.stringify(next.polygon),JSON.stringify(old.polygon));}assert.ok(realResult.body.validation.checks.includes('entrance-circulation'));assert.equal(fs.readFileSync(path.join(repo,'public/preset/svg-v2/one/option-01.svg'),'utf8'),original);});
console.log(JSON.stringify({kind:'CONTROLLED_STUB_ONLY_NOT_REAL_AI',passed:assertions}));
})().catch(e=>{console.error(e);process.exitCode=1});
