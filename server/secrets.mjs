import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
function dpapi(mode,value){
 const statement=mode==='protect'?'[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)':'[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)';
 const code="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); try {$result="+statement+"; [Console]::Write([Convert]::ToBase64String($result))} catch {exit 1}";
 return new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(code,'utf16le').toString('base64')],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='';child.stdout.setEncoding('utf8');child.stdout.on('data',v=>out+=v);child.stderr.resume();child.on('error',()=>reject(Error('Der geschützte Windows-Schlüsselspeicher ist nicht erreichbar.')));child.on('close',status=>status===0?resolve(out.trim()):reject(Error('Der Server-Schlüssel konnte nicht mit diesem Windows-Konto gelesen werden.')));child.stdin.end(value);});
}
export async function masterSecret(directory){await mkdir(directory,{recursive:true});const windows=process.platform==='win32',file=path.join(directory,windows?'server-key.dpapi':'server-key');let stored;try{stored=await readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;const value=randomBytes(32).toString('base64');stored=windows?await dpapi('protect',value):value;await writeFile(file,stored,{mode:0o600,flag:'wx'});}
 const value=windows?await dpapi('unprotect',stored):stored;if(Buffer.from(value,'base64').length!==32)throw Error('Ungültiger Server-Schlüssel. Stelle die zugehörige Sicherung wieder her.');return value;
}
