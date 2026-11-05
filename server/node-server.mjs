import http from 'node:http';
import path from 'node:path';
import {homedir} from 'node:os';
import {openServerStorage} from './storage.mjs';
import {masterSecret} from './secrets.mjs';
import worker from './index.mjs';
const directory=process.env.MEC_SERVER_DATA||path.join(process.env.APPDATA||homedir(),'Lernpass Server');
const port=Number(process.env.MEC_SERVER_PORT||8796);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Ungültiger Server-Port.');
const publicURL=new URL(process.env.MEC_SERVER_PUBLIC_URL||'http://127.0.0.1:'+port);
if(publicURL.protocol!=='https:'&&publicURL.hostname!=='127.0.0.1')throw Error('Der Server benötigt eine HTTPS-Adresse oder eine lokale Vorschau.');
const storage=await openServerStorage(directory),secret=await masterSecret(directory),env={DB:storage.DB,BUCKET:storage.BUCKET,AI_KEY_ENCRYPTION_KEY:secret,AI_LEGACY_SINGLE_USER:'false'};
const server=http.createServer(async(req,res)=>{
 try{
  const host=(req.headers.host||'').toLowerCase();if(![publicURL.host,'127.0.0.1:'+port,'localhost:'+port].includes(host)){res.writeHead(400);res.end();return;}
  let count=0;const chunks=[];for await(const chunk of req){count+=chunk.length;if(count>5*1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const incoming=new URL(req.url,publicURL);if(incoming.origin!==publicURL.origin){res.writeHead(400);res.end();return;}
  const headers=new Headers(req.headers);headers.set('cf-connecting-ip','tailnet|'+(req.headers['tailscale-user-login']||req.socket.remoteAddress||'local'));
  const request=new Request(incoming,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Der Lernpass-Server konnte die Anfrage gerade nicht bearbeiten.'}));}
});
server.headersTimeout=15000;server.requestTimeout=65000;server.maxConnections=64;
server.listen(port,'127.0.0.1',()=>console.log('Lernpass-Server bereit auf 127.0.0.1:'+port+'; Zugriff über den konfigurierten Tailscale-HTTPS-Zugang.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{storage.database.close();process.exit(0);}));
