import { Worker } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const wav=await readFile(process.argv[2]||'/private/tmp/speakeasy-speech-test.wav');
let offset=12,pcm;
while(offset+8<=wav.length){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){pcm=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
if(!pcm)throw Error('No PCM data');
const samples=Float32Array.from({length:pcm.length/2},(_,i)=>pcm.readInt16LE(i*2)/32768);
const worker=new Worker(new URL('../electron/speech-worker.mjs',import.meta.url),{workerData:{modelRoot:path.resolve('public/speech-models')+'/'}});
const timeout=setTimeout(()=>{worker.terminate();throw Error('Speech test timed out');},120000);
worker.on('error',e=>{clearTimeout(timeout);console.error(e);process.exitCode=1;});
worker.on('message',m=>{if(m.progress)console.log(m.progress);else{clearTimeout(timeout);console.log(JSON.stringify(m));worker.terminate();if(m.error||!m.result?.text.toLowerCase().includes('sun'))process.exitCode=1;}});
worker.postMessage({id:1,samples});
