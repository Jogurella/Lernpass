import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile} from 'node:fs/promises';

// Local preview/test adapter only. Production receives a real Sites D1 binding.
export function d1Adapter(database){
  function prepare(sql){let values=[];const args=()=>values.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v);
    return {bind(...input){values=input;return this;},async first(){return database.prepare(sql).get(...args())||null;},async all(){return {results:database.prepare(sql).all(...args())};},execute(){const statement=database.prepare(sql);if(/\bRETURNING\b|^\s*SELECT\b/i.test(sql))return {results:statement.all(...args())};const result=statement.run(...args());return {results:[],meta:{changes:Number(result.changes)}};},async run(){return this.execute();}};
  }
  return {prepare,async batch(statements){database.exec('BEGIN IMMEDIATE');try{const result=statements.map(statement=>statement.execute());database.exec('COMMIT');return result;}catch(error){database.exec('ROLLBACK');throw error;}}};
}
export async function openLocalDB(filename=new URL('../.runtime/learner-preview.sqlite',import.meta.url)){
  await mkdir(new URL('../.runtime/',import.meta.url),{recursive:true});
  const database=new DatabaseSync(filename);database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  database.exec('CREATE TABLE IF NOT EXISTS __local_migrations (name TEXT PRIMARY KEY NOT NULL)');
  const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
  for(const entry of journal.entries)if(!database.prepare('SELECT name FROM __local_migrations WHERE name=?').get(entry.tag)){
    const sql=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');database.exec('BEGIN');try{database.exec(sql);database.prepare('INSERT INTO __local_migrations(name) VALUES(?)').run(entry.tag);database.exec('COMMIT');}catch(error){database.exec('ROLLBACK');throw error;}
  }
  return {database,binding:d1Adapter(database)};
}
