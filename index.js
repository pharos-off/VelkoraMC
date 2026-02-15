const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const MinecraftLauncher = require('./minecraft-launcher');
const MicrosoftAuth = require('./microsoft-auth');
const DiscordPresence = require('./discord-rpc');
const setupDiscordHandlers = require('./discord-handler');
const LauncherVersion = require('./launcher-version.js');
const { setSettingsWindow, broadcastDiscordStatus, updateDiscordReference } = require('./discord-handler');
let _msAuthInstance = null;

const si = require('systeminformation');
const fetch = require('node-fetch');
const mc = require('minecraft-protocol');
const fs = require('fs');
const os = require('os');


const LAUNCHER_VERSION = '3.1.57';
const LAUNCHER_BUILD = '20250214';
const LAUNCHER_NAME = 'CraftLauncher';
const __emojiMap = {
  '✅': '[OK]',
  '❌': '[ERR]',
  '⚠️': '[WARN]',
  '⚠': '[WARN]',
  '⏳': '[WAIT]',
  '🔗': '[LINK]',
  '🔌': '[DISC]',
  '🔧': '[CFG]',
  '📡': '[NET]',
  '🔄': '[RETRY]',
  '🧪': '[TEST]',
  '📦': '[PKG]',
  '📥': '[DL]',
  '🏠': '[HOME]',
  '🎮': '[PLAY]',
  '🌐': '[NET]',
  '👤': '[USER]',
  '🧹': '[CLEAN]',
  '⏱️': '[TIME]',
  '🚀': '[LAUNCH]',
  '✓': '[OK]'
};
function __sanitizeText(t) {
  if (typeof t !== 'string') return t;
  let out = t;
  for (const k in __emojiMap) {
    if (out.includes(k)) out = out.split(k).join(__emojiMap[k]);
  }
  return out;
}
const __origConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};
console.log = (...args) => __origConsole.log.apply(console, args.map(__sanitizeText));
console.info = (...args) => __origConsole.info.apply(console, args.map(__sanitizeText));
console.warn = (...args) => __origConsole.warn.apply(console, args.map(__sanitizeText));
console.error = (...args) => __origConsole.error.apply(console, args.map(__sanitizeText));
console.log(`🚀 ${LAUNCHER_NAME} v${LAUNCHER_VERSION} (Build ${LAUNCHER_BUILD})`);

// Chemins pour les mods
const MODS_DIR = path.join(app.getPath('userData'), 'mods');
const MODS_DB_FILE = path.join(app.getPath('userData'), 'mods.json');

// S'assurer que le dossier mods existe
function initModsDirectory() {
  try {
    if (!fs.existsSync(MODS_DIR)) {
      fs.mkdirSync(MODS_DIR, { recursive: true });
      console.log('📁 Mods folder created:', MODS_DIR);
    }
  } catch (error) {
    console.error('Error creating mods folder:', error);
  }
}

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
let logsWindow = null;
let discordRPC = null;
let _discordCleaned = false;
let minecraftRunning = false;
let lastLaunchAttempt = 0;
// Ignorer certaines erreurs bénignes lors de l’extinction (race Discord RPC)
process.on('uncaughtException', (err) => {
  try {
    if (err && (err.code === 'ERR_STREAM_WRITE_AFTER_END' || /write after end/i.test(err.message || ''))) {
      console.warn('Ignored shutdown error:', err.message || err);
      return;
    }
  } catch (_) {}
  throw err;
});
const LAUNCH_COOLDOWN = 1000;
let modsLoadedCount = 0;
let currentLogs = [];

// ✅ CONFIGURER LES HANDLERS IPC IMMÉDIATEMENT
updateDiscordReference(discordRPC);
setupDiscordHandlers(null, store, null);
console.log('✅ Discord IPC handlers registered');

