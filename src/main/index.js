const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const MinecraftLauncher = require('./minecraft-launcher');
const MicrosoftAuth = require('./microsoft-auth');
const DiscordPresence = require('./discord-rpc');
const si = require('systeminformation');
const fetch = require('node-fetch');
const mc = require('minecraft-protocol');
const fs = require('fs');
const os = require('os');


// ✅ LIMITER LA CONCURRENCE HTTP/HTTPS (Windows compatible)
const http = require('http');
const https = require('https');
http.globalAgent.maxSockets = 5;
https.globalAgent.maxSockets = 5;

// ✅ INTERCEPTER child_process POUR CACHER LA CONSOLE JAVA
const childProcess = require('child_process');
const { icons } = require('../renderer/lucide-icons');
const originalSpawn = childProcess.spawn;

const store = new Store();
let mainWindow;
let settingsWindow = null;
let logsWindow = null; // ✅ FENÊTRE DE LOGS
let discordRPC = new DiscordPresence();
let minecraftRunning = false;
let lastLaunchAttempt = 0;
const LAUNCH_COOLDOWN = 1000; // 1 seconde minimum entre les tentatives
let modsLoadedCount = 0; // Tracker le nombre de mods chargés
let currentLogs = []; // ✅ STOCKER LES LOGS

function createWindow() {
  const iconPath = path.join(__dirname, '../../assets/minecraft-icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    frame: false,
    backgroundColor: '#0f172a',
    ...(fs.existsSync(iconPath) && { icon: iconPath }),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (process.platform === 'win32' && fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath);
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // ✅ RACCOURCIS CLAVIER
  const { globalShortcut } = require('electron');
  
  globalShortcut.register('Control+L', () => {
    mainWindow.webContents.send('keyboard-launch');
  });
  
  globalShortcut.register('Control+S', () => {
    mainWindow.webContents.send('keyboard-settings');
  });
  
  globalShortcut.register('Control+H', () => {
    mainWindow.webContents.send('keyboard-home');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    globalShortcut.unregisterAll();
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, '../../assets/minecraft-icon.png');

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f172a',
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    ...(fs.existsSync(iconPath) && { icon: iconPath })
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ✅ FENÊTRE DE LOGS
function createLogsWindow() {
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, '../../assets/minecraft-icon.png');

  logsWindow = new BrowserWindow({
    width: 950,
    height: 600,
    minWidth: 700,
    minHeight: 400,
    frame: false,
    backgroundColor: '#0a0e27',
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    ...(fs.existsSync(iconPath) && { icon: iconPath })
  });

  // Créer l'HTML de la fenêtre des logs
  const logsHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Logs Minecraft</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: #0a0e27;
          color: #e2e8f0;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .logs-header {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.3);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
        }

        .logs-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logs-title {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .logs-search {
          flex: 1;
          max-width: 300px;
        }

        .logs-search input {
          width: 100%;
          padding: 8px 12px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 12px;
          font-family: inherit;
        }

        .logs-search input::placeholder {
          color: #64748b;
        }

        .logs-search input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(30, 41, 59, 0.8);
        }

        .logs-buttons {
          display: flex;
          gap: 8px;
        }

        .logs-btn {
          padding: 6px 12px;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          color: #cbd5e1;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
          text-align: center;
          white-space: nowrap;
        }

        .logs-btn:hover {
          background: rgba(99, 102, 241, 0.3);
          border-color: rgba(99, 102, 241, 0.5);
          color: #e2e8f0;
        }

        .logs-container {
          flex: 1;
          overflow-y: auto;
          background: #0a0e27;
          padding: 12px 16px;
        }

        .log-line {
          padding: 2px 0;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-all;
          font-size: 11px;
        }

        .log-line.info {
          color: #cbd5e1;
        }

        .log-line.success {
          color: #10b981;
        }

        .log-line.warning {
          color: #f59e0b;
        }

        .log-line.error {
          color: #ef4444;
        }

        .log-line.debug {
          color: #8b5cf6;
        }

        .logs-empty {
          text-align: center;
          color: #64748b;
          padding-top: 40px;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }

        .titlebar {
          height: 32px;
          background: #0f172a;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          padding: 0 12px;
          -webkit-app-region: drag;
          user-select: none;
        }

        .titlebar-title {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .titlebar-buttons {
          display: flex;
          gap: 8px;
          -webkit-app-region: no-drag;
        }

        .titlebar-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .titlebar-btn:hover {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }

        .titlebar-btn.close:hover {
          background: #ef4444;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="titlebar">
        <div class="titlebar-title">🎮 Mission Control / CraftLauncher with ${os.version}</div>
        <div class="titlebar-buttons">
          <button class="titlebar-btn" id="minimize-btn">−</button>
          <button class="titlebar-btn" id="maximize-btn">□</button>
          <button class="titlebar-btn close" id="close-btn">✕</button>
        </div>
      </div>

      <div class="logs-header">
        <div class="logs-header-left">
          <div class="logs-title">📋 Logs de lancement</div>
          <div class="logs-search">
            <input type="text" id="search-input" placeholder="Rechercher dans les logs...">
          </div>
        </div>
        <div class="logs-buttons">
          <button class="logs-btn" id="clear-btn" title=Effacer>${icons.trash}</button>
          <button class="logs-btn" id="copy-btn" title=Copier tout>${icons.clipboard}</button>
        </div>
      </div>

      <div class="logs-container" id="logs-container">
        <div class="logs-empty">En attente de logs...</div>
      </div>

      <script>
        const { ipcRenderer } = require('electron');

        const logsContainer = document.getElementById('logs-container');
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('clear-btn');
        const copyBtn = document.getElementById('copy-btn');
        const minimizeBtn = document.getElementById('minimize-btn');
        const maximizeBtn = document.getElementById('maximize-btn');
        const closeBtn = document.getElementById('close-btn');
        
        let allLogs = [];
        let filteredLogs = [];

        // Ajouter un log
        ipcRenderer.on('add-log', (event, log) => {
          allLogs.push(log);
          filterLogs();
          scrollToBottom();
        });

        // Remplacer tous les logs
        ipcRenderer.on('set-logs', (event, logs) => {
          allLogs = logs;
          filterLogs();
          scrollToBottom();
        });

        // Recherche
        searchInput.addEventListener('input', () => {
          filterLogs();
        });

        function filterLogs() {
          const query = searchInput.value.toLowerCase();
          if (!query) {
            filteredLogs = [...allLogs];
          } else {
            filteredLogs = allLogs.filter(log => 
              log.message.toLowerCase().includes(query)
            );
          }
          renderLogs();
        }

        function renderLogs() {
          if (filteredLogs.length === 0) {
            logsContainer.innerHTML = '<div class="logs-empty">Aucun log trouvé</div>';
            return;
          }

          logsContainer.innerHTML = filteredLogs.map(log => {
            return \`<div class="log-line \${log.type}">\${log.message}</div>\`;
          }).join('');
        }

        function scrollToBottom() {
          logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        clearBtn.addEventListener('click', () => {
          allLogs = [];
          filteredLogs = [];
          renderLogs();
          ipcRenderer.send('clear-logs');
        });

        copyBtn.addEventListener('click', () => {
          const text = filteredLogs.map(log => log.message).join('\\n');
          require('electron').clipboard.writeText(text);
          copyBtn.textContent = '✓ Copié !';
          setTimeout(() => copyBtn.textContent = '📋 Copier tout', 2000);
        });

        minimizeBtn.addEventListener('click', () => {
          ipcRenderer.send('minimize-logs-window');
        });

        maximizeBtn.addEventListener('click', () => {
          ipcRenderer.send('maximize-logs-window');
        });

        closeBtn.addEventListener('click', () => {
          ipcRenderer.send('close-logs-window');
        });
      </script>
    </body>
    </html>
  `;

  // Charger l'HTML personnalisé
  logsWindow.webContents.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(logsHTML));

  logsWindow.on('closed', () => {
    logsWindow = null;
  });
}

// AJOUTER AVANT app.whenReady():

ipcMain.on('settings-updated', (event, settings) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-updated', settings);
  }
});

// ✅ ENVOYER LE CHEMIN DES ASSETS POUR LA MUSIQUE (HORS DE app.asar)
ipcMain.handle('get-assets-path', async () => {
  // Utiliser process.resourcesPath qui pointe vers le dossier resources/
  // Les extraResources (music/) y sont extraits automatiquement
  let musicPath;
  
  if (app.isPackaged) {
    // Mode production: les musiques sont copiées dans resources/music
    musicPath = path.join(process.resourcesPath, 'assets', 'music');
  } else {
    // Mode développement: les assets sont dans le dossier root
    musicPath = path.join(__dirname, '../../assets/music');
  }
  
  console.log('✅ Music path sent to renderer:', musicPath);
  return musicPath;
});

// Obtenir les infos du compte
// ✅ NEWSLETTER SUBSCRIPTION
ipcMain.handle('subscribe-newsletter', async (event, { email }) => {
  try {
    const subscribers = store.get('newsletter-subscribers', []);
    if (!subscribers.includes(email)) {
      subscribers.push(email);
      store.set('newsletter-subscribers', subscribers);
    }
    return { success: true, message: 'Subscription successful' };
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return { success: true }; // Retourner success même en cas d'erreur
  }
});

ipcMain.handle('get-account-info', async () => {
  try {
    const authData = store.get('authData', null);
    
    if (!authData) {
      return { success: false, username: null };
    }

    return {
      success: true,
      username: authData.username,
      email: authData.email || authData.username + '@minecraft.net (temporaire pour reconnaitre nos joueurs)',
      uuid: authData.uuid || null,
      type: authData.type || 'offline'
    };
  } catch (error) {
    console.error('Erreur récupération compte:', error);
    return { success: false, error: error.message };
  }
});



// ✅ ÉCOUTER LE SIGNAL DE DÉCONNEXION
ipcMain.on('logout-complete', (event) => {
  const settingsWindow = BrowserWindow.getAllWindows().find(w => w.webContents.getTitle().includes('Paramètres'));
  if (settingsWindow) {
    settingsWindow.close();
  }
  
  // Afficher la fenêtre principale avec la page de login
  if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
  }
});

// ✅ Dialog de confirmation - AVEC SUPPORT POUR CUSTOM BUTTONS
ipcMain.handle('show-confirm-dialog', async (event, options) => {
  // Si c'est le message Mode Hors Ligne, afficher juste OK
  if (options.title === 'Mode Hors Ligne' || options.message?.includes('Mode Hors Ligne')) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: options.title || 'Confirmation',
      message: options.message || 'Opération confirmée',
      buttons: ['OK'],
      defaultId: 0
    });
    return true;
  }

  // Pour les autres messages, afficher Oui/Non
  const result = await dialog.showMessageBox(mainWindow, {
    type: options.type || 'question',
    title: options.title || 'Confirmation',
    message: options.message || 'Êtes-vous sûr ?',
    buttons: ['Oui', 'Non'],
    defaultId: 0,
    cancelId: 1
  });
  
  return result.response === 0; // true = Oui, false = Non
});

