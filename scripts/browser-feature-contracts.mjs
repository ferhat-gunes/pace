/** Explicit optional endpoints introduced by preserved latest-main features. */
export async function fulfillFeatureRequest(route){
 const req=route.request(),path=new URL(req.url()).pathname,method=req.method();let data;
 if(method==='GET'&&path==='/api/auth/capabilities')data={email_code_enabled:false,push_enabled:false};
 else if(method==='GET'&&path==='/api/social/inbox')data={items:[]};
 else if(method==='GET'&&path==='/api/push/public-key')data={public_key:null,enabled:false};
 else if(method==='GET'&&path==='/api/gamification')data={gamification:{xp:0,gems:10,streakFreezes:1,claimedDates:{},usedFreezeDates:{},allDoneBonusDates:{}}};
 else if(method==='PUT'&&path==='/api/gamification'){const value=req.postDataJSON();if(!Number.isFinite(value.xp)||!Number.isFinite(value.gems))throw new Error('Invalid gamification write contract');data={ok:true,gamification:value};}
 else return false;
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});return true;
}
