import {readFile,mkdir,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
await import('./build-explanations.mjs');
const files=['index.html','styles.css','updates.css','workbook.css','data.js','flow.js','core.js','workbook.js','explanations.js','app.js','writer.js','insights.js','sync.js','planner-ui.js','unit-ui.js','icon.svg','manifest.webmanifest','sw.js','fonts/Inter.ttf','fonts/OFL.txt'];
const assets={};for(const file of files)assets[file]=(await readFile(new URL('../dist/'+file,import.meta.url))).toString('base64');
const context={window:{}};vm.runInNewContext(await readFile(new URL('../dist/data.js',import.meta.url),'utf8'),context);
const catalog=Object.fromEntries(context.window.MEC_CARDS.map(c=>[c.id,c]));
const worker=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const root=new URL('../dist/',import.meta.url);await mkdir(new URL('server/',root),{recursive:true});await mkdir(new URL('.openai/',root),{recursive:true});
let engine='const STATE_ENGINE=(()=>{const scope={};\n';
for(const file of ['flow.js','workbook.js','core.js']){const code=await readFile(new URL('../dist/'+file,import.meta.url),'utf8');engine+=code.replace(/\}\)\(typeof window[^\n]+\);?\s*$/,'})(scope);')+'\n';}
engine+='return scope.LernpassCore;})();\n';
const source='const ASSETS='+JSON.stringify(assets)+';\nconst CATALOG='+JSON.stringify(catalog)+';\n'+engine+worker;
await writeFile(new URL('server/index.js',root),source);await writeFile(new URL('.openai/hosting.json',root),await readFile(new URL('../.openai/hosting.json',import.meta.url)));
const result=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));if(typeof result.default?.fetch!=='function')throw new Error('Invalid Worker export');
console.log(JSON.stringify({ok:true,assets:files.length,cases:Object.keys(catalog).length,workerBytes:Buffer.byteLength(source)}));
