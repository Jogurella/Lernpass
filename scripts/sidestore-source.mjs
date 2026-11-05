import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=new URL('../',import.meta.url),version=process.env.RELEASE_VERSION||JSON.parse(await readFile(new URL('package.json',root),'utf8')).version,notes=JSON.parse(await readFile(new URL('release-notes.json',root),'utf8')),repo=process.env.GITHUB_REPOSITORY||'Jogurella/Lernpass',file=process.argv[2];
if(!file)throw Error('Bitte die tatsächlich gebaute IPA-Datei angeben.');
const size=(await stat(file)).size;if(size<10000)throw Error('Die IPA-Datei ist unvollständig.');
const target=new URL('sidestore/source.json',root),source=JSON.parse(await readFile(target,'utf8')),icon='https://raw.githubusercontent.com/'+repo+'/main/windows/icons/icon-1024.png';
const entry={version,date:new Date().toISOString(),downloadURL:'https://github.com/'+repo+'/releases/download/v'+version+'/'+path.basename(file),size,localizedDescription:notes[version]||'Aktualisierung der App.',minOSVersion:'16.0'};
let app=source.apps.find(a=>a.bundleIdentifier==='at.lernpass.mec');if(!app){app={name:'Lernpass',bundleIdentifier:'at.lernpass.mec',developerName:'Jogurella',localizedDescription:'Lernplan, Tests und Wiederholungen für Mechatronik MEC H1.',iconURL:icon,tintColor:'DD7419',versions:[],appPermissions:{entitlements:[],privacy:{NSCameraUsageDescription:'Füge Fotos deiner Skizzen in deine eigenen Antworten ein.',NSPhotoLibraryUsageDescription:'Wähle Bilder für deine eigenen Antworten.',NSPhotoLibraryAddUsageDescription:'Speichere eigene Lernbilder.'}}};source.apps.push(app);}
app.versions=[entry,...app.versions.filter(v=>v.version!==version)];source.iconURL=icon;await writeFile(target,JSON.stringify(source,null,2)+'\n');console.log('SideStore-Quelle mit echter Dateigröße aktualisiert.');
