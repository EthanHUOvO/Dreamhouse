import fs from 'node:fs';
const source=fs.readFileSync('/workspace/tests/svg-adapter/results/font-check.svg','utf8');
const r=await fetch('http://web:3000/api/ai/svg-render',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({svgText:source})});
if(!r.ok)throw new Error(await r.text());
fs.writeFileSync('/workspace/tests/svg-adapter/results/font-check-after.png',Buffer.from(await r.arrayBuffer()));
console.log(JSON.stringify({status:'PASS',stage:'render-only-no-ai',httpStatus:r.status}));
