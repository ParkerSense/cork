import {test} from 'node:test';import assert from 'node:assert/strict';import {validateWine,selectWines,escapeHtml} from '../src/model.js';
const a={producer:'Sample Estate',name:'Chardonnay',vintage:2020,country:'France',score:6.5,style:'White',created_at:'2024-01-01'};
test('validates rating and vintage',()=>{assert.equal(validateWine(a).score,6.5);for(const score of [-1,11,6.55,'bad'])assert.throws(()=>validateWine({...a,score}));assert.throws(()=>validateWine({...a,vintage:20205}));});
test('filters and sorts without changing original',()=>{const wines=[a,{...a,producer:'B',style:'Red',score:8}];assert.equal(selectWines(wines)[0].producer,'B');assert.equal(wines[0].producer,'Sample Estate');assert.equal(selectWines(wines,'france','White').length,1);assert.equal(selectWines(wines,'missing').length,0);});
test('escapes user input',()=>assert.equal(escapeHtml('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;'));