// ✅ HANDLERS POUR LES LOGS
ipcMain.on('clear-logs', () => {
  currentLogs = [];
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.webContents.send('set-logs', []);
  }
});

// Fonction pour ajouter un log et l'envoyer à la fenêtre de logs
function addLog(message, type = 'info') {
  const log = {
    message: message,
    type: type,
    timestamp: new Date().toLocaleTimeString()
  };
  
  currentLogs.push(log);
  
  // Envoyer au logs window s'il est ouvert
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.webContents.send('add-log', log);
  }
}

// Intercepter console.log pour capturer les logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function(...args) {
  originalLog.apply(console, args);
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  addLog(message, 'info');
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  addLog(message, 'warning');
};

console.error = function(...args) {
  originalError.apply(console, args);
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  addLog(message, 'error');
};

app.whenReady().then(async () => {
  createWindow();
  
  const discordEnabled = store.get('settings.discordRPC', false);
  if (discordEnabled) {
    await discordRPC.connect();
  }

  // ✅ VÉRIFIER ET INSTALLER LES MISES À JOUR AUTOMATIQUEMENT
  setTimeout(async () => {
    try {
      console.log('\n[o] Auto checking for updates on startup...');
      const updateResult = await checkUpdatesAndInstall();
      if (updateResult.hasUpdate) {
        console.log('✅ Mise à jour automatique en cours...');
      } else {
        console.log('[v] You are up to date');
      }
    } catch (error) {
      console.error('[!] Error checking for updates:', error.message);
    }
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // ✅ CLEANUP: Libérer la mémoire
  minecraftRunning = false;
  lastLaunchAttempt = 0;
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Obtenir la RAM système
ipcMain.handle('get-system-ram', async () => {
  try {
    const mem = await si.mem();
    const totalGB = Math.floor(mem.total / (1024 * 1024 * 1024));
    return totalGB;
  } catch (error) {
    return 16;
  }
});

// ✅ OPTIMISATION RAM AUTOMATIQUE
ipcMain.handle('get-optimal-ram', async () => {
  try {
    const info = await si.mem();
    const totalRam = Math.floor(info.total / (1024 ** 3)); // Convert to GB
    const availableRam = Math.floor(info.available / (1024 ** 3));
    
    // Recommandation: 50% de la RAM libre, min 2GB, max (totalRam - 2GB)
    const recommended = Math.min(
      Math.max(Math.floor(availableRam * 0.5), 2),
      totalRam - 2
    );
    
    return {
      total: totalRam,
      available: availableRam,
      recommended: recommended,
      systemRam: info.total,
      freeRam: info.available
    };
  } catch (error) {
    console.error('Erreur optimisation RAM:', error);
    return { total: 16, available: 8, recommended: 4 };
  }
});

// ✅ OBTENIR LA RAM DISPONIBLE
ipcMain.handle('get-available-ram', async () => {
  try {
    const info = await si.mem();
    return Math.floor(info.available / (1024 ** 3));
  } catch (error) {
    return 0;
  }
});

// Authentification Microsoft
ipcMain.handle('login-microsoft', async () => {
  try {
    const auth = new MicrosoftAuth();
    const result = await auth.authenticate();
    
    if (result.success) {
      store.set('authData', result.data);
      return result;
    }
    
    return { success: false, error: 'Authentification échouée' };
  } catch (error) {
    console.error('Erreur Microsoft Auth:', error);
    return { success: false, error: error.message || 'Erreur de connexion' };
  }
});

// ✅ CACHE POUR LES STATISTIQUES (mise à jour toutes les 5 minutes)
let storageInfoCache = null;
let lastStorageUpdate = 0;
const STORAGE_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

ipcMain.handle('get-storage-info', async () => {
  try {
    const now = Date.now();
    
    // Utiliser le cache si récent
    if (storageInfoCache && (now - lastStorageUpdate) < STORAGE_CACHE_TIME) {
      return storageInfoCache;
    }
    
    const settings = store.get('settings', {});
    const gameDir = settings.gameDirectory || path.join(os.homedir(), '.minecraft');
    
    // Vérifier que le dossier existe
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
    }

    // Utiliser du command pour calculer la taille (beaucoup plus rapide)
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec(`powershell -Command "Get-ChildItem -Path '${gameDir}' -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name='Size';Expression={$_.Sum}}"`, 
        { encoding: 'utf8' },
        (error, stdout, stderr) => {
          try {
            let usedBytes = 0;
            
            if (!error && stdout) {
              // Parser la sortie PowerShell
              const sizeMatch = stdout.match(/\d+/);
              if (sizeMatch) {
                usedBytes = parseInt(sizeMatch[0]);
              }
            }
            
            // Si PowerShell échoue, utiliser une fonction rapide (sans récursion complète)
            if (usedBytes === 0) {
              const getApproxSize = (dir, depth = 0) => {
                if (depth > 3) return 0; // Limiter la profondeur
                let size = 0;
                
                try {
                  const files = fs.readdirSync(dir);
                  files.forEach(file => {
                    try {
                      const filePath = path.join(dir, file);
                      const stat = fs.statSync(filePath);
                      
                      if (stat.isDirectory() && depth < 3) {
                        size += getApproxSize(filePath, depth + 1);
                      } else {
                        size += stat.size;
                      }
                    } catch (e) {
                      // Ignorer les fichiers non accessibles
                    }
                  });
                } catch (e) {
                  // Ignorer les dossiers non accessibles
                }
                
                return size;
              };
              
              usedBytes = getApproxSize(gameDir);
            }
            
            const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);

            // Obtenir l'espace disque du lecteur
            si.fsSize().then(diskInfo => {
              const drive = diskInfo.find(d => gameDir.startsWith(d.mount)) || diskInfo[0];
              
              const totalGB = (drive.size / (1024 * 1024 * 1024)).toFixed(2);
              const freeGB = (drive.available / (1024 * 1024 * 1024)).toFixed(2);

              const result = {
                success: true,
                gamePath: gameDir,
                usedGB: parseFloat(usedGB),
                totalGB: parseFloat(totalGB),
                freeGB: parseFloat(freeGB)
              };
              
              // Mettre en cache
              storageInfoCache = result;
              lastStorageUpdate = now;
              
              resolve(result);
            });
          } catch (err) {
            resolve({
              success: false,
              error: 'Erreur calcul stockage'
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Erreur récupération stockage:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// ✅ OUVRIR LE DOSSIER MINECRAFT
ipcMain.handle('open-minecraft-folder', async () => {
  try {
    const settings = store.get('settings', {});
    const gameDir = settings.gameDirectory || path.join(os.homedir(), '.minecraft');
    
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
    }
    
    await shell.openPath(gameDir);
    return { success: true };
  } catch (error) {
    console.error('Erreur ouverture dossier:', error);
    return { success: false, error: error.message };
  }
});

// ✅ VIDER LE CACHE
ipcMain.handle('clear-minecraft-cache', async () => {
  try {
    const settings = store.get('settings', {});
    const gameDir = settings.gameDirectory || path.join(os.homedir(), '.minecraft');
    
    const cacheDirs = [
      path.join(gameDir, 'cache'),
      path.join(gameDir, 'logs'),
      path.join(gameDir, 'crash-reports')
    ];

    let clearedSize = 0;

    for (const cacheDir of cacheDirs) {
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        
        files.forEach(file => {
          const filePath = path.join(cacheDir, file);
          const stat = fs.statSync(filePath);
          clearedSize += stat.size;
          
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        });
      }
    }

    const clearedMB = (clearedSize / (1024 * 1024)).toFixed(2);
    console.log(`✅ Cache supprimé: ${clearedMB} MB`);
    
    return {
      success: true,
      message: `Cache supprimé: ${clearedMB} MB`,
      clearedSize: clearedMB
    };
  } catch (error) {
    console.error('Erreur suppression cache:', error);
    return { success: false, error: error.message };
  }
});

// ...existing code...

// ✅ NOTIFICATIONS - OBTENIR LES PARAMETRES
ipcMain.handle('get-notification-settings', async () => {
  try {
    const notifSettings = store.get('notificationSettings', {});
    return {
      success: true,
      launchNotif: notifSettings.launchNotif !== false,
      downloadNotif: notifSettings.downloadNotif !== false,
      updateNotif: notifSettings.updateNotif !== false,
      errorNotif: notifSettings.errorNotif !== false,
      sound: notifSettings.sound !== false,
      volume: notifSettings.volume || 50
    };
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    return { success: false, error: error.message };
  }
});

// ✅ NOTIFICATIONS - SAUVEGARDER
ipcMain.handle('save-notification-settings', async (event, settings) => {
  try {
    store.set('notificationSettings', settings);
    console.log('✅ Paramètres de notifications sauvegardés');
    return { success: true };
  } catch (error) {
    console.error('Erreur sauvegarde notifications:', error);
    return { success: false, error: error.message };
  }
});

// ✅ NOTIFICATIONS - TEST
ipcMain.handle('test-notification', async (event, options) => {
  try {
    const { Notification } = require('electron');
    
    const notif = new Notification({
      title: 'Test de notification',
      body: 'Ceci est un test de notification CraftLauncher',
      icon: path.join(__dirname, '../assets/icon.png')
    });

    notif.show();
    
    console.log('✅ Notification test envoyée');
    return { success: true };
  } catch (error) {
    console.error('Erreur notification test:', error);
    return { success: false, error: error.message };
  }
});

// ✅ NOTIFICATIONS - REINITIALISER
ipcMain.handle('reset-notification-settings', async () => {
  try {
    const defaultSettings = {
      launchNotif: true,
      downloadNotif: true,
      updateNotif: true,
      errorNotif: true,
      sound: true,
      volume: 50
    };
    
    store.set('notificationSettings', defaultSettings);
    console.log('✅ Paramètres de notifications réinitialisés');
    return { success: true };
  } catch (error) {
    console.error('Erreur réinitialisation notifications:', error);
    return { success: false, error: error.message };
  }
});

// ...existing code...

// ✅ DISCORD - OBTENIR LES PARAMETRES
ipcMain.handle('get-discord-settings', async () => {
  try {
    const discordSettings = store.get('discordSettings', {});
    return {
      success: true,
      rpcEnabled: discordSettings.rpcEnabled !== false,
      showStatus: discordSettings.showStatus !== false,
      showDetails: discordSettings.showDetails !== false,
      showImage: discordSettings.showImage !== false,
      isConnected: discordRPC.isConnected
    };
  } catch (error) {
    console.error('Erreur récupération Discord:', error);
    return { success: false, error: error.message };
  }
});

// ✅ DISCORD - SAUVEGARDER
ipcMain.handle('save-discord-settings', async (event, settings) => {
  try {
    store.set('discordSettings', settings);
    
    if (settings.rpcEnabled) {
      if (!discordRPC.isConnected) {
        await discordRPC.connect();
      }
    } else {
      await discordRPC.disconnect();
    }
    
    console.log('✅ Paramètres Discord sauvegardés');
    return { success: true };
  } catch (error) {
    console.error('Erreur sauvegarde Discord:', error);
    return { success: false, error: error.message };
  }
});

// ✅ DISCORD - RECONNECTER
ipcMain.handle('reconnect-discord-rpc', async () => {
  try {
    await discordRPC.disconnect();
    const connected = await discordRPC.connect();
    
    if (connected) {
      const authData = store.get('authData');
      if (authData) {
        await discordRPC.setInLauncher(authData.username);
      }
      console.log('[OK] Discord reconnected');
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Erreur reconnexion Discord:', error);
    return { success: false, error: error.message };
  }
});

// ✅ DISCORD - REINITIALISER
ipcMain.handle('reset-discord-settings', async () => {
  try {
    const defaultSettings = {
      rpcEnabled: true,
      showStatus: true,
      showDetails: true,
      showImage: true
    };
    
    store.set('discordSettings', defaultSettings);
    
    if (defaultSettings.rpcEnabled && !discordRPC.isConnected) {
      await discordRPC.connect();
    }
    
    console.log('✅ Paramètres Discord réinitialisés');
    return { success: true };
  } catch (error) {
    console.error('Erreur réinitialisation Discord:', error);
    return { success: false, error: error.message };
  }
});

// ✅ HISTORIQUE DE JEU - ENREGISTRER UNE PARTIE
ipcMain.handle('log-game-session', async (event, sessionData) => {
  const sessions = store.get('gameSessions', []);
  
  const newSession = {
    id: Date.now(),
    version: sessionData.version,
    server: sessionData.server || 'Solo',
    username: sessionData.username,
    startTime: new Date(sessionData.startTime).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: Math.round((new Date() - new Date(sessionData.startTime)) / 60000)
  };
  
  sessions.unshift(newSession);
  // Garder seulement les 100 dernières sessions
  if (sessions.length > 100) sessions.pop();
  
  store.set('gameSessions', sessions);
  console.log(`✅ Session enregistrée: ${newSession.durationMinutes}min`);
  
  return { success: true };
});

// ✅ OBTENIR L'HISTORIQUE DE JEU
ipcMain.handle('get-game-sessions', async () => {
  return store.get('gameSessions', []);
});

// ✅ OBTENIR LES STATISTIQUES DE JEU
ipcMain.handle('get-game-stats', async () => {
  const sessions = store.get('gameSessions', []);
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalPlaytime: 0,
      averageSession: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastPlayed: null,
      favoriteServer: 'Aucun',
      favoriteVersion: 'Aucune',
      favoriteMode: 'Survie',
      weeklyStats: [0, 0, 0, 0, 0, 0, 0],
      weeklySessionCount: 0
    };
  }
  
  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const serverCounts = {};
  const versionCounts = {};
  const wins = sessions.filter(s => s.won).length;
  
  sessions.forEach(s => {
    serverCounts[s.server] = (serverCounts[s.server] || 0) + 1;
    versionCounts[s.version] = (versionCounts[s.version] || 0) + 1;
  });
  
  const favoriteServer = Object.entries(serverCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Aucun';
  const favoriteVersion = Object.entries(versionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Aucune';
  
  // Calculer les streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  
  for (const session of sessions.reverse()) {
    if (session.won) {
      tempStreak++;
      currentStreak = tempStreak;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }
  
  const longestSession = sessions.reduce((max, s) => s.durationMinutes > max ? s.durationMinutes : max, 0);
  const longestSessionFormatted = `${Math.floor(longestSession / 60)}h ${longestSession % 60}min`;
  
  // ✅ CALCULER LES STATISTIQUES HEBDOMADAIRES
  const weeklyStats = [0, 0, 0, 0, 0, 0, 0]; // Lun à Dim (en heures)
  const weeklySessionCount = {};
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.startTime);
    
    // Vérifier si la session est dans la semaine dernière
    if (sessionDate >= oneWeekAgo && sessionDate <= now) {
      // Lundi = 1, Dimanche = 0 (convertir en index 0-6 où Lundi = 0)
      let dayIndex = sessionDate.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // Dimanche
      
      weeklyStats[dayIndex] += session.durationMinutes / 60; // Convertir en heures
      weeklySessionCount[dayIndex] = (weeklySessionCount[dayIndex] || 0) + 1;
    }
  });
  
  // Arrondir à 1 décimale
  weeklyStats.forEach((_, i) => {
    weeklyStats[i] = Math.round(weeklyStats[i] * 10) / 10;
  });
  
  const totalWeeklySessions = Object.values(weeklySessionCount).reduce((a, b) => a + b, 0);
  
  return {
    totalSessions: sessions.length,
    totalPlaytime: totalMinutes,
    totalPlaytimeFormatted: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`,
    averageSession: Math.round(totalMinutes / sessions.length),
    wins: wins,
    currentStreak: currentStreak,
    bestStreak: bestStreak,
    lastPlayed: sessions[sessions.length - 1]?.startTime || null,
    longestSession: longestSessionFormatted,
    favoriteServer,
    favoriteVersion,
    favoriteMode: 'Survie',
    weeklyStats: weeklyStats,
    weeklySessionCount: totalWeeklySessions
  };
});

// Mode hors ligne
ipcMain.handle('login-offline', async (event, username) => {
  try {
    const authData = {
      type: 'offline',
      username: username,
      email: username + '@minecraft.net (temporaire pour reconnaitre nos joueurs)',
      uuid: null,
      accessToken: null,
      online: true
    };
    
    store.set('authData', authData);
    
    if (discordRPC.enabled) {
      await discordRPC.setInLauncher(username);
    }
    
    console.log(`✅ Connecté en mode offline: ${username}`);
    return { success: true, data: authData };
  } catch (error) {
    console.error('Erreur login-offline:', error);
    return { success: false, error: error.message };
  }
});

// Déconnexion
ipcMain.handle('logout', async () => {
  store.delete('authData');
  await discordRPC.clear();
  return { success: true };
});

// Obtenir auth data
ipcMain.handle('get-auth-data', async () => {
  return store.get('authData', null);
});

// ✅ GESTION COMPLÈTE DES PROFILS
ipcMain.handle('get-profiles', async () => {
  const defaultProfile = {
    id: 1,
    name: 'Principal',
    version: '1.21.4',
    lastPlayed: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  
  return store.get('profiles', [defaultProfile]);
});

// ✅ OBTENIR UN PROFIL PAR ID
ipcMain.handle('get-profile', async (event, profileId) => {
  const profiles = store.get('profiles', [
    {
      id: 1,
      name: 'Principal',
      version: '1.21.4',
      lastPlayed: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }
  ]);
  
  const profile = profiles.find(p => p.id === parseInt(profileId));
  
  if (!profile) {
    return null;
  }
  
  console.log(`✅ Profil obtenu: ${profile.name}`);
  return profile;
});

// ✅ CRÉER UN NOUVEAU PROFIL
ipcMain.handle('create-profile', async (event, profileData) => {
  const profiles = store.get('profiles', []);
  const newId = profiles.length > 0 ? Math.max(...profiles.map(p => p.id)) + 1 : 1;
  
  const newProfile = {
    id: newId,
    name: profileData.name || `Profil ${newId}`,
    version: profileData.version || '1.21.4',
    lastPlayed: null,
    createdAt: new Date().toISOString()
  };
  
  profiles.push(newProfile);
  store.set('profiles', profiles);
  console.log(`✅ Profil créé: ${newProfile.name}`);
  
  return { success: true, profile: newProfile };
});

// ✅ SUPPRIMER UN PROFIL
ipcMain.handle('delete-profile', async (event, profileId) => {
  const profiles = store.get('profiles', []);
  
  if (profileId === 1) {
    return { success: false, error: 'Impossible de supprimer le profil principal' };
  }
  
  const filtered = profiles.filter(p => p.id !== profileId);
  store.set('profiles', filtered);
  console.log(`✅ Profil supprimé: ${profileId}`);
  
  return { success: true };
});

// ✅ DUPLIQUER UN PROFIL
ipcMain.handle('duplicate-profile', async (event, profileId) => {
  const profiles = store.get('profiles', []);
  const profileToDuplicate = profiles.find(p => p.id === profileId);
  
  if (!profileToDuplicate) {
    return { success: false, error: 'Profil non trouvé' };
  }
  
  const newId = Math.max(...profiles.map(p => p.id)) + 1;
  const duplicated = {
    ...profileToDuplicate,
    id: newId,
    name: `${profileToDuplicate.name} (copie)`,
    createdAt: new Date().toISOString()
  };
  
  profiles.push(duplicated);
  store.set('profiles', profiles);
  console.log(`✅ Profil dupliqué: ${duplicated.name}`);
  
  return { success: true, profile: duplicated };
});

// ✅ RENOMMER UN PROFIL
ipcMain.handle('rename-profile', async (event, profileId, newName) => {
  const profiles = store.get('profiles', []);
  const profile = profiles.find(p => p.id === profileId);
  
  if (!profile) {
    return { success: false, error: 'Profil non trouvé' };
  }
  
  profile.name = newName;
  store.set('profiles', profiles);
  console.log(`✅ Profil renommé: ${newName}`);
  
  return { success: true, profile };
});

// ✅ MODIFIER JUSTE LA VERSION DU PROFIL
ipcMain.handle('update-profile-version', async (event, version) => {
  const profiles = store.get('profiles', [
    {
      id: 1,
      name: 'Principal',
      version: '1.21.4',
      ram: 4,
      lastPlayed: new Date().toISOString().split('T')[0]
    }
  ]);
  
  const profile = profiles[0]; // Toujours le premier profil
  profile.version = version;
  profile.lastPlayed = new Date().toISOString().split('T')[0];
  
  store.set('profiles', profiles);
  console.log(`✅ Version mise à jour: ${version}`);
  
  return { success: true, profile };
});

// Paramètres
ipcMain.handle('get-settings', async () => {
  return store.get('settings', {
    ramAllocation: 4,
    javaPath: 'java',
    gameDirectory: path.join(os.homedir(), '.minecraft'),
    discordRPC: false
  });
});

ipcMain.handle('save-settings', async (event, settings) => {
  store.set('settings', settings);
  
  if (settings.discordRPC !== undefined) {
    discordRPC.setEnabled(settings.discordRPC);
    if (settings.discordRPC) {
      await discordRPC.connect();
      const authData = store.get('authData');
      if (authData) {
        await discordRPC.setInLauncher(authData.username);
      }
    }
  }
  
  // ✅ NOTIFIER LA FENÊTRE PRINCIPALE DE LA MISE À JOUR DES SETTINGS
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-updated', settings);
  }
  
  return { success: true };
});

// ✅ HANDLER LANCER MINECRAFT AVEC VÉRIFICATION AUTH
ipcMain.handle('launch-minecraft', async (event, profile, serverIP) => {
  try {
    // ✅ PROTECTION: Cooldown entre les lancements
    const now = Date.now();
    if (now - lastLaunchAttempt < LAUNCH_COOLDOWN) {
      return {
        success: false,
        error: 'Veuillez attendre avant de relancer'
      };
    }
    lastLaunchAttempt = now;

    if (minecraftRunning) {
      return {
        success: false,
        error: 'Minecraft est déjà en cours d\'exécution !'
      };
    }

    const authData = store.get('authData', null);
    const settings = store.get('settings', {});
    
    if (!authData) {
      return {
        success: false,
        error: 'Veuillez vous connecter d\'abord'
      };
    }

    // ✅ VÉRIFICATION: OFFLINE NE PEUT PAS LANCER SANS VERSION EXISTANTE
    if (authData.type === 'offline') {
      // Vérifier que la version existe déjà localement
      const gameDir = settings.gameDirectory || path.join(os.homedir(), '.minecraft');
      const versionPath = path.join(gameDir, 'versions', profile.version);
      
      if (!fs.existsSync(versionPath)) {
        return {
          success: false,
          error: `⚠️ Version ${profile.version} non trouvée.\n\nEn mode hors ligne, vous devez télécharger les versions via une connexion Microsoft d'abord, ou utiliser une version déjà installée.`
        };
      }
    }

    minecraftRunning = true;

    const gameDir = settings.gameDirectory || path.join(os.homedir(), '.minecraft');
    const launcher = new MinecraftLauncher();
    
    console.log(`\n🚀 Lancement Minecraft (${authData.type})...`);
    
    // ✅ OUVRIR LA FENÊTRE DE LOGS
    createLogsWindow();
    currentLogs = []; // Réinitialiser les logs
    
    try {
      // ✅ ENVOYER LES MISES À JOUR DE PROGRESSION AU RENDERER
      const result = await launcher.launch({
        authData: authData,
        version: profile.version,
        ram: settings.ramAllocation || 4,
        gameDirectory: gameDir,
        javaPath: settings.javaPath || 'java',
        serverIP: serverIP,
        onProgress: (progress) => {
          // Envoyer la progression au renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('launch-progress', {
              type: progress.type,
              percent: progress.percent,
              message: progress.message
            });
          }
        }
      });

      if (discordRPC.enabled) {
        await discordRPC.setPlaying(profile.version, serverIP);
      }
      
      return {
        success: result.success !== false,
        message: result.error ? `Erreur: ${result.error}` : 'Minecraft lancé !'
      };
    } finally {
      setTimeout(() => {
        minecraftRunning = false;
        // ✅ CLEANUP: Forcer le garbage collector
        if (global.gc) {
          global.gc();
        }
      }, 5000);
    }

  } catch (error) {
    console.error('❌ Erreur handler launch:', error);
    minecraftRunning = false;
    return {
      success: false,
      error: error.message
    };
  }
});

// Sélectionner le répertoire du jeu
ipcMain.handle('select-game-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner le répertoire Minecraft',
      defaultPath: os.homedir(),
      properties: ['openDirectory']
    });

    if (!result.canceled) {
      const settings = store.get('settings', {});
      settings.gameDirectory = result.filePaths[0];
      store.set('settings', settings);
      console.log('📁 Répertoire Minecraft défini:', result.filePaths[0]);
      return { success: true, path: result.filePaths[0] };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Erreur sélection répertoire:', error);
    return { success: false, error: error.message };
  }
});

