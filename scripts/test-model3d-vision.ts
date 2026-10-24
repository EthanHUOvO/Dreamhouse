import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { model3dDimensionViews,validateModelDimensionEvidence } from '../lib/ai/model3d-vision-input';

test('dimension views are four decodable same-source crops and leave original bytes unchanged',async()=>{
 const bytes=await sharp({create:{width:748,height:718,channels:3,background:'#ffffff'}}).png().toBuffer();
 const dataUrl=`data:image/png;base64,${bytes.toString('base64')}`;
 const views=await model3dDimensionViews(dataUrl);
 assert.equal(views.length,4);assert.equal(dataUrl,`data:image/png;base64,${bytes.toString('base64')}`);
 for(const view of views){const meta=await sharp(Buffer.from(view.dataUrl.split(',')[1],'base64')).metadata();assert.ok(meta.width&&meta.height);assert.ok(meta.width<=1536);assert.equal(meta.format,'png');}
});
test('printed dimension chain arithmetic agrees with metre polygon bounds',()=>{
 const args={scaleMethod:'drawing-dimensions',outerPolygon:[[0,0],[6.63,0],[6.63,8.383],[0,8.383]],dimensionEvidence:{unit:'mm',horizontalChains:[[1967,1314,3349],[3281,1732,1617]],verticalChains:[[2210,4777,1396],[3873,3109]]}};
 assert.doesNotThrow(()=>validateModelDimensionEvidence(args));
 const before=JSON.stringify(args);assert.throws(()=>validateModelDimensionEvidence({...args,outerPolygon:[[0,0],[10.01,0],[10.01,11.48],[0,11.48]]}),/disagree/);assert.equal(JSON.stringify(args),before);
});
test('claimed measured dimensions need actual positive mm chains; explicit estimation stays identified',()=>{
 const base={scaleMethod:'drawing-dimensions',outerPolygon:[[0,0],[6,0],[6,4],[0,4]]};
 for(const dimensionEvidence of [undefined,{unit:'m',horizontalChains:[[6]],verticalChains:[[4]]},{unit:'mm',horizontalChains:[[NaN]],verticalChains:[[4000]]}])assert.throws(()=>validateModelDimensionEvidence({...base,dimensionEvidence}));
 assert.doesNotThrow(()=>validateModelDimensionEvidence({...base,scaleMethod:'standard-door-estimate'}));
});
