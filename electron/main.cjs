const { app, BrowserWindow, session, ipcMain } = require('electron');
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
let win, speechWorker, pending, jobId=0;
function runSpeech(samples) {
 if(pending) return Promise.reject(new Error('Speech analysis is already running.'));
 if(!(samples instanceof Float32Array) || samples.length < 16000 || samples.length > 16000*180 || !samples.every(Number.isFinite)) return Promise.reject(new Error('Record between 1 and 180 seconds of valid audio.'));
 if(!speechWorker){
  speechWorker=new Worker(path.join(__dirname,'speech-worker.mjs'),{workerData:{modelRoot:path.join(__dirname,'../dist/speech-models/')}});
  const activeWorker=speechWorker;
  speechWorker.on('message',message=>{
   if(speechWorker!==activeWorker)return;
   if(message.progress){win?.webContents.send('speech:progress',message.progress);return;}
   if(pending&&message.id===pending.id){clearTimeout(pending.timer);const job=pending;pending=undefined;message.error?job.reject(new Error(message.error)):job.resolve(message.result);}
  });
  const failed=error=>{if(speechWorker!==activeWorker)return;if(pending){clearTimeout(pending.timer);pending.reject(error);pending=undefined;}speechWorker=undefined;};
  speechWorker.on('error',failed);
  speechWorker.on('exit',code=>failed(new Error(`Speech worker exited (${code}). Please retry.`)));
 }
 return new Promise((resolve,reject)=>{
  const id=++jobId;const timer=setTimeout(()=>{pending=undefined;const old=speechWorker;speechWorker=undefined;old?.terminate();reject(new Error('Transcription took too long. Try a shorter recording.'));},180000);
  pending={id,resolve,reject,timer};speechWorker.postMessage({id,samples});
 });
}
const index = path.join(__dirname, '../dist/index.html');
const trusted = url => url?.split('#')[0].split('?')[0] === pathToFileURL(index).href;
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(permission === 'media' && trusted(contents.getURL()) && (details.mediaTypes || []).every(t => ['audio', 'video'].includes(t)));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => permission === 'media' && !!contents && trusted(contents.getURL()));
  ipcMain.handle('speech:transcribe', (event,samples) => {
    if(!trusted(event.senderFrame?.url)) throw new Error('Untrusted speech request.');
    return runSpeech(samples);
  });
  function createWindow() {
    win = new BrowserWindow({ width: 1440, height: 980, minWidth: 1000, minHeight: 740, title: 'SpeakEasy', backgroundColor: '#f8f7f4', webPreferences: { preload: path.join(__dirname,'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
    win.loadFile(index);
  }
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

app.on('before-quit',()=>{speechWorker?.terminate();});
