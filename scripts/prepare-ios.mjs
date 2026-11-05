import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.platform!=='darwin')throw Error('iPhone-Projekt auf dem MacBook oder einem macOS-CI-Runner vorbereiten.');
const run=(args)=>{const r=spawnSync(process.execPath,['node_modules/@capacitor/cli/bin/capacitor',...args],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);};
try{await readFile(new URL('../ios/App/App.xcodeproj/project.pbxproj',import.meta.url));}catch{run(['add','ios','--packagemanager','SPM']);}
run(['sync','ios']);
const project=new URL('../ios/App/App/',import.meta.url);await mkdir(project,{recursive:true});
for(const file of ['LernpassNative.swift','LernpassViewController.swift'])await copyFile(new URL('../ios/'+file,import.meta.url),new URL(file,project));
const storyboard=new URL('Base.lproj/Main.storyboard',project);let xml=await readFile(storyboard,'utf8');xml=xml.replace('customClass="CAPBridgeViewController" customModule="Capacitor"','customClass="LernpassViewController" customModule="App"');await writeFile(storyboard,xml);
const pbx=new URL('../ios/App/App.xcodeproj/project.pbxproj',import.meta.url);let code=await readFile(pbx,'utf8');
for(const [file,id] of [['LernpassNative.swift','AB17A100'],['LernpassViewController.swift','AB17A200']]){
 if(code.includes('/* '+file+' */'))continue;
 const ref=id+'0000000000000001',build=id+'0000000000000002';
 code=code.replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n\t\t'+build+' /* '+file+' in Sources */ = {isa = PBXBuildFile; fileRef = '+ref+' /* '+file+' */; };');
 code=code.replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n\t\t'+ref+' /* '+file+' */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = '+file+'; sourceTree = "<group>"; };');
 code=code.replace(/(\/\* App \*\/ = \{\s*isa = PBXGroup;\s*children = \()/,'$1\n\t\t\t\t'+ref+' /* '+file+' */,');
 code=code.replace(/(isa = PBXSourcesBuildPhase;[\s\S]*?files = \()/,'$1\n\t\t\t\t'+build+' /* '+file+' in Sources */,');
}
code=code.replace(/IPHONEOS_DEPLOYMENT_TARGET = [\d.]+;/g,'IPHONEOS_DEPLOYMENT_TARGET = 16.0;');await writeFile(pbx,code);
const plist=new URL('Info.plist',project);let info=await readFile(plist,'utf8');if(!info.includes('NSCameraUsageDescription'))info=info.replace('</dict>\n</plist>','<key>NSCameraUsageDescription</key><string>Füge Fotos deiner Skizzen in deine eigenen Antworten ein.</string><key>NSPhotoLibraryUsageDescription</key><string>Wähle Bilder für deine eigenen Antworten.</string><key>NSPhotoLibraryAddUsageDescription</key><string>Speichere eigene Lernbilder.</string><key>LSApplicationQueriesSchemes</key><array><string>sidestore</string><string>altstore</string></array></dict>\n</plist>');await writeFile(plist,info);
await copyFile(new URL('../windows/icons/icon-1024.png',import.meta.url),new URL('Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',project));
await writeFile(new URL('Assets.xcassets/AppIcon.appiconset/Contents.json',project),JSON.stringify({images:[{filename:'AppIcon-512@2x.png',idiom:'universal',platform:'ios',size:'1024x1024'}],info:{author:'xcode',version:1}},null,2));
console.log('iPhone-Projekt vorbereitet. Bundle-ID: at.lernpass.mec; auf dem Mac in Xcode bauen und prüfen.');
