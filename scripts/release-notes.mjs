import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),version=JSON.parse(await readFile(new URL('package.json',root),'utf8')).version,notes=JSON.parse(await readFile(new URL('release-notes.json',root),'utf8'));
console.log(notes[version]||'Lernpass '+version+' – Aktualisierung der App.');
