(function(root){
  'use strict';
  const VERDICTS=['correct','partial','incorrect','unclear'];
  const STATUSES=['approved','missing','incorrect','unclear'];
  const MAX_TESTS=8, MAX_UNITS=30, MAX_QUESTIONS=25;
  const dayNow=()=>new Date().toLocaleDateString('sv-SE');
  const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const parsed=new Date(v+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===v;};
  const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
  const integer=(v,max)=>Number.isInteger(v)?Math.max(0,Math.min(max,v)):0;
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  function fresh(){return {units:[],tests:[],pool:{},activeUnitId:null,activeTestId:null};}
  function shuffle(list,random=Math.random){const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999999,random()))*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function differentStudyOrder(ids,base,random){const positions=ids.map((id,i)=>base.includes(id)?i:-1).filter(i=>i>=0);if(base.length>1&&positions.length===base.length&&positions.every((p,i)=>ids[p]===base[i])){const first=Math.min(base.length-1,Math.floor(Math.max(0,random())*base.length)),second=(first+1)%base.length;[ids[positions[first]],ids[positions[second]]]=[ids[positions[second]],ids[positions[first]]];}return ids;}
  function assessment(value,card){
    if(!value||!VERDICTS.includes(value.verdict)||typeof value.summary!=='string'||!Array.isArray(value.points)||value.points.length!==card.answer.length)return null;
    const points=[];for(let i=0;i<card.answer.length;i++){const p=value.points[i];if(p?.index!==i||!STATUSES.includes(p.status)||typeof p.feedback!=='string')return null;points.push({index:i,label:card.answer[i].label,status:p.status,feedback:str(p.feedback,1200)});}
    let verdict=value.verdict;
    if(points.some(p=>p.status==='incorrect'))verdict='incorrect';else if(points.some(p=>p.status==='unclear'))verdict='unclear';else if(points.some(p=>p.status==='missing')&&verdict==='correct')verdict='partial';
    return {verdict,summary:str(value.summary,2000),points,nextStep:str(value.nextStep,1600),model:str(value.model,80),checkedAt:str(value.checkedAt,40),caseId:card.id,unanswered:Boolean(value.unanswered),manualVisual:value.manualVisual===true,manualSelf:value.manualSelf===true};
  }
  function normalize(input,cards){
    const out=fresh();if(!input||typeof input!=='object')return out;
    const catalog=new Map(cards.map(c=>[c.id,c])),allowed=new Set(catalog.keys()),seenUnits=new Set(),seenTests=new Set();
    const ids=(v,max=MAX_QUESTIONS)=>Array.isArray(v)?[...new Set(v.filter(id=>allowed.has(id)))].slice(0,max):[];
    for(const u of (Array.isArray(input.units)?input.units:[]).slice(-MAX_UNITS)){
      if(!u||typeof u.id!=='string'||seenUnits.has(u.id)||!date(u.day))continue;const list=ids(u.ids);if(!list.length)continue;seenUnits.add(u.id);
      const studied=ids(u.studied).filter(id=>list.includes(id));out.units.push({id:str(u.id,100),day:u.day,ids:list,studied,position:Math.min(integer(u.position,24),list.length-1),completed:studied.length===list.length});
    }
    for(const t of (Array.isArray(input.tests)?input.tests:[]).slice(-MAX_TESTS)){
      if(!t||typeof t.id!=='string'||seenTests.has(t.id)||!date(t.day))continue;const list=ids(t.ids,t.kind==='knowledge'?cards.length:MAX_QUESTIONS);if(!list.length)continue;seenTests.add(t.id);
      const submitted=['submitted','complete'].includes(t.status),entries={};
      for(const id of list){const e=t.entries?.[id]||{};entries[id]={answer:str(e.answer,6000),assessment:submitted?assessment(e.assessment,catalog.get(id)):null,source:['repeat','control'].includes(e.source)?e.source:'unit'};}
      out.tests.push({id:str(t.id,100),unitId:typeof t.unitId==='string'?str(t.unitId,100):null,kind:t.kind==='knowledge'?'knowledge':t.kind==='quick'?'quick':t.unitId?'unit':'repeat',...(t.kind==='knowledge'?{scope:['text','visual'].includes(t.scope)?t.scope:'all'}:{}),day:t.day,ids:list,entries,position:Math.min(integer(t.position,list.length-1),list.length-1),status:submitted?(list.every(id=>entries[id].assessment)?'complete':'submitted'):'draft'});
    }
    for(const [id,p] of Object.entries(input.pool||{}))if(allowed.has(id)&&p&&['partial','incorrect','unclear'].includes(p.verdict)){const labels=new Set(catalog.get(id).answer.map(a=>a.label));out.pool[id]={verdict:p.verdict,attempts:integer(p.attempts,100000),firstDay:date(p.firstDay)?p.firstDay:dayNow(),lastDay:date(p.lastDay)?p.lastDay:dayNow(),nextStep:str(p.nextStep,600),focus:Array.isArray(p.focus)?[...new Set(p.focus.filter(label=>labels.has(label)))].slice(0,12):[]};}
    out.activeUnitId=out.units.some(u=>u.id===input.activeUnitId)?input.activeUnitId:null;
    out.activeTestId=out.tests.some(t=>t.id===input.activeTestId)?input.activeTestId:null;
    return out;
  }
  function flow(state){return state.learning||(state.learning=fresh());}
  function unit(state,id){return flow(state).units.find(u=>u.id===id);}
  function test(state,id){return flow(state).tests.find(t=>t.id===id);}
  function createUnit(state,cards,selection,day=dayNow()){
    const f=flow(state),allowed=new Set(cards.map(c=>c.id));const ids=[...new Set(selection)].filter(id=>allowed.has(id)).slice(0,20);if(!ids.length)throw new Error('Für diese Einheit fehlen noch Fragen.');
    const u={id:uid('unit'),day,ids,studied:[],position:0,completed:false};f.units.push(u);f.units=f.units.slice(-MAX_UNITS);f.activeUnitId=u.id;return u;
  }
  function markStudied(state,unitId,id){const u=unit(state,unitId);if(!u||!u.ids.includes(id))throw new Error('Diese Frage gehört nicht zur Einheit.');if(!u.studied.includes(id))u.studied.push(id);u.completed=u.studied.length===u.ids.length;return u;}
  function learnedIds(state,cards){const f=flow(state),allowed=new Set(cards.map(c=>c.id)),ids=new Set();for(const u of f.units)if(u.completed)for(const id of u.ids)ids.add(id);for(const c of cards)if(state.cards?.[c.id]?.reps>0)ids.add(c.id);for(const t of f.tests)for(const id of t.ids)if(t.entries[id].assessment)ids.add(id);return [...ids].filter(id=>allowed.has(id));}
  function appendTest(state,t){const f=flow(state);if(f.tests.filter(test=>test.status!=='complete').length>=MAX_TESTS)throw new Error('Bitte zuerst einen gespeicherten Test abschließen. Deine offenen Antworten bleiben erhalten.');f.tests.push(t);while(f.tests.length>MAX_TESTS)f.tests.splice(f.tests.findIndex(test=>test.status==='complete'),1);f.activeTestId=t.id;return t;}
  function createQuickTest(state,cards,{random=Math.random,day=dayNow()}={}){
    const f=flow(state),pending=f.tests.find(t=>t.kind==='quick'&&t.status!=='complete');if(pending){f.activeTestId=pending.id;return pending;}
    const known=learnedIds(state,cards);if(!known.length)throw new Error('Lerne zuerst eine vollständige Einheit. Der Kurztest wiederholt bereits gelernte Fragen.');
    const weak=shuffle(known.filter(id=>f.pool[id]),random),other=shuffle(known.filter(id=>!f.pool[id]),random);
    const selected=weak.slice(0,2);selected.push(...other.slice(0,3-selected.length));if(selected.length<3)selected.push(...weak.slice(2,2+3-selected.length));
    const ids=shuffle(selected,random),recent=[...f.units].reverse().find(u=>u.completed&&u.ids.filter(id=>ids.includes(id)).length>1);
    if(recent)differentStudyOrder(ids,recent.ids.filter(id=>ids.includes(id)),random);
    const entries={};for(const id of ids)entries[id]={answer:'',assessment:null,source:f.pool[id]?'repeat':'unit'};
    return appendTest(state,{id:uid('quick'),unitId:null,kind:'quick',day,ids,entries,position:0,status:'draft'});
  }
  function createTest(state,cards,unitId,{random=Math.random,day=dayNow(),limit=10}={}){
    const f=flow(state),u=unitId?unit(state,unitId):null;
    if(unitId&&(!u||!u.completed))throw new Error('Lerne zuerst alle Fragen dieser Einheit.');
    const pending=f.tests.find(t=>t.kind!=='quick'&&t.kind!=='knowledge'&&t.unitId===(unitId||null)&&t.status!=='complete');if(pending){f.activeTestId=pending.id;return pending;}
    const allowed=new Set(cards.map(c=>c.id)),base=u?[...u.ids]:[],baseSet=new Set(base);
    const eligible=Object.keys(f.pool).filter(id=>allowed.has(id)&&!baseSet.has(id));
    const correctIds=new Set(f.tests.flatMap(t=>t.ids.filter(id=>t.entries[id].assessment?.verdict==='correct')));
    const known=cards.filter(card=>!baseSet.has(card.id)&&!f.pool[card.id]&&(correctIds.has(card.id)||state.cards?.[card.id]?.lastGoodDay&&state.cards[card.id].stage>0)).map(card=>card.id);
    const controls=known.length&&random()<1/3?shuffle(known,random).slice(0,1):[];
    const count=u?Math.min(5,Math.ceil(base.length*.3),MAX_QUESTIONS-base.length-controls.length):Math.min(20,Math.max(1,limit-controls.length));
    const repeats=shuffle(eligible,random).slice(0,count);if(!base.length&&!repeats.length)throw new Error('Es sind noch keine Wiederholungsfragen gesammelt.');
    if(f.tests.filter(t=>t.status!=='complete').length>=MAX_TESTS)throw new Error('Bitte zuerst einen gespeicherten Test abschließen. Deine offenen Antworten bleiben erhalten.');
    const ids=shuffle([...base,...repeats,...controls],random),entries={};
    differentStudyOrder(ids,base,random);
    for(const id of ids)entries[id]={answer:'',assessment:null,source:baseSet.has(id)?'unit':controls.includes(id)?'control':'repeat'};
    const t={id:uid('test'),unitId:unitId||null,kind:u?'unit':'repeat',day,ids,entries,position:0,status:'draft'};return appendTest(state,t);
  }
  function createKnowledgeTest(state,cards,{scope='all',random=Math.random,day=dayNow()}={}){
    if(!['all','text','visual'].includes(scope))throw Error('Diese Testauswahl ist ungültig.');
    const f=flow(state),pending=f.tests.find(t=>t.kind==='knowledge'&&t.scope===scope&&t.status!=='complete');if(pending){f.activeTestId=pending.id;return pending;}
    const known=new Set(learnedIds(state,cards)),visual=c=>Boolean(c.imagePage||c.imagePages?.length||/skizzier|zeichne[nr]?\b/i.test(c.question));
    const base=cards.filter(c=>known.has(c.id)&&(scope==='all'||(scope==='visual'?visual(c):!visual(c)))).map(c=>c.id);
    if(!base.length)throw Error('Für diese Auswahl gibt es noch keine gelernten Fragen. Lerne zuerst eine Einheit.');
    const ids=differentStudyOrder(shuffle(base,random),base,random),entries={};for(const id of ids)entries[id]={answer:'',assessment:null,source:f.pool[id]?'repeat':'unit'};
    return appendTest(state,{id:uid('knowledge'),kind:'knowledge',scope,unitId:null,day,ids,entries,position:0,status:'draft'});
  }
  function selfAssessment(card,grade,visual=false){
    if(!['again','hard','good'].includes(grade))throw Error('Bitte deinen Vergleich einschätzen.');
    const verdict=grade==='good'?'correct':grade==='hard'?'partial':'incorrect',status=grade==='good'?'approved':'missing';
    return {verdict,manualSelf:true,manualVisual:visual,summary:grade==='good'?'Du hast deine eigene Antwort mit der Vorlage verglichen und als sicher eingeschätzt.':grade==='hard'?'Beim eigenen Vergleich warst du noch unsicher.':'Du möchtest die Abbildung und ihre Zusammenhänge noch einmal üben.',points:card.answer.map((a,index)=>({index,status,feedback:'Eigener Vergleich mit der Vorlage; keine KI-Bildbewertung.'})),nextStep:visual?'Abbildung ansehen, verdecken, aus dem Gedächtnis erklären oder zeichnen und erneut mit der Vorlage vergleichen.':'Vergleiche alle Fachpunkte, ergänze die Lücken und erkläre die Antwort später noch einmal ohne Vorlage.',model:'Selbsteinschätzung',caseId:card.id};
  }
  function visualAssessment(card,grade){return selfAssessment(card,grade,true);}
  function saveDraft(state,testId,id,text){const t=test(state,testId);if(!t||t.status!=='draft'||!t.ids.includes(id)||typeof text!=='string')throw new Error('Dieser Test kann gerade nicht bearbeitet werden.');t.entries[id].answer=text.slice(0,6000);return t;}
  function submit(state,testId){const t=test(state,testId);if(!t)throw new Error('Der Test wurde nicht gefunden.');if(t.status==='draft')t.status='submitted';return t;}
  function applyAssessment(state,testId,card,value,day=dayNow()){
    const f=flow(state),t=test(state,testId);if(!t||t.status==='draft'||!t.ids.includes(card.id))throw new Error('Der Test ist nicht zur Bewertung freigegeben.');
    const entry=t.entries[card.id];if(entry.assessment)return false;const result=assessment(value,card);if(!result)throw new Error('Diese Bewertung ist nicht vollständig lesbar.');result.checkedAt=new Date().toISOString();entry.assessment=result;
    if(result.verdict==='correct')delete f.pool[card.id];else{const prev=f.pool[card.id];f.pool[card.id]={verdict:result.verdict,attempts:(prev?.attempts||0)+1,firstDay:prev?.firstDay||day,lastDay:day,nextStep:str(result.nextStep,600),focus:result.points.filter(p=>p.status!=='approved').map(p=>p.label).slice(0,12)};}
    if(t.ids.every(id=>t.entries[id].assessment))t.status='complete';return true;
  }
  function unanswered(card){return {verdict:'incorrect',summary:'Für diese Frage wurde keine Antwort abgegeben.',points:card.answer.map((a,index)=>({index,status:'missing',feedback:'Dieser Fachpunkt wurde noch nicht erklärt.'})),nextStep:'Lies die Erklärung noch einmal und versuche die Frage beim nächsten Test in eigenen Worten.',unanswered:true,caseId:card.id};}
  function summary(t){let correct=0,partial=0,incorrect=0,unclear=0,pending=0,approved=0,points=0,manual=0;for(const id of t.ids){const a=t.entries[id].assessment;if(!a){pending++;continue;}if(a.verdict==='correct')correct++;if(a.verdict==='partial')partial++;if(a.verdict==='incorrect')incorrect++;if(a.verdict==='unclear')unclear++;if(a.manualVisual||a.manualSelf)manual++;else{approved+=a.points.filter(p=>p.status==='approved').length;points+=a.points.length;}}return {total:t.ids.length,correct,partial,incorrect,unclear,pending,approved,points,manual,percent:points?Math.round(approved/points*100):0,repeats:t.ids.filter(id=>t.entries[id].source==='repeat').length,controls:t.ids.filter(id=>t.entries[id].source==='control').length};}
  const api={fresh,normalize,shuffle,flow,unit,test,createUnit,markStudied,learnedIds,createQuickTest,createTest,createKnowledgeTest,selfAssessment,visualAssessment,saveDraft,submit,applyAssessment,unanswered,summary};root.LernpassFlow=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
