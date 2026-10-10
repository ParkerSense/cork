import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('private accounts, no anonymous access, read-only and revocable sharing',async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 const a='11111111-1111-1111-1111-111111111111',b='22222222-2222-2222-2222-222222222222';await db.exec(`insert into auth.users values('${a}'),('${b}');`);
 await db.exec(`set role authenticated;set app.user_id='${a}';insert into public.wines(producer,name,style,score)values('Test Estate','Test wine','White',6);`);
 assert.equal((await db.query('select * from wines')).rows.length,1);
 await assert.rejects(db.exec(`insert into wines(owner_id,producer,name,style,score)values('${b}','Attack','Attack','White',6)`));
 const share=(await db.query('insert into collection_shares default values returning token')).rows[0].token;
 await db.exec(`set app.user_id='${b}';`);assert.equal((await db.query('select * from wines')).rows.length,0);
 assert.equal((await db.query("update wines set score=10 returning id")).rows.length,0);
 assert.equal((await db.query("delete from wines returning id")).rows.length,0);
 assert.equal((await db.query('select * from collection_shares')).rows.length,0);
 const shared=(await db.query(`select * from shared_wines('${share}')`)).rows;assert.equal(shared.length,1);assert.equal('owner_id' in shared[0],false);
 await db.exec(`set app.user_id='${a}';delete from collection_shares;set app.user_id='${b}';`);assert.equal((await db.query(`select * from shared_wines('${share}')`)).rows.length,0);
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from wines'));await assert.rejects(db.query(`select * from shared_wines('${share}')`));await db.close();
});
