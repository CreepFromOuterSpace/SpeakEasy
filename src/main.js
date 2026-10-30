import './style.css';
import { createIcons, icons } from 'lucide';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { compareText, escapeHTML } from './alignment.js';
import { passage, analyze, advance, readingReport, drillPrompt } from './engine.js';
const $=s=>document.querySelector(s), app=$('#app');
const icon=(name,size=20)=>`<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
let screen='welcome',profile={age:'',gender:''},report,result,comparison,speechResult,speechError='',sample=false;
let selectedIssue,progress={},drillFeedback,prompt='',history=[],showReading=false,showProfile=false,taskToken=0;
let recording=false,stream,context,analyser,source,recorder,chunks=[],frames=[],startTime=0,lastFrame=0,raf,tracker,trackLoading=false,lastVideoTime=-1,lastTrack=0,recordingURL,drillURL,lastBlob,error='',cameraStatus='Camera off',currentLine=0;
let mediaBusy=false,analyzing=false,analysisMessage='';
try{progress=JSON.parse(localStorage.getItem('speakeasy-learn')||'{}');history=JSON.parse(localStorage.getItem('speakeasy-history')||'[]');profile=JSON.parse(localStorage.getItem('speakeasy-profile')||'{"age":"","gender":""}');}catch{}
const save=()=>{try{localStorage.setItem('speakeasy-learn',JSON.stringify(progress));localStorage.setItem('speakeasy-history',JSON.stringify(history.slice(-30)));localStorage.setItem('speakeasy-profile',JSON.stringify(profile));}catch{}};
window.speech?.onProgress(message=>{analysisMessage=message;const el=$('#analysis-status');if(el)el.textContent=message;});
const busy=()=>recording||analyzing||mediaBusy;
const cameraOn=()=>stream?.getVideoTracks().some(t=>t.readyState==='live');
function render(){
 app.innerHTML=`<header class="app-header"><span class="brand">${icon('AudioLines',23)}SpeakEasy</span><span class="header-right">${sample&&screen!=='welcome'?'<span class="demo-tag">Sample session</span>':''}${screen!=='welcome'?`<button class="button quiet" id="profile">${icon('ChartNoAxesCombined',15)} Your progress</button>${screen==='practice'?'<button class="button quiet" id="diagnostic">'+icon('RotateCcw',15)+' New diagnostic</button>':''}`:''}<span class="privacy" title="Audio and video are processed on this device">${icon('LockKeyhole',14)} Private by design</span></span></header><main class="${screen}">${analyzing?loading():screen==='welcome'?welcome():screen==='read'?reading():practice()}</main>${showProfile?profilePanel():''}${error?`<div class="error" role="alert">${escapeHTML(error)}</div>`:''}<footer>Speech practice. Not a medical diagnosis.</footer>`;
 createIcons({icons});bind();if((screen==='read'||screen==='practice')&&cameraOn())attachVideo();
}
function welcome(){return `<section class="welcome-content"><div class="app-mark">${icon('AudioLines',42)}</div><h1>A little about you.</h1><p class="subtitle">Then, let’s get to know your voice.</p><form id="profile-form"><div class="fields"><label>Age<input id="age" type="number" inputmode="numeric" min="5" max="120" placeholder="Your age" value="${profile.age}" required></label><label>Gender<select id="gender" required><option value="" disabled ${!profile.gender?'selected':''}>Select</option>${['Woman','Man','Nonbinary','Self-described','Prefer not to say'].map(g=>`<option ${profile.gender===g?'selected':''}>${g}</option>`).join('')}</select></label></div><button class="button primary" type="submit">Continue ${icon('ArrowRight',18)}</button></form><p class="fine">Kept for this session. Never used to grade your speech.</p></section>`;}
function reading(){return `<div class="section-heading"><span class="eyebrow">ONE SIMPLE CHECK</span><h1>Let’s hear you.</h1><p class="subtitle">Read this aloud in your everyday voice.</p></div><section class="reading-layout"><div class="reading-main"><div class="reading-passage">${passage.map(p=>`<p>${p}</p>`).join('')}</div><div class="record-controls">${recording?`<button class="button primary recording" id="finish">${icon('Square',16)} Finish reading</button><span class="record-time"><span class="live-dot"></span><span id="timer">00:00</span></span>`:`<button class="button primary" id="start">${icon('Mic',19)} Start reading</button><button class="button quiet" id="sample">Try a sample</button>`}</div><p class="fine">One reading checks word delivery, pauses, filler words, repetition, and recorded volume.</p><details class="limits"><summary>What this check can tell you</summary><p>Words are compared with a local speech-recognition transcript. Differences may come from recognition errors or noise. Pauses are observations, not faults. This prototype cannot diagnose lisps, stuttering, or other speech conditions.</p></details></div>${mirror()}</section>`;}
function mirror(){return `<aside class="mirror"><div class="video-wrap"><video id="video" autoplay playsinline muted></video><canvas id="overlay"></canvas><div class="camera-empty ${cameraOn()?'hidden':''}" id="camera-empty">${icon('ScanFace',46)}<button class="button glass" id="camera">${icon('Video',16)} Turn on mirror</button></div>${cameraOn()?'<button class="camera-off" id="camera-off" aria-label="Turn camera off">'+icon('VideoOff',16)+'</button>':''}<span class="mirror-label" id="tracking">${cameraStatus}</span></div><p>Live lip mirror · stays on this device</p><div class="wave-wrap"><canvas id="wave" width="300" height="40"></canvas></div></aside>`;}
function loading(){return `<section class="loading-content" role="status"><div class="spinner"></div><h1>${screen==='practice'?'Listening closely.':'Getting to know your voice.'}</h1><p class="subtitle" id="analysis-status">${escapeHTML(analysisMessage)}</p><p class="fine">Your recording stays on this device.</p></section>`;}
function annotatedPassage(){
 if(!comparison)return passage.map(escapeHTML).join(' ');
 return comparison.items.map(item=>item.type==='match'?escapeHTML(item.word):item.type==='addition'?`<span class="added" title="Extra word recognized">${escapeHTML(item.heard)}</span>`:`<button class="word ${item.type}" data-word="${escapeHTML(item.word)}" title="${item.type==='omission'?'Not heard':`Heard: ${escapeHTML(item.heard)}`}">${escapeHTML(item.word)}</button>`).join(' ');
}
function issueRow(issue){return `<button class="issue-row" data-issue="${issue.id}"><span class="issue-dot ${issue.color}"></span><span><strong>${issue.name}</strong><small>${escapeHTML(issue.detail)}</small></span><span class="row-action">Practice ${icon('ArrowUpRight',17)}</span></button>`;}
function results(){
 const issues=report.issues;
 return `<div class="results-heading"><div><span class="eyebrow">YOUR STARTING POINT</span><h1>A clearer picture.</h1><p class="subtitle">Select an underline. Work on one thing at a time.</p></div><div class="score-block"><div class="score">${report.score??'—'}<small>${report.score!==null?'/100':''}</small></div><span>Script match ${sample?'· sample':''}</span></div></div><section class="results-layout"><div><div class="result-passage">${annotatedPassage()}</div><div class="legend"><span><i class="blue-dot"></i>Heard differently</span><span><i class="orange-dot"></i>Not heard</span><span><i class="green-dot"></i>Added</span></div>${!sample&&recordingURL?`<audio controls src="${recordingURL}"></audio>`:''}<details class="transcript"><summary>What we heard & how the score works</summary><p>${escapeHTML(speechResult?.text||'Transcription unavailable.')}</p><p class="fine">Script match = 100 × (1 − word error rate), bounded at zero. It measures transcript agreement, not pronunciation accuracy. Recognition can miss a lisp or flag a correctly spoken word.</p>${sample?'<p class="fine">Illustrative results, not analyzed from your voice.</p>':''}</details>${speechError?`<p class="inline-error">${escapeHTML(speechError)}</p>`:''}</div><aside class="issue-list"><h2>${issues.length?'Your practice plan':'Keep your momentum.'}</h2>${issues.length?issues.map(issueRow).join(''):`<p class="muted">No word differences or selected audio cues were found. You can still practice.</p>${issueRow({id:'words',name:'Word delivery',detail:'Build consistency with a fresh prompt',words:[],color:'blue'})}`}<div class="observation"><span>${result.duration.toFixed(0)} sec</span><span>${result.pauses} pauses</span><span>${result.db} dBFS</span></div><p class="fine">Pauses can be natural. Low volume may reflect mic distance. These are practice cues.</p><button class="button quiet" id="reset">${icon('RotateCcw',15)} Read again</button></aside></section>`;
}
function stateFor(id){if(!progress[id]||!Number.isInteger(progress[id].level))progress[id]={level:0,streak:0,attempts:0};return progress[id];}
const cues={words:'Give each word its own space.',coverage:'Read the whole phrase, from beginning to end.',pacing:'Take a comfortable breath. Pause at punctuation.',fillers:'Take a quiet breath before you begin.',repeats:'Read once, steadily, without rushing.',volume:'Keep your distance from the microphone consistent. Speak comfortably.',s:'Listen to your /s/ sounds. Review how the attempt feels.'};
function practice(){
 const p=stateFor(selectedIssue.id);if(!prompt)prompt=drillPrompt(selectedIssue,p);
 return `<div class="session-summary"><div><span class="summary-score">${report.score??'—'}<small>${report.score===null?'':'/100'}</small></span><span class="summary-label">Script match${sample?' · sample':''}</span></div><div class="focus-summary"><strong>${report.issues.length} practice ${report.issues.length===1?'focus':'focuses'}</strong><span>Choose one. Keep going. Switch whenever you like.</span></div><button class="button quiet" id="review-reading">${showReading?'Hide reading':'Review your reading'} ${icon(showReading?'ChevronUp':'ChevronDown',15)}</button></div>
 ${showReading?`<section class="reading-review"><div><div class="result-passage">${annotatedPassage()}</div><div class="legend"><span><i class="blue-dot"></i>Heard differently</span><span><i class="orange-dot"></i>Not heard</span><span><i class="green-dot"></i>Added</span></div>${!sample&&recordingURL?`<audio controls src="${recordingURL}"></audio>`:''}<details class="transcript"><summary>Transcript & score</summary><p>${escapeHTML(speechResult?.text||'Transcription unavailable.')}</p><p class="fine">Script match = 100 × (1 − word error rate), bounded at zero. This measures transcript agreement, not pronunciation accuracy. ${sample?'Illustrative sample results.':''}</p></details>${speechError?`<p class="inline-error">${escapeHTML(speechError)}</p>`:''}</div><p class="fine">One reading checks words, pauses, filler words, repetition, and volume. This prototype cannot diagnose lisps or other speech conditions.</p></section>`:''}
 <div class="focus-tabs">${(report.issues.length?report.issues:[{id:'words',name:'Word delivery',detail:'General practice',words:[],color:'blue'}]).map(i=>`<button class="focus-tab ${selectedIssue.id===i.id?'active':''}" data-issue="${i.id}"><i class="issue-dot ${i.color}"></i>${i.name}</button>`).join('')}</div>
 <section class="practice-content"><div class="practice-heading"><div><span class="eyebrow">${escapeHTML(selectedIssue.name.toUpperCase())} · CONTINUOUS PRACTICE</span><h1>${drillFeedback?'Keep finding your flow.':'Your next small step.'}</h1><p class="subtitle">${cues[selectedIssue.id]||cues.words}</p></div><span class="practice-count">${p.attempts} practiced · Level ${p.level+1}</span></div><div class="speaking-zone"><div class="drill-main"><div class="drill-prompt">${escapeHTML(prompt)}</div>${drillFeedback?`<div class="attempt-feedback"><span class="feedback-icon ${drillFeedback.pass?'success':''}">${icon(drillFeedback.pass?'Check':'RotateCcw',18)}</span><div><strong>${drillFeedback.title}</strong><p>${escapeHTML(drillFeedback.detail)}</p></div></div>${drillURL?`<audio controls src="${drillURL}"></audio>`:''}<div class="practice-buttons"><button class="button primary" id="next">${drillFeedback.pass?'Next prompt':'Try another'} ${icon('ArrowRight',18)}</button>${drillFeedback.needsReview?'<button class="button secondary" id="confident">Felt confident</button>':''}</div><p class="fine">${drillFeedback.needsReview?'Self-review changes difficulty.':'Difficulty adapts to transcript agreement and the selected audio cue.'}</p>`:`<div class="practice-buttons"><button class="button round" id="hear" aria-label="Hear prompt">${icon('Volume2',22)}</button><button class="button primary ${recording?'recording':''}" id="drill-record">${icon(recording?'Square':'Mic',18)} ${recording?'Finish attempt':'Read aloud'}</button>${recording?'<span class="record-time"><span class="live-dot"></span><span id="timer">00:00</span></span>':''}</div><p class="fine">${recording?'Listening on this device.':'Listen, read, repeat. There’s no last card.'}</p>`}<div class="practice-progress" title="Practice difficulty"><span style="width:${(p.level*2+p.streak)/10*100}%"></span></div></div>${mirror()}</div></section>`;
}
function profilePanel(){
 const entries=Object.entries(progress),total=entries.reduce((n,[,p])=>n+p.attempts,0),latest=history.at(-1),previous=history.length>1?history.at(-2):undefined;
 const names={words:'Word clarity',coverage:'Complete phrases',pacing:'Pauses & flow',fillers:'Filler words',repeats:'Repeated words',volume:'Steady volume'};
 return `<div class="profile-scrim" id="profile-scrim"><aside class="profile-panel" role="dialog" aria-modal="true" aria-label="Your progress"><div class="profile-top"><h2>Your progress</h2><button class="button round" id="close-profile" aria-label="Close progress">${icon('X',18)}</button></div><p class="muted">${escapeHTML(profile.age)} years · ${escapeHTML(profile.gender)}</p><div class="profile-numbers"><div><strong>${total}</strong><span>attempts</span></div><div><strong>${history.length}</strong><span>diagnostics</span></div></div><h3>Reading check</h3><p class="profile-score">${latest?.score??'—'}<small> /100 script match</small></p>${previous&&latest?.score!==null&&previous.score!==null?`<p class="fine">${latest.score-previous.score>=0?'+':''}${latest.score-previous.score} points since your last diagnostic.</p>`:''}${history.length?`<div class="history-bars" aria-label="Recent diagnostic script-match scores">${history.slice(-10).map(h=>`<div title="${new Date(h.date).toLocaleDateString()} · ${h.score??'Unavailable'}"><span style="height:${h.score??0}%"></span></div>`).join('')}</div>`:''}<h3>Practice</h3>${entries.filter(([,p])=>p.attempts).map(([id,p])=>`<div class="profile-skill"><span>${names[id]||id}</span><small>${p.attempts} attempts · Level ${p.level+1}</small>${p.lastScore!=null?`<strong>${p.lastScore}% latest match</strong>`:''}</div>`).join('')||'<p class="fine">Your progress will appear as you practice.</p>'}<p class="fine">Saved on this device. Scores reflect transcript agreement and practice difficulty, not clinical improvement.</p></aside></div>`;
}

async function selectIssue(id,word){
 if(analyzing||mediaBusy)return;if(recording)await stopRecording(true);
 selectedIssue=report.issues.find(i=>i.id===id)||{id:'words',name:'Word delivery',detail:'General practice',words:[],color:'blue'};
 if(word)selectedIssue={...selectedIssue,words:[word]};
 prompt='';drillFeedback=undefined;revokeDrill();error='';screen='practice';render();
}
function enterPractice(){selectedIssue=report.issues[0]||{id:'words',name:'Word delivery',detail:'General practice',words:[],color:'blue'};screen='practice';prompt='';drillFeedback=undefined;showReading=false;error='';render();}
async function restartDiagnostic(){taskToken++;if(analyzing)await window.speech?.cancel();analyzing=false;if(recording)await stopRecording(true);speechSynthesis.cancel();screen='read';sample=false;error='';showProfile=false;render();}
function bind(){
 $('#profile')?.addEventListener('click',()=>{showProfile=true;render();$('#close-profile')?.focus();});
 $('#close-profile')?.addEventListener('click',()=>{showProfile=false;render();$('#profile')?.focus();});
 $('#profile-scrim')?.addEventListener('click',e=>{if(e.target.id==='profile-scrim'){showProfile=false;render();}});
 $('#diagnostic')?.addEventListener('click',restartDiagnostic);
 $('#review-reading')?.addEventListener('click',()=>{if(recording||mediaBusy)return;showReading=!showReading;render();});
 $('#profile-form')?.addEventListener('submit',e=>{e.preventDefault();profile={age:$('#age').value,gender:$('#gender').value};screen='read';error='';save();render();});
 $('#start')?.addEventListener('click',()=>startRecording(false));$('#finish')?.addEventListener('click',finishCheckin);
 $('#camera')?.addEventListener('click',enableCamera);$('#camera-off')?.addEventListener('click',()=>{if(mediaBusy)return;stopCamera();render();});
 $('#sample')?.addEventListener('click',()=>{
  if(busy())return;sample=true;stopCamera();
  const text=passage.join(' ').replace('silver','little').replace('bright yellow','yellow').replace('She took a breath','She um took a breath');
  speechResult={text};comparison=compareText(passage.join(' '),text);result={duration:34.2,pauses:3,db:-24,quiet:false};report=readingReport(comparison,result,text);speechError='';enterPractice();
 });
 document.querySelectorAll('[data-issue]').forEach(b=>b.onclick=()=>selectIssue(b.dataset.issue));
 document.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>selectIssue('words',b.dataset.word));
 $('#reset')?.addEventListener('click',()=>{if(busy())return;sample=false;screen='read';error='';render();});
 $('#back')?.addEventListener('click',()=>{if(busy())return;showReading=!showReading;error='';speechSynthesis.cancel();render();});
 $('#switch')?.addEventListener('click',()=>{if(!busy())$('#issue-picker').classList.toggle('hidden');});
 $('#hear')?.addEventListener('click',()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(prompt);u.rate=.85;speechSynthesis.speak(u);});
 $('#drill-record')?.addEventListener('click',()=>recording?finishDrill():startRecording(true));
 $('#next')?.addEventListener('click',()=>{if(busy())return;drillFeedback=undefined;prompt='';revokeDrill();render();});
 $('#confident')?.addEventListener('click',()=>{if(busy())return;progress[selectedIssue.id]=advance(stateFor(selectedIssue.id),true);save();drillFeedback=undefined;prompt='';revokeDrill();render();});
}
function stopCamera(){stream?.getVideoTracks().forEach(t=>{t.stop();stream.removeTrack(t);});cameraStatus='Camera off';lipCrop=undefined;}
function revokeDrill(){if(drillURL)URL.revokeObjectURL(drillURL);drillURL=undefined;}
async function pcmFromBlob(blob){const ctx=new AudioContext();try{const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),node=offline.createBufferSource();node.buffer=decoded;node.connect(offline.destination);node.start();return(await offline.startRendering()).getChannelData(0);}finally{await ctx.close();}}
async function transcribe(){if(!window.speech)throw Error('Open the Electron app for local speech analysis.');return window.speech.transcribe(await pcmFromBlob(lastBlob));}
async function finishCheckin(){
 if(analyzing||mediaBusy||!recording)return;
 const token=++taskToken;const duration=(performance.now()-startTime)/1000;await stopRecording();result=analyze(frames,duration);
 if(!result.valid){error=result.reason;render();return;}
 sample=false;speechResult=undefined;comparison=undefined;speechError='';analyzing=true;analysisMessage='Preparing your reading…';render();
 try{speechResult=await transcribe();if(!speechResult.text.trim())throw Error('No words recognized. Try again closer to the microphone.');comparison=compareText(passage.join(' '),speechResult.text);}catch(e){speechError=e.message;}
 finally{if(token!==taskToken)return;report=readingReport(comparison,result,speechResult?.text||'');analyzing=false;history.push({date:Date.now(),score:report.score});save();enterPractice();}
}
async function finishDrill(){
 if(analyzing||mediaBusy||!recording)return;
 const token=++taskToken;const duration=(performance.now()-startTime)/1000;await stopRecording(true);const signal=analyze(frames,duration,1);
 if(!signal.valid){error=signal.reason;revokeDrill();render();return;}
 analyzing=true;analysisMessage='Comparing your attempt…';render();
 try{
  const heard=await transcribe();if(token!==taskToken)return;if(!heard.text.trim())throw Error('No words recognized. Listen back and review your attempt.');
  const aligned=compareText(prompt,heard.text),agreement=Math.round(Math.max(0,1-aligned.wordErrorRate)*100);
  let pass=agreement>=90;
  if(selectedIssue.id==='volume')pass=pass&&!signal.quiet;
  if(selectedIssue.id==='fillers')pass=pass&&!/\b(um|uh|erm)\b/i.test(heard.text);
  const differences=aligned.items.filter(i=>i.type==='substitution'||i.type==='omission').map(i=>i.word);
  drillFeedback={pass,title:pass?'That matched. Let’s keep going.':'Let’s give that another go.',detail:`${agreement}% script match. ${differences.length?'Revisit: '+differences.slice(0,4).join(', ')+'.':'Heard: '+heard.text.trim()}${selectedIssue.id==='pacing'?` ${signal.pauses} pauses observed; they are not graded.`:''}`};
  progress[selectedIssue.id]={...advance(stateFor(selectedIssue.id),pass),lastScore:agreement};save();
 }catch(e){if(token!==taskToken)return;drillFeedback={pass:false,needsReview:true,title:'Listen back. How did it feel?',detail:e.message};}
 finally{if(token===taskToken){analyzing=false;render();}}
}
async function enableCamera() {
 if(mediaBusy)return;mediaBusy=true;
 try {
 const camera = await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'},audio:false});
 if(!stream)stream=camera;else{stream.getVideoTracks().forEach(t=>{t.stop();stream.removeTrack(t);});camera.getVideoTracks().forEach(t=>stream.addTrack(t));}
 cameraStatus='Loading tracker';render();await initTracker();if(tracker){cameraStatus='Finding your face';const label=$('#tracking');if(label)label.textContent=cameraStatus;}
 }catch(e){error=`Camera unavailable: ${e.message}. Audio practice still works.`;render();}finally{mediaBusy=false;}
}
async function initTracker() {
 if(tracker||trackLoading)return;trackLoading=true;
 try { const vision=await FilesetResolver.forVisionTasks('./wasm');tracker=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'./models/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:1});cameraStatus='Finding your face'; }
 catch(e){cameraStatus='Tracker unavailable';error='Mouth tracking could not load. Run npm run models to install the local MediaPipe assets. Camera preview and audio still work.';}
 finally{trackLoading=false;const el=$('#tracking');if(el)el.textContent=cameraStatus;}
}
function attachVideo(){const video=$('#video');if(video&&stream?.getVideoTracks().some(t=>t.readyState==='live')){video.srcObject=stream;video.play().catch(()=>{});$('#camera-empty')?.classList.add('hidden');}else $('#camera-empty')?.classList.remove('hidden');}
async function startRecording(drill) {
 if(mediaBusy||recording)return;mediaBusy=true;
 try {
 error='';speechSynthesis.cancel();
 const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
 if(!stream)stream=mic;else{stream.getAudioTracks().forEach(t=>{t.stop();stream.removeTrack(t);});mic.getAudioTracks().forEach(t=>stream.addTrack(t));}
 context=new AudioContext();await context.resume();source=context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));analyser=context.createAnalyser();analyser.fftSize=2048;source.connect(analyser);
 chunks=[];frames=[];recorder=new MediaRecorder(new MediaStream(stream.getAudioTracks()));recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();startTime=performance.now();lastFrame=startTime;recording=true;currentLine=0;if(drill&&drillURL){URL.revokeObjectURL(drillURL);drillURL=undefined;}render();
 }catch(e){error=`Microphone unavailable: ${e.message}. Check microphone permissions and try again.`;render();}finally{mediaBusy=false;}
}
async function stopRecording(drill=false){
 if(!recording)return;recording=false;mediaBusy=true;
 await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
 lastBlob=new Blob(chunks,{type:recorder.mimeType});const url=URL.createObjectURL(lastBlob);
 if(drill){if(drillURL)URL.revokeObjectURL(drillURL);drillURL=url;}else{if(recordingURL)URL.revokeObjectURL(recordingURL);recordingURL=url;}
 source?.disconnect();await context?.close();analyser=undefined;stream?.getAudioTracks().forEach(t=>{t.stop();stream.removeTrack(t);});mediaBusy=false;
}
const outer=[61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
const inner=[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
let lipCrop;
function drawLipMirror(video,canvas,landmarks){
 const vw=video.videoWidth,vh=video.videoHeight;
 canvas.width=460;canvas.height=340;const ctx=canvas.getContext('2d');
 if(!landmarks){ctx.clearRect(0,0,460,340);return;}
 const points=outer.map(i=>landmarks[i]);
 const minX=Math.min(...points.map(p=>p.x))*vw,maxX=Math.max(...points.map(p=>p.x))*vw;
 const minY=Math.min(...points.map(p=>p.y))*vh,maxY=Math.max(...points.map(p=>p.y))*vh;
 const width=Math.min(vw,Math.max((maxX-minX)*2.05,(maxY-minY)*2.8,80));
 const height=width*340/460;
 const target={x:Math.max(0,Math.min(vw-width,(minX+maxX)/2-width/2)),y:Math.max(0,Math.min(vh-height,(minY+maxY)/2-height/2)),w:width,h:height};
 if(!lipCrop)lipCrop=target;else for(const k of ['x','y','w','h'])lipCrop[k]+=(target[k]-lipCrop[k])*.28;
 const c=lipCrop;ctx.drawImage(video,c.x,c.y,c.w,c.h,0,0,460,340);
 for(const ring of [outer,inner]){ctx.beginPath();ring.forEach((index,i)=>{const p=landmarks[index],x=(p.x*vw-c.x)/c.w*460,y=(p.y*vh-c.y)/c.h*340;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.strokeStyle='#adffd0';ctx.lineWidth=1.6;ctx.shadowColor='#83fcb3';ctx.shadowBlur=4;ctx.stroke();}ctx.shadowBlur=0;
}
function loop(now){
 if(recording&&now-startTime>=175000){screen==='practice'?finishDrill():finishCheckin();}
 if(recording&&analyser){
  const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);
  if(now-lastFrame>=50){frames.push({rms,dt:(now-lastFrame)/1000,time:(now-startTime)/1000});lastFrame=now;}
  const timer=$('#timer');if(timer){const sec=Math.floor((now-startTime)/1000);timer.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
  const c=$('#wave');if(c){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#75acf0';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<c.width;i++){const y=c.height/2+data[i*5]*c.height*2;i?ctx.lineTo(i,y):ctx.moveTo(i,y);}ctx.stroke();}
 }
 const video=$('#video'),canvas=$('#overlay');
 if(tracker&&video&&canvas&&video.readyState>=2&&video.currentTime!==lastVideoTime&&now-lastTrack>65){lastVideoTime=video.currentTime;lastTrack=now;try{const detection=tracker.detectForVideo(video,now);const landmarks=detection.faceLandmarks[0];cameraStatus=landmarks?'Live lip mirror':'Move your face into view';drawLipMirror(video,canvas,landmarks);const label=$('#tracking');if(label)label.textContent=cameraStatus;}catch{cameraStatus='Tracking interrupted';}}
 raf=requestAnimationFrame(loop);
}
window.addEventListener('beforeunload',()=>{cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());tracker?.close();context?.close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&showProfile){showProfile=false;render();$('#profile')?.focus();}});
render();raf=requestAnimationFrame(loop);
