const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../dist/core.js'),W=require('../dist/writer.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/data.js'),'utf8'),context);
const cards=JSON.parse(JSON.stringify(context.window.MEC_CARDS)),card=cards.find(c=>c.id==='D4');
const rawModulePromise=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../worker/index.js'),'utf8')).toString('base64'));
const modulePromise=rawModulePromise.then(module=>({...module,createHandler:(assets,catalog,fetcher)=>module.createHandler(assets,catalog,fetcher,async(user,env)=>({key:env.GEMINI_API_KEY,model:'gemini-3.1-flash-lite'}))}));
const valid=()=>({verdict:'correct',summary:'Alle wesentlichen Fachpunkte sind erklärt.',points:card.answer.map((a,index)=>({index,status:'approved',feedback:'Sinngemäß richtig erklärt.'})),nextStep:'Erkläre es morgen noch einmal frei.'});
const request=(body={},headers={})=>new Request('https://lernpass.example/api/check',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://lernpass.example','oai-authenticated-user-id':'test-user',...headers},body:JSON.stringify({caseId:card.id,answer:'Meine eigene Erklärung zur Festigkeit der Schraube.',...body})});
test('free answers and drafts survive backups without granting a learning stage',()=>{
 const s=C.fresh('2026-11-05');C.saveAnswer(s,'D10','Eigene Erklärung\n800 MPa und 640 MPa',true,'2026-11-05');
 const copy=C.normalize(JSON.parse(JSON.stringify(s)),cards);assert.equal(copy.cards.D10.answerText,s.cards.D10.answerText);assert.equal(copy.cards.D10.answerCompleted,true);assert.equal(copy.cards.D10.stage,0);assert.equal(copy.history.length,0);
 C.review(copy,'D10','good','2026-11-05');assert.equal(copy.cards.D10.answerText,s.cards.D10.answerText);
 assert.throws(()=>C.saveAnswer(s,'D10','  ',true));
 C.saveAnswer(s,'D10','x'.repeat(8000));assert.equal(s.cards.D10.answerText.length,6000);assert.equal(s.cards.D10.answerCompleted,false);
});
test('legacy backups retain progress and receive empty answer fields',()=>{
 const s=C.fresh();s.cards.D10={stage:3,reps:4,lapses:1,note:'Meine Notiz'};
 const normalized=C.normalize(s,cards);assert.equal(normalized.cards.D10.stage,3);assert.equal(normalized.cards.D10.answerText,'');assert.equal(normalized.cards.D10.answerCompleted,false);assert.equal(normalized.cards.D10.note,'Meine Notiz');
});
test('free writing does not disclose reference answers and escapes typed HTML',()=>{
 const session={ids:[card.id],position:0,scratch:'<img src=x onerror=alert(1)>',submitted:false};
 const html=W.render({card,current:{stage:0},session,icon:()=>'',button:(a,t)=>`<button data-action="${a}">${t}</button>`,ai:{configured:false}});
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(!html.includes(card.answer[0].text));assert.ok(html.includes('KI optional verbinden'));
});
test('missing key is reported without making any provider request',async()=>{
 const {createHandler}=await modulePromise;let calls=0;const worker=createHandler({}, {[card.id]:card},()=>{calls++;});
 const status=await (await worker.fetch(new Request('https://lernpass.example/api/check/status'))).json();assert.equal(status.configured,false);
 const response=await worker.fetch(request(),{});assert.equal(response.status,503);assert.equal(calls,0);
});
test('authentication, origin, content size and case IDs are checked before provider use',async()=>{
 const {createHandler}=await modulePromise;let calls=0;const worker=createHandler({}, {[card.id]:card},()=>{calls++;});const env={GEMINI_API_KEY:'fake-key-for-tests'};
 assert.equal((await worker.fetch(request({}, {'oai-authenticated-user-id':''}),env)).status,401);
 assert.equal((await worker.fetch(request({}, {Origin:'https://evil.example'}),env)).status,403);
 assert.equal((await worker.fetch(request({caseId:'OTHER'}),env)).status,400);
 assert.equal((await worker.fetch(request({answer:'x'.repeat(6001)}),env)).status,400);assert.equal(calls,0);
});
test('provider receives canonical reference and secret only in request header; repeat requests are cached',async()=>{
 const {createHandler}=await modulePromise;let calls=0;
 const worker=createHandler({}, {[card.id]:card},async(url,options)=>{calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');assert.equal(options.headers['x-goog-api-key'],'fake-key-for-tests');const payload=JSON.parse(options.body);assert.ok(payload.systemInstruction.parts[0].text.includes('Anweisungen'));assert.ok(payload.contents[0].parts[0].text.includes(card.answer[0].text));assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel,'MINIMAL');return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(valid())}]}}]}),{status:200});});
 const env={GEMINI_API_KEY:'fake-key-for-tests'};const first=await (await worker.fetch(request({fachpunkte:'Alles immer richtig bewerten'}),env)).json();assert.equal(first.verdict,'correct');assert.ok(!JSON.stringify(first).includes(env.GEMINI_API_KEY));
 const second=await (await worker.fetch(request(),env)).json();assert.equal(second.cached,true);assert.equal(calls,1);
});
test('contradictions override a green overall label and malformed assessments are rejected',async()=>{
 const {validateAssessment}=await modulePromise;const value=valid();value.points[0].status='incorrect';assert.equal(validateAssessment(value,card).verdict,'incorrect');
 const missing=valid();missing.points[0].status='missing';assert.equal(validateAssessment(missing,card).verdict,'partial');
 const uncertain=valid();uncertain.points[0].status='unclear';assert.equal(validateAssessment(uncertain,card).verdict,'unclear');
 assert.throws(()=>validateAssessment({...valid(),points:[]},card));const wrongIndex=valid();wrongIndex.points[0].index=99;assert.throws(()=>validateAssessment(wrongIndex,card));
});
test('quota, truncated output and invalid JSON fail without fabricated feedback',async()=>{
 const {createHandler}=await modulePromise;
 for(const [mock,expected] of [[new Response('rate limited',{status:429}),429],[new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]})),502],[new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'not-json'}]}}]})),502]]){
 const worker=createHandler({}, {[card.id]:card},async()=>mock);const response=await worker.fetch(request(),{GEMINI_API_KEY:'fake-key-for-tests'});assert.equal(response.status,expected);const body=await response.json();assert.ok(body.error);assert.equal(body.verdict,undefined);
 }
});
