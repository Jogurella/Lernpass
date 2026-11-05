const encode=new TextEncoder();
export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function sha(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
async function codeHash(code,env){if(!env.AI_KEY_ENCRYPTION_KEY)throw Error('Server secret missing');const key=await crypto.subtle.importKey('raw',encode.encode(env.AI_KEY_ENCRYPTION_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encode.encode('pair|'+code))),b=>b.toString(16).padStart(2,'0')).join('');}
async function body(request){if(Number(request.headers.get('content-length'))>8192)throw Error('Die Anfrage ist zu groß.');const text=await request.text();if(text.length>8192)throw Error('Die Anfrage ist zu groß.');const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ungültige Anfrage.');return value;}
function deviceInput(value){const name=typeof value.name==='string'?value.name.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,80):'';if(!name||!['win','ios'].includes(value.platform))throw Error('Gib einen Gerätenamen und eine gültige Plattform an.');return {name,platform:value.platform};}
export async function authenticate(request,env){const value=request.headers.get('authorization')||'',match=/^Bearer ([a-f0-9]{64})$/.exec(value);if(!match)return null;return env.DB.prepare('SELECT id, account_id, name, platform FROM devices WHERE token_hash = ?').bind(await sha(match[1])).first();}
async function throttle(request,env,kind,max,now){const ip=request.headers.get('cf-connecting-ip')||'local',bucket=kind+'|'+await sha(ip);const row=await env.DB.prepare('INSERT INTO device_rate_limits(bucket,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN reset_at <= ? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END RETURNING attempts').bind(bucket,now+600000,now,now).first();return row.attempts<=max;}
export function createDevices({now=()=>Date.now()}={}){
 return async function handle(request,env,device){const url=new URL(request.url),path=url.pathname,time=now(),at=new Date(time).toISOString();
  if(!env.DB)return json({error:'Der Kontospeicher ist noch nicht eingerichtet.'},503);
  try{
   if(path==='/api/account'&&request.method==='POST'){
    if(!await throttle(request,env,'account',5,time))return json({error:'Bitte in zehn Minuten erneut versuchen.'},429);
    if(!env.AI_KEY_ENCRYPTION_KEY)return json({error:'Der Server benötigt zuerst seinen Verschlüsselungsschlüssel.'},503);
    const input=deviceInput(await body(request)),accountId='account_'+crypto.randomUUID(),id=crypto.randomUUID(),token=randomToken();
    await env.DB.batch([env.DB.prepare('INSERT INTO accounts(id,created_at) VALUES (?,?)').bind(accountId,at),env.DB.prepare('INSERT INTO devices(id,account_id,name,platform,token_hash,created_at,last_seen) VALUES (?,?,?,?,?,?,?)').bind(id,accountId,input.name,input.platform,await sha(token),at,at)]);
    return json({token,deviceId:id,accountId},201);
   }
   if(path==='/api/pair/claim'&&request.method==='POST'){
    if(!await throttle(request,env,'claim',5,time))return json({error:'Zu viele Versuche. Warte zehn Minuten und fordere einen neuen Code an.'},429);
    const value=await body(request),input=deviceInput(value);
    if(typeof value.code!=='string'||!/^\d{6}$/.test(value.code))return json({error:'Der Code ist ungültig oder abgelaufen.'},400);
    const id=crypto.randomUUID(),token=randomToken(),hash=await codeHash(value.code,env),tokenHash=await sha(token);
    const result=await env.DB.batch([
     env.DB.prepare('UPDATE pairing_codes SET claimed_at=?,claimed_device_id=? WHERE code_hash=? AND claimed_at IS NULL AND expires_at>?').bind(time,id,hash,time),
     env.DB.prepare('INSERT INTO devices(id,account_id,name,platform,token_hash,created_at,last_seen) SELECT ?,account_id,?,?,?,?,? FROM pairing_codes WHERE code_hash=? AND claimed_device_id=?').bind(id,input.name,input.platform,tokenHash,at,at,hash,id)
    ]);
    if(result[1].meta?.changes!==1)return json({error:'Der Code ist ungültig oder abgelaufen.'},400);
    return json({token,deviceId:id},201);
   }
   if(!device)return json({error:'Dieses Gerät ist nicht verbunden. Kopple es in den Einstellungen.'},401);
   if(path==='/api/pair/start'&&request.method==='POST'){
    if(!await throttle(request,env,'pair-start-'+device.account_id,10,time))return json({error:'Bitte warte, bevor du einen weiteren Code anforderst.'},429);
    await env.DB.prepare('DELETE FROM pairing_codes WHERE account_id=? OR expires_at<=?').bind(device.account_id,time).run();
    let code,inserted=false;
    for(let tries=0;tries<8&&!inserted;tries++){
     const number=crypto.getRandomValues(new Uint32Array(1))[0];if(number>=4294000000)continue;code=String(number%1000000).padStart(6,'0');
     const result=await env.DB.prepare('INSERT OR IGNORE INTO pairing_codes(code_hash,account_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await codeHash(code,env),device.account_id,time,time+600000).run();inserted=result.meta?.changes===1;
    }
    if(!inserted)return json({error:'Der Code konnte gerade nicht erstellt werden. Versuche es erneut.'},503);
    return json({code,expiresAt:new Date(time+600000).toISOString()});
   }
   if(path==='/api/devices'&&request.method==='GET'){
    const result=await env.DB.prepare('SELECT id,name,platform,created_at,last_seen FROM devices WHERE account_id=? ORDER BY created_at,id').bind(device.account_id).all();return json({devices:result.results,currentDeviceId:device.id});
   }
   const remove=/^\/api\/devices\/([a-f0-9-]{36})$/.exec(path);
   if(remove&&request.method==='DELETE'){
    if(remove[1]===device.id)return json({error:'Dieses Gerät ist gerade aktiv. Entferne es über ein anderes gekoppeltes Gerät.'},400);
    const result=await env.DB.prepare('DELETE FROM devices WHERE id=? AND account_id=?').bind(remove[1],device.account_id).run();return result.meta?.changes===1?json({removed:true}):json({error:'Dieses Gerät wurde nicht gefunden.'},404);
   }
   return json({error:'Diese Gerätefunktion ist nicht vorhanden.'},404);
  }catch(error){return json({error:error instanceof SyntaxError?'Die Anfrage ist nicht lesbar.':/Gerätenamen|Plattform|Anfrage/.test(error.message)?error.message:'Die Geräteverbindung konnte gerade nicht verarbeitet werden.'},/Gerätenamen|Plattform|Anfrage/.test(error.message)||error instanceof SyntaxError?400:503);}
 };
}