// Obtenir les versions
ipcMain.handle('get-versions', async () => {
  const launcher = new MinecraftLauncher();
  return await launcher.getAvailableVersions();
});

// Amis
ipcMain.handle('get-friends', async () => {
  return store.get('friends', []);
});

ipcMain.handle('add-friend', async (event, friend) => {
  const friends = store.get('friends', []);
  
  const exists = friends.find(f => f.username.toLowerCase() === friend.username.toLowerCase());
  if (exists) {
    return { success: false, error: 'Cet ami existe déjà' };
  }
  
  const newFriend = {
    id: Date.now(),
    username: friend.username,
    online: false,
    server: null,
    addedAt: new Date().toISOString()
  };
  
  friends.push(newFriend);
  store.set('friends', friends);
  return { success: true, friends };
});

ipcMain.handle('remove-friend', async (event, friendId) => {
  const friends = store.get('friends', []);
  const filtered = friends.filter(f => f.id !== friendId);
  store.set('friends', filtered);
  return { success: true, friends: filtered };
});

ipcMain.handle('update-friend-status', async (event, friendId, status) => {
  const friends = store.get('friends', []);
  const friend = friends.find(f => f.id === friendId);
  
  if (friend) {
    friend.online = status.online;
    friend.server = status.server || null;
    friend.lastSeen = new Date().toISOString();
    store.set('friends', friends);
  }
  
  return { success: true, friends };
});

