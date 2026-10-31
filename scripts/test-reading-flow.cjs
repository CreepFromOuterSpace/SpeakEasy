// End-to-end test of the real renderer, preload bridge, model, and audio endpoint.
// Uses synthesized speech only; never accesses a physical microphone or camera.
const {app}=require('electron');
const fs=require('node:fs');
app.setPath('userData',`/private/tmp/speakeasy-reading-test-${Date.now()}`);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const timeout=setTimeout(()=>{console.error('Reading flow timed out');app.exit(1);},100000);
app.on('browser-window-created',(_,win)=>{
 win.hide();
 win.webContents.once('did-finish-load',async()=>{
 try{
  const wav=fs.readFileSync('/private/tmp/speakeasy-read-progress.wav');let offset=12,pcm;while(offset+8<=wav.length){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){pcm=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
  const samples=Array.from({length:pcm.length/2},(_,i)=>pcm.readInt16LE(i*2)/32768);
  await win.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext({sampleRate:16000});await ctx.resume();const buffer=ctx.createBuffer(1,${samples.length+16000},16000);buffer.copyToChannel(new Float32Array(${JSON.stringify(samples)}),0,16000);const source=ctx.createBufferSource();source.buffer=buffer;const destination=ctx.createMediaStreamDestination();source.connect(destination);source.start();return destination.stream;};void 0;`);
  await win.webContents.executeJavaScript(`document.querySelector('#age').value='25';document.querySelector('#gender').value='Prefer not to say';document.querySelector('#profile-form').requestSubmit();document.querySelector('#start').click();`);
  let advanced=false,scoreShown=false,recordingBegan=false;
  for(let i=0;i<360;i++){
   await delay(200);
   const state=await win.webContents.executeJavaScript(`({count:document.querySelector('#reading-count')?.textContent,recording:!!document.querySelector('#finish'),score:document.querySelector('.diagnostic-score h1')?.textContent,error:document.querySelector('.error')?.textContent})`);
   if(state.recording)recordingBegan=true;
   if(state.count&&parseInt(state.count)>0)advanced=true;
   if(state.error)throw Error(state.error);
   if(state.score){scoreShown=true;console.log(JSON.stringify({advanced,score:state.score,recordingBegan}));break;}
  }
  if(!advanced||!scoreShown||!recordingBegan)throw Error('Expected live word progress and automatic transition to score.');
  const image=await win.webContents.capturePage();fs.writeFileSync('docs/screenshots/diagnostic-score.png',image.toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('#begin-practice').click()`);
  const hasDrill=await win.webContents.executeJavaScript(`!!document.querySelector('#drill-record')`);
  if(!hasDrill)throw Error('Score did not lead to practice');
  clearTimeout(timeout);console.log('Reading progress, automatic endpoint, score, and practice: PASS');app.exit(0);
 }catch(e){console.error(e);clearTimeout(timeout);app.exit(1);}
 });
});
require('../electron/main.cjs');
