import {test} from 'node:test';import assert from 'node:assert/strict';import {validateWine,selectWines,escapeHtml} from '../src/model.js';
const a={producer:'Sample Estate',name:'Chardonnay',vintage:2020,country:'France',score:6.5,style:'White',created_at:'2024-01-01'};
test('validates rating and vintage',()=>{assert.equal(validateWine(a).score,6.5);for(const score of [-1,11,6.55,'bad'])assert.throws(()=>validateWine({...a,score}));assert.throws(()=>validateWine({...a,vintage:20205}));});
test('filters and sorts without changing original',()=>{const wines=[a,{...a,producer:'B',style:'Red',score:8}];assert.equal(selectWines(wines)[0].producer,'B');assert.equal(wines[0].producer,'Sample Estate');assert.equal(selectWines(wines,'france','White').length,1);assert.equal(selectWines(wines,'missing').length,0);});
test('escapes user input',()=>assert.equal(escapeHtml('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;'));
import {fitSize,photoPath} from '../src/model.js';
test('photo sizing never upscales and keeps ratio',()=>{assert.deepEqual(fitSize(4000,3000),{width:1280,height:960});assert.deepEqual(fitSize(800,600),{width:800,height:600});assert.throws(()=>fitSize(0,5));});
test('photo path is owner-folder scoped and rejects junk',()=>{const u='11111111-1111-4111-8111-111111111111',v='22222222-2222-4222-8222-222222222222';assert.equal(photoPath(u,v),`${u}/${v}.jpg`);assert.throws(()=>photoPath('../x',v));});