ipcMain.handle('check-friends-status', async () => {
  const friends = store.get('friends', []);
  
  const updatedFriends = friends.map(friend => ({
    ...friend,
    online: Math.random() > 0.5,
    lastChecked: new Date().toISOString()
  }));
  
  store.set('friends', updatedFriends);
  return updatedFriends;
});

// Ping serveur
ipcMain.handle('ping-server', async (event, serverAddress) => {
  try {
    const [host, portStr] = serverAddress.split(':');
    const port = parseInt(portStr) || 25565;

    return new Promise((resolve) => {
      mc.ping({ host, port }, (err, result) => {
        if (err) {
          resolve({ online: false, error: err.message });
        } else {
          resolve({
            online: true,
            players: result.players,
            version: result.version,
            description: result.description
          });
        }
      });
    });
  } catch (error) {
    return { online: false, error: error.message };
  }
});

// News Minecraft
ipcMain.handle('get-minecraft-news', async () => {
  try {
    const response = await fetch('https://launchermeta.mojang.com/mc/news.json');
    const data = await response.json();
    return data.newsitems || [];
  } catch (error) {
    console.log('Erreur récupération news Minecraft:', error);
    return [];
  }
});

// Tête du joueur
ipcMain.handle('get-player-head', async (event, username) => {
  try {
    const headUrl = `https://mc-heads.net/avatar/${username}/128`;
    return { success: true, url: headUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Test Discord RPC
ipcMain.handle('test-discord-rpc', async () => {
  try {
    if (discordRPC.isConnected) {
      await discordRPC.disconnect();
    }
    
    const connected = await discordRPC.connect();
    
    if (connected) {
      await discordRPC.setActivity(
        'Test Discord RPC',
        'CraftLauncher fonctionne !',
        Date.now()
      );
      return { success: true };
    }
    return { success: false, error: 'Discord non connecté' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ FENÊTRES - OUVRIR PARAMÈTRES AVEC UN ONGLET SPÉCIFIQUE
ipcMain.on('open-settings', (event, options = {}) => {
  createSettingsWindow();
  
  // ✅ ENVOYER L'ONGLET À AFFICHER SI SPÉCIFIÉ
  if (options && options.tab) {
    setTimeout(() => {
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send('navigate-to-tab', options.tab);
      }
    }, 500);
  }
});

// ✅ HANDLER POUR LA DÉCONNEXION DEPUIS LES PARAMÈTRES
ipcMain.on('logout-from-settings', (event) => {
  console.log('📡 Signal logout-from-settings reçu dans main');
  
  // Fermer immédiatement les paramètres
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
  
  // Vérifier que la fenêtre principale existe et est visible
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    
    // Envoyer le signal à la fenêtre principale
    mainWindow.webContents.send('logout-from-settings');
    console.log('✅ Signal envoyé à la fenêtre principale');
  } else {
    console.error('❌ Fenêtre principale introuvable');
  }
});

// ✅ HANDLER LOGOUT - NETTOYER LES DONNÉES
ipcMain.handle('logout-account', async () => {
  try {
    // Supprimer les données d'authentification
    store.delete('authData');
    store.delete('authToken');
    store.delete('profiles');
    
    // Déconnecter Discord RPC si actif
    if (discordRPC && discordRPC.isConnected) {
      try {
        await discordRPC.disconnect();
      } catch (e) {
        console.log('[i] Discord already disconnected');
      }
    }
    
    console.log('✅ Compte déconnecté');
    return { success: true };
  } catch (error) {
    console.error('Erreur logout:', error);
    return { success: false, error: error.message };
  }
});

// ✅ REMPLACER L'ANCIEN HANDLER
ipcMain.on('return-to-login', (event) => {
  console.log('📡 Signal return-to-login reçu');
  
  // Fermer les paramètres s'ils sont ouverts
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
  
  // Afficher et focus la fenêtre principale
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('return-to-login');
  }
});

ipcMain.on('minimize-settings-window', () => {
  if (settingsWindow) settingsWindow.minimize();
});

ipcMain.on('maximize-settings-window', () => {
  if (settingsWindow) {
    settingsWindow.isMaximized() ? settingsWindow.unmaximize() : settingsWindow.maximize();
  }
});

ipcMain.on('close-settings-window', () => {
  if (settingsWindow) settingsWindow.close();
});

// ✅ TOGGLE FULLSCREEN
ipcMain.on('toggle-fullscreen', (event, isFullscreen) => {
  if (mainWindow) {
    if (isFullscreen) {
      mainWindow.maximize();
    } else {
      mainWindow.unmaximize();
    }
  }
});

// ✅ HANDLERS POUR LA FENÊTRE DE LOGS
ipcMain.on('minimize-logs-window', () => {
  if (logsWindow && !logsWindow.isDestroyed()) logsWindow.minimize();
});

ipcMain.on('maximize-logs-window', () => {
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.isMaximized() ? logsWindow.unmaximize() : logsWindow.maximize();
  }
});

ipcMain.on('close-logs-window', () => {
  if (logsWindow && !logsWindow.isDestroyed()) logsWindow.close();
});

ipcMain.on('open-folder', (event, folderPath) => {
  shell.openPath(folderPath);
});

// ✅ TERMS OF SERVICE - GET ACCEPTANCE
ipcMain.handle('get-tos-acceptance', async () => {
  try {
    const tosAccepted = store.get('tosAccepted', false);
    return tosAccepted;
  } catch (error) {
    console.error('Erreur get-tos-acceptance:', error);
    return false;
  }
});

// ✅ TERMS OF SERVICE - ACCEPT
ipcMain.handle('accept-tos', async () => {
  try {
    store.set('tosAccepted', true);
    console.log('✅ TOS Acceptées');
    return { success: true };
  } catch (error) {
    console.error('Erreur accept-tos:', error);
    return { success: false, error: error.message };
  }
});

// ✅ UPDATES - FONCTION POUR EXTRAIRE LA VERSION DU NOM DE RELEASE
function extractVersionFromReleaseName(releaseName) {
  // Cherche un pattern comme "v3.0.0" ou "3.0.0" dans le nom
  const versionRegex = /v?(\d+\.\d+\.\d+)/i;
  const match = releaseName.match(versionRegex);
  return match ? match[1] : null;
}

// ✅ UPDATES - VÉRIFIER ET INSTALLER AUTOMATIQUEMENT
async function checkUpdatesAndInstall() {
  try {
    const pkg = require('../../package.json');
    const currentVersion = pkg.version;
    
    // Récupérer les releases
    const response = await fetch('https://api.github.com/repos/pharos-off/minecraft-launcher/releases', {
      headers: { 'User-Agent': 'CraftLauncher' }
    });
    
    if (!response.ok) {
      return { hasUpdate: false, error: 'GitHub API unavailable' };
    }
    
    const releases = await response.json();
    
    // Chercher la dernière release stable
    let latestRelease = null;
    let latestVersion = null;
    
    for (const release of releases) {
      if (!release.draft && !release.prerelease && release.assets && release.assets.length > 0) {
        const version = extractVersionFromReleaseName(release.name);
        if (version) {
          latestRelease = release;
          latestVersion = version;
          break;
        }
      }
    }
    
    if (!latestRelease || !latestVersion) {
      return { hasUpdate: false, error: 'No release found' };
    }
    
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    
    if (!hasUpdate) {
      return { hasUpdate: false };
    }
    
    // Nouvelle version trouvée! Télécharger et installer
    console.log(`\n🎉 Nouvelle version disponible: v${latestVersion}`);
    
    const exeAsset = latestRelease.assets.find(a => a.name.endsWith('.exe'));
    if (!exeAsset) {
      return { hasUpdate: true, error: 'No .exe file found' };
    }
    
    const downloadUrl = exeAsset.browser_download_url;
    const fileName = exeAsset.name;
    const updatePath = path.join(os.tmpdir(), fileName);
    
    console.log(`📥 Téléchargement v${latestVersion}...`);
    const downloadResponse = await fetch(downloadUrl);
    
    if (!downloadResponse.ok) {
      return { hasUpdate: true, error: 'Download failed' };
    }
    
    const buffer = await downloadResponse.buffer();
    fs.writeFileSync(updatePath, buffer);
    
    console.log(`✓ ${fileName} téléchargé (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
    console.log('🚀 Installation automatique en cours...\n');
    
    // Lancer l'installateur
    const { spawn } = require('child_process');
    spawn(updatePath, [], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    
    // Quitter l'app
    setTimeout(() => {
      app.quit();
    }, 500);
    
    return { hasUpdate: true, installed: true };
  } catch (error) {
    console.error('❌ Erreur auto-update:', error.message);
    return { hasUpdate: false, error: error.message };
  }
}

// ✅ UPDATES - STOCKAGE DES DONNÉES DE MISE À JOUR
let latestUpdateData = null;

// ✅ UPDATES - CHECK FOR UPDATES
ipcMain.handle('check-updates', async () => {
  try {
    const pkg = require('../../package.json');
    const currentVersion = pkg.version;
    
    console.log(`[o] Checking for updates (Current: v${currentVersion})...`);
    
    // Récupérer les 5 dernières releases
    const response = await fetch('https://api.github.com/repos/pharos-off/minecraft-launcher/releases', {
      headers: { 'User-Agent': 'CraftLauncher' }
    });
    
    if (!response.ok) {
      console.log('⚠️ Impossible de vérifier les mises à jour (API GitHub)');
      return { 
        hasUpdate: false, 
        currentVersion: currentVersion,
        latestVersion: currentVersion,
        error: 'Impossible de contacter GitHub'
      };
    }
    
    const releases = await response.json();
    
    // Chercher la dernière release stable (pas prerelease)
    let latestRelease = null;
    let latestVersion = null;
    
    for (const release of releases) {
      if (!release.draft && !release.prerelease && release.assets && release.assets.length > 0) {
        const version = extractVersionFromReleaseName(release.name);
        if (version) {
          latestRelease = release;
          latestVersion = version;
          break;
        }
      }
    }
    
    if (!latestRelease || !latestVersion) {
      console.log('⚠️ Aucune release stable trouvée');
      return { 
        hasUpdate: false, 
        currentVersion: currentVersion,
        latestVersion: currentVersion,
        error: 'Aucune release trouvée'
      };
    }
    
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    
    // Chercher le fichier .exe
    const exeAsset = latestRelease.assets.find(a => a.name.endsWith('.exe'));
    
    if (!exeAsset) {
      console.log('⚠️ Aucun fichier .exe trouvé');
      return { 
        hasUpdate: false, 
        currentVersion: currentVersion,
        latestVersion: currentVersion,
        error: 'Fichier d\'installation non trouvé'
      };
    }
    
    // Stocker les données pour l'installation
    latestUpdateData = {
      hasUpdate: hasUpdate,
      currentVersion: currentVersion,
      latestVersion: latestVersion,
      downloadUrl: exeAsset.browser_download_url,
      fileName: exeAsset.name,
      releaseNotes: latestRelease.body,
      releaseName: latestRelease.name
    };
    
    if (hasUpdate) {
      console.log(`✅ Nouvelle version disponible: v${latestVersion}`);
    } else {
      console.log('[v] You are using the latest version');
    }
    
    return latestUpdateData;
  } catch (error) {
    console.error('❌ Erreur check-updates:', error);
    return { 
      hasUpdate: false, 
      currentVersion: 'unknown',
      latestVersion: 'unknown',
      error: `Erreur: ${error.message}`
    };
  }
});

// ✅ UPDATES - INSTALL UPDATE
ipcMain.handle('install-update', async () => {
  try {
    if (!latestUpdateData || !latestUpdateData.downloadUrl) {
      console.log('⚠️ Pas de mise à jour disponible');
      return { success: false, error: 'Aucune mise à jour trouvée. Vérifiez d\'abord.' };
    }
    
    console.log(`📥 Téléchargement v${latestUpdateData.latestVersion}...`);
    const updatePath = path.join(os.tmpdir(), latestUpdateData.fileName);
    
    // Télécharger la mise à jour
    const response = await fetch(latestUpdateData.downloadUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(updatePath, buffer);
    
    console.log(`✓ ${latestUpdateData.fileName} téléchargé (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
    console.log('🚀 Lancement de l\'installateur...');
    
    // Exécuter l'installateur en mode détaché
    const { spawn } = require('child_process');
    spawn(updatePath, [], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    
    // Fermer l'app après un délai
    setTimeout(() => {
      console.log('🔄 Fermeture de l\'application...');
      app.quit();
    }, 500);
    
    return { success: true, message: `Installation de v${latestUpdateData.latestVersion} en cours...` };
  } catch (error) {
    console.error('❌ Erreur install-update:', error);
    latestUpdateData = null;
    return { success: false, error: error.message };
  }
});

// ✅ COMPARE VERSIONS (simple version comparison)
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.handle('get-mods', async () => {
  try {
    const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
      return [];
    }
    
    const files = fs.readdirSync(modsPath);
    const mods = files
      .filter(file => file.endsWith('.jar'))
      .map(file => {
        const filePath = path.join(modsPath, file);
        const stat = fs.statSync(filePath);
        
        // Extraire le nom du mod (sans l'extension .jar)
        const name = file.replace('.jar', '');
        const parts = name.split('-');
        
        return {
          id: file,
          name: name,
          version: parts[parts.length - 1] || 'Unknown',
          size: stat.size,
          enabled: true,
          filePath: filePath
        };
      });
    
    return mods;
  } catch (error) {
    console.error('Erreur get-mods:', error);
    return [];
  }
});

// ✅ MODS MANAGER - DELETE MOD
ipcMain.handle('delete-mod', async (event, modId) => {
  try {
    const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
    const modPath = path.join(modsPath, modId);
    
    if (fs.existsSync(modPath)) {
      fs.unlinkSync(modPath);
      return { success: true };
    }
    return { success: false, error: 'Fichier non trouvé' };
  } catch (error) {
    console.error('Erreur delete-mod:', error);
    return { success: false, error: error.message };
  }
});

// ✅ MODS MANAGER - OPEN MODS FOLDER
ipcMain.handle('open-mods-folder', async () => {
  try {
    const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }
    
    shell.openPath(modsPath);
    return { success: true };
  } catch (error) {
    console.error('Erreur open-mods-folder:', error);
    return { success: false, error: error.message };
  }
});

// ✅ MODS MANAGER - IMPORT MOD
ipcMain.handle('import-mod', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner un mod à importer',
      defaultPath: os.homedir(),
      filters: [
        { name: 'Fichiers JAR', extensions: ['jar'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    });
    
    if (!result.canceled) {
      const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
      
      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(modsPath)) {
        fs.mkdirSync(modsPath, { recursive: true });
      }
      
      // Copier les fichiers
      result.filePaths.forEach(filePath => {
        const fileName = path.basename(filePath);
        const destPath = path.join(modsPath, fileName);
        fs.copyFileSync(filePath, destPath);
      });
      
      return { success: true, count: result.filePaths.length };
    }
    return { success: false };
  } catch (error) {
    console.error('Erreur import-mod:', error);
    return { success: false, error: error.message };
  }
});

// ✅ MODS MANAGER - MODRINTH API INTEGRATION
ipcMain.handle('get-curseforge-mods', async () => {
  try {
    const cached = store.get('modrinth-mods-cache', null);
    const cacheTime = store.get('modrinth-mods-time', 0);
    
    // Si le cache est valide (moins de 2 heures), le retourner immédiatement
    if (cached && Array.isArray(cached) && cached.length > 0 && Date.now() - cacheTime < 120 * 60 * 1000) {
      console.log(`✓ ${cached.length} mods chargés depuis le cache`);
      // Ajouter les mods "À venir" s'ils ne sont pas déjà dans le cache
      const comingSoonMods = getComingSoonMods();
      const allMods = [...cached, ...comingSoonMods.filter(cm => !cached.some(m => m.id === cm.id))];
      return allMods;
    }

    console.log('📥 Récupération des mods depuis Modrinth API...');

    // Mods populaires à récupérer depuis Modrinth
    const modQueries = [
      'sodium', 'fabric-api', 'lithium', 'iris', 'create', 'modmenu', 'jei', 'noisium',
      'ae2', 'origins', 'botania', 'immersive-engineering', 'tinkers-construct', 'thaumcraft',
      'just-enough-resources', 'waila', 'ars-nouveau', 'blood-magic', 'craftable-horse-armour',
      'dynamictrees', 'emendatus-enigmatica', 'engineersdecor', 'ftb-chunks', 'glamour',
      'immersiveportals', 'jade', 'journeymap', 'lazy-dfu', 'modular-routers', 'mtr-fabric',
      'realspeaker', 'sodium-extra', 'stoneholm', 'supplementaries', 'tetra', 'tower',
      'universal-graves', 'villager-names', 'visual-workbench', 'waystones', 'yungs-api'
    ];

    const mods = [];
    let successCount = 0;
    
    for (const query of modQueries) {
      try {
        await delay(300);
        const mod = await fetchModWithRetry(query, 1);
        if (mod) {
          mods.push(mod);
          successCount++;
        }
      } catch (error) {
        console.error(`⚠️ ${query}: ${error.message}`);
      }
    }

    if (mods.length === 0) {
      console.log('⚠️ Aucun mod trouvé, utilisation du cache par défaut');
      return getDefaultMods();
    }

    // Ajouter les mods "À venir" à la fin
    const comingSoonMods = getComingSoonMods();
    const allMods = [...mods, ...comingSoonMods];

    store.set('modrinth-mods-cache', allMods);
    store.set('modrinth-mods-time', Date.now());
    
    console.log(`✓ ${allMods.length} mods chargés depuis Modrinth (dont ${comingSoonMods.length} à venir)`);
    return allMods;
  } catch (error) {
    console.error('Erreur get-curseforge-mods:', error);
    return getDefaultMods();
  }
});

// ✅ CHARGER PLUS DE MODS
ipcMain.handle('get-more-mods', async () => {
  try {
    // Mods supplémentaires à charger avec "Charger plus"
    const additionalModQueries = [
      'ae2', 'origins', 'botania', 'immersive-engineering', 'tinkers-construct', 'thaumcraft',
      'just-enough-resources', 'waila', 'ars-nouveau', 'blood-magic', 'craftable-horse-armour',
      'dynamictrees', 'emendatus-enigmatica', 'engineersdecor', 'ftb-chunks', 'glamour',
      'immersiveportals', 'jade', 'journeymap', 'lazy-dfu', 'modular-routers', 'mtr-fabric',
      'realspeaker', 'sodium-extra', 'stoneholm', 'supplementaries', 'tetra', 'tower',
      'universal-graves', 'villager-names', 'visual-workbench', 'waystones', 'yungs-api'
    ];

    const mods = [];
    
    // Charger 10 mods à la fois pour ne pas surcharger l'API
    const modsToLoad = additionalModQueries.slice(modsLoadedCount, modsLoadedCount + 10);
    
    for (const query of modsToLoad) {
      try {
        await delay(300);
        const mod = await fetchModWithRetry(query, 1);
        if (mod) {
          mods.push(mod);
        }
      } catch (error) {
        console.error(`⚠️ ${query}: ${error.message}`);
      }
    }

    // Incrémenter le compteur pour la prochaine fois
    modsLoadedCount += 10;

    // Sauvegarder tous les mods chargés en cache pour l'installation
    const allCachedMods = store.get('modrinth-mods-cache', []);
    const combinedMods = [...allCachedMods, ...mods];
    store.set('modrinth-mods-cache', combinedMods);

    console.log(`✓ ${mods.length} mods supplémentaires chargés`);
    return mods;
  } catch (error) {
    console.error('Erreur get-more-mods:', error);
    return [];
  }
});

// Fonction pour charger les mods depuis Modrinth avec retry et délai
async function fetchModWithRetry(query, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'User-Agent': 'CraftLauncher/3.0.0' },
        timeout: 5000
      });
      
      if (!response.ok) {
        const status = response.status;
        if ((status === 503 || status === 429) && i < retries - 1) {
          const delay_ms = 1000 * (i + 1);
          console.warn(`⚠️ API ${status} pour ${query}, retry dans ${delay_ms}ms`);
          await delay(delay_ms);
          continue;
        }
        throw new Error(`HTTP ${status}`);
      }
      
      const data = await response.json();
      
      if (data.hits && data.hits.length > 0) {
        const mod = data.hits[0];
        return {
          id: mod.project_id,
          name: mod.title,
          author: mod.author,
          description: mod.description || 'Aucune description',
          icon: mod.icon_url || null,
          gameVersions: mod.latest_version || '1.20.4',
          downloads: mod.downloads || 0,
          modrinthId: mod.project_id,
          modrinthUrl: mod.project_url,
          category: mod.categories?.[0] || 'gameplay'
        };
      }
      
      return null;
    } catch (error) {
      if (i < retries - 1) {
        const delay_ms = 1000 * (i + 1);
        await delay(delay_ms);
      } else {
        console.error(`❌ Impossible de charger ${query}: ${error.message}`);
        throw error;
      }
    }
  }
}

