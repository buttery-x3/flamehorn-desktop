import { contextBridge, ipcRenderer } from 'electron';
import type { Command, DesktopAPI } from '../core/types';
const api:DesktopAPI={
  state:()=>ipcRenderer.invoke('flamehorn:state'),
  command:async(command:Command)=>{const result=await ipcRenderer.invoke('flamehorn:command',command);if(!result.ok)throw new Error(result.error);return result.value;},
  subscribe:listener=>{const wrapped=(_event:Electron.IpcRendererEvent,value:{type:string;data?:unknown})=>listener(value);ipcRenderer.on('flamehorn:event',wrapped);return()=>ipcRenderer.removeListener('flamehorn:event',wrapped);},
};
contextBridge.exposeInMainWorld('flamehorn',api);
