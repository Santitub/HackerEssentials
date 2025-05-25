#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Configurando HackerEssentials...\n');

async function setup() {
  try {
    // 1. Crear estructura de directorios
    console.log('📁 Creando estructura de directorios...');
    await fs.ensureDir('src/renderer');
    await fs.ensureDir('src/assets');
    await fs.ensureDir('tools');
    console.log('✅ Directorios creados\n');

    // 2. Verificar que existen los archivos necesarios
    console.log('📋 Verificando archivos...');
    const requiredFiles = [
      'src/main.js',
      'src/preload.js',
      'src/renderer/index.html',
      'package.json'
    ];

    for (const file of requiredFiles) {
      if (await fs.pathExists(file)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - FALTA`);
      }
    }
    console.log('');

    // 3. Copiar .env.example a .env si no existe
    if (!(await fs.pathExists('.env'))) {
      if (await fs.pathExists('.env.example')) {
        await fs.copy('.env.example', '.env');
        console.log('✅ Archivo .env creado desde .env.example');
      } else {
        console.log('⚠️ No se encontró .env.example');
      }
    } else {
      console.log('✅ Archivo .env ya existe');
    }
    console.log('');

    // 4. Instalar dependencias si no existen
    if (!(await fs.pathExists('node_modules'))) {
      console.log('📦 Instalando dependencias...');
      try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencias instaladas');
      } catch (error) {
        console.error('❌ Error instalando dependencias:', error.message);
      }
    } else {
      console.log('✅ Dependencias ya instaladas');
    }
    console.log('');

    // 5. Verificar herramientas del sistema
    console.log('🔍 Verificando herramientas del sistema...');
    const tools = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'Python', command: 'python --version || python3 --version' },
      { name: 'Git', command: 'git --version' }
    ];

    for (const tool of tools) {
      try {
        const version = execSync(tool.command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${tool.name}: ${version.trim()}`);
      } catch (error) {
        console.log(`⚠️ ${tool.name}: No encontrado`);
      }
    }
    console.log('');

    // 6. Mostrar siguiente pasos
    console.log('🎉 ¡Configuración completada!\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Edita el archivo .env si necesitas un token de GitHub');
    console.log('   2. Ejecuta: npm run dev');
    console.log('   3. La aplicación se abrirá automáticamente\n');
    
    console.log('🔑 Para obtener un token de GitHub (opcional):');
    console.log('   1. Ve a: https://github.com/settings/tokens');
    console.log('   2. Crea un nuevo token con permisos "public_repo"');
    console.log('   3. Copia el token al archivo .env\n');
    
    console.log('🚀 Comandos disponibles:');
    console.log('   npm run dev  - Ejecutar en modo desarrollo');
    console.log('   npm start    - Ejecutar aplicación');
    console.log('   npm run build - Construir para distribución');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
  }
}

setup();