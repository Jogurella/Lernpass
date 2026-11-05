import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {d1Adapter} from '../scripts/local-db.mjs';
import {openLocalBucket} from '../scripts/local-bucket.mjs';
export async function openServerStorage(directory){
 await mkdir(directory,{recursive:true});
 const database=new DatabaseSync(path.join(directory,'learning.sqlite'));
 database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS __local_migrations(name TEXT PRIMARY KEY NOT NULL);');
 const folder=new URL('./drizzle/',import.meta.url),names=(await readdir(folder)).filter(n=>/^\d{4}_[a-z0-9_]+\.sql$/.test(n)).sort();
 for(const name of names){if(database.prepare('SELECT name FROM __local_migrations WHERE name=?').get(name))continue;database.exec('BEGIN');try{database.exec(await readFile(new URL(name,folder),'utf8'));database.prepare('INSERT INTO __local_migrations(name) VALUES(?)').run(name);database.exec('COMMIT');}catch(error){database.exec('ROLLBACK');throw error;}}
 return {database,DB:d1Adapter(database),BUCKET:await openLocalBucket(path.join(directory,'images'))};
}
