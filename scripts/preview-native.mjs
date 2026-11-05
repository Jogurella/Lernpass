import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {openLocalDB} from './local-db.mjs';
import {openLocalBucket} from './local-bucket.mjs';
const root=new URL('../',import.meta.url),port=Number(process.env.MEC_NATIVE_PORT||8794);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const db=await openLocalDB(new URL('.runtime/native-preview.sqlite',root));
if(!db.database.prepare("SELECT name FROM sqlite_master WHERE name='accounts'").get())db.database.exec(await readFile(new URL('server/drizzle/0002_devices.sql',root),'utf8'));
await mkdir(new URL('.runtime/',root),{recursive:true});let secret;try{secret=await readFile(new URL('.runtime/native-preview-secret',root),'utf8');}catch{secret=randomBytes(32).toString('base64');await writeFile(new URL('.runtime/native-preview-secret',root),secret);}
const env={DB:db.binding,BUCKET:await openLocalBucket(new URL('.runtime/native-images/',root)),AI_KEY_ENCRYPTION_KEY:secret,AI_LEGACY_SINGLE_USER:'false'};
const {default:worker}=await import('../server/index.mjs');
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'application/javascript; charset=utf-8',svg:'image/svg+xml',png:'image/png'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:'+port);if(!url.pathname.startsWith('/api/')&&url.pathname!=='/health'){const name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!/^[a-zA-Z0-9_.-]+$/.test(name)){res.writeHead(404);res.end();return;}const bytes=await readFile(new URL('app/'+name,root));res.writeHead(200,{'Content-Type':types[name.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);return;}let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>5*1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Die lokale Vorschau konnte die Anfrage nicht verarbeiten.');}}).listen(port,'127.0.0.1',()=>console.log('Lernpass-App Vorschau: http://127.0.0.1:'+port));
