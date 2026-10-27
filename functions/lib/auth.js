const textEncoder=new TextEncoder();
export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
export function error(message,status=400){return json({error:message},status)}
export function secureCookie(name,value,maxAge){return name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge}
export function clearCookie(name){return name+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}
export function readCookie(request,name){const raw=request.headers.get('Cookie')||'';for(const part of raw.split(';')){const [key,...value]=part.trim().split('=');if(key===name)return value.join('=')}return null}
export async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',textEncoder.encode(value));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',textEncoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=await crypto.subtle.sign('HMAC',key,textEncoder.encode(value));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('')}
export function randomToken(bytes=32){const data=crypto.getRandomValues(new Uint8Array(bytes));return Array.from(data).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function readJson(request){const type=request.headers.get('Content-Type')||'';if(!type.includes('application/json'))throw new Error('İstek biçimi geçersiz.');const raw=await request.text();if(raw.length>20000)throw new Error('İstek çok büyük.');try{return JSON.parse(raw)}catch{throw new Error('İstek okunamadı.')}}
export function validEmail(value){return typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
export async function currentUser(request,env){const token=readCookie(request,'__Host-pace_session');if(!token)return null;const tokenHash=await digest(token);return env.DB.prepare('SELECT users.id, users.email, users.week_start FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>? LIMIT 1').bind(tokenHash,new Date().toISOString()).first()}
export async function requireSameOrigin(request){const origin=request.headers.get('Origin');if(!origin)return false;try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}}
export function sessionCookie(token){return secureCookie('__Host-pace_session',token,60*60*24*30)}