function createWindow() {
  const iconPath = path.join(__dirname, "../../assets/icon.ico");
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

  mainWindow.on('closed', () => {    
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, "../../assets/icon.ico");

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

  // Mettre à jour la référence dans discord-handler
  setSettingsWindow(settingsWindow);

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

  const iconPath = path.join(__dirname, "../../assets/icon.ico");

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
          height: 40px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 30, 50, 0.9) 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.15);
          display: flex;
          align-items: center;
          padding: 0 12px;
          -webkit-app-region: drag;
          user-select: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .titlebar-title {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .titlebar-buttons {
          display: flex;
          gap: 10px;
          -webkit-app-region: no-drag;
          align-items: center;
        }

        .titlebar-button {
          width: 36px;
          height: 36px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.15);
          color: #cbd5e1;
          cursor: pointer;
          font-size: 14px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          -webkit-app-region: no-drag;
          user-select: none;
        }
        .titlebar-button:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.3);
          color: #f1f5f9;
          transform: translateY(-1px);
        }
        .titlebar-button:active {
          transform: translateY(0);
          background: rgba(99, 102, 241, 0.15);
        }
        .titlebar-button.minimize:hover {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.25);
          color: #4ade80;
        }
        .titlebar-button.maximize:hover {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.25);
          color: #60a5fa;
        }
        .titlebar-button.close:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #ff6b6b;
        }
        .titlebar-button.close:active {
          background: rgba(239, 68, 68, 0.25);
        }
      </style>
    </head>
    <body>
      <div class="titlebar">
        <div class="titlebar-title">🎮 Mission Control / ${LAUNCHER_NAME} with ${os.version}</div>
        <div class="titlebar-buttons">
          <button class="titlebar-button minimize" id="minimize-btn" title="Réduire">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="titlebar-button maximize" id="maximize-btn" title="Agrandir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
          <button class="titlebar-button close" id="close-btn" title="Fermer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
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
/*
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
*/
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
    console.error('Error retrieving account:', error);
    return { success: false, error: error.message };
  }
});

