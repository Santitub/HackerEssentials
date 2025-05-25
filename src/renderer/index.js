let tools = [];
let installedTools = new Set();
let installingTools = new Set();

async function loadTools() {
    try {
        showLoading(true);
        console.log('🔄 Cargando herramientas...');
        tools = await window.electronAPI.fetchTools();
        console.log('📦 Herramientas recibidas:', tools.length);
        await updateInstalledStatus();
        renderTools();
        updateStats();
    } catch (error) {
        console.error('❌ Error cargando herramientas:', error);
        showError('Error cargando herramientas: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function updateInstalledStatus() {
    installedTools.clear();
    for (const tool of tools) {
        const isInstalled = await window.electronAPI.checkToolInstalled(tool.name);
        if (isInstalled) {
            installedTools.add(tool.name);
        }
    }
}

function renderTools() {
    const container = document.getElementById('tools-container');
    
    if (tools.length === 0) {
        container.innerHTML = '<div class="loading">No se encontraron herramientas</div>';
        return;
    }

    container.innerHTML = tools.map(tool => {
        const isInstalled = installedTools.has(tool.name);
        const isInstalling = installingTools.has(tool.name);
        const hasReadme = tool.hasReadme || false;
        
        let statusClass = 'status-not-installed';
        if (isInstalling) statusClass = 'status-installing';
        else if (isInstalled) statusClass = 'status-installed';

        return `
            <div class="tool-card ${isInstalling ? 'installing' : ''}" data-tool="${tool.name}">
                <div class="tool-header">
                    <div class="tool-name">
                        <span class="status-indicator ${statusClass}"></span>
                        ${tool.name}
                    </div>
                    <div class="tool-language">${tool.language || 'unknown'}</div>
                </div>
                <div class="tool-author">👨‍💻 ${tool.author}</div>
                <div class="tool-description">${tool.description}</div>
                <div class="tool-actions">
                    <button class="btn ${isInstalling ? 'btn-installing' : ''}" 
                            onclick="installTool('${tool.name}')" 
                            ${isInstalled || isInstalling ? 'disabled' : ''}>
                        ${isInstalling ? '⏳ Instalando...' : '📥 Instalar'}
                    </button>
                    <button class="btn btn-warning" onclick="executeTool('${tool.name}', 'main')"
                            ${!isInstalled || isInstalling ? 'disabled' : ''}>
                        ▶️ Ejecutar
                    </button>
                    <button class="btn btn-danger" onclick="executeTool('${tool.name}', 'uninstall')"
                            ${!isInstalled || isInstalling || !tool.hasUninstall ? 'disabled' : ''}>
                        🗑️ Desinstalar
                    </button>
                    ${hasReadme ? `<button class="btn btn-info" onclick="showReadme('${tool.name}')">📖 README</button>` : ''}
                    ${isInstalling ? `<button class="btn btn-info" onclick="toggleToolOutput('${tool.name}')">👁️ Ver Output</button>` : ''}
                </div>
                <div id="output-${tool.name}" class="tool-output"></div>
            </div>
        `;
    }).join('');
}

async function installTool(toolName) {
    if (installingTools.has(toolName)) {
        return; // Ya se está instalando
    }

    try {
        installingTools.add(toolName);
        renderTools(); // Re-renderizar para mostrar estado de instalación
        
        showToolOutput(toolName, `Instalando ${toolName}...`);
        const success = await window.electronAPI.downloadTool(toolName);
        
        if (success) {
            showToolOutput(toolName, `✅ ${toolName} descargado exitosamente`);
            
            // Ejecutar script de instalación si existe
            const tool = tools.find(t => t.name === toolName);
            if (tool && tool.hasInstall) {
                showToolOutput(toolName, `Ejecutando script de instalación...`);
                const result = await window.electronAPI.executeTool(toolName, 'install');
                if (result.success) {
                    showToolOutput(toolName, `✅ ${toolName} instalado correctamente`);
                } else {
                    showToolOutput(toolName, `⚠️ Error en instalación: ${result.error}`);
                }
            }
            
            installedTools.add(toolName);
            showOutput(`✅ ${toolName} instalado exitosamente`);
        } else {
            showToolOutput(toolName, `❌ Error instalando ${toolName}`);
            showOutput(`❌ Error instalando ${toolName}`);
        }
    } catch (error) {
        showToolOutput(toolName, `❌ Error: ${error.message}`);
        showOutput(`❌ Error instalando ${toolName}: ${error.message}`);
    } finally {
        installingTools.delete(toolName);
        renderTools();
        updateStats();
    }
}

async function executeTool(toolName, scriptType) {
    try {
        showOutput(`Ejecutando ${toolName} (${scriptType})...`);
        const result = await window.electronAPI.executeTool(toolName, scriptType);
        
        if (result.success) {
            showOutput(`✅ Ejecución completada:`);
            if (result.stdout) showOutput(result.stdout);
            if (result.stderr) showOutput(`Warnings: ${result.stderr}`);
            
            if (scriptType === 'uninstall') {
                installedTools.delete(toolName);
                renderTools();
                updateStats();
            }
        } else {
            showOutput(`❌ Error: ${result.error}`);
        }
    } catch (error) {
        showOutput(`❌ Error: ${error.message}`);
    }
}

async function showReadme(toolName) {
    try {
        const readmeContent = await window.electronAPI.getToolReadme(toolName);
        if (readmeContent) {
            const modal = document.getElementById('readme-modal');
            const content = document.getElementById('readme-content');
            
            // Renderizar markdown usando marked.js
            content.innerHTML = marked.parse(readmeContent);
            modal.style.display = 'block';
        } else {
            showOutput(`❌ No se pudo cargar el README de ${toolName}`);
        }
    } catch (error) {
        showOutput(`❌ Error cargando README: ${error.message}`);
    }
}

function closeReadmeModal() {
    document.getElementById('readme-modal').style.display = 'none';
}

function showToolOutput(toolName, message) {
    const outputDiv = document.getElementById(`output-${toolName}`);
    if (outputDiv) {
        const timestamp = new Date().toLocaleTimeString();
        outputDiv.innerHTML += `[${timestamp}] ${message}\n`;
        outputDiv.classList.add('show');
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }
}

function toggleToolOutput(toolName) {
    const outputDiv = document.getElementById(`output-${toolName}`);
    if (outputDiv) {
        if (outputDiv.classList.contains('show')) {
            outputDiv.classList.remove('show');
        } else {
            outputDiv.classList.add('show');
        }
    }
}

async function installAllTools() {
    const uninstalledTools = tools.filter(tool => !installedTools.has(tool.name));
    showOutput(`Iniciando instalación masiva de ${uninstalledTools.length} herramientas...`);
    
    for (const tool of uninstalledTools) {
        if (!installingTools.has(tool.name)) {
            await installTool(tool.name);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre instalaciones
        }
    }
    
    showOutput(`✅ Instalación masiva completada`);
}

function refreshTools() {
    loadTools();
}

function showLoading(show) {
    const container = document.getElementById('tools-container');
    if (show) {
        container.innerHTML = '<div class="loading">Cargando herramientas...</div>';
    }
}

function showOutput(message) {
    const panel = document.getElementById('output-panel');
    const content = document.getElementById('output-content');
    
    const timestamp = new Date().toLocaleTimeString();
    content.innerHTML += `[${timestamp}] ${message}\n`;
    panel.classList.add('show');
    panel.scrollTop = panel.scrollHeight;
}

function clearOutput() {
    const content = document.getElementById('output-content');
    const panel = document.getElementById('output-panel');
    content.innerHTML = '';
    panel.classList.remove('show');
    
    // Limpiar también los outputs individuales
    const toolOutputs = document.querySelectorAll('.tool-output');
    toolOutputs.forEach(output => {
        output.innerHTML = '';
        output.classList.remove('show');
    });
}

function showError(message) {
    showOutput(`❌ ${message}`);
}

function updateStats() {
    document.getElementById('total-tools').textContent = tools.length;
    document.getElementById('installed-tools').textContent = installedTools.size;
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('readme-modal');
    if (event.target === modal) {
        closeReadmeModal();
    }
}

// Cargar herramientas al iniciar
window.addEventListener('DOMContentLoaded', loadTools);