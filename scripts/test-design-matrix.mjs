import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const results=[],errors=[];
const output=process.env.PACE_AUDIT_OUTPUT||'/tmp/pace-design-audit';await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PACE_BASE_URL||'http://localhost:5173')+'/?demo=1&noworker=1');await page.locator('#view-today').waitFor();await page.evaluate(()=>document.fonts.ready);
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>{localStorage.setItem('pace_theme',theme);window.dispatchEvent(new StorageEvent('storage',{key:'pace_theme',newValue:theme}));},theme);
  await page.waitForFunction(t=>(document.documentElement.getAttribute('data-theme')==='dark')===(t==='dark'),theme);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:width<768?844:1000});const nav=width<768?'.mobile-nav':'.sidebar';
   for(const view of ['today','habits','discover','progress','groups','settings']){
    if(width<768&&view==='discover'){
     await page.locator('.mobile-nav [data-view="habits"]').click();
     await page.locator('#view-habits h1').waitFor();
     await page.getByRole('button',{name:'Rutin şablonlarını keşfet',exact:true}).click();
    }else if(width<768&&view==='settings'){
     await page.evaluate(()=>{location.hash='#settings';});
    }else{
     await page.locator(`${nav} [data-view="${view}"]`).click();
    }
    await page.locator(`#view-${view} h1`).waitFor();await page.evaluate(()=>document.fonts.ready);
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const result=await page.evaluate(async()=>{
     const report=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
     return {overflow:document.documentElement.scrollWidth>innerWidth,violations:report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),smallTargets:[...document.querySelectorAll('button')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&!el.closest('[inert]')&&(r.width<43.5||r.height<43.5)}).map(el=>({label:el.getAttribute('aria-label')||el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))};
    });
    results.push({theme,width,view,...result});
    if(result.overflow||result.violations.length||result.smallTargets.length)console.log('ISSUE',theme,width,view,JSON.stringify(result));
    if(width===390||width===1440&&view==='today')await page.screenshot({path:`${output}/${theme}-${width}-${view}.png`,fullPage:true});
   }
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.mobile-nav [data-view="today"]').click();await page.getByRole('button',{name:'Yeni alışkanlık ekle',exact:true}).filter({visible:true}).first().click();
 await page.locator('#view-habit-form h1').waitFor();await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const modal=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
 results.push({theme:'dark',width:390,view:'habit-form',violations:modal});await page.screenshot({path:`${output}/dark-390-habit-form.png`});
 await writeFile(`${output}/results.json`,JSON.stringify({date:new Date().toISOString(),results,errors},null,2));
 assert.deepEqual(errors,[],'browser runtime errors');
 assert.equal(results.filter(r=>r.overflow).length,0,'page overflow');
 assert.equal(results.reduce((n,r)=>n+(r.violations?.length||0),0),0,'axe violations; see audit results');
 assert.equal(results.reduce((n,r)=>n+(r.smallTargets?.length||0),0),0,'small targets; see audit results');
 console.log(`PASS: ${results.length} design/accessibility states, no overflow, no small buttons, no runtime errors. Report ${output}/results.json`);
}finally{await browser.close();}
