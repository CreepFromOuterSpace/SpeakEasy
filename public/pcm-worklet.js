class SpeechCapture extends AudioWorkletProcessor {
 constructor(){super();this.buffer=new Float32Array(4096);this.offset=0;}
 process(inputs){const channels=inputs[0];if(!channels?.length)return true;const input=channels[0];for(let i=0;i<input.length;i++){this.buffer[this.offset++]=input[i];if(this.offset===this.buffer.length){this.port.postMessage(this.buffer);this.buffer=new Float32Array(4096);this.offset=0;}}return true;}
}
registerProcessor('speech-capture',SpeechCapture);
