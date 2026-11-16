import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const port=process.env.PACE_PWA_PORT||'5194',base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',port,'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}});const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>console.log('PAGE ERROR',e.message));p.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()?.errorText));
 await p.goto(base+'/?demo=1');await p.locator('#view-today').waitFor();
 await p.evaluate(async()=>{await navigator.serviceWorker.ready; if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
 await context.setOffline(true);await p.reload();try{await p.locator('#view-today').waitFor()}catch(error){console.log('OFFLINE BODY',(await p.locator('body').innerText()).slice(0,1000));console.log('CACHES',await p.evaluate(async()=>{const keys=await caches.keys();return Promise.all(keys.map(async k=>[k,(await(await caches.open(k)).keys()).map(r=>r.url)]))}));throw error}
 for(const view of ['groups','progress','settings']){await p.locator(`.mobile-nav [data-view="${view}"]`).click();await p.locator(`#view-${view} h1`).waitFor();}
 console.log('PASS: production offline reload plus previously unvisited lazy group/progress/settings screens');
}finally{await browser?.close();server.kill('SIGTERM')}