async function initializeDiscord() {
  try {
    console.log('🎮 Initializing Discord RPC...');
    
    // Créer l'instance Discord
    discordRPC = new DiscordPresence({
      clientId: '1459481513513975971',
      autoReconnect: true,
      reconnectDelay: 5000,
      maxReconnectAttempts: 10
    });

    // Charger les paramètres
    discordRPC.updateRPCSettings({
      showStatus: store.get('discord.showStatus', true),
      showDetails: store.get('discord.showDetails', true),
      showImage: store.get('discord.showImage', true)
    });

    // ✅ METTRE À JOUR LA RÉFÉRENCE DISCORD DANS LES HANDLERS
    const { updateDiscordReference } = require('./discord-handler');
    updateDiscordReference(discordRPC);

    // Écouter les événements (géré maintenant dans updateDiscordReference)
    // Mais on garde le setLauncher ici
    discordRPC.on('connected', (user) => {
      console.log('✅ Discord connected:', user.username);
      const authData = store.get('authData');
      if (authData) {
        discordRPC.setLauncher(authData.username || 'Joueur');
      }
    });

    // Se connecter avec retries
    setTimeout(async () => {
      const success = await discordRPC.initializeWithRetry(3, 2000);
      if (success) {
        console.log('✅ Discord RPC initialized successfully');
      } else {
        console.log('⚠️ Discord RPC failed to initialize (Discord may not be running)');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Erreur initialisation Discord:', error);
  }
}

// ==================== APP LIFECYCLE ====================

// Initialiser Discord au démarrage de l'app
app.whenReady().then(async () => {
  // ... ton code existant ...
  
  // Initialiser Discord RPC
  const discordEnabled = store.get('discord.rpcEnabled', true);
  if (discordEnabled) {
    await initializeDiscord();
  }
  
  // ... reste de ton code ...
});

// Nettoyer Discord à la fermeture
app.on('before-quit', async () => {
  try {
    if (discordRPC && !_discordCleaned) {
      _discordCleaned = true;
      try { await discordRPC.destroy(); } catch (e) { console.error('Discord destroy error:', e?.message || e); }
    }
  } catch (e) {
    // ignorer toute erreur de fermeture
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== EXPORTS (si nécessaire) ====================

// Exporter discordRPC pour l'utiliser ailleurs dans ton app
module.exports = {
  getDiscordRPC: () => discordRPC,
  initializeDiscord
};

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
  initModsDirectory();
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
        console.log('✅ Automatic update in progress...');
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
    if (!_msAuthInstance) {
      _msAuthInstance = new MicrosoftAuth();
    }
    const result = await _msAuthInstance.authenticate();
    
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
    const gameDir = settings.gameDirectory || path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
    
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
    console.error('Error retrieving storage:', error);
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
    const gameDir = settings.gameDirectory || path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
    
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
    const gameDir = settings.gameDirectory || path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
    
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
    console.log(`✅ Cache cleared: ${clearedMB} MB`);
    
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
    console.error('Error retrieving notifications:', error);
    return { success: false, error: error.message };
  }
});

// ✅ NOTIFICATIONS - SAUVEGARDER
ipcMain.handle('save-notification-settings', async (event, settings) => {
  try {
    store.set('notificationSettings', settings);
    console.log('✅ Notification settings saved');
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
      body: `Ceci est un test de notification ${LAUNCHER_NAME}`,
      icon: path.join(__dirname, "../../assets/icon.ico")
    });

    notif.show();
    
    console.log('✅ Test notification sent');
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
    console.log('✅ Notification settings reset');
    return { success: true };
  } catch (error) {
    console.error('Error resetting notifications:', error);
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
  console.log(`✅ Session registered: ${newSession.durationMinutes}min`);
  
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
    
    console.log(`✅ Connected in offline mode: ${username}`);
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
  console.log(`✅ Profile created: ${newProfile.name}`);
  
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
  console.log(`✅ Profile deleted: ${profileId}`);
  
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
  console.log(`✅ Profile duplicated: ${duplicated.name}`);
  
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
  console.log(`✅ Profile renamed: ${newName}`);
  
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
  console.log(`✅ Version updated: ${version}`);
  
  return { success: true, profile };
});

// Paramètres
ipcMain.handle('get-settings', async () => {
  return store.get('settings', {
    ramAllocation: 4,
    javaPath: 'java',
    gameDirectory: path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft'),
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
    console.log('='.repeat(60));
    console.log('🚀 LANCEMENT MINECRAFT');
    console.log('='.repeat(60));
    console.log('Profile:', profile);
    console.log('Server:', serverIP);
    console.log('LauncherVersion:', typeof LauncherVersion !== 'undefined' ? LauncherVersion.version : 'UNDEFINED');
    
    // ✅ VÉRIFICATION 1: LauncherVersion existe
    if (typeof LauncherVersion === 'undefined') {
      console.error('❌ ERREUR CRITIQUE: LauncherVersion non défini');
      return {
        success: false,
        error: 'Erreur de configuration du launcher. Veuillez redémarrer.'
      };
    }

    // ✅ VÉRIFICATION 2: Cooldown entre lancements
    const now = Date.now();
    if (now - lastLaunchAttempt < LAUNCH_COOLDOWN) {
      console.warn('⚠️ Cooldown actif');
      return {
        success: false,
        error: 'Veuillez attendre avant de relancer'
      };
    }
    lastLaunchAttempt = now;

    // ✅ VÉRIFICATION 3: Minecraft déjà en cours
    if (minecraftRunning) {
      console.warn('⚠️ Minecraft déjà en cours');
      return {
        success: false,
        error: 'Minecraft est déjà en cours d\'exécution !'
      };
    }

    // ✅ VÉRIFICATION 4: Authentification
    const authData = store.get('authData', null);
    if (!authData) {
      console.error('❌ Pas de données d\'authentification');
      return {
        success: false,
        error: 'Veuillez vous connecter d\'abord'
      };
    }
    console.log('✅ Auth:', authData.type, '-', authData.username);

    // ✅ VÉRIFICATION 5: Mode offline - version doit exister
    const settings = store.get('settings', {});
    const gameDir = settings.gameDirectory || path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
    
    if (authData.type === 'offline') {
      const versionPath = path.join(gameDir, 'versions', profile.version);
      
      console.log('📂 Vérification version offline:', versionPath);
      
      if (!fs.existsSync(versionPath)) {
        console.error('❌ Version non trouvée en mode offline');
        return {
          success: false,
          error: `⚠️ Version ${profile.version} non trouvée.\n\nEn mode hors ligne, vous devez télécharger les versions via une connexion Microsoft d'abord, ou utiliser une version déjà installée.`
        };
      }
      console.log('✅ Version trouvée');
    }

    // ✅ MARQUER COMME EN COURS
    minecraftRunning = true;
    console.log('🎮 Minecraft marqué comme en cours de lancement');

    // ✅ OUVRIR LA FENÊTRE DE LOGS
    try {
      createLogsWindow();
      currentLogs = [];
      console.log('📋 Fenêtre de logs ouverte');
    } catch (error) {
      console.warn('⚠️ Impossible d\'ouvrir la fenêtre de logs:', error.message);
    }

    // ✅ INITIALISER LE LAUNCHER
    const launcher = new MinecraftLauncher();
    console.log('✅ Launcher initialisé');

    try {
      // ✅ LANCER MINECRAFT
      console.log('🚀 Lancement en cours...');
      
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
          
          // Log de progression
          console.log(`📊 ${progress.type}: ${progress.percent}%`);
        }
      });

      console.log('✅ Résultat lancement:', result);

      // ✅ METTRE À JOUR DISCORD RPC (avec vérification)
      if (discordRPC && discordRPC.connected) {
        try {
          console.log('📡 Mise à jour Discord RPC...');
          await discordRPC.setPlaying(profile.version);
          console.log('✅ Discord RPC mis à jour');
        } catch (error) {
          console.error('⚠️ Erreur Discord RPC:', error.message);
          // Ne pas bloquer le lancement si Discord échoue
        }
      } else {
        console.log('⚠️ Discord RPC non disponible (normal si Discord fermé)');
      }
      
      console.log('='.repeat(60));
      console.log('✅ LANCEMENT TERMINÉ');
      console.log('='.repeat(60));
      
      return {
        success: result.success !== false,
        message: result.error ? `Erreur: ${result.error}` : 'Minecraft lancé avec succès !'
      };

    } catch (launchError) {
      console.error('❌ Erreur lors du lancement:', launchError);
      console.error('Stack:', launchError.stack);
      
      // ✅ Réinitialiser l'état
      minecraftRunning = false;
      
      return {
        success: false,
        error: `Erreur de lancement: ${launchError.message}`
      };
      
    } finally {
      // ✅ Réinitialiser après un délai
      setTimeout(() => {
        console.log('🧹 Nettoyage après lancement');
        minecraftRunning = false;
        
        // Discord RPC: remettre en idle
        if (discordRPC && discordRPC.connected) {
          discordRPC.setIdle().catch(err => {
            console.warn('⚠️ Erreur Discord setIdle:', err.message);
          });
        }
        
        // Garbage collection si disponible
        if (global.gc) {
          global.gc();
        }
      }, 5000);
    }

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ ERREUR CRITIQUE HANDLER LAUNCH');
    console.error('='.repeat(60));
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60));
    
    minecraftRunning = false;
    
    return {
      success: false,
      error: `Erreur critique: ${error.message}`
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
      console.log('📁 Minecraft directory set:', result.filePaths[0]);
      return { success: true, path: result.filePaths[0] };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error selecting directory:', error);
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

// Tête du joueur
ipcMain.handle('get-player-head', async (event, username) => {
  try {
    const headUrl = `https://mc-heads.net/avatar/${username}/128`;
    return { success: true, url: headUrl };
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

// ✅ HANDLER FOR DISCONNECTION FROM SETTINGS
ipcMain.on('logout-from-settings', (event) => {
  console.log('📡 Logout signal received from settings');
  
  // Close settings immediately
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
  
  // Verify that the main window exists and is visible
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    
    // Send the signal to the main window
    mainWindow.webContents.send('logout-from-settings');
    console.log('✅ Signal sent to main window');
  } else {
    console.error('❌ Main window not found');
  }
});

// ✅ HANDLER LOGOUT - NETTOYER LES DONNÉES
ipcMain.handle('logout-account', async () => {
  try {
    // Delete authentication data
    store.delete('authData');
    store.delete('authToken');
    store.delete('profiles');
    
    // Disconnect Discord RPC if active
    if (discordRPC && discordRPC.isConnected) {
      try {
        await discordRPC.disconnect();
      } catch (e) {
        console.log('[i] Discord already disconnected');
      }
    }
    
    // Fermer la fenêtre des paramètres si elle est ouverte
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
      settingsWindow = null;
    }
    
    // Forcer la fenêtre principale à afficher la page de login
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.webContents.send('logout-from-settings');
    }
    
    console.log('✅ Account disconnected');
    return { success: true };
  } catch (error) {
    console.error('Erreur logout:', error);
    return { success: false, error: error.message };
  }
});

// ✅ REPLACE OLD HANDLER
ipcMain.on('return-to-login', (event) => {
  console.log('📡 Return to login signal received');
  
  // Close settings if they are open
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
  
  // Show and focus the main window
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

// ✅ UPDATES - FONCTION POUR EXTRAIRE LA VERSION DU NOM DE RELEASE
function extractVersionFromReleaseName(releaseName) {
  // Cherche un pattern comme "v3.1.57" ou "3.1.57" dans le nom
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
    
    // New version found! Download and install
    console.log(`\n🎉 New version available: v${latestVersion}`);
    
    const exeAsset = latestRelease.assets.find(a => a.name.endsWith('.exe'));
    if (!exeAsset) {
      return { hasUpdate: true, error: 'No .exe file found' };
    }
    
    const downloadUrl = exeAsset.browser_download_url;
    const fileName = exeAsset.name;
    const updatePath = path.join(os.tmpdir(), fileName);
    
    console.log(`📥 Downloading v${latestVersion}...`);
    const downloadResponse = await fetch(downloadUrl);
    
    if (!downloadResponse.ok) {
      return { hasUpdate: true, error: 'Download failed' };
    }
    
    const buffer = await downloadResponse.buffer();
    fs.writeFileSync(updatePath, buffer);
    
    console.log(`✓ ${fileName} downloaded (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
    console.log('🚀 Automatic installation in progress...\n');
    
    // Launch the installer
    const { spawn } = require('child_process');
    spawn(updatePath, [], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    
    // Quit the app
    setTimeout(() => {
      app.quit();
    }, 500);
    
    return { hasUpdate: true, installed: true };
  } catch (error) {
    console.error('❌ Auto-update error:', error.message);
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
      headers: { 'User-Agent': '${LAUNCHER_NAME}' }
    });
    
    if (!response.ok) {
      console.log('⚠️ Unable to check for updates (GitHub API)');
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
      console.log('⚠️ No stable release found');
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
      console.log('⚠️ No .exe file found');
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
      console.log(`✅ New version available: v${latestVersion}`);
    } else {
      console.log('[v] You are using the latest version');
    }
    
    return latestUpdateData;
  } catch (error) {
    console.error('❌ Check-updates error:', error);
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
      console.log('⚠️ No update available');
      return { success: false, error: 'No update found. Check first.' };
    }
    
    console.log(`📥 Downloading v${latestUpdateData.latestVersion}...`);
    const updatePath = path.join(os.tmpdir(), latestUpdateData.fileName);
    
    // Download the update
    const response = await fetch(latestUpdateData.downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(updatePath, buffer);
    
    console.log(`✓ ${latestUpdateData.fileName} downloaded (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
    console.log('🚀 Launching the installer...');
    
    // Run the installer in detached mode
    const { spawn } = require('child_process');
    spawn(updatePath, [], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    
    // Close the app after a delay
    setTimeout(() => {
      console.log('🔄 Closing application...');
      app.quit();
    }, 500);
    
    return { success: true, message: `Installation of v${latestUpdateData.latestVersion} in progress...` };
  } catch (error) {
    console.error('❌ Install-update error:', error);
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

// Charger la base de données des mods
function loadModsDB() {
  try {
    if (fs.existsSync(MODS_DB_FILE)) {
      return JSON.parse(fs.readFileSync(MODS_DB_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Erreur lecture mods DB:', error);
  }
  return [];
}

// Sauvegarder la base de données des mods
function saveModsDB(mods) {
  try {
    fs.writeFileSync(MODS_DB_FILE, JSON.stringify(mods, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde mods DB:', error);
    return false;
  }
}

// Formater la taille du fichier
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 📥 Récupérer tous les mods installés
ipcMain.handle('get-installed-mods', async () => {
  try {
    return loadModsDB();
  } catch (error) {
    console.error('Erreur get-installed-mods:', error);
    return [];
  }
});

// Variable globale pour éviter les imports multiples
let importInProgress = false;

// ➕ Import mods (KEEP NAME import-mod)
ipcMain.handle('import-mod', async () => {
  // Avoid multiple calls
  if (importInProgress) {
    console.log('⚠️ Import already in progress, ignored');
    return { success: false, message: 'Import already in progress' };
  }

  try {
    importInProgress = true;
    const { dialog } = require('electron');
    
    // Create mods folder
    if (!fs.existsSync(MODS_DIR)) {
      fs.mkdirSync(MODS_DIR, { recursive: true });
    }
    
    const result = await dialog.showOpenDialog({
      title: 'Select a mod (.jar)',
      filters: [
        { name: 'JAR Files', extensions: ['jar'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'Import cancelled' };
    }

    const mods = loadModsDB();
    let importedCount = 0;
    const errors = [];

    for (const sourcePath of result.filePaths) {
      const fileName = path.basename(sourcePath);
      console.log(`\n📦 Import: ${fileName}`);

      try {
        const targetPath = path.join(MODS_DIR, fileName);

        // Check if already exists
        if (mods.find(m => m.fileName === fileName)) {
          console.log(`   ⚠ Already exists`);
          continue;
        }

        // Copy the file
        console.log(`   → Copying...`);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`   ✅ Copy successful`);

        // Vérifier que la copie a réussi
        if (!fs.existsSync(targetPath)) {
          errors.push(`${fileName}: Copie échouée`);
          continue;
        }

        // Get the stats of the copied file
        const fileStats = fs.statSync(targetPath);

        // Add to database
        const newMod = {
          id: Date.now() + importedCount,
          name: fileName.replace('.jar', '').replace(/\s*\(\d+\)$/, ''),
          fileName: fileName,
          version: 'N/A',
          size: formatFileSize(fileStats.size),
          enabled: true,
          importedAt: new Date().toISOString(),
          path: targetPath
        };

        mods.push(newMod);
        importedCount++;
        console.log(`   ✅ Mod added to database`);

      } catch (error) {
        console.error(`   ✗ Error:`, error);
        errors.push(`${fileName}: ${error.message}`);
      }
    }

    if (importedCount > 0) {
      saveModsDB(mods);
    }

    let message = importedCount > 0 
      ? `${importedCount} mod(s) imported` 
      : 'No mods imported';
    
    if (errors.length > 0) {
      message += `\n\nErrors:\n${errors.join('\n')}`;
    }

    return {
      success: importedCount > 0,
      message: message,
      count: importedCount
    };

  } catch (error) {
    console.error('❌ Import-mod error:', error);
    return { success: false, message: error.message };
  } finally {
    // Reset the flag after a short delay
    setTimeout(() => {
      importInProgress = false;
      console.log('✅ Import completed, flag reset');
    }, 1000);
  }
});

// 🗑️ Delete a mod
ipcMain.handle('delete-mod', async (event, modId) => {
  try {
    console.log('🗑️ Deleting mod backend, ID:', modId);
    
    const mods = loadModsDB();
    const modIndex = mods.findIndex(m => m.id === modId);

    if (modIndex === -1) {
      console.error('❌ Mod not found, ID:', modId);
      return { success: false, message: 'Mod not found' };
    }

    const mod = mods[modIndex];
    console.log('📦 Mod found:', mod.name);

    // Delete the physical file
    if (fs.existsSync(mod.path)) {
      fs.unlinkSync(mod.path);
      console.log('✅ File deleted:', mod.path);
    } else {
      console.warn('⚠️ File already absent:', mod.path);
    }

    // Remove from database
    mods.splice(modIndex, 1);
    saveModsDB(mods);
    console.log('✅ Mod removed from database');

    return { success: true, message: 'Mod deleted successfully' };

  } catch (error) {
    console.error('❌ Delete-mod error:', error);
    return { success: false, message: error.message };
  }
});

// 🔄 Enable/Disable a mod
ipcMain.handle('toggle-mod', async (event, { modId, enabled }) => {
  try {
    const mods = loadModsDB();
    const mod = mods.find(m => m.id === modId);

    if (!mod) {
      return { success: false, message: 'Mod not found' };
    }

    mod.enabled = enabled;
    
    // Renommer le fichier pour le désactiver/activer
    const currentPath = mod.path;
    const newPath = enabled 
      ? currentPath.replace('.disabled', '')
      : currentPath + '.disabled';

    if (fs.existsSync(currentPath)) {
      fs.renameSync(currentPath, newPath);
      mod.path = newPath;
    }

    saveModsDB(mods);

    return { 
      success: true, 
      message: enabled ? 'Mod activé' : 'Mod désactivé' 
    };

  } catch (error) {
    console.error('Erreur toggle-mod:', error);
    return { success: false, message: error.message };
  }
});

// 🔍 Obtenir les détails d'un mod
ipcMain.handle('get-mod-details', async (event, modId) => {
  try {
    const mods = loadModsDB();
    const mod = mods.find(m => m.id === modId);

    if (!mod) {
      return { success: false, message: 'Mod introuvable' };
    }

    return { success: true, mod };

  } catch (error) {
    console.error('Erreur get-mod-details:', error);
    return { success: false, message: error.message };
  }
});

// 🧹 Nettoyer les mods orphelins (fichiers sans entrée DB)
ipcMain.handle('cleanup-mods', async () => {
  try {
    const mods = loadModsDB();
    const files = fs.readdirSync(MODS_DIR).filter(f => f.endsWith('.jar'));
    
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(MODS_DIR, file);
      const existsInDB = mods.some(m => m.fileName === file);

      if (!existsInDB) {
        fs.unlinkSync(filePath);
        cleanedCount++;
      }
    }

    return { 
      success: true, 
      message: `${cleanedCount} fichier(s) orphelin(s) supprimé(s)` 
    };

  } catch (error) {
    console.error('Erreur cleanup-mods:', error);
    return { success: false, message: error.message };
  }
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
