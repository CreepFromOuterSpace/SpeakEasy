const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('speech', {
 cancel: () => ipcRenderer.invoke('speech:cancel'),
 transcribe: samples => ipcRenderer.invoke('speech:transcribe', samples),
 onProgress: callback => {const listener=(_,message)=>callback(message);ipcRenderer.on('speech:progress',listener);return ()=>ipcRenderer.removeListener('speech:progress',listener);}
});
