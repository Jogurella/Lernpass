import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const scope={window:{}};vm.runInNewContext(await readFile(new URL('../dist/data.js',import.meta.url),'utf8'),scope);
const cards=scope.window.MEC_CARDS,notes={};
for(const line of (await readFile(new URL('../content/vertiefungen.txt',import.meta.url),'utf8')).trim().split(/\r?\n/)){
  const [id,reason,example,...extra]=line.split('|');if(notes[id]||!reason||!example||extra.length)throw Error('Invalid explanation '+id);notes[id]={reason,example};
}
if(Object.keys(notes).length!==cards.length||cards.some(c=>!notes[c.id]))throw Error('Missing case explanation');
const code=`(function(root){
  'use strict';
  const DETAILS=${JSON.stringify(notes)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function switchHTML(mode,global=false){return '<div class="detail-switch '+(global?'global-detail-switch':'')+'" role="group" aria-label="Erklärungstiefe"><span>Antworten anzeigen</span>'+[['summary','Zusammengefasst'],['detailed','Ausführlich erklärt']].map(([value,label])=>'<button type="button" class="button '+(mode===value?'primary':'secondary')+'" data-action="answer-depth" data-depth="'+value+'" aria-pressed="'+(mode===value)+'">'+label+'</button>').join('')+'</div>';}
  function firstSentence(text){const match=text.match(/^.*?[.!?](?=\\s+[A-ZÄÖÜ]|$)/);return match?match[0]:text;}
  function summaryHTML(card){return '<div class="answer-short">'+card.answer.map(a=>'<section><h3>'+esc(a.label)+'</h3><p>'+esc(firstSentence(a.text))+'</p></section>').join('')+'</div><p class="small-muted">Kurzfassung zum Wiederholen. Begründungen, Grenzen und Beispiele stehen unter „Ausführlich erklärt“.</p>';}
  function detailedHTML(card){const n=DETAILS[card.id];if(!n)return '';return '<section class="explain-detail"><div class="eyebrow">SCHRITT FÜR SCHRITT VERSTEHEN</div><h3>Wie die Fachpunkte zusammenhängen</h3><p>'+esc(n.reason)+'</p><h3>Praxis, Rechenweg und genaue Abgrenzung</h3><p>'+esc(n.example)+'</p><h3>So baust du deine eigene Erklärung auf</h3><ol>'+card.answer.map(a=>'<li><strong>'+esc(a.label)+'</strong>: Erkläre den Zusammenhang in eigenen Worten und nenne die dafür entscheidenden Eigenschaften oder Bedingungen.</li>').join('')+'</ol><p class="small-muted">Die vollständigen Fachpunkte und ihre Quellen gehören dazu. Diese Vertiefung ist ein Lernbeispiel; konkrete Anlagen, Grenzwerte und Herstellerangaben müssen zum Anwendungsfall passen.</p></section>';}
  const api={DETAILS,switchHTML,firstSentence,summaryHTML,detailedHTML};root.LernpassExplanations=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
`;
await writeFile(new URL('../dist/explanations.js',import.meta.url),code);