function getDefaultMods() {
  return [
    { id: 'sodium', name: 'Sodium', author: 'CaffeineMC', description: 'Optimisation graphiques pour Fabric', icon: '📦', gameVersions: '1.16.5 - 1.21+', downloads: 50000000, modrinthId: 'sodium', category: 'optimization' },
    { id: 'fabric-api', name: 'Fabric API', author: 'FabricMC', description: 'API pour mods Fabric', icon: '📦', gameVersions: '1.14+', downloads: 30000000, modrinthId: 'fabric-api', category: 'library' },
    { id: 'lithium', name: 'Lithium', author: 'CaffeineMC', description: 'Optimisation performances', icon: '📦', gameVersions: '1.15 - 1.21+', downloads: 20000000, modrinthId: 'lithium', category: 'optimization' },
    { id: 'iris', name: 'Iris Shaders', author: 'IrisShaders', description: 'Support shaders Fabric', icon: '🌈', gameVersions: '1.16.5 - 1.21+', downloads: 15000000, modrinthId: 'iris', category: 'render' },
    { id: 'create', name: 'Create', author: 'simibubi', description: 'Machines et mécanismes', icon: '⚙️', gameVersions: '1.16.5 - 1.21', downloads: 10000000, modrinthId: 'create', category: 'technology' },
    { id: 'modmenu', name: 'Mod Menu', author: 'TerraformersMC', description: 'Gestionnaire de mods', icon: '📋', gameVersions: '1.16 - 1.21+', downloads: 25000000, modrinthId: 'modmenu', category: 'utility' },
    { id: 'jei', name: 'Just Enough Items', author: 'mezz', description: 'Recettes et inventaire', icon: '🔍', gameVersions: '1.12 - 1.21+', downloads: 35000000, modrinthId: 'jei', category: 'utility' },
    { id: 'noisium', name: 'Noisium', author: 'Steveplays28', description: 'Génération terrain optimisée', icon: '🌍', gameVersions: '1.18.2 - 1.21+', downloads: 8000000, modrinthId: 'noisium', category: 'optimization' },
  ];
}

