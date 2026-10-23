// Disposable visual regression harness, not an application route.
const {buildSync}=require('/app/node_modules/esbuild');
const {createServer}=require('node:http');
const {readFileSync}=require('node:fs');
buildSync({entryPoints:['/workspace/tests/image-alignment/browser-preview.tsx'],bundle:true,jsx:'automatic',nodePaths:['/app/node_modules'],platform:'browser',outfile:'/tmp/alignment-preview.js',define:{'process.env.NODE_ENV':'"production"'}});
createServer((req,res)=>{
 try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><div id="root"></div><script src="/preview.js"></script></html>');}
  if(req.url==='/preview.js'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync('/tmp/alignment-preview.js'));}
  if(req.url==='/globals.css'){res.setHeader('Content-Type','text/css');return res.end(readFileSync('/app/app/globals.css'));}
  const allowed=['source.png','legacy-stretched.png','portrait-source.png','portrait-legacy.png'];
  const name=req.url.slice(1);if(!allowed.includes(name)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type','image/png');res.end(readFileSync('/workspace/tests/image-alignment/results/'+name));
 }catch(error){res.statusCode=500;res.end(String(error));}
}).listen(8800,'0.0.0.0',()=>console.log('Alignment visual fixture listening on 8800; no AI inference'));
