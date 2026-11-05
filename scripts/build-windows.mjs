import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),env={...process.env};
const local=path.join(root,'.runtime/toolchain');
try{await readFile(path.join(local,'cargo/bin/cargo.exe'));env.CARGO_HOME=path.join(local,'cargo');env.RUSTUP_HOME=path.join(local,'rustup');env.PATH=path.join(local,'cargo/bin')+path.delimiter+env.PATH;
 const compiler=path.join(local,'msvc'),msvc=(await readdir(path.join(compiler,'VC/Tools/MSVC')))[0],sdk=(await readdir(path.join(compiler,'Windows Kits/10/Lib')))[0];
 env.PATH=[path.join(compiler,'VC/Tools/MSVC',msvc,'bin/Hostx64/x64'),path.join(compiler,'Windows Kits/10/bin',sdk,'x64'),env.PATH].join(path.delimiter);
 env.INCLUDE=[path.join(compiler,'VC/Tools/MSVC',msvc,'include'),...['ucrt','shared','um','winrt'].map(n=>path.join(compiler,'Windows Kits/10/Include',sdk,n))].join(';');
 env.LIB=[path.join(compiler,'VC/Tools/MSVC',msvc,'lib/x64'),...['ucrt','um'].map(n=>path.join(compiler,'Windows Kits/10/Lib',sdk,n,'x64'))].join(';');
 env.VCToolsInstallDir=path.join(compiler,'VC/Tools/MSVC',msvc)+path.sep;env.WindowsSdkDir=path.join(compiler,'Windows Kits/10')+path.sep;env.WindowsSDKVersion=sdk+path.sep;
}catch{}
try{env.TAURI_SIGNING_PRIVATE_KEY||=await readFile(path.join(root,'.runtime/signing/lernpass.key'),'utf8');env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD||='';}catch{}
env.CARGO_TARGET_DIR=path.join(root,'.runtime/target');
const build=spawnSync(process.execPath,['scripts/build-app.mjs'],{cwd:root,env,stdio:'inherit'});if(build.status!==0)process.exit(build.status||1);
const result=spawnSync(process.execPath,[path.join(root,'node_modules/@tauri-apps/cli/tauri.js'),'build',...process.argv.slice(2)],{cwd:path.join(root,'windows'),env,stdio:'inherit'});process.exit(result.status||0);
