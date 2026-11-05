import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {setupPage} from './setup-page.mjs';
import {normalizeKey} from './key-format.mjs';
import {execFile} from 'node:child_process';
import {openLocalDB} from './local-db.mjs';
import {openLocalBucket} from './local-bucket.mjs';
const previewPort=Number(process.env.MEC_PREVIEW_PORT||8788);
if(!Number.isInteger(previewPort)||previewPort<1024||previewPort>65535)throw new Error('Invalid preview port');
const previewOrigin='http://127.0.0.1:'+previewPort;
const previewUser=process.env.MEC_PREVIEW_USER||'local-preview';
if(!/^[a-zA-Z0-9_-]{1,80}$/.test(previewUser))throw Error('Invalid local preview user');
const {default:worker}=await import('data:text/javascript;base64,'+(await readFile(new URL('../dist/server/index.js',import.meta.url))).toString('base64'));
const env={GEMINI_API_KEY:process.env.GEMINI_API_KEY||'',GEMINI_MODEL:process.env.GEMINI_MODEL||'gemini-3.1-flash-lite'};
env.DB=(await openLocalDB()).binding;
env.BUCKET=await openLocalBucket();
try{env.AI_KEY_ENCRYPTION_KEY=await readFile(new URL('../.runtime/local-ai-secret',import.meta.url),'utf8');}catch{env.AI_KEY_ENCRYPTION_KEY=randomBytes(32).toString('base64');await writeFile(new URL('../.runtime/local-ai-secret',import.meta.url),env.AI_KEY_ENCRYPTION_KEY,{mode:0o600});}
env.AI_LEGACY_SINGLE_USER='true';
// Ignored, machine-local secrets are read without logging their values.
try{const raw=await readFile(new URL('../.dev.vars',import.meta.url),'utf8');for(const line of raw.split(/\r?\n/)){const match=line.match(/^(GEMINI_API_KEY|GEMINI_MODEL)=(.*)$/);if(match)env[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');}}catch{}
const server=http.createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}if(req.url==='/__setup'){
  if(req.headers.host!=='127.0.0.1:'+previewPort){res.writeHead(403);res.end();return;}
  if(req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(setupPage);return;}
  if(req.method!=='POST'||req.headers.origin!==previewOrigin||req.headers['content-type']!=='application/json'){res.writeHead(403);res.end();return;}
  let body;try{body=JSON.parse(Buffer.concat(chunks));}catch{res.writeHead(400);res.end();return;}
  const key=normalizeKey(body?.key);if(!key){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Bitte nur den vollständigen Schlüssel ohne Leerzeichen oder zusätzlichen Text einfügen.'}));return;}
  await writeFile(new URL('../.dev.vars',import.meta.url),'GEMINI_API_KEY='+key+'\nGEMINI_MODEL=gemini-3.1-flash-lite\n',{mode:0o600});env.GEMINI_API_KEY=key;
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({saved:true,message:'Lokal gespeichert. Schreibe im Chat nur „Schlüssel gespeichert“, damit die Online-Anbindung aktiviert und geprüft werden kann.'}));return;
}const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);headers.set('oai-authenticated-user-id',previewUser);const method=req.method||'GET';const request=new Request(previewOrigin+req.url,{method,headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Preview error');}});
server.listen(previewPort,'127.0.0.1',()=>{console.log('Mechatronik Lernpass preview: '+previewOrigin+' (Gemini '+(env.GEMINI_API_KEY?'configured':'not configured')+')');if(process.argv.includes('--setup')&&process.platform==='win32')execFile('rundll32.exe',['url.dll,FileProtocolHandler',previewOrigin+'/__setup'],{windowsHide:true},()=>{});});
