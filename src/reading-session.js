import { compareText } from './alignment.js';
// Use recognized words, never elapsed time, to move the reading cursor.
export function readingPosition(reference, transcript, previous=0) {
 const words=reference.split(/\s+/).filter(Boolean),heard=transcript.split(/\s+/).filter(Boolean);
 if(!heard.length)return previous;
 let best,position=0;
 for(let end=1;end<=words.length;end++){
  const match=compareText(words.slice(0,end).join(' '),transcript);
  const cost=match.substitutions+match.omissions+match.additions;
  if(!best||cost<best.cost||(cost===best.cost&&match.matches>best.matches)){best={cost,matches:match.matches};position=end;}
 }
 if(best.matches<Math.min(2,heard.length)||best.matches/heard.length<.35)return previous;
 return Math.max(previous,position);
}
export function createEndpoint(){return {noise:.003,peak:0,elapsed:0,voice:0,silence:0,started:false};}
export function updateEndpoint(state,rms,dt){
 const next={...state,elapsed:state.elapsed+dt};
 if(next.elapsed<.3&&rms<.008)next.noise=Math.min(.02,next.noise*.8+rms*.2);
 next.peak=Math.max(rms,next.peak*.999);
 const threshold=Math.max(.008,Math.min(next.noise*2.5,.025),next.peak*.08);
 const voiced=rms>threshold;
 if(voiced){next.voice+=dt;next.silence=0;}else if(next.started)next.silence+=dt;
 next.started=next.voice>=.35;
 return {...next,voiced,stop:next.started&&next.elapsed>=3&&next.silence>=3,noSpeech:!next.started&&next.elapsed>=15};
}
export function resamplePCM(chunks,sourceRate,targetRate=16000){
 const length=chunks.reduce((n,a)=>n+a.length,0),input=new Float32Array(length);let offset=0;
 for(const chunk of chunks){input.set(chunk,offset);offset+=chunk.length;}
 const out=new Float32Array(Math.floor(length*targetRate/sourceRate));
 for(let i=0;i<out.length;i++){const x=i*sourceRate/targetRate,j=Math.floor(x),fraction=x-j;out[i]=(input[j]||0)*(1-fraction)+(input[Math.min(j+1,length-1)]||0)*fraction;}
 return out;
}
