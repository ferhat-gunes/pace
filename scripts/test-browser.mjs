import {spawn} from 'node:child_process';
const base=process.env.PACE_BASE_URL||'http://127.0.0.1:5199';
let server;
if(!process.env.PACE_BASE_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5199','--strictPort'],{stdio:'ignore'});}
const run=file=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[`scripts/${file}`],{stdio:'inherit',env:{...process.env,PACE_BASE_URL:base}});p.once('error',reject);p.once('exit',code=>code===0?resolve():reject(new Error(`${file} failed (${code})`)))});
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,150))}if(!ready)throw new Error('Test server did not start');
 const selected=process.env.PACE_BROWSER_TESTS?.split(',').filter(Boolean);
 for(const file of selected || ['test-hook-sync-e2e.mjs','test-habit-editor-e2e.mjs','test-e2e-suite.mjs'])await run(file);
}finally{server?.kill('SIGTERM')}
