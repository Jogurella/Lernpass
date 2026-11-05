(function (root) {
  'use strict';
  const DAY=86400000, STAGE_NAMES=['Neu','Kennengelernt','Wiedererkannt','Verstanden','Gefestigt','Sicher erinnert'];
  const CATEGORIES=['Pneumatik','Mechanik','Elektrotechnik','Automation','Sicherheit'];
  function today(now=new Date()){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
  function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
  function addDays(date,n){return new Date(new Date(date+'T12:00:00Z').getTime()+n*DAY).toISOString().slice(0,10);}
  function diff(a,b){return Math.round((new Date(a+'T12:00:00Z')-new Date(b+'T12:00:00Z'))/DAY);}
  function weekday(date){return new Date(date+'T12:00:00Z').getUTCDay();}
  function fresh(day=today()){return {version:1,onboarded:false,plan:{start:day,days:28,deadline:null,reviewAuto:true,finalReviewDays:3,minutes:45,session:10,weekdays:[0,1,2,3,4,5,6],formats:['practice'],diagnostic:{}},cards:{},worksheets:{},history:[],exams:[],learning:root.LernpassFlow?root.LernpassFlow.fresh():{units:[],tests:[],pool:{},activeUnitId:null,activeTestId:null}};}
  function cardState(state,id){return state.cards[id]||{stage:0,due:null,reps:0,lapses:0,firstDay:null,lastDay:null,lastGoodDay:null,favorite:false,note:'',answerText:'',answerDay:null,answerCompleted:false};}
  function saveAnswer(state,id,text,completed=false,day=today()){
    if(typeof text!=='string')throw new Error('Bitte eine Textantwort eingeben.');
    const answerText=text.slice(0,6000);
    if(completed&&!answerText.trim())throw new Error('Deine Erklärung ist noch leer.');
    state.cards[id]={...cardState(state,id),answerText,answerDay:day,answerCompleted:Boolean(completed)};
    return state.cards[id];
  }
  function normalize(input,cards,day=today()){
    if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1)throw new Error('Dieses Backup hat kein unterstütztes Lernpass-Format.');
    const result=fresh(day),p=input.plan||{};
    result.onboarded=Boolean(input.onboarded);result.plan.start=validDate(p.start)?p.start:day;
    result.plan.days=[21,28].includes(p.days)?p.days:28;
    result.plan.deadline=validDate(p.deadline)&&diff(p.deadline,result.plan.start)>0&&diff(p.deadline,result.plan.start)<=366?p.deadline:null;
    result.plan.finalReviewDays=[2,3,5,7].includes(p.finalReviewDays)?p.finalReviewDays:3;
    result.plan.reviewAuto=p.reviewAuto===true;
    result.plan.minutes=[15,30,45,60,90].includes(p.minutes)?p.minutes:45;
    result.plan.session=[5,10,15,20].includes(p.session)?p.session:10;
    result.plan.weekdays=Array.isArray(p.weekdays)?[...new Set(p.weekdays.filter(n=>Number.isInteger(n)&&n>=0&&n<=6))]:result.plan.weekdays;
    if(!result.plan.weekdays.length)result.plan.weekdays=[0,1,2,3,4,5,6];
    result.plan.formats=Array.isArray(p.formats)?p.formats.filter(n=>['practice','structure','speak','compact'].includes(n)).slice(0,3):['practice'];
    if(!result.plan.formats.length)result.plan.formats=['practice'];
    for(const cat of CATEGORIES){const value=p.diagnostic?.[cat];if(typeof value==='number'&&Number.isFinite(value))result.plan.diagnostic[cat]=Math.min(1,Math.max(0,value));}
    const allowed=new Set(cards.map(c=>c.id));
    for(const id of allowed){const s=input.cards?.[id];if(!s||typeof s!=='object')continue;
      const integer=(v,min,max,fallback=0)=>Number.isInteger(v)?Math.max(min,Math.min(max,v)):fallback;
      const answerText=typeof s.answerText==='string'?s.answerText.slice(0,6000):'';
      result.cards[id]={stage:integer(s.stage,0,5),due:validDate(s.due)?s.due:null,reps:integer(s.reps,0,100000),lapses:integer(s.lapses,0,100000),firstDay:validDate(s.firstDay)?s.firstDay:null,lastDay:validDate(s.lastDay)?s.lastDay:null,lastGoodDay:validDate(s.lastGoodDay)?s.lastGoodDay:null,favorite:Boolean(s.favorite),note:typeof s.note==='string'?s.note.slice(0,2000):'',answerText,answerDay:validDate(s.answerDay)?s.answerDay:null,answerCompleted:Boolean(s.answerCompleted&&answerText.trim())};
    }
    result.worksheets=root.LernpassWorkbook?root.LernpassWorkbook.normalize(input.worksheets,cards):{};
    result.history=Array.isArray(input.history)?input.history.filter(h=>allowed.has(h?.id)&&validDate(h.day)&&['again','hard','good'].includes(h.grade)).slice(-5000).map(h=>({id:h.id,day:h.day,grade:h.grade,at:Number.isFinite(h.at)?h.at:0})):[];
    result.exams=Array.isArray(input.exams)?input.exams.filter(e=>validDate(e?.day)&&Number.isInteger(e.total)&&e.total>0&&e.total<=20&&Number.isInteger(e.good)&&e.good>=0&&e.good<=e.total).slice(-100).map(e=>({day:e.day,total:e.total,good:e.good})):[];
    result.learning=root.LernpassFlow?root.LernpassFlow.normalize(input.learning,cards):result.learning;
    return result;
  }
  function review(state,id,grade,day=today(),at=Date.now()){
    if(!['again','hard','good'].includes(grade))throw new Error('Ungültige Bewertung.');
    const s={...cardState(state,id)};s.reps++;s.firstDay=s.firstDay||day;
    if(grade==='again'){s.stage=0;s.lapses++;s.due=day;}
    else if(grade==='hard'){s.stage=Math.max(1,s.stage-1);s.due=addDays(day,1);}
    else{if(s.lastGoodDay!==day||s.stage===0)s.stage=Math.min(5,s.stage+1);s.lastGoodDay=day;const duration=validDate(state.plan.deadline)&&state.plan.deadline>state.plan.start?diff(state.plan.deadline,state.plan.start):state.plan.days,intervals=duration<=21?[1,1,2,4,7]:[1,2,4,7,10];s.due=addDays(day,intervals[Math.max(0,s.stage-1)]);}
    if(grade!=='again')for(let i=0;i<7&&!state.plan.weekdays.includes(weekday(s.due));i++)s.due=addDays(s.due,1);
    s.lastDay=day;state.cards[id]=s;state.history.push({id,day,grade,at});state.history=state.history.slice(-5000);return s;
  }
  function planInfo(state,day=today()){
    const examDate=validDate(state.plan.deadline)&&diff(state.plan.deadline,state.plan.start)>0?state.plan.deadline:null;
    const days=examDate?diff(examDate,state.plan.start):state.plan.days,elapsed=diff(day,state.plan.start),index=Math.max(0,Math.min(days-1,elapsed)),end=addDays(state.plan.start,days-1);
    let reviewDays=examDate?Math.min(state.plan.finalReviewDays||3,Math.max(1,days-1)):0,finalStart=examDate?addDays(end,1-reviewDays):null;
    if(examDate&&state.plan.reviewAuto){const available=studyDates(state,state.plan.start,end),count=Math.min(7,Math.max(1,Math.round(available.length*.2)),Math.max(1,available.length-1));finalStart=available.length?available[Math.max(0,available.length-count)]:end;reviewDays=diff(end,finalStart)+1;}
    const reviewDates=examDate?studyDates(state,finalStart,end):[];
    const newUntil=examDate?addDays(finalStart,-1):addDays(state.plan.start,Math.ceil(days*.5)-1),finalReview=Boolean(examDate&&day>=finalStart&&day<=end);
    return {day:elapsed+1,index,end,days,examDate,reviewDays,reviewDates,finalStart,newUntil,finalReview,started:elapsed>=0,finished:elapsed>=days,remaining:Math.max(0,diff(end,day)+1),studyDay:state.plan.weekdays.includes(weekday(day)),phase:elapsed<0?'Vor dem Start':elapsed>=days?'Plan abgeschlossen':finalReview?'Abschlusswiederholung':index<Math.ceil(days*.45)?'Grundlagen aufbauen':index<Math.ceil(days*.77)?'Wissen festigen':'Fachgespräch trainieren'};
  }
  function studyDates(state,from,to){const dates=[];for(let day=from;day<=to&&dates.length<=366;day=addDays(day,1))if(state.plan.weekdays.includes(weekday(day)))dates.push(day);return dates;}
  function planning(cards,state,day=today()){
    const info=planInfo(state,day),from=day>state.plan.start?day:state.plan.start,dates=studyDates(state,from,info.end),introDates=studyDates(state,from,info.newUntil);
    const untested=cards.filter(c=>cardState(state,c.id).reps===0).length,learnedToday=cards.filter(c=>cardState(state,c.id).firstDay===day).length;
    const target=info.started&&info.studyDay&&!info.finished&&introDates.length?Math.max(0,Math.ceil((untested+learnedToday)/introDates.length)-learnedToday):0;
    const need=Math.ceil(cards.reduce((n,c)=>{const s=cardState(state,c.id);return n+(s.reps===0?9:Math.max(0,5-s.stage)*1.4);},0)),budget=dates.length*state.plan.minutes;
    const active=new Set(state.history.map(h=>h.day));for(const u of state.learning?.units||[])if(u.studied.length)active.add(u.day);
    const missed=studyDates(state,state.plan.start,addDays(day,-1)).filter(d=>d<=info.end&&!active.has(d)).length;
    const schedule=forecast(cards,state,day),introNeed=introDates.length?Math.ceil(untested/introDates.length*3):0;
    const recommendedMinutes=dates.length?Math.max(Math.ceil(need/dates.length),introNeed+Math.ceil(dailyQueue(cards,state,day,'due').length*1.4)):null;
    return {...info,dates,introDates,untested,target,need,budget,missed,recommendedMinutes,shortfall:Math.max(0,need-budget),forecast:schedule};
  }
  function priority(state,card){const s=cardState(state,card.id),diagnostic=state.plan.diagnostic[card.category];return s.lapses*3+(diagnostic===undefined?0:(1-diagnostic)*2)+(s.favorite?0.3:0);}
  function dailyQueue(cards,state,day=today(),mode='mixed',template=null){
    const info=template?{...template,started:day>=state.plan.start,finished:day>template.end,studyDay:state.plan.weekdays.includes(weekday(day)),finalReview:Boolean(template.examDate&&day>=template.finalStart&&day<=template.end)}:planInfo(state,day);
    const due=cards.filter(c=>{const s=cardState(state,c.id);return s.reps>0&&s.due&&s.due<=day;}).sort((a,b)=>{const sa=cardState(state,a.id),sb=cardState(state,b.id);return (info.examDate?Boolean(state.learning?.pool[b.id])-Boolean(state.learning?.pool[a.id]):0)||sa.due.localeCompare(sb.due)||priority(state,b)-priority(state,a);});
    if(mode==='due')return due;if(mode==='weak')return cards.filter(c=>cardState(state,c.id).lapses>0).sort((a,b)=>priority(state,b)-priority(state,a));
    const freshCards=cards.filter(c=>cardState(state,c.id).reps===0).sort((a,b)=>priority(state,b)-priority(state,a)||a.id.localeCompare(b.id,undefined,{numeric:true}));
    let quota=0;
    if(info.started&&info.studyDay&&!info.finished){const days=studyDates(state,day,info.newUntil).length;quota=info.examDate&&!days?0:Math.ceil(freshCards.length/Math.max(1,days));}
    const learnedToday=cards.filter(c=>cardState(state,c.id).firstDay===day).length;
    // Keep today's initial new-card quota stable as new cards are completed.
    const totalRemaining=freshCards.length+learnedToday;
    if(quota>0){const days=studyDates(state,day,info.newUntil).length;quota=Math.max(0,Math.ceil(totalRemaining/Math.max(1,days))-learnedToday);}
    // Reviews retain priority. A time estimate limits new material without hiding overdue cards.
    const repeatIds=new Set(due.filter(c=>cardState(state,c.id).firstDay!==day).map(c=>c.id));
    for(const h of state.history)if(h.day===day&&cardState(state,h.id).firstDay!==day)repeatIds.add(h.id);
    const newCapacity=Math.max(0,Math.floor((state.plan.minutes-repeatIds.size*1.4)/3)-learnedToday);
    const newCards=freshCards.slice(0,Math.min(quota,newCapacity));
    if(mode==='new')return newCards;
    const combined=[];let a=0,b=0;while(a<due.length||b<newCards.length){for(let n=0;n<2&&a<due.length;n++)combined.push(due[a++]);if(b<newCards.length)combined.push(newCards[b++]);}
    if(info.finalReview&&info.studyDay&&root.LernpassFlow){const known=new Set(root.LernpassFlow.learnedIds(state,cards)),present=new Set(combined.map(c=>c.id)),extras=cards.filter(c=>known.has(c.id)&&!present.has(c.id)).sort((a,b)=>Boolean(state.learning?.pool[b.id])-Boolean(state.learning?.pool[a.id])||(cardState(state,a.id).lastDay||'').localeCompare(cardState(state,b.id).lastDay||'')||cardState(state,a.id).stage-cardState(state,b.id).stage||a.id.localeCompare(b.id,undefined,{numeric:true}));combined.push(...extras.slice(0,Math.max(0,state.plan.session-combined.length)));}
    return combined;
  }
  function forecast(cards,state,day=today()){
    const info=planInfo(state,day),from=day>state.plan.start?day:state.plan.start,dates=studyDates(state,from,info.end);
    const sim={plan:JSON.parse(JSON.stringify(state.plan)),cards:{},history:state.history.filter(h=>h.day===day).map(h=>({...h})),learning:{units:state.learning?.units||[],tests:[],pool:{...state.learning?.pool}}};
    for(const card of cards){const s=cardState(state,card.id);if(s.reps||state.cards[card.id])sim.cards[card.id]={...s};}
    const rows=[];let at=1;
    for(const date of dates){const queue=dailyQueue(cards,sim,date,'mixed',info),done=date===day?new Set(sim.history.filter(h=>h.day===day).map(h=>h.id)):new Set();let spent=0,newCount=0,reviews=0;
      for(const id of done)spent+=cardState(sim,id).firstDay===date?3:1.4;
      let available=Math.max(0,state.plan.minutes-spent);
      for(const card of queue){const fresh=cardState(sim,card.id).reps===0,cost=fresh?3:1.4;if(cost>available+.00001)continue;available-=cost;if(fresh)newCount++;else reviews++;review(sim,card.id,'good',date,at++);delete sim.learning.pool[card.id];}
      rows.push({day:date,newCount,reviews,minutes:Math.ceil(newCount*3+reviews*1.4),phase:info.examDate&&date>=info.finalStart?'Abschlusswiederholung':'Lernen & festigen'});
    }
    return {rows,newCount:rows.reduce((n,r)=>n+r.newCount,0),reviewCount:rows.reduce((n,r)=>n+r.reviews,0),unintroduced:cards.filter(c=>cardState(sim,c.id).reps===0).length,assumption:'Vorschau bei richtigen Antworten; wird nach deinen Tests neu berechnet.'};
  }
  function validatePlan(plan,day=today()){
    if(!validDate(plan.start))return 'Bitte ein gültiges Startdatum angeben.';
    if(plan.deadline&&(!validDate(plan.deadline)||plan.deadline<=day))return 'Bitte deinen zukünftigen Prüfungstermin angeben.';
    if(plan.deadline&&(diff(plan.deadline,plan.start)<1||diff(plan.deadline,plan.start)>366))return 'Der Prüfungstermin muss nach dem Lernstart und innerhalb eines Jahres liegen.';
    if(!Array.isArray(plan.weekdays)||!plan.weekdays.length)return 'Bitte mindestens einen Lerntag auswählen.';
    return '';
  }
  function stats(cards,state,day=today()){
    const reviewed=new Set(state.history.filter(h=>h.day===day).map(h=>h.id));
    const queue=dailyQueue(cards,state,day),target=new Set([...reviewed,...queue.map(c=>c.id)]).size;
    const total=cards.reduce((n,c)=>n+cardState(state,c.id).stage,0),mastered=cards.filter(c=>cardState(state,c.id).stage===5).length,seen=cards.filter(c=>cardState(state,c.id).reps>0).length;
    const byCategory=CATEGORIES.map(category=>{const list=cards.filter(c=>c.category===category);return {category,total:list.length,mastered:list.filter(c=>cardState(state,c.id).stage===5).length,seen:list.filter(c=>cardState(state,c.id).reps>0).length,percent:list.length?Math.round(list.reduce((n,c)=>n+cardState(state,c.id).stage,0)/(list.length*5)*100):0};});
    let streak=0,key=reviewed.size?day:addDays(day,-1);const active=new Set(state.history.map(h=>h.day));while(active.has(key)){streak++;key=addDays(key,-1);}
    return {mastered,seen,total:cards.length,percent:cards.length?Math.round(total/(cards.length*5)*100):0,today:reviewed.size,target:Math.max(target,reviewed.size),due:dailyQueue(cards,state,day,'due').length,queue,streak,byCategory};
  }
  function filter(cards,state,{search='',category='all',chapter='all',status='all'}={}){const q=search.trim().toLocaleLowerCase('de');return cards.filter(c=>(category==='all'||c.category===category)&&(chapter==='all'||c.id.startsWith(chapter))&&(status==='all'||status==='favorite'&&cardState(state,c.id).favorite||status==='new'&&cardState(state,c.id).reps===0||status==='weak'&&cardState(state,c.id).lapses>0||status==='mastered'&&cardState(state,c.id).stage===5||status==='own-empty'&&(!root.LernpassWorkbook||root.LernpassWorkbook.status(state,c.id)==='empty')||status==='own-started'&&root.LernpassWorkbook?.status(state,c.id)==='started'||status==='own-complete'&&root.LernpassWorkbook?.status(state,c.id)==='complete'||status==='learned'&&root.LernpassFlow?.learnedIds(state,cards).includes(c.id))&&(!q||[c.id,c.title,c.question,...c.keywords].join(' ').toLocaleLowerCase('de').includes(q)));}
  const api={STAGE_NAMES,CATEGORIES,today,validDate,addDays,diff,weekday,fresh,normalize,cardState,saveAnswer,review,planInfo,studyDates,planning,forecast,validatePlan,dailyQueue,stats,filter};
  root.LernpassCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
