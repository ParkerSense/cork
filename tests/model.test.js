import {test} from 'node:test';import assert from 'node:assert/strict';import {validateDrink,selectWines,escapeHtml} from '../src/model.js';
const a={producer:'Sample Estate',name:'Chardonnay',vintage:2020,country:'France',score:6.5,style:'White',drink_type:'Wine',created_at:'2024-01-01'};
test('validates rating and vintage',()=>{assert.equal(validateDrink(a).score,6.5);for(const score of [-1,11,6.55,'bad'])assert.throws(()=>validateDrink({...a,score}));assert.throws(()=>validateDrink({...a,vintage:20205}));});
test('wine requires a style and never keeps an ABV',()=>{assert.throws(()=>validateDrink({...a,style:undefined}));assert.equal(validateDrink({...a,abv:13}).abv,null);assert.equal(validateDrink(a).style,'White');});
test('other drinks take brand and ABV, never vintage or style',()=>{const m=validateDrink({producer:'Jipyeong',name:'Makgeolli',score:8,drink_type:'Makgeolli',abv:6,vintage:2020,style:'Red',notes:'sweet and fizzy'});assert.equal(m.drink_type,'Makgeolli');assert.equal(m.abv,6);assert.equal(m.vintage,null);assert.equal(m.style,null);for(const abv of [-1,101,13.55,'bad'])assert.throws(()=>validateDrink({producer:'J',name:'M',score:8,drink_type:'Soju',abv}));assert.equal(validateDrink({producer:'J',name:'M',score:8,drink_type:'Soju'}).abv,null);assert.equal(validateDrink({producer:'J',name:'M',score:8,drink_type:'nonsense',style:'Red'}).drink_type,'Wine');});
test('taste scales are optional 1-5 integers, wine only',()=>{
 const t=validateDrink({...a,sweetness:1,acidity:4,tannin:2,body:3});
 assert.deepEqual([t.sweetness,t.acidity,t.tannin,t.body],[1,4,2,3]);
 const unset=validateDrink(a);
 assert.deepEqual([unset.sweetness,unset.acidity,unset.tannin,unset.body],[null,null,null,null]);
 for(const bad of [0,6,2.5,'bad'])assert.throws(()=>validateDrink({...a,body:bad}));
 const soju=validateDrink({producer:'J',name:'M',score:8,drink_type:'Soju',sweetness:3,body:''});
 assert.equal(soju.sweetness,null);assert.equal(soju.body,null);
});
test('filters by drink type and style and sorts without changing original',()=>{const soju={...a,producer:'Jinro',name:'Chamisul',drink_type:'Soju',style:null,vintage:null,abv:16.5,score:8};const wines=[a,soju,{...a,producer:'B',style:'Red',score:9}];assert.equal(selectWines(wines)[0].producer,'B');assert.equal(wines[0].producer,'Sample Estate');assert.equal(selectWines(wines,'france','White','score','Wine').length,1);assert.equal(selectWines(wines,'','All','score','Soju')[0].producer,'Jinro');assert.equal(selectWines(wines,'soju').length,1);assert.equal(selectWines(wines,'missing').length,0);});
test('escapes user input',()=>assert.equal(escapeHtml('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;'));
import {fitSize,photoPath} from '../src/model.js';
test('photo sizing never upscales and keeps ratio',()=>{assert.deepEqual(fitSize(4000,3000),{width:1280,height:960});assert.deepEqual(fitSize(800,600),{width:800,height:600});assert.throws(()=>fitSize(0,5));});
test('photo path is owner-folder scoped and rejects junk',()=>{const u='11111111-1111-4111-8111-111111111111',v='22222222-2222-4222-8222-222222222222';assert.equal(photoPath(u,v),`${u}/${v}.jpg`);assert.throws(()=>photoPath('../x',v));});
