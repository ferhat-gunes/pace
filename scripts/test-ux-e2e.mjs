import { fulfillFeatureRequest } from './browser-feature-contracts.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const base=process.env.PACE_BASE_URL||'http://localhost:5173';
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(10000);
 let authorized=true,deleted=false;const unexpected=[];
 const user={id:'review-user',email:'review@example.test',week_start:1};
 await page.route('**/api/**',async route=>{
    if(await fulfillFeatureRequest(route))return;
  const path=new URL(route.request().url()).pathname,method=route.request().method();let status=200,body;
  if(path==='/api/habits'&&method==='GET'){if(authorized)body={user,habits:[],checkins:[]};else{status=401;body={error:'Giriş gerekli'}}}
  else if(path==='/api/groups'&&method==='GET')body={groups:[]};
  else if(path==='/api/auth/logout'&&method==='POST'){authorized=false;body={ok:true};}
  else if(path==='/api/account'&&method==='DELETE'){authorized=false;deleted=true;body={ok:true};}
  else{unexpected.push(`${method} ${path}`);status=501;body={error:'Unexpected endpoint'}}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(base+'/?noworker=1#today');await page.locator('#view-today h1').waitFor();
 for(const view of ['groups','progress','settings']){await page.locator(`.mobile-nav [data-view="${view}"]`).click();await page.locator(`#view-${view} h1`).waitFor();}
 await page.goBack();await page.locator('#view-progress').waitFor();await page.reload();await page.locator('#view-progress').waitFor();
 assert.equal(new URL(page.url()).hash,'#progress');
 await page.locator('.mobile-nav [data-view="settings"]').click();await page.locator('#view-settings').waitFor();
 await page.evaluate(()=>{Storage.prototype.removeItem=function(){throw new DOMException('Storage unavailable','SecurityError')}});
 await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Alışkanlıkların için giriş yap'}).waitFor();
 assert.equal(authorized,false);assert.equal(await page.getByText(user.email,{exact:true}).count(),0);
 authorized=true;await page.reload();await page.locator('.mobile-nav [data-view="settings"]').click();await page.locator('#view-settings').waitFor();
 await page.getByRole('button',{name:'Hesabı Sil',exact:true}).click();await page.locator('#delete-phrase').fill('SİL');
 await page.getByRole('button',{name:'Evet, Kalıcı Olarak Sil',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Alışkanlıkların için giriş yap'}).waitFor();assert.equal(deleted,true);
 assert.deepEqual(unexpected,[]);
 console.log('PASS: history/reload navigation, successful logout despite storage cleanup failure, successful account deletion clears session');
}finally{await browser.close()}
