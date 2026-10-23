import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source=readFileSync(new URL('../components/customer/TouchCustomerPortal.tsx',import.meta.url),'utf8');
const expression=source.slice(source.indexOf('  const progressPresentationReady ='),source.indexOf('  const progressValue ='));
const ready=(kind:string,done:boolean,elapsed=0)=>runInNewContext(`${expression}\nprogressPresentationReady;`,{
 progressTask:{kind,ready:done},progressMeta:{estimatedSeconds:150},progressElapsed:elapsed});
test('actual completed or cached AI jobs display completion immediately',()=>{
 for(const kind of ['model','render','image-preview'])assert.equal(ready(kind,true),true);
});
test('estimated elapsed time cannot falsely complete an unfinished AI job',()=>{
 for(const kind of ['model','render','image-preview'])assert.equal(ready(kind,false,1000),false);
});
