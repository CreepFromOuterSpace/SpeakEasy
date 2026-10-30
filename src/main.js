import './style.css';
import { createIcons, icons } from 'lucide';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { compareText, escapeHTML } from './alignment.js';
import { passage, analyze, advance, readingReport, drillPrompt } from './engine.js';
const $=s=>document.querySelector(s), app=$('#app');
const icon=(name,size=20)=>`<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
let screen='welcome',profile={age:'',gender:''},report,result,comparison,speechResult,speechError='',sample=false;
let selectedIssue,progress={},drillNumber=1,drillFeedback,prompt='',focusWord;
let recording=false,stream,context,analyser,source,recorder,chunks=[],frames=[],startTime=0,lastFrame=0,raf,tracker,trackLoading=false,lastVideoTime=-1,lastTrack=0,recordingURL,drillURL,lastBlob,error='',cameraStatus='Camera off',currentLine=0;
let mediaBusy=false,analyzing=false,analysisMessage='';
try{progress=JSON.parse(localStorage.getItem('speakeasy-learn')||'{}');}catch{}
const save=()=>{try{localStorage.setItem('speakeasy-learn',JSON.stringify(progress));}catch{}};
window.speech?.onProgress(message=>{analysisMessage=message;const el=$('#analysis-status');if(el)el.textContent=message;});
const busy=()=>recording||analyzing||mediaBusy;
const cameraOn=()=>stream?.getVideoTracks().some(t=>t.readyState==='live');
function render(){
 app.innerHTML=`<header class="app-header"><span class="brand">${icon('AudioLines',23)}SpeakEasy</span><span class="header-right">${sample&&screen!=='welcome'?'<span class="demo-tag">Sample session</span>':''}${screen!=='welcome'?`<span class="step-name">${screen==='read'?'Speech check':screen==='results'?'Your results':'Practice'}</span>`:''}<span class="privacy" title="Audio and video are processed on this device">${icon('LockKeyhole',14)} Private by design</span></span></header><main class="${screen}">${analyzing?loading():screen==='welcome'?welcome():screen==='read'?reading():screen==='results'?results():practice()}</main>${error?`<div class="error" role="alert">${escapeHTML(error)}</div>`:''}<footer>Speech practice. Not a medical diagnosis.</footer>`;
 createIcons({icons});bind();if(screen==='read'&&cameraOn())attachVideo();
}
function welcome(){return `<section class="welcome-content"><div class="app-mark">${icon('AudioLines',42)}</div><h1>A little about you.</h1><p class="subtitle">Then, let’s get to know your voice.</p><form id="profile-form"><div class="fields"><label>Age<input id="age" type="number" inputmode="numeric" min="5" max="120" placeholder="Your age" value="${profile.age}" required></label><label>Gender<select id="gender" required><option value="" disabled ${!profile.gender?'selected':''}>Select</option>${['Woman','Man','Nonbinary','Self-described','Prefer not to say'].map(g=>`<option ${profile.gender===g?'selected':''}>${g}</option>`).join('')}</select></label></div><button class="button primary" type="submit">Continue ${icon('ArrowRight',18)}</button></form><p class="fine">Kept for this session. Never used to grade your speech.</p></section>`;}
function reading(){return `<div class="section-heading"><span class="eyebrow">ONE SIMPLE CHECK</span><h1>Let’s hear you.</h1><p class="subtitle">Read this aloud in your everyday voice.</p></div><section class="reading-layout"><div class="reading-main"><div class="reading-passage">${passage.map(p=>`<p>${p}</p>`).join('')}</div><div class="record-controls">${recording?`<button class="button primary recording" id="finish">${icon('Square',16)} Finish reading</button><span class="record-time"><span class="live-dot"></span><span id="timer">00:00</span></span>`:`<button class="button primary" id="start">${icon('Mic',19)} Start reading</button><button class="button quiet" id="sample">Try a sample</button>`}</div><p class="fine">One reading checks word delivery, pauses, filler words, repetition, and recorded volume.</p><details class="limits"><summary>What this check can tell you</summary><p>Words are compared with a local speech-recognition transcript. Differences may come from recognition errors or noise. Pauses are observations, not faults. This prototype cannot diagnose lisps, stuttering, or other speech conditions.</p></details></div><aside class="mirror"><div class="video-wrap"><video id="video" autoplay playsinline muted></video><canvas id="overlay"></canvas><div class="camera-empty ${cameraOn()?'hidden':''}" id="camera-empty">${icon('ScanFace',46)}<button class="button glass" id="camera">${icon('Video',16)} Turn on mirror</button></div>${cameraOn()?'<button class="camera-off" id="camera-off" aria-label="Turn camera off">'+icon('VideoOff',16)+'</button>':''}<span class="mirror-label" id="tracking">${cameraStatus}</span></div><p>Mouth outline · visual guide only</p><div class="wave-wrap"><canvas id="wave" width="300" height="40"></canvas></div></aside></section>`;}
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
 return `<div class="practice-top"><button class="button quiet" id="back">${icon('ArrowLeft',17)} Your results</button><span class="practice-count">${p.attempts} practiced · Level ${p.level+1}</span></div><section class="practice-content"><span class="eyebrow">${escapeHTML(selectedIssue.name.toUpperCase())} · CONTINUOUS PRACTICE</span><h1>${drillFeedback?'A little clearer, every time.':'Your next small step.'}</h1><p class="subtitle">${cues[selectedIssue.id]||cues.words}</p><div class="drill-prompt">${escapeHTML(prompt)}</div>${drillFeedback?`<div class="attempt-feedback"><span class="feedback-icon ${drillFeedback.pass?'success':''}">${icon(drillFeedback.pass?'Check':'RotateCcw',18)}</span><div><strong>${drillFeedback.title}</strong><p>${escapeHTML(drillFeedback.detail)}</p></div></div>${drillURL?`<audio controls src="${drillURL}"></audio>`:''}<div class="practice-buttons"><button class="button primary" id="next">${drillFeedback.pass?'Next prompt':'Try another'} ${icon('ArrowRight',18)}</button>${drillFeedback.needsReview?'<button class="button secondary" id="confident">Felt confident</button>':''}</div><p class="fine">${drillFeedback.needsReview?'Self-review changes difficulty.':'Difficulty adapts to transcript agreement and the selected audio cue.'}</p>`:`<div class="practice-buttons"><button class="button round" id="hear" aria-label="Hear prompt">${icon('Volume2',22)}</button><button class="button primary ${recording?'recording':''}" id="drill-record">${icon(recording?'Square':'Mic',18)} ${recording?'Finish attempt':'Read aloud'}</button>${recording?'<span class="record-time"><span class="live-dot"></span><span id="timer">00:00</span></span>':''}</div><p class="fine">${recording?'Listening on this device.':'Listen, read, repeat. There’s no last card.'}</p>`}<div class="practice-progress"><span style="width:${(p.level*2+p.streak)/10*100}%"></span></div><button class="button quiet switch" id="switch">Work on something else ${icon('ChevronDown',15)}</button><div id="issue-picker" class="issue-picker hidden">${(report.issues.length?report.issues:[{id:'words',name:'Word delivery',detail:'General practice',words:[],color:'blue'}]).map(issueRow).join('')}</div></section>`;
}
function selectIssue(id,word){
 if(busy())return;
 selectedIssue=report.issues.find(i=>i.id===id)||{id:'words',name:'Word delivery',detail:'General practice',words:[],color:'blue'};
 if(word)selectedIssue={...selectedIssue,words:[word]};
 prompt='';drillFeedback=undefined;revokeDrill();error='';screen='practice';render();
}
function bind(){
 $('#profile-form')?.addEventListener('submit',e=>{e.preventDefault();profile={age:$('#age').value,gender:$('#gender').value};screen='read';error='';render();});
 $('#start')?.addEventListener('click',()=>startRecording(false));$('#finish')?.addEventListener('click',finishCheckin);
 $('#camera')?.addEventListener('click',enableCamera);$('#camera-off')?.addEventListener('click',()=>{if(mediaBusy)return;stopCamera();render();});
 $('#sample')?.addEventListener('click',()=>{
  if(busy())return;sample=true;stopCamera();
  const text=passage.join(' ').replace('silver','little').replace('bright yellow','yellow').replace('She took a breath','She um took a breath');
  speechResult={text};comparison=compareText(passage.join(' '),text);result={duration:34.2,pauses:3,db:-24,quiet:false};report=readingReport(comparison,result,text);speechError='';screen='results';render();
 });
 document.querySelectorAll('[data-issue]').forEach(b=>b.onclick=()=>selectIssue(b.dataset.issue));
 document.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>selectIssue('words',b.dataset.word));
 $('#reset')?.addEventListener('click',()=>{if(busy())return;sample=false;screen='read';error='';render();});
 $('#back')?.addEventListener('click',()=>{if(busy())return;screen='results';error='';speechSynthesis.cancel();render();});
 $('#switch')?.addEventListener('click',()=>{if(!busy())$('#issue-picker').classList.toggle('hidden');});
 $('#hear')?.addEventListener('click',()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(prompt);u.rate=.85;speechSynthesis.speak(u);});
 $('#drill-record')?.addEventListener('click',()=>recording?finishDrill():startRecording(true));
 $('#next')?.addEventListener('click',()=>{if(busy())return;drillFeedback=undefined;prompt='';revokeDrill();render();});
 $('#confident')?.addEventListener('click',()=>{if(busy())return;progress[selectedIssue.id]=advance(stateFor(selectedIssue.id),true);save();drillFeedback=undefined;prompt='';revokeDrill();render();});
}
function stopCamera(){stream?.getVideoTracks().forEach(t=>{t.stop();stream.removeTrack(t);});cameraStatus='Camera off';}
function revokeDrill(){if(drillURL)URL.revokeObjectURL(drillURL);drillURL=undefined;}
async function pcmFromBlob(blob){const ctx=new AudioContext();try{const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),node=offline.createBufferSource();node.buffer=decoded;node.connect(offline.destination);node.start();return(await offline.startRendering()).getChannelData(0);}finally{await ctx.close();}}
async function transcribe(){if(!window.speech)throw Error('Open the Electron app for local speech analysis.');return window.speech.transcribe(await pcmFromBlob(lastBlob));}
async function finishCheckin(){
 if(analyzing||mediaBusy||!recording)return;
 const duration=(performance.now()-startTime)/1000;await stopRecording();result=analyze(frames,duration);
 if(!result.valid){error=result.reason;render();return;}
 stopCamera();sample=false;speechResult=undefined;comparison=undefined;speechError='';analyzing=true;analysisMessage='Preparing your reading…';render();
 try{speechResult=await transcribe();if(!speechResult.text.trim())throw Error('No words recognized. Try again closer to the microphone.');comparison=compareText(passage.join(' '),speechResult.text);}catch(e){speechError=e.message;}
 finally{report=readingReport(comparison,result,speechResult?.text||'');analyzing=false;screen='results';render();}
}
async function finishDrill(){
 if(analyzing||mediaBusy||!recording)return;
 const duration=(performance.now()-startTime)/1000;await stopRecording(true);const signal=analyze(frames,duration);
 if(!signal.valid){error=signal.reason;revokeDrill();render();return;}
 analyzing=true;analysisMessage='Comparing your attempt…';render();
 try{
  const heard=await transcribe();if(!heard.text.trim())throw Error('No words recognized. Listen back and review your attempt.');
  const aligned=compareText(prompt,heard.text),agreement=Math.round(Math.max(0,1-aligned.wordErrorRate)*100);
  let pass=agreement>=90;
  if(selectedIssue.id==='volume')pass=pass&&!signal.quiet;
  if(selectedIssue.id==='fillers')pass=pass&&!/\b(um|uh|erm)\b/i.test(heard.text);
  const differences=aligned.items.filter(i=>i.type==='substitution'||i.type==='omission').map(i=>i.word);
  drillFeedback={pass,title:pass?'That matched. Let’s keep going.':'Let’s give that another go.',detail:`${agreement}% script match. ${differences.length?'Revisit: '+differences.slice(0,4).join(', ')+'.':'Heard: '+heard.text.trim()}${selectedIssue.id==='pacing'?` ${signal.pauses} pauses observed; they are not graded.`:''}`};
  progress[selectedIssue.id]=advance(stateFor(selectedIssue.id),pass);save();
 }catch(e){drillFeedback={pass:false,needsReview:true,title:'Listen back. How did it feel?',detail:e.message};}
 finally{analyzing=false;render();}
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
function loop(now){
 if(recording&&now-startTime>=175000){screen==='practice'?finishDrill():finishCheckin();}
 if(recording&&analyser){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);if(now-lastFrame>=50){frames.push({rms,dt:(now-lastFrame)/1000,time:(now-startTime)/1000});lastFrame=now;}const timer=$('#timer');if(timer){const sec=Math.floor((now-startTime)/1000);timer.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}const c=$('#wave');if(c){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#a99be7';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<c.width;i++){let y=c.height/2+data[i*5]*c.height*2;i?ctx.lineTo(i,y):ctx.moveTo(i,y);}ctx.stroke();}}
 const video=$('#video'),canvas=$('#overlay');
 if(tracker&&video&&canvas&&video.readyState>=2&&video.currentTime!==lastVideoTime&&now-lastTrack>65){lastVideoTime=video.currentTime;lastTrack=now;try{const detection=tracker.detectForVideo(video,now);canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);const landmarks=detection.faceLandmarks[0];cameraStatus=landmarks?'Mouth tracking active':'Face not in view';if(landmarks){for(const ring of [outer,inner]){ctx.beginPath();ring.forEach((index,i)=>{const p=landmarks[index];i?ctx.lineTo(p.x*canvas.width,p.y*canvas.height):ctx.moveTo(p.x*canvas.width,p.y*canvas.height);});ctx.closePath();ctx.strokeStyle='#b6ffd9';ctx.shadowColor='#67ffb0';ctx.shadowBlur=8;ctx.lineWidth=2;ctx.stroke();}ctx.shadowBlur=0;for(const index of outer){const p=landmarks[index];ctx.beginPath();ctx.arc(p.x*canvas.width,p.y*canvas.height,2,0,Math.PI*2);ctx.fillStyle='#edfff5';ctx.fill();}}const label=$('#tracking');if(label)label.textContent=cameraStatus;}catch{cameraStatus='Tracking interrupted';}}
 raf=requestAnimationFrame(loop);
}
window.addEventListener('beforeunload',()=>{cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());tracker?.close();context?.close();});
render();raf=requestAnimationFrame(loop);
