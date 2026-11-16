import { fulfillFeatureRequest } from './browser-feature-contracts.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
try {
 const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.clock.install({time:new Date('2026-11-18T12:00:00Z')});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:'test-ui',email:'ui@example.test'};
 const habits=[{id:'h',name:'Kısa yürüyüş',start_date:'2026-11-16',tracking:'quantity',target:.25,unit:'km',direction:'at_least',schedule:{type:'daily'},progression:{enabled:false},debt:{enabled:false}},{id:'w',name:'Haftalık meditasyon',start_date:'2026-11-16',tracking:'check',target:1,schedule:{type:'weekly_quota',times_per_week:2},progression:{enabled:false},debt:{enabled:false}}];
 let checkins=[{id:'a',habit_id:'w',habit_date:'2026-11-16',value:1,revision:1},{id:'b',habit_id:'w',habit_date:'2026-11-17',value:1,revision:1}];let puts=[];
 await page.route('**/api/**',async route=>{
    if(await fulfillFeatureRequest(route))return;
  const req=route.request(),path=new URL(req.url()).pathname;
  let body;
  if(path==='/api/habits'&&req.method()==='GET')body={user,habits,checkins};
  else if(path==='/api/groups')body={groups:[]};
  else if(path==='/api/auth/me')body={user};
  else if(path.startsWith('/api/habits/h/check-ins/')&&req.method()==='PUT'){
   const payload=req.postDataJSON();puts.push(payload);const row={id:'saved',habit_id:'h',habit_date:path.split('/').at(-1),value:payload.value,revision:puts.length};checkins=[...checkins.filter(r=>r.habit_id!=='h'),row];body={checkin:row};
  }else throw new Error('Unexpected request '+req.method()+' '+path);
  await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto((process.env.PACE_BASE_URL || 'http://localhost:5173') + '/?noworker=1');await page.locator('#today-list').waitFor();
 await page.getByText('Bu hafta 2 / 2 gün · Haftalık hedef tamamlandı',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Haftalık meditasyon tamamlandı olarak işaretle',exact:true}).waitFor();
 await page.getByRole('button',{name:'Kısa yürüyüş güncel miktar: 0, değiştirmek için tıkla',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Kısa yürüyüş miktarı',exact:true});
 await input.fill('');await page.getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Miktarı gir.'}).waitFor();assert.equal(puts.length,0);
 await input.fill('0,25');await input.blur();assert.equal(puts.length,0,'blur never saves amount');
 await page.getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Kısa yürüyüş miktarı"]'));
 await page.waitForTimeout(400);assert.equal(puts.length,1);assert.equal(puts[0].value,.25);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.clock.fastForward(86400000);
 await page.waitForFunction(()=>document.querySelector('#selected-date-label')?.textContent.includes('Bugün, 19 Kasım'));
 await page.locator('.week-day').filter({has:page.locator('strong', {hasText:/^18$/})}).click();
 await page.clock.fastForward(86400000);
 await page.waitForFunction(()=>{const label=document.querySelector('#selected-date-label')?.textContent;return label?.includes('18 Kasım')&&!label.startsWith('Bugün');});
 await page.locator('.mobile-nav [data-view="progress"]').click();
 await page.getByText('Toplam (km)',{exact:true}).waitFor();await page.getByText('Günlük ortalama (km)',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS Today UI: blank rejection, explicit decimal save, no blur writes, weekly/daily distinction, quantity report, no mobile overflow, midnight rollover and deliberate past-date preservation');
} finally {await browser.close();}
