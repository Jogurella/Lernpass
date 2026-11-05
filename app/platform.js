(function(){
 'use strict';
 const native=window.__TAURI__?.core?.invoke, mobile=window.LernpassMobile;
 const invoke=native?((command,args={})=>native(command,args)):mobile?.invoke;
 const storage=native||mobile?new Map():null;
 let write=Promise.resolve(),writeTimer=null,base='',paired=false,volatileToken='',lastError='';
 const memory={getItem:k=>storage?.get(k)??null,setItem(k,v){storage.set(k,String(v));scheduleSave();},removeItem(k){storage.delete(k);scheduleSave();}};
 function scheduleSave(){clearTimeout(writeTimer);writeTimer=setTimeout(()=>{writeTimer=null;flush().catch(error=>window.dispatchEvent(new CustomEvent('lernpass-storage-error',{detail:error.message})));},120);}
 async function flush(){if(!invoke)return;const values=Object.fromEntries(storage);write=write.catch(()=>{}).then(()=>invoke('save_storage',{values}));await write;}
 const local=storage?memory:localStorage;
 const ready=(async()=>{if(invoke){const data=await invoke('load_storage');for(const [key,value] of Object.entries(data||{}))storage.set(key,String(value));}base=local.getItem('lernpass.server')||'';if(invoke)paired=await invoke('has_token');})();
 function validServer(value){const u=new URL(value);if(u.username||u.password||u.search||u.hash||u.pathname!=='/'&&u.pathname!=='')throw Error('Bitte die reine Serveradresse ohne Pfad eingeben.');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw Error('Die Serveradresse muss HTTPS verwenden.');return u.origin;}
 async function setServer(value){const next=validServer(value);if(invoke)await invoke('configure_server',{url:next});if(next!==base){volatileToken='';paired=false;for(const suffix of ['.sync','.recovery'])local.removeItem('mechatronik-lernpass.v1'+suffix);}base=next;local.setItem('lernpass.server',base);await flush();}
 async function request(path,options={}){
  if(!/^\/api\/[a-zA-Z0-9_/-]+$/.test(path))throw Error('Ungültiger App-Aufruf.');
  if(!base&&!invoke)base=location.protocol==='http:'||location.protocol==='https:'?location.origin:'';
  if(!base)throw Error('Verbinde zuerst einen Lernpass-Server in den Einstellungen.');
  if(invoke){let body=options.body,bodyBase64;
   if(body instanceof Blob){const bytes=new Uint8Array(await body.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);bodyBase64=btoa(binary);body=undefined;}
   const value=await invoke('api_request',{path,method:options.method||'GET',body:body??null,bodyBase64:bodyBase64??null,contentType:new Headers(options.headers).get('content-type')||null,caseId:new Headers(options.headers).get('x-case-id')||null,imageName:new Headers(options.headers).get('x-image-name')||null});
   if(value.paired)paired=true;
   const bytes=Uint8Array.from(atob(value.bodyBase64||''),c=>c.charCodeAt(0));
   return new Response(bytes,{status:value.status,headers:value.headers});
  }
  const headers=new Headers(options.headers);if(volatileToken)headers.set('Authorization','Bearer '+volatileToken);
  const response=await fetch(base+path,{...options,headers,credentials:'omit',redirect:'error'});
  if(['/api/account','/api/pair/claim'].includes(path)&&response.ok){const data=await response.clone().json();if(data.token){volatileToken=data.token;paired=true;delete data.token;return new Response(JSON.stringify(data),{status:response.status,headers:response.headers});}}
  return response;
 }
 async function json(path,method='GET',body){const r=await request(path,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});let data;try{data=await r.json();}catch{throw Error('Der Server hat keine lesbare Antwort gesendet.');}if(!r.ok)throw Error(data.error||'Die Verbindung konnte nicht hergestellt werden.');return data;}
 async function backup(){await flush();return invoke?invoke('backup_storage'):null;}
 async function openExternal(url){const target=new URL(url);if(!['https:','http:'].includes(target.protocol)&&!['sidestore:','altstore:'].includes(target.protocol))return;if(invoke)return invoke('open_external',{url:target.href});window.open(target.href,'_blank','noopener');}
 async function saveFile(name,content,mime='application/json'){if(invoke){let bytes;if(content instanceof Blob)bytes=new Uint8Array(await content.arrayBuffer());else bytes=new TextEncoder().encode(content);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return invoke('export_file',{name,bodyBase64:btoa(binary),mime});}const blob=content instanceof Blob?content:new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 window.LernpassPlatform={ready,storage:local,flush,request,json,setServer,backup,saveFile,openExternal,platform:mobile?'ios':new URLSearchParams(location.search).get('platform')==='ios'?'ios':'win',native:Boolean(invoke),get server(){return base;},get paired(){return paired;},async unpair(){if(invoke)await invoke('clear_token');volatileToken='';paired=false;},async window(action){if(native)await invoke('window_action',{action});},async update(action='check'){if(!invoke)return {available:false,configured:false};if(action==='install')await backup();return invoke('app_update',{action});},async haptic(kind='light'){await mobile?.haptic?.(kind);},async signature(){return mobile?.signature?.()||null;}};
})();
