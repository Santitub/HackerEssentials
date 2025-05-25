const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchTools: () => ipcRenderer.invoke('fetch-tools'),
  downloadTool: (toolName) => ipcRenderer.invoke('download-tool', toolName),
  executeTool: (toolName, scriptType) => ipcRenderer.invoke('execute-tool', toolName, scriptType),
  checkToolInstalled: (toolName) => ipcRenderer.invoke('check-tool-installed', toolName),
  getToolReadme: (toolName) => ipcRenderer.invoke('get-tool-readme', toolName),
  deleteTool: (toolName) => ipcRenderer.invoke('delete-tool', toolName),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});