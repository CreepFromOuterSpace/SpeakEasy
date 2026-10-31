const {app}=require('electron');
const {Worker}=require('node:worker_threads');
const {readFileSync}=require('node:fs');
const path=require('node:path');
app.whenReady().then(()=>{
 const wav=readFileSync('/private/tmp/speakeasy-speech-test.wav');let offset=12,pcm;
 while(offset+8<=wav.length){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){pcm=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
 const samples=Float32Array.from({length:pcm.length/2},(_,i)=>pcm.readInt16LE(i*2)/32768);
 const worker=new Worker(path.resolve('electron/speech-worker.mjs'),{workerData:{modelRoot:path.resolve('dist/speech-models')+'/'}});
 const timer=setTimeout(()=>{console.error('Timed out');app.exit(1);},90000);
 worker.on('error',e=>{console.error(e);app.exit(1);});
 worker.on('message',m=>{if(m.progress)console.log(m.progress);else{clearTimeout(timer);console.log(JSON.stringify(m));worker.terminate();app.exit(m.result?.text.toLowerCase().includes('sun')?0:1);}});
 worker.postMessage({id:1,samples});
});
