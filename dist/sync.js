(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  function sameLearning(a,b){if(!a||!b)return false;const strip=value=>{const s=copy(value);if(s.learning){delete s.learning.activeUnitId;delete s.learning.activeTestId;for(const u of s.learning.units||[])delete u.position;for(const t of s.learning.tests||[])delete t.position;}return s;};return equal(strip(a),strip(b));}
  function meaningful(s){return Boolean(s?.onboarded||Object.keys(s?.worksheets||{}).length||Object.keys(s?.cards||{}).length||s?.history?.length||s?.learning?.units?.length||s?.learning?.tests?.length);}
  function decision(base,local,remote){
    if(remote===null)return meaningful(local)?'upload':'empty';
    if(equal(local,remote))return 'same';
    if(base&&equal(local,base))return 'download';
    if(base&&equal(remote,base))return 'upload';
    if(base&&sameLearning(local,base))return 'download';
    if(base&&sameLearning(remote,base))return 'upload';
    if(sameLearning(local,remote))return 'download';
    if(!base&&!meaningful(local))return 'download';
    return 'conflict';
  }
  function create({key,storage,getState,applyState,normalize,canApply=()=>true,onStatus=()=>{},fetcher=(...args)=>fetch(...args),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){
    let meta=null,conflict=null,running=false,timer=null,again=false,stopped=false,lastAt=null;
    let status={phase:'checking',message:'Lernstand wird abgeglichen.',lastAt:null};
    try{const saved=JSON.parse(storage.getItem(key+'.sync')||'null');if(saved&&Number.isSafeInteger(saved.revision)&&saved.revision>=0&&typeof saved.ownerKey==='string')meta={...saved,base:saved.base?normalize(saved.base):null};}catch{}
    const state=()=>normalize(copy(getState()));
    const emit=(phase,message)=>{status={phase,message,lastAt,pending:Boolean(conflict)};onStatus({...status});};
    function remember(remote){meta={ownerKey:remote.ownerKey,revision:remote.revision,base:remote.state?copy(remote.state):null};storage.setItem(key+'.sync',JSON.stringify(meta));}
    function recovery(snapshot,label){
      if(!snapshot||!meaningful(snapshot))return;
      let list=[];try{list=JSON.parse(storage.getItem(key+'.recovery')||'[]');if(!Array.isArray(list))list=[];}catch{}
      if(list[0]&&equal(list[0].state,snapshot))return;
      list.unshift({at:new Date().toISOString(),label,state:copy(snapshot)});
      storage.setItem(key+'.recovery',JSON.stringify(list.slice(0,2)));
    }
    async function request(method='GET',payload,path='/api/state'){
      const r=await fetcher(path,{method,credentials:'same-origin',cache:'no-store',headers:payload?{'Content-Type':'application/json'}:{},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(12000)});
      if(r.redirected||!r.headers.get('content-type')?.includes('application/json'))throw Object.assign(new Error('Bitte die App erneut mit deinem ChatGPT-Konto öffnen. Dein Stand bleibt auf diesem Gerät.'),{phase:'login'});
      const data=await r.json();
      if(r.status===409){if(!Number.isSafeInteger(data.revision)||typeof data.ownerKey!=='string')throw new Error('Ungültige Serverantwort.');return {...data,state:data.state?normalize(data.state):null,conflict:true};}
      if(!r.ok)throw Object.assign(new Error(data.error||'Die Verbindung ist unterbrochen. Du kannst lokal weiterlernen.'),{phase:r.status===401?'login':'offline'});
      if(!Number.isSafeInteger(data.revision)||data.revision<0||typeof data.ownerKey!=='string')throw new Error('Der Serverstand konnte nicht gelesen werden.');
      return {...data,state:data.state?normalize(data.state):null};
    }
    function block(remote,message){conflict=copy(remote);emit('conflict',message||'Auf beiden Geräten wurde etwas geändert. Bitte einen Stand auswählen; bis dahin bleibt jeder Stand erhalten.');}
    async function receive(remote,force=false){
      if(!force&&!canApply()){conflict={...copy(remote),waiting:true};emit('waiting','Ein neuer Serverstand wartet. Beende die aktuelle Eingabe und starte den Abgleich.');return false;}
      const local=state();recovery(local,'Browserstand vor dem Geräteabgleich');
      if(applyState(copy(remote.state))===false)throw new Error('Der Browser kann den neuen Stand nicht speichern. Bitte zuerst ein Backup exportieren.');
      remember(remote);conflict=null;lastAt=new Date().toISOString();emit('synced','Auf diesem Gerät und dem Server gespeichert.');return true;
    }
    async function upload(remote){
      const captured=state();emit('syncing','Änderungen werden übertragen.');
      const result=await request('PUT',{revision:remote.revision,state:captured});
      if(result.conflict){block(result);return;}
      if(result.saved!==true)throw new Error('Der Server hat die Speicherung nicht bestätigt.');
      remember(result);conflict=null;lastAt=new Date().toISOString();
      if(!equal(state(),result.state)){again=true;emit('pending','Weitere Änderungen warten auf den Abgleich.');}
      else emit('synced','Auf diesem Gerät und dem Server gespeichert.');
    }
    async function refresh(){
      if(stopped)return;if(running){again=true;return;}running=true;
      try{
        const remote=await request(),local=state();
        if(conflict&&!conflict.waiting){if(remote.state&&equal(local,remote.state)){remember(remote);conflict=null;lastAt=new Date().toISOString();emit('synced','Auf diesem Gerät und dem Server gespeichert.');}else block(remote);return;}
        if(meta&&meta.ownerKey!==remote.ownerKey&&meaningful(local)){block(remote,'Du bist mit einem anderen Konto angemeldet. Bitte vor der Übertragung einen Stand auswählen.');return;}
        const base=meta?.ownerKey===remote.ownerKey?meta.base:null,action=decision(base,local,remote.state);
        if(action==='download')await receive(remote);
        else if(action==='upload')await upload(remote);
        else if(action==='conflict')block(remote);
        else{remember(remote);conflict=null;lastAt=new Date().toISOString();emit('synced',action==='empty'?'Bereit. Dein Lernstand wird nach der Einrichtung automatisch gespeichert.':'Auf diesem Gerät und dem Server gespeichert.');}
      }catch(error){emit(error.phase||'offline',error.message||'Der Abgleich ist unterbrochen. Du kannst lokal weiterlernen.');}
      finally{running=false;if(again&&!conflict){again=false;changed();}else again=false;}
    }
    function changed(){
      if(stopped)return;if(timer!==null)cancel(timer);
      if(conflict&&!conflict.waiting){emit('conflict','Auf beiden Geräten wurde etwas geändert. Wähle einen Stand für den Abgleich.');return;}
      emit('pending','Änderungen sind auf diesem Gerät gespeichert. Abgleich folgt.');
      timer=schedule(()=>{timer=null;refresh();},1200);
    }
    async function resolve(choice){
      if(running||stopped)return;if(!['local','server'].includes(choice))return;running=true;
      try{const remote=await request();if(choice==='server'){
        if(!remote.state){emit('conflict','Auf dem Server ist noch kein Lernstand vorhanden.');return;}
        await receive(remote,true);
      }else{recovery(remote.state,'Serverstand vor der gewählten Übertragung');conflict=null;await upload(remote);}}
      catch(error){emit(error.phase||'offline',error.message||'Der Abgleich ist unterbrochen.');}
      finally{running=false;if(again&&!conflict){again=false;changed();}}
    }
    async function serverBackup(){return (await request('GET',undefined,'/api/state/backup')).state;}
    function browserBackup(){try{return JSON.parse(storage.getItem(key+'.recovery')||'[]')[0]?.state||null;}catch{return null;}}
    return {start:refresh,refresh,changed,resolve,serverBackup,browserBackup,getStatus:()=>({...status}),getConflict:()=>conflict?copy(conflict):null,stop(){stopped=true;if(timer!==null)cancel(timer);}};
  }
  const api={meaningful,decision,create};root.LernpassSync=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
