const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../dist/core.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/data.js'),'utf8'),context);
const cards=JSON.parse(JSON.stringify(context.window.MEC_CARDS));
const day='2026-11-05';
test('94 complete cases, exact D/E coverage and primary source links',()=>{
  assert.equal(cards.length,94);
  assert.equal(new Set(cards.map(c=>c.id)).size,94);
  for(const [chapter,n] of [['D',46],['E',48]])for(let i=1;i<=n;i++)assert.ok(cards.find(c=>c.id===chapter+i));
  for(const c of cards){assert.ok(c.title&&c.question&&c.mnemonic&&c.pitfall);assert.ok(c.answer.length>=2);for(const a of c.answer)assert.ok(a.label&&a.text.length>30);assert.ok(c.pdfPage>=1&&c.pdfPage<=71);assert.ok(c.sources.length);for(const s of c.sources)assert.equal(new URL(s.url).protocol,'https:');}
  assert.deepEqual(cards.find(c=>c.id==='D11').imagePages,[28,29]);
  assert.deepEqual(cards.find(c=>c.id==='D21').imagePages,[35,36]);
});
test('calendar dates remain stable across DST and reject impossible days',()=>{
  assert.equal(C.validDate('2026-02-29'),false);assert.equal(C.validDate('2028-02-29'),true);
  assert.equal(C.addDays('2026-10-24',2),'2026-10-26');assert.equal(C.diff('2026-10-26','2026-10-24'),2);
  assert.equal(C.validDate('2026-11-05junk'),false);
});
test('correct recall only advances once on one day; errors reset and become due now',()=>{
  const s=C.fresh(day);C.review(s,'D1','good',day);C.review(s,'D1','good',day);
  assert.equal(s.cards.D1.stage,1);assert.equal(s.cards.D1.due,'2026-11-06');
  C.review(s,'D1','good','2026-11-06');assert.equal(s.cards.D1.stage,2);assert.equal(s.cards.D1.due,'2026-11-08');
  C.review(s,'D1','again','2026-11-06');assert.equal(s.cards.D1.stage,0);assert.equal(s.cards.D1.lapses,1);assert.equal(s.cards.D1.due,'2026-11-06');
  assert.equal(C.stats(cards,s,'2026-11-06').mastered,0);
});
test('21 and 28 day plans use different intervals and honor selected weekdays',()=>{
  const a=C.fresh(day),b=C.fresh(day);a.plan.days=21;
  for(const s of [a,b]){C.review(s,'D1','good',day);C.review(s,'D1','good','2026-11-06');}
  assert.equal(a.cards.D1.due,'2026-11-07');assert.equal(b.cards.D1.due,'2026-11-08');
  b.plan.weekdays=[1,2,3,4,5];C.review(b,'D2','hard','2026-11-06');assert.equal(b.cards.D2.due,'2026-11-09');
});
test('diagnostic knowledge affects priority without granting learned stages',()=>{
  const s=C.fresh(day);s.plan.diagnostic={Mechanik:0,Pneumatik:1};
  assert.equal(C.dailyQueue(cards,s,day)[0].category,'Mechanik');assert.equal(C.stats(cards,s,day).seen,0);
});
test('daily new quota stays stable after learning and uses the chosen time budget',()=>{
  const s=C.fresh(day),initial=C.dailyQueue(cards,s,day,'new');assert.equal(initial.length,7);
  C.review(s,initial[0].id,'good',day);assert.equal(C.dailyQueue(cards,s,day,'new').length,6);
  const compact=C.fresh(day);compact.plan.minutes=15;assert.equal(C.dailyQueue(cards,compact,day,'new').length,5);
  C.review(compact,'D1','good','2026-11-04');assert.ok(C.dailyQueue(cards,compact,day,'new').length<=4);
});
test('no new cards before start or on free days; overdue recall stays available',()=>{
  const s=C.fresh(day);assert.equal(C.dailyQueue(cards,s,'2026-11-04','new').length,0);
  s.plan.weekdays=[1];assert.equal(C.dailyQueue(cards,s,day,'new').length,0);
  C.review(s,'D1','again','2026-11-04');assert.equal(C.dailyQueue(cards,s,day,'due')[0].id,'D1');
});
test('realistic daily recall can cover all 94 cases in either plan',()=>{
  for(const duration of [21,28]){const s=C.fresh(day);s.plan.days=duration;s.plan.minutes=60;
    for(let n=0;n<duration;n++){const date=C.addDays(day,n);for(const card of C.dailyQueue(cards,s,date))C.review(s,card.id,'good',date);}
    const stats=C.stats(cards,s,C.addDays(day,duration-1));assert.equal(stats.seen,94);assert.ok(stats.mastered>=80);
  }
});
test('malformed backup cannot introduce unknown cards or unlimited notes',()=>{
  assert.throws(()=>C.normalize({version:2},cards));
  const bad=C.fresh(day);bad.plan.start='2026-02-30';bad.plan.weekdays=[];
  bad.cards={D1:{stage:99,reps:-1,lapses:0,note:'x'.repeat(4000)},FOREIGN:{stage:5}};
  bad.history=[null,{id:'FOREIGN',day,grade:'good'},{id:'D1',day:'bad',grade:'good'},{id:'D1',day,grade:'good'}];
  const s=C.normalize(bad,cards,day);assert.equal(s.plan.start,day);assert.equal(s.plan.weekdays.length,7);assert.equal(s.cards.D1.stage,5);assert.equal(s.cards.D1.note.length,2000);assert.equal(s.cards.D1.reps,0);assert.equal(s.cards.FOREIGN,undefined);assert.equal(s.history.length,1);
});
test('search, favorites and progress roundtrip independently of plan edits',()=>{
  const s=C.fresh(day);C.review(s,'D1','again',day);s.cards.D1.favorite=true;s.cards.D1.note='<b>eigene Notiz</b>';
  assert.equal(C.filter(cards,s,{search:'D1',chapter:'D'}).some(c=>c.id==='D1'),true);
  assert.deepEqual(C.filter(cards,s,{status:'favorite'}).map(c=>c.id),['D1']);
  assert.deepEqual(C.filter(cards,s,{status:'weak'}).map(c=>c.id),['D1']);
  const copy=C.normalize(JSON.parse(JSON.stringify(s)),cards,day);copy.plan.days=21;assert.deepEqual(copy.cards,s.cards);assert.deepEqual(copy.history,s.history);
});
