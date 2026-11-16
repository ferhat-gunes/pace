import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const base=process.env.PACE_BASE_URL||'http://localhost:5212';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try{
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.setDefaultTimeout(8000);
 const unexpected=[],errors=[],requests=[];p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});p.on('requestfailed',r=>console.error('REQUEST',r.url(),r.failure()?.errorText));
 await p.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,body=req.postDataJSON();requests.push({path,body});let result;
  if(path==='/api/auth/request-code')result={ok:true,message:'Kod gönderildi.'};
  else if(path==='/api/auth/verify-code'){assert.equal(body.code,'123456');result={ok:true,user:{id:'u',email:'u@example.test',has_password:false}}}
  else if(path==='/api/account/password'){assert.equal(body.new_password,'Yeni-parola-123');result={ok:true,has_password:true}}
  else if(path==='/api/account/recovery-code'){assert.equal(body.password,'Old-12345');result={ok:true,recovery_code:'11111111-22222222-33333333-44444444-55555555-66666666'}}
  else if(path==='/api/groups/g/reactions'){assert.equal(body.target_user_id,'friend');result={reaction:{id:'r1',reaction_type:body.reaction_type}}}
  else{unexpected.push(path);await route.fulfill({status:501,contentType:'application/json',body:JSON.stringify({error:'Unexpected'})});return}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await p.route('**/merge-account-harness.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="tr"><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
 import React from '/node_modules/.vite/deps/react.js';import ReactDOM from'/node_modules/.vite/deps/react-dom_client.js';const{useState}=React,{createRoot}=ReactDOM;
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 const {default:Theme}=await import('/src/theme/ThemeProvider.jsx'),{default:Auth}=await import('/src/components/AuthModal.jsx'),{default:Security}=await import('/src/components/Settings/AccountSecuritySettings.jsx'),{default:Notifications}=await import('/src/components/Settings/NotificationSettings.jsx'),{default:Social}=await import('/src/components/Groups/GroupSocialPanel.jsx'),{useDialogAccessibility}=await import('/src/state/useDialogAccessibility.js');
 const h=React.createElement;function Harness(){useDialogAccessibility();const[auth,A]=useState(false),[user,U]=useState({id:'u',email:'u@example.test',has_password:true}),[notice,N]=useState('');return h('div',{id:'app'},h('button',{onClick:()=>A(true)},'E-postayla aç'),h('p',{id:'auth-result'},notice),h(Security,{user,setUser:U}),h(Notifications,{authorized:false}),h(Social,{group:{id:'g',name:'Ritim'},members:[{user_id:'u',display_name:'Sen'},{user_id:'friend',display_name:'Arkadaş'}],habits:[{id:'h',name:'Oku',tracking:'check',target:1}],checkins:[],reactions:[],user,anchor:'2026-11-16',gamification:{addXp:n=>N('XP '+n)}}),h(Auth,{isOpen:auth,initialMode:'code',emailCodeEnabled:true,onClose:()=>A(false),onAuthSuccess:u=>N(u.email)}))}createRoot(document.getElementById('root')).render(h(Theme,null,h(Harness)));
 </script></body></html>`}));
 await p.goto(base+'/merge-account-harness.html');await p.getByRole('button',{name:'E-postayla aç',exact:true}).click();
 await p.locator('#auth-email').fill('u@example.test');await p.getByRole('button',{name:'Giriş Kodu Gönder',exact:true}).click();await p.locator('#auth-email-code').fill('123456');await p.getByRole('button',{name:'Kodu Doğrula ve Giriş Yap',exact:true}).click();await p.getByRole('dialog').waitFor({state:'detached'});assert.equal(await p.locator('#auth-result').innerText(),'u@example.test');
 await p.getByRole('button',{name:'Parolayı değiştir',exact:true}).click();await p.locator('#security-current-password').fill('Old-12345');await p.locator('#security-new-password').fill('Yeni-parola-123');await p.getByRole('button',{name:'Parolayı kaydet',exact:true}).click();await p.getByRole('button',{name:'Parolayı değiştir',exact:true}).waitFor();
 await p.getByRole('button',{name:'Kurtarma kodunu yenile',exact:true}).click();await p.locator('#security-current-password').fill('Old-12345');await p.getByRole('button',{name:'Yeni kod oluştur',exact:true}).click();await p.getByRole('dialog').waitFor();await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog').isVisible(),true);await p.getByRole('button',{name:'Kodu kaydettim',exact:true}).click();await p.getByRole('dialog').waitFor({state:'detached'});
 await p.getByLabel('Hatırlatma saati',{exact:true}).fill('19:30');await p.getByRole('button',{name:'Grup bildirimleri açık',exact:true}).click();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('pace_notification_settings_v1')).socialEnabled),false);
 await p.getByRole('button',{name:'Arkadaş için tebrik gönder',exact:true}).click();await p.getByRole('button',{name:'👏 Harika ritim, birlikte devam edelim!',exact:true}).click();await p.getByRole('dialog').waitFor({state:'detached'});assert.equal(await p.locator('#auth-result').innerText(),'XP 10');
 assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);assert.equal(requests.length,5);
 console.log('PASS merged account UI: email-code login, change password, retained regenerated recovery code, reminder/quiet/social settings, real cheer API');
}finally{await b.close()}
