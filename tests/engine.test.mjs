import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, advance } from '../src/engine.js';
test('silence and short captures cannot generate useful feedback',()=>{assert.equal(analyze([],5).valid,false);assert.equal(analyze([{rms:0,dt:3}],3).valid,false);});
test('counts interior pauses but excludes lead-in and trailing silence',()=>{
 const frames=[...Array.from({length:20},()=>({rms:0,dt:.1})),...Array.from({length:20},()=>({rms:.1,dt:.1})),...Array.from({length:10},()=>({rms:0,dt:.1})),...Array.from({length:20},()=>({rms:.1,dt:.1})),...Array.from({length:20},()=>({rms:0,dt:.1}))];
 const r=analyze(frames,9);assert.equal(r.valid,true);assert.equal(r.pauses,1);assert.equal(r.db,-20);
});
test('two confident reviews advance; difficulty lowers after a retry',()=>{let p={level:0,streak:0,attempts:0};p=advance(p,true);assert.equal(p.level,0);p=advance(p,true);assert.equal(p.level,1);p=advance(p,false);assert.equal(p.level,0);assert.equal(p.attempts,3);assert.equal(advance({level:4,streak:1,attempts:5},true).level,4);});
import { compareText, escapeHTML } from '../src/alignment.js';
test('alignment handles punctuation, case, substitutions, omissions and insertions',()=>{
 const r=compareText('The sun is bright today.', 'the son is very bright');
 assert.equal(r.matches,3);assert.equal(r.substitutions,1);assert.equal(r.omissions,1);assert.equal(r.additions,1);
 assert.equal(r.items.find(x=>x.type==='substitution').heard,'son');
 assert.equal(r.items.find(x=>x.type==='omission').word,'today.');
 assert.equal(compareText("She’s here.","shes HERE").wordErrorRate,0);
});
test('empty transcript flags all reference words and rendered text is escaped',()=>{assert.equal(compareText('six small birds','').omissions,3);assert.equal(escapeHTML('<img>'), '&lt;img&gt;');});
