const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('speech', {
 transcribe: samples => ipcRenderer.invoke('speech:transcribe', samples),
 onProgress: callback => {const listener=(_,message)=>callback(message);ipcRenderer.on('speech:progress',listener);return ()=>ipcRenderer.removeListener('speech:progress',listener);}
});
