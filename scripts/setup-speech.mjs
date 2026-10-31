import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const model='Xenova/whisper-tiny.en';
const metadata=await fetch(`https://huggingface.co/api/models/${model}`).then(r=>{if(!r.ok)throw Error('Model metadata download failed');return r.json();});
const files=metadata.siblings.map(f=>f.rfilename).filter(f=>!f.includes('/')&&/\.(json|txt)$/.test(f)||['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'].includes(f));
for(const file of files){
 const target=path.join('public/speech-models',model,file);await mkdir(path.dirname(target),{recursive:true});
 console.log('Downloading',file);const response=await fetch(`https://huggingface.co/${model}/resolve/main/${file}`);if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);
 await writeFile(target,Buffer.from(await response.arrayBuffer()));
}
console.log('Whisper tiny.en is ready for local transcription.');
