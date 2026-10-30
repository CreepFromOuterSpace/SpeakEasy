import { mkdir, writeFile, cp } from 'node:fs/promises';
await mkdir('public/models', { recursive: true });
const url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
const response = await fetch(url);
if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
await writeFile('public/models/face_landmarker.task', Buffer.from(await response.arrayBuffer()));
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', { recursive: true });
console.log('MediaPipe model and WASM ready. Inference runs locally.');
