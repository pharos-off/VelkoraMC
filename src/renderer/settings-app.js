const { ipcRenderer } = require('electron');

let originalSettings = {};
let currentSettings = {};

// ✅ ÉCOUTER LES SIGNAUX DE NAVIGATION
ipcRenderer.on('navigate-to-tab', (event, tabName) => {
  setTimeout(() => {
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton) {
      tabButton.click();
      console.log(`✅ Navigation vers l'onglet: ${tabName}`);
    }
  }, 300);
});

async function loadSettings() {
  try {
    const settings = await ipcRenderer.invoke('get-settings');
    originalSettings = JSON.parse(JSON.stringify(settings));
    currentSettings = JSON.parse(JSON.stringify(settings));
    
    setTimeout(() => {
      const gameDirInput = document.getElementById('game-dir-input');
      const discordToggle = document.getElementById('discord-rpc-toggle');
      const fullscreenToggle = document.getElementById('fullscreen-toggle');
      const ramSlider = document.getElementById('ram-slider');
      const ramValue = document.getElementById('ram-value');
      
      if (gameDirInput) gameDirInput.value = settings.gameDirectory || '';
      if (discordToggle) discordToggle.checked = settings.discordRPC || false;
      if (fullscreenToggle) fullscreenToggle.checked = settings.fullscreen || false;
      if (ramSlider) {
        ramSlider.value = settings.ramAllocation || 4;
        if (ramValue) ramValue.textContent = `${ramSlider.value} GB`;
      }
    }, 100);
  } catch (error) {
    console.error('Erreur chargement parametres:', error);
  }
}

async function loadAccountInfo() {
  try {
    const accountInfo = await ipcRenderer.invoke('get-account-info');
    const accountNameEl = document.getElementById('account-username');
    const accountEmailEl = document.getElementById('account-email');
    const accountStatusEl = document.getElementById('account-status');
    
    if (accountInfo && accountInfo.username) {
      if (accountNameEl) accountNameEl.textContent = accountInfo.username;
      if (accountEmailEl) accountEmailEl.textContent = accountInfo.email || 'N/A';
      if (accountStatusEl) accountStatusEl.innerHTML = '<span style="color: #10b981;">✓ En ligne</span>';
    } else {
      if (accountStatusEl) accountStatusEl.innerHTML = '<span style="color: #ef4444;">✗ Pas connecte</span>';
    }
  } catch (error) {
    console.error('Erreur chargement compte:', error);
  }
}

// ✅ CACHE POUR LES INFOS DE STOCKAGE
let storageInfoCache = null;
let lastStorageLoadTime = 0;
const STORAGE_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

async function loadStorageInfo() {
  try {
    const now = Date.now();
    
    // Ne recharger que toutes les 5 minutes
    if (storageInfoCache && (now - lastStorageLoadTime) < STORAGE_CACHE_TIME) {
      displayStorageInfo(storageInfoCache);
      return;
    }
    
    const storageInfo = await ipcRenderer.invoke('get-storage-info');
    
    if (storageInfo && storageInfo.success) {
      storageInfoCache = storageInfo;
      lastStorageLoadTime = now;
      displayStorageInfo(storageInfo);
    }
  } catch (error) {
    console.error('Erreur chargement stockage:', error);
  }
}

function displayStorageInfo(storageInfo) {
  const gamePathEl = document.getElementById('storage-game-path');
  const totalSizeEl = document.getElementById('storage-total-size');
  const usedSpaceEl = document.getElementById('storage-used-space');
  const freeSpaceEl = document.getElementById('storage-free-space');
  const progressBarEl = document.getElementById('storage-progress');
  
  if (gamePathEl) gamePathEl.textContent = storageInfo.gamePath;
  if (totalSizeEl) totalSizeEl.textContent = storageInfo.totalGB + ' GB';
  if (usedSpaceEl) usedSpaceEl.textContent = storageInfo.usedGB + ' GB';
  if (freeSpaceEl) freeSpaceEl.textContent = storageInfo.freeGB + ' GB';
  
  const percentage = (storageInfo.usedGB / storageInfo.totalGB) * 100;
  if (progressBarEl) {
    progressBarEl.style.width = percentage + '%';
    progressBarEl.textContent = percentage.toFixed(1) + '%';
    
    if (percentage > 90) {
      progressBarEl.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    } else if (percentage > 70) {
      progressBarEl.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    } else {
      progressBarEl.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }
  }
}

