import {readFile,appendFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const root=new URL('../',import.meta.url),version=JSON.parse(await readFile(new URL('package.json',root),'utf8')).version,notes=JSON.parse(await readFile(new URL('release-notes.json',root),'utf8'));
if(!process.env.GITHUB_OUTPUT)throw Error('Dieser Helfer wird von GitHub Actions ausgeführt.');
const delimiter=randomUUID();await appendFile(process.env.GITHUB_OUTPUT,'body<<'+delimiter+'\n'+(notes[version]||'Lernpass '+version)+'\n'+delimiter+'\n');
