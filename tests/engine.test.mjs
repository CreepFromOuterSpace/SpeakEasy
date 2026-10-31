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
import { readingReport, drillPrompt } from '../src/engine.js';
test('reading report derives score and practice focuses from actual observations',()=>{
 const cmp=compareText('The silver birds sing today.', 'The little birds um sing');
 const r=readingReport(cmp,{pauses:2,quiet:true},'The little birds um sing');
 assert.equal(r.score,40);assert.deepEqual(r.issues.map(x=>x.id),['words','coverage','pacing','fillers','volume']);
 assert.equal(readingReport(null,{pauses:0,quiet:false},'').score,null);
});
test('practice rotates indefinitely at the highest level and uses flagged words',()=>{
 const issue={id:'words',words:['silver','bright']};
 assert.equal(drillPrompt(issue,{level:0,attempts:0}),'silver');assert.equal(drillPrompt(issue,{level:0,attempts:1}),'bright');
 const prompts=Array.from({length:12},(_,attempts)=>drillPrompt(issue,{level:4,attempts}));assert.ok(prompts.every(Boolean));assert.ok(new Set(prompts).size>2);
});
import { createEndpoint, updateEndpoint, readingPosition, resamplePCM } from '../src/reading-session.js';
test('endpoint waits for speech, tolerates short pauses, and stops after sustained silence',()=>{
 let s=createEndpoint();for(let i=0;i<100;i++)s=updateEndpoint(s,0,.1);assert.equal(s.stop,false);
 for(let i=0;i<10;i++)s=updateEndpoint(s,.1,.1);assert.equal(s.started,true);
 for(let i=0;i<15;i++)s=updateEndpoint(s,0,.1);assert.equal(s.stop,false);
 s=updateEndpoint(s,.1,.1);assert.equal(s.silence,0);
 for(let i=0;i<31;i++)s=updateEndpoint(s,0,.1);assert.equal(s.stop,true);
});
test('reading position uses recognized content, tolerates recognition differences and never moves backward',()=>{
 const text='Sarah stepped outside into the morning sunshine. Six small birds sang.';
 assert.equal(readingPosition(text,'Sarah stepped outside'),3);
 assert.equal(readingPosition(text,'Sarah stepped outside into the morning sunshine'),7);
 assert.equal(readingPosition(text,'Sarah stepped',7),7);
 assert.equal(readingPosition(text,'unrelated noises only'),0);
 assert.equal(readingPosition(text,text),11);
});
test('PCM resampling preserves duration and finite samples',()=>{const out=resamplePCM([new Float32Array(48000).fill(.25)],48000);assert.equal(out.length,16000);assert.ok(out.every(x=>x===.25));});