function getComingSoonMods() {
  return [];
}

// URLs de fallback pour les mods populaires (en cas d'API indisponible)
function getModFallbackUrl(modId) {
  const fallbackUrls = {
    'sodium': 'https://cdn.modrinth.com/data/AANobbMI/versions/f89a12c1/download',
    'AANobbMI': 'https://cdn.modrinth.com/data/AANobbMI/versions/f89a12c1/download',
    'fabric-api': 'https://cdn.modrinth.com/data/P7dR8mSH/versions/latest/download',
    'P7dR8mSH': 'https://cdn.modrinth.com/data/P7dR8mSH/versions/latest/download',
    'lithium': 'https://cdn.modrinth.com/data/gvQK8ZW2/versions/latest/download',
    'gvQK8ZW2': 'https://cdn.modrinth.com/data/gvQK8ZW2/versions/latest/download',
    'iris': 'https://cdn.modrinth.com/data/YL57xq9U/versions/latest/download',
    'YL57xq9U': 'https://cdn.modrinth.com/data/YL57xq9U/versions/latest/download',
  };
  return fallbackUrls[modId] || null;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

ipcMain.handle('get-installed-mods', async () => {
  try {
    const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
    
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(modsPath);
    const installedMods = files.filter(f => f.endsWith('.jar')).map(file => {
      const filePath = path.join(modsPath, file);
      const stats = fs.statSync(filePath);
      
      return {
        id: file.replace('.jar', ''),
        name: file.replace('.jar', '').replace(/-\d+\.\d+\.\d+/, ''),
        version: '3.0.0',
        size: Math.round(stats.size / (1024 * 1024)), // En MB
        path: filePath
      };
    });

    return installedMods;
  } catch (error) {
    console.error('Erreur get-installed-mods:', error);
    return [];
  }
});

ipcMain.handle('get-mod-details', async (event, { modId }) => {
  try {
    // Essayer de récupérer depuis Modrinth avec retry
    for (let i = 0; i < 2; i++) {
      try {
        const response = await fetch(`https://api.modrinth.com/v2/search?query=${modId}&limit=1`, {
          headers: { 'User-Agent': 'CraftLauncher/3.0.0' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
          const mod = data.hits[0];
          
          // Récupérer les versions
          const versionsResponse = await fetch(`https://api.modrinth.com/v2/project/${mod.project_id}/versions?limit=1`, {
            headers: { 'User-Agent': 'CraftLauncher/3.0.0' }
          });
          
          const versions = await versionsResponse.json();
          const latestVersion = versions[0];

          return {
            id: mod.project_id,
            name: mod.title,
            description: mod.description,
            author: mod.author,
            version: latestVersion?.name || '3.0.0',
            gameVersions: latestVersion?.game_versions?.join(', ') || '1.20.4',
            size: latestVersion?.files?.[0]?.size ? `${Math.round(latestVersion.files[0].size / (1024 * 1024))} MB` : '10-50 MB',
            dependencies: [],
            url: mod.project_url,
            downloads: mod.downloads,
            modrinthId: mod.project_id
          };
        }
        
        break; // Succès, ne pas retry
      } catch (error) {
        if (i < 1) {
          await delay(1000);
        } else {
          throw error;
        }
      }
    }

    // Fallback
    return { 
      name: 'Mod Inconnu',
      description: 'Informations non disponibles',
      author: 'Unknown',
      gameVersions: '1.20.4',
      dependencies: [],
      url: 'https://modrinth.com'
    };
  } catch (error) {
    console.error('Erreur get-mod-details:', error);
    return { 
      name: 'Erreur', 
      description: 'Impossible de charger les détails', 
      author: 'System', 
      gameVersions: '', 
      dependencies: [], 
      url: '' 
    };
  }
});

ipcMain.handle('install-mod', async (event, { modId }) => {
  try {
    console.log(`📥 Installation du mod: ${modId}`);
    
    const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
    
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }

    let mod = null;
    let versions = null;
    let downloadFile = null;
    let apiSucceeded = false;

    // Étape 1: Chercher le mod sur Modrinth avec retry aggressif
    console.log(`🔍 Recherche du mod: ${modId}`);
    for (let i = 0; i < 4; i++) {
      try {
        const searchResponse = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(modId)}&limit=1`, {
          headers: { 'User-Agent': 'CraftLauncher/3.0.0' },
          timeout: 5000
        });
        
        if (!searchResponse.ok) {
          const status = searchResponse.status;
          if (status === 503 || status === 429) {
            // Service Unavailable ou Rate Limit
            if (i < 3) {
              const delay_ms = 2000 * (i + 1);
              console.warn(`⚠️ API ${status} - Retry dans ${delay_ms}ms...`);
              await delay(delay_ms);
              continue;
            }
          }
          throw new Error(`HTTP ${status}`);
        }
        
        const searchData = await searchResponse.json();
        if (searchData.hits && searchData.hits.length > 0) {
          mod = searchData.hits[0];
          console.log(`✅ ${mod.title} trouvé sur Modrinth`);
          apiSucceeded = true;
          break;
        }
      } catch (error) {
        if (i < 3) {
          const delay_ms = 2000 * (i + 1);
          console.warn(`⏳ Tentative ${i + 1}/4 échouée - Retry dans ${delay_ms}ms:`, error.message);
          await delay(delay_ms);
        } else {
          console.warn(`⚠️ API indisponible, tentative fallback...`);
        }
      }
    }

    // Fallback: Si API fail, utiliser les données de cache
    if (!mod) {
      // Chercher dans le cache d'abord
      const cachedMods = store.get('modrinth-mods-cache', []);
      mod = cachedMods.find(m => m.modrinthId === modId || m.id === modId);
      
      // Si pas dans le cache, chercher dans les mods par défaut
      if (!mod) {
        const defaultMods = getDefaultMods();
        mod = defaultMods.find(m => m.modrinthId === modId || m.id === modId);
      }
      
      if (!mod) {
        return { success: false, error: 'Mod introuvable - Vérifier la connexion' };
      }
      console.log(`💾 Utilisation données cache pour: ${mod.name}`);
    }

    // Étape 2: Récupérer les versions
    if (apiSucceeded) {
      console.log(`📥 Récupération des versions...`);
      for (let i = 0; i < 4; i++) {
        try {
          const versionsResponse = await fetch(`https://api.modrinth.com/v2/project/${mod.project_id}/versions?limit=10`, {
            headers: { 'User-Agent': 'CraftLauncher/3.0.0' },
            timeout: 5000
          });
          
          if (!versionsResponse.ok) {
            const status = versionsResponse.status;
            if (status === 503 || status === 429) {
              if (i < 3) {
                const delay_ms = 2000 * (i + 1);
                console.warn(`⚠️ API ${status} - Retry dans ${delay_ms}ms...`);
                await delay(delay_ms);
                continue;
              }
            }
            throw new Error(`HTTP ${status}`);
          }
          versions = await versionsResponse.json();
          apiSucceeded = versions && versions.length > 0;
          break;
        } catch (error) {
          if (i < 3) {
            const delay_ms = 2000 * (i + 1);
            console.warn(`⏳ Versions retry ${i + 1}/4:`, error.message);
            await delay(delay_ms);
          }
        }
      }
    }

    // Étape 3: Trouver le fichier à télécharger
    if (versions && versions.length > 0) {
      // Chercher une version avec des fichiers valides
      for (const version of versions) {
        if (!version.files || version.files.length === 0) continue;
        
        // Chercher un fichier .jar valide
        const jarFile = version.files.find(f => f.filename && f.filename.endsWith('.jar') && f.url);
        if (jarFile) {
          downloadFile = jarFile;
          break;
        }
      }
    }

    if (!downloadFile || !downloadFile.url) {
      console.warn(`⚠️ Pas de fichier trouvé sur API...`);
      
      // Si API n'a pas réussi, on ne peut pas continuer
      if (!apiSucceeded) {
        return { success: false, error: 'Mod indisponible actuellement - L\'API Modrinth ne répond pas. Réessayez dans quelques instants.' };
      }
    }

    // Étape 4: Télécharger le fichier
    if (downloadFile && downloadFile.url) {
      console.log(`🔗 Téléchargement: ${downloadFile.filename}`);
      
      let buffer = null;
      for (let i = 0; i < 4; i++) {
        try {
          const response = await fetch(downloadFile.url, {
            headers: { 'User-Agent': 'CraftLauncher/3.0.0' },
            timeout: 30000
          });
          
          if (!response.ok) {
            const status = response.status;
            if (status === 503 || status === 429) {
              if (i < 3) {
                const delay_ms = 3000 * (i + 1);
                console.warn(`⚠️ Téléchargement ${status} - Retry dans ${delay_ms}ms...`);
                await delay(delay_ms);
                continue;
              }
            }
            throw new Error(`HTTP ${status}`);
          }
          
          buffer = await response.buffer();
          break;
        } catch (error) {
          console.warn(`⏳ Téléchargement retry ${i + 1}/4:`, error.message);
          if (i < 3) {
            const delay_ms = 3000 * (i + 1);
            await delay(delay_ms);
          } else {
            throw error;
          }
        }
      }

      if (!buffer) {
        return { success: false, error: 'Impossible de télécharger le fichier' };
      }

      // Écrire le fichier
      const modPath = path.join(modsPath, downloadFile.filename);
      if (fs.existsSync(modPath)) {
        return { success: true, message: `${mod.title} est déjà installé` };
      }

      fs.writeFileSync(modPath, buffer);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ ${mod.title} installé (${sizeMB} MB)`);
      return { success: true, message: `${mod.title} installé (${sizeMB} MB)` };
    } else {
      return { success: false, error: 'Fichier indisponible - Réessayer plus tard' };
    }
  } catch (error) {
    console.error('❌ Erreur install-mod:', error.message);
    return { success: false, error: `Erreur: ${error.message}` };
  }
});

ipcMain.handle('uninstall-mod', async (event, { modId }) => {
  try {
    console.log(`🗑️ Désinstallation du mod: ${modId}`);
    
    const modsPath = path.join(os.homedir(), '.minecraft', 'mods');
    
    // Chercher le fichier du mod
    if (fs.existsSync(modsPath)) {
      const files = fs.readdirSync(modsPath);
      
      for (const file of files) {
        if (file.toLowerCase().includes(modId.toLowerCase()) && file.endsWith('.jar')) {
          const modPath = path.join(modsPath, file);
          fs.unlinkSync(modPath);
          console.log(`✓ Mod ${file} désinstallé`);
          return { success: true, message: `Mod désinstallé` };
        }
      }
    }

    return { success: false, error: 'Mod non trouvé' };
  } catch (error) {
    console.error('Erreur uninstall-mod:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-mod-config', async (event, { modId }) => {
  try {
    const configPath = path.join(os.homedir(), '.minecraft', 'config', modId);
    
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }

    shell.openPath(configPath);
    return configPath;
  } catch (error) {
    console.error('Erreur open-mod-config:', error);
    return null;
  }
});

ipcMain.handle('refresh-curseforge-cache', async () => {
  try {
    store.delete('modrinth-mods-cache');
    store.delete('modrinth-mods-time');
    console.log('✓ Cache Modrinth actualisé');
    return { success: true, message: 'Cache actualisé' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('maximize-window', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});

ipcMain.on('close-window', () => {
  discordRPC.disconnect();
  mainWindow.close();
});

ipcMain.on('open-external', (event, url) => {
  require('electron').shell.openExternal(url);
});