import { parentPort, workerData } from 'node:worker_threads';
import { pipeline, env } from '@huggingface/transformers';
env.allowRemoteModels=false;
env.allowLocalModels=true;
env.localModelPath=workerData.modelRoot;
let transcriber;
parentPort.on('message',async({id,samples})=>{
 try{
  parentPort.postMessage({progress:transcriber?'Transcribing on this device…':'Loading local Whisper model…'});
  transcriber ||= await pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{device:'cpu',dtype:'q8'});
  const output=await transcriber(new Float32Array(samples),{chunk_length_s:25,stride_length_s:4,return_timestamps:true});
  parentPort.postMessage({id,result:{text:output.text,chunks:output.chunks}});
 }catch(e){parentPort.postMessage({id,error:e.message});}
});
