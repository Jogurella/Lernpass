import {readFile,writeFile,open,mkdir,stat,copyFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),config=JSON.parse(await readFile(new URL('../.runtime/server-launch.json',import.meta.url),'utf8'));
await mkdir(config.directory,{recursive:true});const log=path.join(config.directory,'server.log');
async function running(){try{const r=await fetch('http://127.0.0.1:'+config.port+'/health',{signal:AbortSignal.timeout(1500)});return r.ok&&(await r.json()).app==='Lernpass';}catch{return false;}}
while(!await running()){
 try{if((await stat(log)).size>2097152){await copyFile(log,log+'.previous');await writeFile(log,'');}}catch{}
 const output=await open(log,'a');
 const child=spawn(process.execPath,['server/node-server.mjs'],{cwd:root,windowsHide:true,stdio:['ignore',output.fd,output.fd],env:{...process.env,MEC_SERVER_DATA:config.directory,MEC_SERVER_PORT:String(config.port),MEC_SERVER_PUBLIC_URL:config.publicURL}});
 await new Promise(resolve=>{child.on('error',resolve);child.on('close',resolve);});await output.close();await new Promise(resolve=>setTimeout(resolve,5000));
}
