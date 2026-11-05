import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {renderSetupPage} from './setup-page.mjs';
import {normalizeKey} from './key-format.mjs';
export function isAllowed(req,config){
 const login=String(req.headers['tailscale-user-login']||'').toLowerCase();
 const route=req.url===config.path||req.method==='GET'&&[config.path+'?v=2',config.path+'?v=3'].includes(req.url);
 return req.headers.host===config.host&&login===config.owner.toLowerCase()&&route;
}
export async function createMobileSetup(config,onKey){
 let stored=false;
 const server=http.createServer(async(req,res)=>{
  const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(body));};
  if(!isAllowed(req,config)){send({message:'Dieser Einrichtungslink ist nur für dein Tailscale-Konto freigegeben.'},403);return;}
  const html=(options,status=200)=>{res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(renderSetupPage({endpoint:config.path,mobile:true,saved:stored,...options}));};
  if(req.method==='GET'){html({});return;}
  const type=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
  const isJson=type==='application/json',isForm=type==='application/x-www-form-urlencoded';
  const reply=(body,status=200)=>{if(isForm)html({notice:body.message},status);else send(body,status);};
  if(req.method!=='POST'||req.headers.origin!=='https://'+config.host||!isJson&&!isForm){send({message:'Die Anfrage ist nicht erlaubt. Öffne die neue Einrichtungsseite noch einmal.',saved:false},403);return;}
  try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384){reply({message:'Die Eingabe ist zu groß.',saved:false},413);return;}chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');const data=isJson?JSON.parse(raw):Object.fromEntries(new URLSearchParams(raw));const key=normalizeKey(data.key);
   if(!key){reply({message:'Bitte den vollständigen Schlüssel ohne Leerzeichen oder zusätzlichen Text einfügen. Neue Google-Auth-Schlüssel mit Punkten werden unterstützt.',saved:false},400);return;}
   try{await onKey(key);}catch{reply({message:'Der Server konnte den Schlüssel nicht speichern. Bitte erneut versuchen.',saved:false},500);return;}
   stored=true;reply({message:'Schlüssel geschützt gespeichert. Schreibe im Chat nur „Schlüssel gespeichert“. Die Online-Prüfung wird anschließend aktiviert.',saved:true});
  }catch{reply({message:'Die Eingabe konnte nicht gelesen werden. Bitte erneut versuchen.',saved:false},400);}
 });
 return server;
}
if(process.argv.includes('--run')){
 const config=JSON.parse(await readFile(new URL('../.runtime/mobile-setup.json',import.meta.url),'utf8'));
 const server=await createMobileSetup(config,async key=>{await writeFile(new URL('../.dev.vars',import.meta.url),'GEMINI_API_KEY='+key+'\nGEMINI_MODEL=gemini-3.1-flash-lite\n',{mode:0o600});console.log('Gemini key received and saved. Secret value is not displayed.');});
 server.listen(8790,'127.0.0.1',()=>console.log('Private mobile setup receiver ready on loopback port 8790.'));
}
