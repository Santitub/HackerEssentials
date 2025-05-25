const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const axios = require('axios');
require('dotenv').config();

class HackerEssentialsApp {
  constructor() {
    this.mainWindow = null;
    this.toolsPath = path.join(__dirname, '..', 'tools');
    this.githubApiUrl = 'https://api.github.com/repos/Santitub/hackerEssentials/contents/tools';
    
    // Configurar headers para GitHub API
    this.githubHeaders = {
      'User-Agent': 'HackerEssentials-App',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Añadir token si está disponible
    if (process.env.GITHUB_TOKEN) {
      this.githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      console.log('✅ GitHub token configurado');
    } else {
      console.log('⚠️ GitHub token no encontrado, usando API pública (límites más bajos)');
    }
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true, // Cambiar a true
      allowRunningInsecureContent: true, // Añadir esta línea
      experimentalFeatures: true // Añadir esta línea
    },
      show: false,
      titleBarStyle: 'default',
      icon: path.join(__dirname, 'assets', 'icon.png') // Opcional
    });

    // Cargar el archivo HTML - ruta corregida
    const htmlPath = path.join(__dirname, 'renderer', 'index.html');
    console.log('Cargando HTML desde:', htmlPath);
    
    try {
      // Verificar que el archivo existe
      if (!(await fs.pathExists(htmlPath))) {
        console.error('❌ Archivo HTML no encontrado:', htmlPath);
        throw new Error(`Archivo HTML no encontrado: ${htmlPath}`);
      }
      
      await this.mainWindow.loadFile(htmlPath);
      console.log('✅ HTML cargado correctamente');
    } catch (error) {
      console.error('❌ Error cargando HTML:', error);
      // Intentar cargar una página de error básica
      this.loadErrorPage();
    }
    
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
      console.log('✅ Ventana mostrada');
    });

    // Mostrar DevTools en desarrollo
    if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // Event listeners para debugging
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ Error cargando página:', errorCode, errorDescription, validatedURL);
    });

    this.mainWindow.webContents.on('crashed', () => {
      console.error('❌ Renderer process crashed');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Forzar mostrar la ventana después de un tiempo
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('🔧 Forzando mostrar ventana...');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 2000);
  }

  loadErrorPage() {
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>HackerEssentials - Error</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: #1a1a1a; 
                color: #00ff41; 
                padding: 50px; 
                text-align: center; 
            }
            h1 { color: #ff4444; }
            .error { background: #333; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>❌ Error de Carga</h1>
        <div class="error">
            <p>No se pudo cargar la interfaz principal.</p>
            <p>Verifica que el archivo index.html existe en src/renderer/</p>
        </div>
        <button onclick="location.reload()">🔄 Reintentar</button>
    </body>
    </html>`;
    
    this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }

  async fetchToolsFromGitHub() {
    try {
      console.log('📡 Obteniendo herramientas desde GitHub...');
      const response = await axios.get(this.githubApiUrl, {
        headers: this.githubHeaders,
        timeout: 10000
      });
      
      const folders = response.data.filter(item => item.type === 'dir');
      console.log(`📁 Encontradas ${folders.length} carpetas de herramientas`);
      
      const tools = [];
      
      for (const folder of folders) {
        console.log(`🔍 Procesando herramienta: ${folder.name}`);
        const toolInfo = await this.fetchToolInfo(folder.name);
        if (toolInfo) {
          tools.push(toolInfo);
        }
      }
      
      console.log(`✅ ${tools.length} herramientas procesadas correctamente`);
      return tools;
    } catch (error) {
      console.error('❌ Error fetching tools from GitHub:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      return [];
    }
  }

  async fetchToolInfo(toolName) {
    try {
      const toolUrl = `https://api.github.com/repos/Santitub/hackerEssentials/contents/tools/${toolName}`;
      const response = await axios.get(toolUrl, {
        headers: this.githubHeaders,
        timeout: 5000
      });
      const files = response.data;
      
      const tool = {
        name: toolName,
        description: 'Herramienta de ciberseguridad disponible para instalación', // Descripción por defecto
        author: 'Unknown',
        hasInstall: false,
        hasUninstall: false,
        hasReadme: false,
        mainScript: null,
        language: null
      };

      for (const file of files) {
        if (file.name === 'README.md') {
          tool.hasReadme = true;
          // NO extraer descripción del README, mantener la por defecto o la de description.txt
        } else if (file.name === 'description.txt') {
          try {
            const descResponse = await axios.get(file.download_url, { timeout: 5000 });
            const descContent = descResponse.data.trim();
            if (descContent) {
              tool.description = descContent.substring(0, 200) + (descContent.length > 200 ? '...' : '');
            }
          } catch (err) {
            console.warn(`⚠️ No se pudo leer description.txt para ${toolName}`);
          }
        } else if (file.name === 'author.txt') {
          try {
            const authorResponse = await axios.get(file.download_url, { timeout: 5000 });
            tool.author = authorResponse.data.trim();
          } catch (err) {
            console.warn(`⚠️ No se pudo leer author.txt para ${toolName}`);
          }
        } else if (file.name.startsWith('install.')) {
          tool.hasInstall = true;
        } else if (file.name.startsWith('uninstall.')) {
          tool.hasUninstall = true;
        } else if (file.name === `${toolName}.py` || 
                  file.name === `${toolName}.go` || 
                  file.name === `${toolName}.rb` || 
                  file.name === `${toolName}.sh`) {
          tool.mainScript = file.name;
          tool.language = this.getLanguageFromExtension(file.name);
        }
      }
      
      return tool;
    } catch (error) {
      console.error(`❌ Error fetching tool info for ${toolName}:`, error.message);
      return null;
    }
  }

  getLanguageFromExtension(filename) {
    const ext = path.extname(filename);
    const langMap = {
      '.py': 'python',
      '.go': 'go',
      '.rb': 'ruby',
      '.sh': 'bash'
    };
    return langMap[ext] || 'unknown';
  }

  async fetchToolReadme(toolName) {
    try {
      const readmeUrl = `https://api.github.com/repos/Santitub/hackerEssentials/contents/tools/${toolName}/README.md`;
      const response = await axios.get(readmeUrl, {
        headers: this.githubHeaders,
        timeout: 10000
      });
      
      // El contenido viene en base64, necesitamos decodificarlo
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return content;
    } catch (error) {
      console.error(`❌ Error fetching README for ${toolName}:`, error.message);
      return null;
    }
  }

  async downloadTool(toolName) {
    try {
      console.log(`📥 Descargando herramienta: ${toolName}`);
      const toolDir = path.join(this.toolsPath, toolName);
      await fs.ensureDir(toolDir);
      
      const toolUrl = `https://api.github.com/repos/Santitub/hackerEssentials/contents/tools/${toolName}`;
      const response = await axios.get(toolUrl, {
        headers: this.githubHeaders,
        timeout: 10000
      });
      const files = response.data;
      
      for (const file of files) {
        if (file.type === 'file') {
          try {
            const fileResponse = await axios.get(file.download_url, { timeout: 10000 });
            const filePath = path.join(toolDir, file.name);
            await fs.writeFile(filePath, fileResponse.data);
            
            // Make scripts executable on Unix systems
            if (file.name.endsWith('.sh') || file.name.endsWith('.py') || 
                file.name.endsWith('.rb') || file.name.endsWith('.go')) {
              if (process.platform !== 'win32') {
                await fs.chmod(filePath, '755');
              }
            }
            console.log(`✅ Archivo descargado: ${file.name}`);
          } catch (fileError) {
            console.error(`❌ Error descargando archivo ${file.name}:`, fileError.message);
          }
        }
      }
      
      console.log(`✅ Herramienta ${toolName} descargada completamente`);
      return true;
    } catch (error) {
      console.error(`❌ Error downloading tool ${toolName}:`, error.message);
      return false;
    }
  }

  async deleteTool(toolName) {
    try {
      console.log(`🗑️ Eliminando herramienta: ${toolName}`);
      const toolDir = path.join(this.toolsPath, toolName);
      
      // Verificar que la carpeta existe
      if (await fs.pathExists(toolDir)) {
        await fs.remove(toolDir);
        console.log(`✅ Herramienta ${toolName} eliminada completamente`);
        return true;
      } else {
        console.log(`⚠️ La carpeta ${toolName} no existe`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error eliminando herramienta ${toolName}:`, error.message);
      return false;
    }
  }

  async executeScript(toolName, scriptType) {
    const toolDir = path.join(this.toolsPath, toolName);
    
    // Si es desinstalación y no hay script, solo borrar la carpeta
    if (scriptType === 'uninstall') {
      try {
        const scripts = await fs.readdir(toolDir);
        const hasUninstallScript = scripts.some(script => script.startsWith('uninstall.'));
        
        if (hasUninstallScript) {
          // Ejecutar script de desinstalación primero
          const result = await this.executeUninstallScript(toolDir, scripts);
          // Luego borrar la carpeta
          await this.deleteTool(toolName);
          return result;
        } else {
          // Solo borrar la carpeta si no hay script
          const success = await this.deleteTool(toolName);
          return { 
            stdout: success ? `Herramienta ${toolName} eliminada exitosamente` : `Error eliminando ${toolName}`,
            stderr: '' 
          };
        }
      } catch (error) {
        throw new Error(`Error en desinstalación: ${error.message}`);
      }
    }
    
    // Para otros tipos de script (main, install)
    const scripts = await fs.readdir(toolDir);
    let scriptFile = null;
    let command = '';
    
    // Find the appropriate script
    for (const script of scripts) {
      if (scriptType === 'main' && script === `${toolName}.py`) {
        scriptFile = script;
        command = `python "${path.join(toolDir, scriptFile)}"`;
        break;
      } else if (scriptType === 'main' && script === `${toolName}.go`) {
        scriptFile = script;
        command = `cd "${toolDir}" && go run "${scriptFile}"`;
        break;
      } else if (scriptType === 'main' && script === `${toolName}.rb`) {
        scriptFile = script;
        command = `ruby "${path.join(toolDir, scriptFile)}"`;
        break;
      } else if (scriptType === 'main' && script === `${toolName}.sh`) {
        scriptFile = script;
        command = `bash "${path.join(toolDir, scriptFile)}"`;
        break;
      } else if (scriptType === 'install' && script.startsWith('install.')) {
        scriptFile = script;
        command = this.getCommandForScript(path.join(toolDir, scriptFile));
        break;
      }
    }
    
    if (!scriptFile) {
      throw new Error(`Script not found for ${scriptType}`);
    }
    
    return new Promise((resolve, reject) => {
      exec(command, { shell: true }, (error, stdout, stderr) => {
        if (error) {
          reject({ error: error.message, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  // 4. Añadir método auxiliar para ejecutar scripts de desinstalación:

  async executeUninstallScript(toolDir, scripts) {
    let scriptFile = null;
    let command = '';
    
    for (const script of scripts) {
      if (script.startsWith('uninstall.')) {
        scriptFile = script;
        command = this.getCommandForScript(path.join(toolDir, scriptFile));
        break;
      }
    }
    
    if (!scriptFile) {
      return { stdout: 'No uninstall script found', stderr: '' };
    }
    
    return new Promise((resolve, reject) => {
      exec(command, { shell: true }, (error, stdout, stderr) => {
        if (error) {
          console.warn(`⚠️ Uninstall script failed: ${error.message}`);
          resolve({ stdout: `Uninstall script failed: ${error.message}`, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  getCommandForScript(scriptPath) {
    const ext = path.extname(scriptPath);
    const commands = {
      '.py': `python "${scriptPath}"`,
      '.go': `cd "${path.dirname(scriptPath)}" && go run "${path.basename(scriptPath)}"`,
      '.rb': `ruby "${scriptPath}"`,
      '.sh': `bash "${scriptPath}"`
    };
    return commands[ext] || `"${scriptPath}"`;
  }

  setupIpcHandlers() {
    ipcMain.handle('fetch-tools', async () => {
      return await this.fetchToolsFromGitHub();
    });

    ipcMain.handle('download-tool', async (event, toolName) => {
      return await this.downloadTool(toolName);
    });

    ipcMain.handle('execute-tool', async (event, toolName, scriptType) => {
      try {
        const result = await this.executeScript(toolName, scriptType);
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('show-message-box', async (event, options) => {
      const result = await dialog.showMessageBox(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('check-tool-installed', async (event, toolName) => {
      const toolDir = path.join(this.toolsPath, toolName);
      return await fs.pathExists(toolDir);
    });

    ipcMain.handle('get-tool-readme', async (event, toolName) => {
      return await this.fetchToolReadme(toolName);
    });

    ipcMain.handle('delete-tool', async (event, toolName) => {
      return await this.deleteTool(toolName);
    });
  }

  async initialize() {
    console.log('🚀 Inicializando HackerEssentials...');
    
    try {
      await fs.ensureDir(this.toolsPath);
      console.log('📁 Directorio de herramientas creado:', this.toolsPath);
      
      this.setupIpcHandlers();
      console.log('🔗 Handlers IPC configurados');
      
      await this.createWindow();
      console.log('🪟 Ventana principal creada');
      
      console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
    }
  }
}

const hackerApp = new HackerEssentialsApp();

// Event listeners principales
app.whenReady().then(() => {
  console.log('🎯 Electron app ready');
  hackerApp.initialize();
});

app.on('window-all-closed', () => {
  console.log('🔚 Todas las ventanas cerradas');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('🔄 Aplicación activada');
  if (BrowserWindow.getAllWindows().length === 0) {
    hackerApp.createWindow();
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});