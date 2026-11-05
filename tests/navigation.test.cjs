const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scripts=['data.js','flow.js','workbook.js','core.js','writer.js','insights.js','sync.js','planner-ui.js','unit-ui.js','explanations.js'];
function app(plan){
  const events={},nodes={app:{innerHTML:''},main:{focus(){}},toast:{textContent:'',hidden:true}},store=new Map();
  const document={visibilityState:'visible',activeElement:null,getElementById:id=>nodes[id]||null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(type,callback){(events[type]||=[]).push(callback);}};
  const window={scrollTo(){},addEventListener(){}};
  const context=vm.createContext({window,document,location:{protocol:'file:'},navigator:{},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},setInterval(){},setTimeout(){},clearTimeout(){},console});
  for(const file of scripts)vm.runInContext(fs.readFileSync(require.resolve('../dist/'+file),'utf8'),context,{filename:file});
  const state=window.LernpassCore.fresh('2026-11-05');state.onboarded=true;Object.assign(state.plan,plan);store.set('mechatronik-lernpass.v1',JSON.stringify(state));
  vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context,{filename:'app.js'});
  function navigate(route){const target={closest:selector=>selector==='[data-route]'?{dataset:{route}}:null};for(const callback of events.click||[])callback({target,preventDefault(){}});return nodes.app.innerHTML;}
  return {navigate,nodes};
}
for(const [label,plan,count,last] of [
 ['three weeks',{days:21},21,'2026-11-25'],
 ['four weeks',{days:28},28,'2026-12-02'],
 ['actual exam date',{deadline:'2026-11-20'},15,'2026-11-19']
])test('the actual Mein Lernpass navigation renders its calendar for '+label,()=>{const view=app(plan),html=view.navigate('pass');assert.ok(html.includes('Jeder kleine Schritt'));assert.equal((html.match(/class="day-cell /g)||[]).length,count);assert.ok(html.includes('data-day="2026-11-05"'));assert.ok(html.includes('data-day="'+last+'"'));assert.ok(!html.includes('Invalid Date'));assert.ok(view.navigate('catalog').includes('Dein Wissen'));assert.ok(view.navigate('pass').includes('calendar-grid'));});