async function loadNotificationSettings() {
  try {
    const notifSettings = await ipcRenderer.invoke('get-notification-settings');
    
    const launchNotifToggle = document.getElementById('launch-notif-toggle');
    const downloadNotifToggle = document.getElementById('download-notif-toggle');
    const updateNotifToggle = document.getElementById('update-notif-toggle');
    const errorNotifToggle = document.getElementById('error-notif-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    if (notifSettings) {
      if (launchNotifToggle) launchNotifToggle.checked = notifSettings.launchNotif !== false;
      if (downloadNotifToggle) downloadNotifToggle.checked = notifSettings.downloadNotif !== false;
      if (updateNotifToggle) updateNotifToggle.checked = notifSettings.updateNotif !== false;
      if (errorNotifToggle) errorNotifToggle.checked = notifSettings.errorNotif !== false;
      if (soundToggle) soundToggle.checked = notifSettings.sound !== false;
      if (volumeSlider) volumeSlider.value = notifSettings.volume || 50;
      if (volumeValue) volumeValue.textContent = (notifSettings.volume || 50) + '%';
    }
  } catch (error) {
    console.error('Erreur chargement notifications:', error);
  }
}

async function loadDiscordSettings() {
  try {
    const discordSettings = await ipcRenderer.invoke('get-discord-settings');
    
    const rpcToggle = document.getElementById('discord-rpc-main-toggle');
    const statusToggle = document.getElementById('discord-status-toggle');
    const detailsToggle = document.getElementById('discord-details-toggle');
    const imageToggle = document.getElementById('discord-image-toggle');
    const connectionStatusEl = document.getElementById('discord-connection-status');
    
    if (discordSettings) {
      if (rpcToggle) rpcToggle.checked = discordSettings.rpcEnabled !== false;
      if (statusToggle) statusToggle.checked = discordSettings.showStatus !== false;
      if (detailsToggle) detailsToggle.checked = discordSettings.showDetails !== false;
      if (imageToggle) imageToggle.checked = discordSettings.showImage !== false;
      
      if (connectionStatusEl) {
        if (discordSettings.isConnected) {
          connectionStatusEl.innerHTML = '<span style="color: #10b981;">✓ Connecte</span>';
        } else {
          connectionStatusEl.innerHTML = '<span style="color: #ef4444;">✗ Deconnecte</span>';
        }
      }
    }
  } catch (error) {
    console.error('Erreur chargement Discord:', error);
  }
}


function setupSearchFunctionality() {
  const searchInput = document.querySelector('.search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
      document.querySelectorAll('.menu-category').forEach(btn => {
        btn.style.display = 'flex'; // ✅ CHANGE 'block' EN 'flex'
      });
      return;
    }

    const tabKeywords = {
      'game': ['game', 'jeu', 'minecraft', 'option', 'version'],
      'general': ['general', 'parametres', 'ram', 'memoire', 'repertoire', 'dossier', 'discord', 'integration', 'allocation'],
      'account': ['account', 'compte', 'utilisateur', 'email', 'profil', 'deconnexion', 'authentification'],
      'storage': ['storage', 'stockage', 'espace', 'disque', 'cache', 'dossier', 'minecraft', 'libre'],
      'notifications': ['notifications', 'notification', 'alerte', 'son', 'volume', 'lancement', 'telechargement', 'mise', 'jour', 'erreur'],
      'discord': ['discord', 'rpc', 'presence', 'statut', 'rich', 'connexion', 'connection'],
      'about': ['about', 'apropos', 'version', 'developpeur', 'licence', 'technologie', 'fonctionnalite', 'information']
    };

    document.querySelectorAll('.menu-category').forEach(btn => {
      const tabName = btn.dataset.tab;
      const keywords = tabKeywords[tabName] || [];
      const btnText = btn.textContent.toLowerCase();
      
      const matches = keywords.some(keyword => keyword.includes(searchTerm)) ||
                      btnText.includes(searchTerm);
      
      btn.style.display = matches ? 'flex' : 'none'; // ✅ CHANGE 'block' EN 'flex'
    });
  });
}

