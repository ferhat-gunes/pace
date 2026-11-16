import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.PACE_BASE_URL||'http://localhost:5173')+'/?demo=1&noworker=1&view=discover&preset=morning-walk-15');
 await p.locator('#view-discover h1').waitFor();assert.equal(await p.locator('.mobile-nav .nav-item').count(),6);
 const trial=p.locator('#view-discover article').filter({has:p.getByRole('heading',{name:'Açık Hava Yürüyüşü',exact:true})});
 await trial.getByRole('button',{name:'Ritimime Ekle',exact:true}).click();await trial.getByRole('button',{name:'Listende Var',exact:true}).waitFor();
 await p.locator('.mobile-nav [data-view="today"]').click();await p.locator('#view-today h1').waitFor();await p.locator('.daily-quest-banner').waitFor();
 await p.reload();await p.locator('#view-today h1').waitFor();assert.equal(new URL(p.url()).hash,'#today');
 await p.getByRole('button',{name:/\d+ kalkan$/}).click();await p.getByRole('dialog',{name:'Seri kalkanı',exact:true}).waitFor();await p.getByRole('button',{name:'Kapat',exact:true}).click();
 const guest=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});guest.setDefaultTimeout(10000);guest.on('pageerror',e=>errors.push(e.message));
 let authenticated=false,imports=0,cloudHabits=[];const unexpected=[];
 const account={id:'merged-user',email:'merged@example.test',week_start:1};
 await guest.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();let status=200,body;
  if(path==='/api/auth/capabilities')body={email_code_enabled:false,push_enabled:false};
  else if(path==='/api/habits'&&method==='GET'){if(authenticated)body={user:account,habits:cloudHabits,checkins:[]};else{status=401;body={error:'Giriş gerekli'}}}
  else if(path==='/api/groups')body={groups:[]};
  else if(path==='/api/social/inbox')body={items:[]};
  else if(path==='/api/gamification')body={ok:true,gamification:route.request().postDataJSON()||{}};
  else if(path==='/api/auth/login'){authenticated=true;body={ok:true,user:account};}
  else if(path==='/api/import'&&method==='POST'){imports++;const input=route.request().postDataJSON();cloudHabits=input.habits;body={ok:true,habits_count:input.habits.length,checkins_count:input.checkins.length};}
  else{unexpected.push(method+' '+path);status=501;body={error:'Unexpected test endpoint'}}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 const base=process.env.PACE_BASE_URL||'http://localhost:5173';await guest.goto(base+'/?noworker=1');await guest.locator('#view-today h1').waitFor();
 await guest.locator('.mobile-fab').click();await guest.locator('#habit-name').fill('Kalıcı misafir rutini');await guest.getByRole('button',{name:'Alışkanlığı Kaydet',exact:true}).click();await guest.locator('.habit-name').filter({hasText:'Kalıcı misafir rutini'}).waitFor();
 await guest.reload();await guest.locator('.habit-name').filter({hasText:'Kalıcı misafir rutini'}).waitFor();
 await guest.locator('#account-button').click();await guest.locator('#auth-email').fill(account.email);await guest.locator('#auth-password').fill('Secure-password-123');await guest.locator('#auth-form button[type="submit"]').click();
 const transfer=guest.getByRole('button',{name:'Onayla ve hesabıma aktar',exact:true});await transfer.waitFor();assert.equal(imports,0,'guest data must not silently migrate');
 await transfer.click();await transfer.waitFor({state:'detached'});assert.equal(imports,1);await guest.locator('.habit-name').filter({hasText:'Kalıcı misafir rutini'}).waitFor();
 await guest.locator('.mobile-nav [data-view="settings"]').click();await guest.locator('#view-settings h1').waitFor();await guest.locator('#notification-settings-title').waitFor();
 assert.equal(await guest.getByLabel('Sessiz saat başlangıcı',{exact:true}).inputValue(),'22:00');
 assert.deepEqual(unexpected,[]);await guest.close();
 assert.deepEqual(errors,[]);console.log('PASS merged features: Discover deep link/add, six navigation routes, daily quest/shield, reload respects selected route, guest create/reload and explicit migration, reminder settings');
}finally{await browser.close()}
