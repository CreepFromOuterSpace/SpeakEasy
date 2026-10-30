export const passage = [
 'Sarah stepped outside into the morning sunshine. Six small birds sang beside the silver stream.',
 'Across the bridge, a little red truck rolled slowly past three bright yellow flowers.',
 'She took a breath and said, “Please bring fresh water for the children.” Then she smiled and continued along the quiet road.'
];
export const skills = {
  s: { name: 'S sound', subtitle: 'Build a steady, comfortable /s/.', icon: 'AudioLines', color: 'purple', levels: ['ssss', 'see · say · so', 'sun · sip · seven', 'silver stream', 'Sarah sees six small birds.'], cue: 'Listen to your attempt. Compare the /s/ sounds and notice what feels comfortable.' },
  pacing: { name: 'Natural pacing', subtitle: 'Find room for each thought.', icon: 'Waves', color: 'green', levels: ['Take a comfortable breath.', 'The sun was shining.', 'Sarah stepped outside. / She took a breath.', 'Pause at the slash: Six small birds / settled on a branch.', 'The sun was shining. Sarah stopped beside the stream.'], cue: 'Use the punctuation to group your words. A pause can be useful; aim for a comfortable flow.' },
  clarity: { name: 'Clear delivery', subtitle: 'Give every word a little space.', icon: 'MessageCircle', color: 'orange', levels: ['sun · stream · street', 'silver · seven · settled', 'Six small birds.', 'She listened to the soft sounds.', 'Six small birds settled beside the silver stream.'], cue: 'Use a comfortable speaking volume and finish each word. Keep the microphone distance consistent.' }
};
export function analyze(frames, duration) {
  if (!frames.length || duration < 2) return { valid: false, reason: 'Record at least two seconds of speech before finishing.' };
  const peak = Math.max(...frames.map(f => f.rms));
  if (peak < 0.006) return { valid: false, reason: 'No clear audio detected. Check your microphone and try again.' };
  const threshold = Math.max(0.006, peak * 0.09);
  const voiced = frames.filter(f => f.rms > threshold);
  const first = frames.findIndex(f => f.rms > threshold);
  let last = frames.length - 1;
  while (last > first && frames[last].rms <= threshold) last--;
  let pauses = 0, gap = 0;
  for (let i = first; i <= last; i++) {
    if (frames[i].rms <= threshold) gap += frames[i].dt;
    else { if (gap >= 0.7) pauses++; gap = 0; }
  }
  const mean = voiced.reduce((s, f) => s + f.rms, 0) / Math.max(1, voiced.length);
  return { valid: true, duration, pauses, db: Math.round(20 * Math.log10(Math.max(mean, 0.00001))), voicedRatio: voiced.length / frames.length, quiet: mean < 0.025 };
}
export function advance(state, confident) {
  const next = { ...state, attempts: state.attempts + 1 };
  if (confident) { next.streak++; if (next.streak >= 2) { next.level = Math.min(4, next.level + 1); next.streak = 0; } }
  else { next.streak = 0; next.level = Math.max(0, next.level - 1); }
  return next;
}

export function readingReport(comparison, signal, transcript = '') {
 const issues=[];
 const differences=comparison?.items.filter(x=>x.type==='substitution').map(x=>x.word)||[];
 const missing=comparison?.items.filter(x=>x.type==='omission').map(x=>x.word)||[];
 const fillers=(transcript.match(/\b(um|uh|erm|hmm)\b/gi)||[]).length;
 const repetitions=(transcript.toLowerCase().match(/\b([\p{L}]+)\s+\1\b/gu)||[]).length;
 if(differences.length)issues.push({id:'words',name:'Word clarity',detail:`${differences.length} words heard differently`,words:differences,color:'blue'});
 if(missing.length)issues.push({id:'coverage',name:'Complete phrases',detail:`${missing.length} words not heard`,words:missing,color:'orange'});
 if(signal?.pauses)issues.push({id:'pacing',name:'Pauses & flow',detail:`${signal.pauses} pauses over 0.7 seconds`,words:[],color:'purple'});
 if(fillers)issues.push({id:'fillers',name:'Filler words',detail:`${fillers} filler words in the transcript`,words:[],color:'purple'});
 if(repetitions)issues.push({id:'repeats',name:'Repeated words',detail:`${repetitions} repeated word pairs in the transcript`,words:[],color:'orange'});
 if(signal?.quiet)issues.push({id:'volume',name:'Steady volume',detail:'Low recorded level; microphone distance may contribute',words:[],color:'blue'});
 return {score:comparison?Math.round(Math.max(0,1-comparison.wordErrorRate)*100):null,issues};
}
const practiceLines = {
 words:['The morning light filled the room.','Please bring a glass of water.','The little red truck crossed the bridge.','Three bright flowers grew beside the road.','Sarah smiled as the birds began to sing.'],
 coverage:['She took a breath.','A little red truck rolled past.','Please bring fresh water for the children.','Across the bridge, six small birds sang.','She smiled and continued along the quiet road.'],
 pacing:['The sun is shining.','Take your time. Then begin again.','Across the bridge, the birds began to sing.','She took a breath. Then she continued down the road.','In the morning, Sarah stepped outside. She stopped, listened, and smiled.'],
 fillers:['I enjoy a quiet morning.','My favorite place is beside the river.','Today I am going to take a walk.','First I will cross the bridge. Then I will visit the park.','One thing I appreciate about the morning is the chance to start again.'],
 repeats:['The bird is singing.','She walked beside the stream.','The bright yellow flowers opened slowly.','Please bring the children a glass of fresh water.','Across the bridge, Sarah watched the little red truck roll past.'],
 volume:['Good morning.','Please bring fresh water.','The little red truck crossed the bridge.','Six small birds sang beside the silver stream.','She took a breath and continued along the quiet road.'],
 s:['Six small birds sing.','Sarah sees the sunshine.','A silver stream flows slowly.','Seven stars shimmer in the sky.','Sarah stepped outside and listened to the soft sounds.']
};
export function drillPrompt(issue, state) {
 const lines=practiceLines[issue.id]||practiceLines.words;
 const line=lines[(state.level+Math.floor(state.attempts/2))%lines.length];
 if(issue.words?.length){
  const word=issue.words[state.attempts%issue.words.length].replace(/[.,!?“”]/g,'');
  if(state.level===0)return word;
  if(state.level===1)return `${word}. ${word}.`;
  if(state.level===2)return `I said ${word}.`;
  return `${line} ${word}.`;
 }
 return line;
}
