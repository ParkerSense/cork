import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('scan counters are service-only, user-separated, capped and reset by time window',async()=>{
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);');
 await db.exec(await readFile(new URL('../supabase/label-scan.sql',import.meta.url),'utf8'));
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';await db.exec(`insert into auth.users values('${A}'),('${B}');`);
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query(`select reserve_label_scan('${A}')`));await assert.rejects(db.query('select * from label_scan_limits'));await db.exec('reset role');}
 const reserve=async id=>(await db.query(`select reserve_label_scan('${id}') allowed`)).rows[0].allowed;
 await db.exec('set role service_role');for(let i=0;i<3;i++)assert.equal(await reserve(A),true);assert.equal(await reserve(A),false);assert.equal(await reserve(B),true);await db.exec('reset role');
 await db.exec(`update label_scan_limits set minute_start=minute_start-interval '2 minutes' where owner_id='${A}'`);assert.equal(await reserve(A),true);
 await db.exec(`update label_scan_limits set day_count=20,minute_count=0 where owner_id='${A}'`);assert.equal(await reserve(A),false);
 await db.exec(`update label_scan_limits set day_start=day_start-1,minute_start=minute_start-interval '2 minutes' where owner_id='${A}'`);assert.equal(await reserve(A),true);
 assert.equal((await db.query(`select day_count from label_scan_limits where owner_id='${A}'`)).rows[0].day_count,1);await db.close();
});
test('scan code keeps provider secret server-side and never uploads or logs image contents',async()=>{
 const edge=await readFile(new URL('../supabase/functions/label-scan/index.ts',import.meta.url),'utf8'),ui=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(edge,/auth\/v1\/user/);assert.match(edge,/user.is_anonymous/);assert.match(edge,/reserve_label_scan/);assert.match(edge,/CLOUDFLARE_AI_TOKEN/);assert.match(edge,/reader.cancel/);assert.match(edge,/jpeg.encode/);
 assert.doesNotMatch(edge,/console\.(log|error)|\/storage\/v1|user\.email/);assert.doesNotMatch(ui,/CLOUDFLARE_AI_TOKEN|api\.cloudflare\.com/);assert.match(ui,/functions.invoke\('label-scan'/);assert.doesNotMatch(ui,/Nothing left your phone/);
});