function renderSettings() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="titlebar">
      <div class="titlebar-title">Parametres - CraftLauncher</div>
      <div class="titlebar-buttons">
        <button class="titlebar-button" id="minimize-btn">−</button>
        <button class="titlebar-button" id="maximize-btn">□</button>
        <button class="titlebar-button close" id="close-btn">×</button>
      </div>
    </div>

    <div class="settings-layout">
      <div class="settings-sidebar">
        <div class="settings-search">
          <input type="text" class="search-input" placeholder="Rechercher...">
        </div>
        <div class="settings-menu">
          <button class="menu-category active" data-tab="game">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="1" ry="1"></rect><path d="M12 19v.01"></path></svg></span><span class="menu-text">Game</span>
          </button>
          <button class="menu-category" data-tab="general">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><path d="M12 1v6m0 6v6"></path><path d="M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24"></path><path d="M1 12h6m6 0h6"></path><path d="M4.22 19.78l4.24-4.24m5.08 0l4.24 4.24"></path></svg></span><span class="menu-text">General</span>
          </button>
          <button class="menu-category" data-tab="account">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span><span class="menu-text">Account</span>
          </button>
          <button class="menu-category" data-tab="storage">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2.707.7l-8.646-3.524a2 2 0 0 0-2.153 0l-8.646 3.524A2 2 0 0 1 2 19Zm0 0V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14Z"></path></svg></span><span class="menu-text">Storage</span>
          </button>
          <button class="menu-category" data-tab="notifications">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span><span class="menu-text">Notifications</span>
          </button>
          <button class="menu-category" data-tab="discord">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></span><span class="menu-text">Discord</span>
          </button>
          <button class="menu-category" data-tab="updates">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></span><span class="menu-text">Mises a jour</span>
          </button>
          <button class="menu-category" data-tab="about">
            <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span><span class="menu-text">A propos</span>
          </button>
        </div>

        <div class="settings-footer">
          <p>CraftLauncher v3.0.0</p>
          <p>2026 Tous droits reserves</p>
        </div>
      </div>

      <div class="settings-content">
        <div class="settings-section" id="game-tab">
          <h2>Game Settings</h2>
          <div class="settings-card">
            <h3>Game Options</h3>
            <p style="color: #9ca3af;">Game settings coming soon...</p>
          </div>
        </div>

        <div class="settings-section" id="general-tab" style="display: none;">
          <h2>Parametres generaux</h2>

          <div class="settings-card">
            <h3>Repertoire du jeu</h3>
            <div class="setting-item">
              <label>Chemin du repertoire Minecraft</label>
              <div class="dir-input-group">
                <input type="text" id="game-dir-input" class="input-field" readonly>
                <button id="browse-btn" class="dir-browse-btn">Parcourir</button>
              </div>
              <p class="help-text">Selectionner le dossier de Minecraft</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Integrations</h3>
            <div class="setting-item">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="discord-rpc-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Afficher votre statut sur Discord</span>
              </label>
              <p class="help-text">Permet a Discord de voir si vous jouez a Minecraft</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Affichage</h3>
            <div class="setting-item">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="fullscreen-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Lancer en plein écran</span>
              </label>
              <p class="help-text">Lance le launcher en mode plein écran au démarrage</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Allocation RAM</h3>
            <div class="setting-item">
              <label>Mémoire RAM</label>
              <div style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
                <input type="range" id="ram-slider" min="1" max="16" value="4" style="flex: 1; height: 6px; cursor: pointer;">
                <div style="min-width: 60px; text-align: center;">
                  <span id="ram-value" style="color: #6366f1; font-weight: 600; font-size: 14px;">4 GB</span>
                </div>
              </div>
              <p class="help-text">Allouer entre 1 et 16 GB de RAM pour Minecraft</p>
            </div>
          </div>

          <div class="button-group">
            <button id="save-settings-btn" class="btn-primary">Valider et sauvegarder</button>
            <button id="cancel-settings-btn" class="btn-secondary">Annuler</button>
          </div>
        </div>

        <div class="settings-section" id="account-tab" style="display: none;">
          <h2>Compte</h2>
          <div class="settings-card">
            <h3>Informations du compte</h3>
            <div class="setting-item">
              <label>Nom d'utilisateur</label>
              <p id="account-username" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item">
              <label>Email</label>
              <p id="account-email" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item">
              <label>Statut</label>
              <p id="account-status" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Actions du compte</h3>
            <button id="logout-btn" class="btn-secondary" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none;">
              Se deconnecter
            </button>
            <p class="help-text" style="margin-top: 15px;">Cliquez pour vous deconnecter de votre compte</p>
          </div>
        </div>

        <div class="settings-section" id="storage-tab" style="display: none;">
          <h2>Stockage</h2>
          <div class="settings-card">
            <h3>Informations de stockage</h3>
            <div class="setting-item">
              <label>Chemin du repertoire Minecraft</label>
              <p id="storage-game-path" style="color: #d1d5db; padding: 10px 0; font-weight: 500; word-break: break-all;">Chargement...</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <label>Espace total</label>
              <p id="storage-total-size" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <label>Espace utilisé</label>
              <p id="storage-used-space" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <label>Espace libre</label>
              <p id="storage-free-space" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item" style="margin-top: 25px;">
              <label>Barre de progression</label>
              <div style="width: 100%; height: 30px; background: rgba(99, 102, 241, 0.1); border-radius: 10px; overflow: hidden; margin-top: 10px;">
                <div id="storage-progress" style="height: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 0%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px;"></div>
              </div>
              <p class="help-text">Utilisation de l'espace disque pour Minecraft</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Actions de stockage</h3>
            <div class="setting-item">
              <button id="open-storage-btn" class="btn-primary">Ouvrir le dossier Minecraft</button>
              <p class="help-text" style="margin-top: 15px;">Acceder directement au dossier d'installation</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <button id="refresh-storage-btn" class="btn-secondary">🔄 Rafraîchir les infos</button>
              <p class="help-text" style="margin-top: 15px;">Recalculer l'espace utilisé (peut prendre du temps)</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <button id="clear-cache-btn" class="btn-secondary">Vider le cache</button>
              <p class="help-text" style="margin-top: 15px;">Supprimer les fichiers temporaires (ne supprime pas les mondes)</p>
            </div>
          </div>
        </div>

        <div class="settings-section" id="notifications-tab" style="display: none;">
          <h2>Notifications</h2>
          <div class="settings-card">
            <h3>Types de notifications</h3>
            <div class="setting-item">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="launch-notif-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Notifier au lancement du jeu</span>
              </label>
              <p class="help-text">Vous recevrez une notification quand le jeu sera lance</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="download-notif-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Notifier au telechargement termine</span>
              </label>
              <p class="help-text">Vous recevrez une notification quand les telechargements seront termines</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="update-notif-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Notifier les mises a jour disponibles</span>
              </label>
              <p class="help-text">Vous serez informe lorsque des mises a jour sont disponibles</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="error-notif-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Notifier les erreurs</span>
              </label>
              <p class="help-text">Vous serez averti en cas d'erreur ou de probleme</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Son des notifications</h3>
            <div class="setting-item">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="sound-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Activer le son des notifications</span>
              </label>
              <p class="help-text">Les notifications emetront un son</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label>Volume du son (%)</label>
              <div class="ram-input-group">
                <div class="ram-slider-container">
                  <input type="range" id="volume-slider" class="slider" min="0" max="100" value="50">
                </div>
                <div class="ram-display" id="volume-value">50%</div>
              </div>
              <p class="help-text">Regler le volume du son des notifications</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <button id="test-notif-btn" class="btn-primary">Tester une notification</button>
              <p class="help-text" style="margin-top: 15px;">Cliquez pour tester le son et l'affichage</p>
            </div>
          </div>

          <div class="button-group">
            <button id="save-notif-btn" class="btn-primary">Valider et sauvegarder</button>
            <button id="reset-notif-btn" class="btn-secondary">Reinitialiser par defaut</button>
          </div>
        </div>

        <div class="settings-section" id="discord-tab" style="display: none;">
          <h2>Discord</h2>
          <div class="settings-card">
            <h3>Etat de la connexion</h3>
            <div class="setting-item">
              <label>Statut Discord RPC</label>
              <p id="discord-connection-status" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
              <p class="help-text">Affiche l'etat de connexion a Discord</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Configuration Discord RPC</h3>
            <div class="setting-item">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="discord-rpc-main-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Activer Discord Rich Presence</span>
              </label>
              <p class="help-text">Affiche votre statut de jeu sur Discord</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="discord-status-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Afficher votre statut de jeu</span>
              </label>
              <p class="help-text">Affiche si vous etes en train de jouer, dans le launcher ou hors ligne</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="discord-details-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Afficher les details du jeu</span>
              </label>
              <p class="help-text">Affiche la version de Minecraft et le serveur (si applicable)</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="discord-image-toggle" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;">
                <span>Afficher les images</span>
              </label>
              <p class="help-text">Affiche le logo Minecraft et CraftLauncher dans Discord</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Actions Discord</h3>
            <div class="setting-item">
              <button id="test-discord-btn" class="btn-primary">Tester la connexion Discord</button>
              <p class="help-text" style="margin-top: 15px;">Teste la connexion a Discord et affiche une notification</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <button id="reconnect-discord-btn" class="btn-secondary">Reconnecter Discord</button>
              <p class="help-text" style="margin-top: 15px;">Force la reconnexion a Discord</p>
            </div>
          </div>

          <div class="button-group">
            <button id="save-discord-btn" class="btn-primary">Valider et sauvegarder</button>
            <button id="reset-discord-btn" class="btn-secondary">Reinitialiser par defaut</button>
          </div>
        </div>

        <div class="settings-section" id="updates-tab" style="display: none;">
          <h2>Mises a jour</h2>
          <div class="settings-card">
            <h3>Etat des mises a jour</h3>
            <div class="setting-item">
              <label>Version actuelle</label>
              <p id="current-version" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <label>Derniere version disponible</label>
              <p id="latest-version" style="color: #d1d5db; padding: 10px 0; font-weight: 500;">Chargement...</p>
            </div>
            <div class="setting-item" style="margin-top: 20px;">
              <label>Statut</label>
              <p id="update-status" style="color: #10b981; padding: 10px 0; font-weight: 500;">Verifiant les mises a jour...</p>
            </div>
          </div>

          <div class="settings-card">
            <h3>Actions</h3>
            <div class="setting-item">
              <button id="check-updates-btn" class="btn-primary" style="width: 100%;">Verifier les mises a jour</button>
              <p class="help-text" style="margin-top: 15px;">Clique pour chercher de nouvelles versions disponibles</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <button id="install-update-btn" class="btn-primary" style="width: 100%; background: #10b981; display: none;">Installer la mise a jour</button>
              <p class="help-text" style="margin-top: 15px;">Telecharge et installe la derniere version</p>
            </div>

            <div class="setting-item" style="margin-top: 20px;">
              <div id="update-progress-container" style="display: none;">
                <label>Progression du telechargement</label>
                <div style="width: 100%; height: 30px; background: rgba(99, 102, 241, 0.1); border-radius: 10px; overflow: hidden; margin-top: 10px;">
                  <div id="update-progress-bar" style="height: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 0%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px;">0%</div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <h3>Informations</h3>
            <p style="color: #d1d5db; line-height: 1.8;">
              Le launcher verifiera automatiquement les nouvelles versions au demarrage. 
              Vous pouvez aussi verifier manuellement en cliquant sur le bouton ci-dessus.
            </p>
            <p style="color: #94a3b8; line-height: 1.8; margin-top: 15px;">
              <strong style="color: #6366f1;">Note:</strong> L'application se relancera automatiquement apres l'installation.
            </p>
          </div>
        </div>

        <div class="settings-section" id="about-tab" style="display: none;">
          <h2>A propos</h2>
          <div class="settings-card">
            <h3>CraftLauncher</h3>
            <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 20px;">
              <strong style="color: #6366f1; font-size: 16px;">Version:</strong> 3.0.0<br>
              <strong style="color: #6366f1;">Developpeur:</strong> Pharos<br>
              <strong style="color: #6366f1;">Licence:</strong> CLv1<br>
              <strong style="color: #6366f1;">Plateforme:</strong> Electron + Node.js
            </p>
          </div>

          <div class="settings-card">
            <h3>Description</h3>
            <p style="color: #d1d5db; line-height: 1.8;">
              CraftLauncher est un launcher Minecraft complet et moderne offrant une experience utilisateur exceptionnelle. 
              Le projet combine la puissance d'Electron avec Node.js pour fournir une application de bureau performante et intuitive.
            </p>
          </div>

          <div class="settings-card">
            <h3>Fonctionnalites principales</h3>
            <ul style="color: #d1d5db; line-height: 2; list-style: none; padding: 0;">
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Authentification Microsoft / Mode hors ligne</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Gestion complète des profils</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Support Discord Rich Presence</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Gestion des mods et versions</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Notifications en temps reel</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Gestionnaire de stockage integre</span>
              </li>
              <li style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <span>Interface utilisateur moderne et responsive</span>
              </li>
            </ul>
          </div>

          <div class="settings-card">
            <h3>Technologies utilisees</h3>
            <p style="color: #d1d5db; line-height: 1.8;">
              <strong style="color: #6366f1;">Frontend:</strong> HTML5, CSS3, JavaScript vanilla<br>
              <strong style="color: #6366f1;">Backend:</strong> Node.js, Electron<br>
              <strong style="color: #6366f1;">Base de donnees:</strong> electron-store<br>
              <strong style="color: #6366f1;">Integration:</strong> Discord RPC, Minecraft API
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  // ✅ TITLEBAR BUTTONS
  document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.send('minimize-settings-window');
  });

  document.getElementById('maximize-btn').addEventListener('click', () => {
    ipcRenderer.send('maximize-settings-window');
  });

  document.getElementById('close-btn').addEventListener('click', () => {
    ipcRenderer.send('close-settings-window');
  });

  // ✅ TABS MENU
  document.querySelectorAll('.menu-category').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.menu-category').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
      
      btn.classList.add('active');
      const tabId = btn.dataset.tab + '-tab';
      const section = document.getElementById(tabId);
      if (section) section.style.display = 'block';
    });
  });

  // ✅ SETUP RECHERCHE
  setupSearchFunctionality();

  // ✅ PARCOURIR REPERTOIRE
  const browseBtn = document.getElementById('browse-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', async () => {
      const result = await ipcRenderer.invoke('select-game-directory');
      if (result.success) {
        document.getElementById('game-dir-input').value = result.path;
        currentSettings.gameDirectory = result.path;
      }
    });
  }

  // ✅ DISCORD TOGGLE
  const discordToggle = document.getElementById('discord-rpc-toggle');
  if (discordToggle) {
    discordToggle.addEventListener('change', (e) => {
      currentSettings.discordRPC = e.target.checked;
    });
  }

  // ✅ LOGOUT
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirm = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
      if (confirm) {
        try {
          await ipcRenderer.invoke('logout-account');
          ipcRenderer.send('close-settings-window');
          ipcRenderer.send('logout-from-settings');
          alert('✓ Vous êtes déconnecté');
        } catch (error) {
          alert('✗ Erreur lors de la déconnexion');
        }
      }
    });
  }

  // ✅ STORAGE - OUVRIR DOSSIER
  const openStorageBtn = document.getElementById('open-storage-btn');
  if (openStorageBtn) {
    openStorageBtn.addEventListener('click', async () => {
      await ipcRenderer.invoke('open-minecraft-folder');
    });
  }

  // ✅ STORAGE - RAFRAÎCHIR LES INFOS
  const refreshStorageBtn = document.getElementById('refresh-storage-btn');
  if (refreshStorageBtn) {
    refreshStorageBtn.addEventListener('click', async () => {
      refreshStorageBtn.disabled = true;
      refreshStorageBtn.textContent = '⏳ Calcul en cours...';
      
      // Forcer le cache à expirer
      lastStorageLoadTime = 0;
      storageInfoCache = null;
      
      await loadStorageInfo();
      
      refreshStorageBtn.disabled = false;
      refreshStorageBtn.textContent = '🔄 Rafraîchir les infos';
    });
  }

  // ✅ STORAGE - VIDER CACHE
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      const confirm = window.confirm('Etes-vous sur ? Cela supprimera les fichiers temporaires.');
      if (confirm) {
        const result = await ipcRenderer.invoke('clear-minecraft-cache');
        if (result.success) {
          alert(result.message);
          await loadStorageInfo();
        }
      }
    });
  }

  // ✅ VOLUME SLIDER
  const volumeSlider = document.getElementById('volume-slider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      document.getElementById('volume-value').textContent = e.target.value + '%';
    });
  }

  // ✅ TEST NOTIFICATION
  const testNotifBtn = document.getElementById('test-notif-btn');
  if (testNotifBtn) {
    testNotifBtn.addEventListener('click', async () => {
      try {
        const result = await ipcRenderer.invoke('test-notification');
        console.log('Notification test:', result);
      } catch (error) {
        console.error('Erreur notification:', error);
      }
    });
  }

  // ✅ SAVE NOTIFICATIONS
  const saveNotifBtn = document.getElementById('save-notif-btn');
  if (saveNotifBtn) {
    saveNotifBtn.addEventListener('click', async () => {
      const btn = saveNotifBtn;
      btn.disabled = true;
      btn.textContent = 'Sauvegarde en cours...';

      try {
        const notifSettings = {
          launchNotif: document.getElementById('launch-notif-toggle').checked,
          downloadNotif: document.getElementById('download-notif-toggle').checked,
          updateNotif: document.getElementById('update-notif-toggle').checked,
          errorNotif: document.getElementById('error-notif-toggle').checked,
          sound: document.getElementById('sound-toggle').checked,
          volume: parseInt(document.getElementById('volume-slider').value)
        };

        const result = await ipcRenderer.invoke('save-notification-settings', notifSettings);
        alert('✓ Parametres de notifications sauvegardes !');
      } catch (error) {
        alert('✗ Erreur lors de la sauvegarde');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Valider et sauvegarder';
      }
    });
  }

  // ✅ RESET NOTIFICATIONS
  const resetNotifBtn = document.getElementById('reset-notif-btn');
  if (resetNotifBtn) {
    resetNotifBtn.addEventListener('click', async () => {
      const confirm = window.confirm('Tous les parametres seront restaures aux valeurs par defaut');
      if (confirm) {
        try {
          await ipcRenderer.invoke('reset-notification-settings');
          alert('✓ Notifications reinitialisees !');
          await loadNotificationSettings();
        } catch (error) {
          alert('✗ Erreur');
        }
      }
    });
  }

  // ✅ TEST DISCORD
  const testDiscordBtn = document.getElementById('test-discord-btn');
  if (testDiscordBtn) {
    testDiscordBtn.addEventListener('click', async () => {
      const btn = testDiscordBtn;
      btn.disabled = true;
      btn.textContent = 'Test en cours...';

      try {
        const result = await ipcRenderer.invoke('test-discord-rpc');
        alert(result.success ? '✓ Discord connecté !' : '✗ Discord non disponible');
      } catch (error) {
        alert('✗ Erreur: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Tester la connexion Discord';
      }
    });
  }

  // ✅ RECONNECT DISCORD
  const reconnectDiscordBtn = document.getElementById('reconnect-discord-btn');
  if (reconnectDiscordBtn) {
    reconnectDiscordBtn.addEventListener('click', async () => {
      const btn = reconnectDiscordBtn;
      btn.disabled = true;
      btn.textContent = 'Reconnexion en cours...';

      try {
        const result = await ipcRenderer.invoke('reconnect-discord-rpc');
        if (result.success) {
          alert('✓ Discord reconnecté !');
          await loadDiscordSettings();
        } else {
          alert('✗ Impossible de reconnecter Discord');
        }
      } catch (error) {
        alert('✗ Erreur');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Reconnecter Discord';
      }
    });
  }

  // ✅ SAVE DISCORD
  const saveDiscordBtn = document.getElementById('save-discord-btn');
  if (saveDiscordBtn) {
    saveDiscordBtn.addEventListener('click', async () => {
      const btn = saveDiscordBtn;
      btn.disabled = true;
      btn.textContent = 'Sauvegarde en cours...';

      try {
        const discordSettings = {
          rpcEnabled: document.getElementById('discord-rpc-main-toggle').checked,
          showStatus: document.getElementById('discord-status-toggle').checked,
          showDetails: document.getElementById('discord-details-toggle').checked,
          showImage: document.getElementById('discord-image-toggle').checked
        };

        await ipcRenderer.invoke('save-discord-settings', discordSettings);
        alert('✓ Parametres Discord sauvegardes !');
      } catch (error) {
        alert('✗ Erreur lors de la sauvegarde');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Valider et sauvegarder';
      }
    });
  }

  // ✅ RESET DISCORD
  const resetDiscordBtn = document.getElementById('reset-discord-btn');
  if (resetDiscordBtn) {
    resetDiscordBtn.addEventListener('click', async () => {
      const confirm = window.confirm('Tous les parametres seront restaures aux valeurs par defaut');
      if (confirm) {
        try {
          await ipcRenderer.invoke('reset-discord-settings');
          alert('✓ Parametres Discord reinitialisés !');
          await loadDiscordSettings();
        } catch (error) {
          alert('✗ Erreur');
        }
      }
    });
  }

  // ✅ RAM SLIDER
  const ramSlider = document.getElementById('ram-slider');
  const ramValue = document.getElementById('ram-value');
  if (ramSlider) {
    ramSlider.addEventListener('input', (e) => {
      ramValue.textContent = `${e.target.value} GB`;
    });
  }

  // ✅ SAVE GENERAL SETTINGS
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const btn = saveBtn;
      btn.disabled = true;
      btn.textContent = 'Sauvegarde en cours...';

      try {
        const settings = {
          gameDirectory: document.getElementById('game-dir-input').value,
          discordRPC: document.getElementById('discord-rpc-toggle').checked,
          fullscreen: document.getElementById('fullscreen-toggle').checked,
          ramAllocation: parseInt(document.getElementById('ram-slider').value)
        };

        await ipcRenderer.invoke('save-settings', settings);
        
        // ✅ Si fullscreen est activé, mettre le launcher en fullscreen
        if (settings.fullscreen) {
          ipcRenderer.send('toggle-fullscreen', true);
        } else {
          ipcRenderer.send('toggle-fullscreen', false);
        }
        
        alert('✓ Parametres sauvegardes !');
        setTimeout(() => {
          ipcRenderer.send('close-settings-window');
        }, 300);
      } catch (error) {
        alert('✗ Erreur lors de la sauvegarde');
        btn.disabled = false;
        btn.textContent = 'Valider et sauvegarder';
      }
    });
  }

  // ✅ CANCEL
  const cancelBtn = document.getElementById('cancel-settings-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      ipcRenderer.send('close-settings-window');
    });
  }

  // ✅ UPDATES - CHECK FOR UPDATES
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
      checkUpdatesBtn.disabled = true;
      const originalText = checkUpdatesBtn.textContent;
      checkUpdatesBtn.textContent = '🔄 Vérification en cours...';
      
      const statusEl = document.getElementById('update-status');
      const installBtn = document.getElementById('install-update-btn');
      const versionEl = document.getElementById('latest-version');
      const currentVersionEl = document.getElementById('current-version');
      
      try {
        const result = await ipcRenderer.invoke('check-updates');
        
        if (result.error) {
          statusEl.textContent = `❌ ${result.error}`;
          statusEl.style.color = '#ef4444';
          installBtn.style.display = 'none';
        } else if (result.hasUpdate) {
          statusEl.innerHTML = `<span style="color: #10b981;">✅ Mise à jour disponible!</span><br><small style="color: #cbd5e1;">Vous êtes en v${result.currentVersion}, passer à v${result.latestVersion}</small>`;
          installBtn.style.display = 'block';
          if (versionEl) versionEl.textContent = `v${result.latestVersion}`;
        } else {
          statusEl.innerHTML = `<span style="color: #10b981;">✓ À jour!</span><br><small style="color: #cbd5e1;">Vous utilisez la dernière version (v${result.currentVersion})</small>`;
          installBtn.style.display = 'none';
          if (versionEl) versionEl.textContent = `v${result.latestVersion}`;
        }
        
        if (currentVersionEl) currentVersionEl.textContent = `v${result.currentVersion}`;
      } catch (error) {
        console.error('Erreur check-updates:', error);
        statusEl.textContent = `❌ Erreur: ${error.message}`;
        statusEl.style.color = '#ef4444';
        installBtn.style.display = 'none';
      } finally {
        checkUpdatesBtn.disabled = false;
        checkUpdatesBtn.textContent = originalText;
      }
    });
  }

  // ✅ UPDATES - INSTALL UPDATE
  const installUpdateBtn = document.getElementById('install-update-btn');
  if (installUpdateBtn) {
    installUpdateBtn.addEventListener('click', async () => {
      const confirm = window.confirm('🚀 Installer la mise à jour?\n\nL\'application va redémarrer automatiquement.');
      if (confirm) {
        installUpdateBtn.disabled = true;
        const originalText = installUpdateBtn.textContent;
        installUpdateBtn.textContent = '📥 Téléchargement et installation...';
        document.getElementById('update-status').textContent = '⏳ Installation en cours...';
        document.getElementById('update-status').style.color = '#64748b';
        
        try {
          const result = await ipcRenderer.invoke('install-update');
          if (result.success) {
            document.getElementById('update-status').innerHTML = `<span style="color: #10b981;">✅ Installation en cours</span><br><small>L'application va redémarrer...</small>`;
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.error('Erreur install-update:', error);
          document.getElementById('update-status').textContent = `❌ Erreur: ${error.message}`;
          document.getElementById('update-status').style.color = '#ef4444';
          installUpdateBtn.disabled = false;
          installUpdateBtn.textContent = originalText;
        }
      }
    });
  }

  // ✅ LISTEN FOR UPDATE PROGRESS
  ipcRenderer.on('update-progress', (event, progress) => {
    const progressBar = document.getElementById('update-progress-bar');
    if (progressBar) {
      progressBar.style.width = progress + '%';
      progressBar.textContent = progress + '%';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderSettings();
  await loadSettings();
  await loadAccountInfo();
  // Charger le cache du stockage s'il existe, sinon afficher un message
  if (storageInfoCache) {
    displayStorageInfo(storageInfoCache);
  } else {
    // Afficher un message pour cliquer sur rafraîchir
    const usedSpaceEl = document.getElementById('storage-used-space');
    if (usedSpaceEl) {
      usedSpaceEl.textContent = '- GB';
      usedSpaceEl.parentElement.style.opacity = '0.6';
    }
  }
  await loadNotificationSettings();
  await loadDiscordSettings();
  
  // Load updates info
  const currentVersionEl = document.getElementById('current-version');
  if (currentVersionEl) {
    currentVersionEl.textContent = '3.0.0';
  }
  
  // Auto-check for updates on load
  setTimeout(() => {
    document.getElementById('check-updates-btn')?.click();
  }, 500);
});