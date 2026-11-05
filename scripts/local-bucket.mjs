import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
// Local preview adapter only. Production uses the Sites R2 binding BUCKET.
export async function openLocalBucket(directory=new URL('../.runtime/worksheet-images/',import.meta.url)){
  const {fileURLToPath}=await import('node:url');const folder=directory instanceof URL?fileURLToPath(directory):directory;await mkdir(folder,{recursive:true});
  const name=key=>{if(!/^worksheets\/[a-f0-9]{64}\/[a-f0-9-]{36}$/.test(key))throw Error('Invalid key');return join(folder,key.replaceAll('/','_'));};
  return {async put(key,bytes,options){const filename=name(key);await writeFile(filename,bytes);await writeFile(filename+'.json',JSON.stringify(options));},async get(key){const filename=name(key);try{const bytes=await readFile(filename),metadata=JSON.parse(await readFile(filename+'.json','utf8'));return {body:bytes,size:bytes.length,...metadata};}catch{return null;}}};
}
