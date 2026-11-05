import base from './generated/base-worker.mjs';
import {authenticate,createDevices,json} from './devices.mjs';
const devices=createDevices();
const nativeOrigins=['http://tauri.localhost','https://tauri.localhost','tauri://localhost','capacitor://localhost','https://localhost','http://localhost'];
export function createNativeHandler(baseWorker=base){return {async fetch(request,env,context){
 const url=new URL(request.url),origin=request.headers.get('origin'),allowed=nativeOrigins.includes(origin)||origin===url.origin;
 if(origin&&!allowed)return json({error:'Diese App-Herkunft ist nicht zugelassen.'},403);
 const cors=origin&&allowed?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Case-Id, X-Image-Name','Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, DELETE, OPTIONS'}:{};
 const respond=response=>{const headers=new Headers(response.headers);for(const [k,v]of Object.entries(cors))headers.set(k,v);return new Response(response.body,{status:response.status,headers});};
 if(request.method==='OPTIONS')return respond(new Response(null,{status:204}));
 if(url.pathname==='/health')return respond(json({app:'Lernpass',version:'1.7.0',ready:Boolean(env.DB&&env.BUCKET&&env.AI_KEY_ENCRYPTION_KEY)}));
 if(!url.pathname.startsWith('/api/'))return respond(json({app:'Lernpass',version:'1.7.0',message:'Dieser Server verbindet deine Lernpass-Apps.'}));
 try{
  const device=await authenticate(request,env);
  if(['/api/account','/api/pair/start','/api/pair/claim','/api/devices'].includes(url.pathname)||url.pathname.startsWith('/api/devices/'))return respond(await devices(request,env,device));
  if(!device)return respond(json({error:'Kopple dieses Gerät zuerst mit deinem Lernkonto.'},401));
  if(!['GET','HEAD'].includes(request.method)&&Number(request.headers.get('content-length'))>5*1024*1024)return respond(json({error:'Die Anfrage ist zu groß.'},413));
  const headers=new Headers(request.headers);headers.delete('authorization');headers.set('oai-authenticated-user-id',device.account_id);headers.set('origin',url.origin);
  const forwarded=new Request(request,{headers});
  const response=await baseWorker.fetch(forwarded,{...env,AI_LEGACY_SINGLE_USER:'false'},context);
  const seen=env.DB.prepare('UPDATE devices SET last_seen=? WHERE id=? AND account_id=? AND last_seen<?').bind(new Date().toISOString(),device.id,device.account_id,new Date(Date.now()-60000).toISOString()).run();if(context?.waitUntil)context.waitUntil(seen);else await seen;
  return respond(response);
 }catch{return respond(json({error:'Der Server ist noch nicht vollständig eingerichtet oder gerade nicht erreichbar.'},503));}
}};}
export default createNativeHandler();
