import {readFile} from 'node:fs/promises';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!=='v'+version)throw Error('Das Git-Tag muss mit package.json übereinstimmen.');
if(!process.env.TAURI_SIGNING_PRIVATE_KEY)throw Error('GitHub-Secret TAURI_SIGNING_PRIVATE_KEY ist noch nicht eingerichtet.');
console.log('Version und vorhandener Signaturzugang geprüft.');
