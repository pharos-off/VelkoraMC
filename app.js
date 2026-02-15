const { ipcRenderer } = require('electron');
const LauncherFeatures = require('./features.js');
const ModsManager = require('./ModsManager.js');
const LauncherVersion = require('../main/launcher-version.js');
const KeyboardShortcuts = require('../main/keyboard-shortcuts.js');
//const MusicPlayer = require('./radio-player.js');

// Icônes SVG inline
const icons = {
  home: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  globe: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  handshake: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a2 2 0 1 0 3 0 2 2 0 0 0-3 0Z"/><path d="M8 18a2 2 0 1 0 3 0 2 2 0 0 0-3 0Z"/><path d="m9 13-1 8"/><path d="m15 13 1 8"/><path d="m9 13-.753-6.374A2 2 0 0 1 10.185 5h3.63a2 2 0 0 1 1.938 1.626l-.753 6.374"/><path d="M11 11h2"/><path d="M6 11h2"/><path d="M4 7c0-1 1-2 2-2h.5a3 3 0 0 1 2 .88M18 7c0-1-1-2-2-2h-.5a3 3 0 0 0-2 .88"/></svg>',
  newspaper: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
  shoppingCart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
  settings: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  logOut: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  folder: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  messageSquare: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  zap: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  harddrive: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5"/><rect x="2" y="3" width="20" height="8" rx="1" ry="1"/></svg>',
  crown: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2h1M6 4h12M5 7h14M8 10h8M7 14h10M9 18h6"/></svg>`,
  star: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 10.26 24 10.5 18 16.6 20.29 25.5 12 20.92 3.71 25.5 6 16.6 0 10.5 8.91 10.26 12 2"/></polygon></svg>`,
  volume: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a7 7 0 0 1 0 9.9M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  leaf: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 22c7.333 0 11-3.667 11-11S18.333 0 11 0 0 3.667 0 11s3.667 11 11 11z"/></svg>`,
  heart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  globe: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  clipboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  barChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  mods: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
};

class CraftLauncherApp {
  constructor() {
    this.currentView = 'login';
    this.authData = null;
    this.profiles = [];
    this.selectedProfile = null;
    this.settings = {};
    this.maxRam = 16;
    this.friends = [];
    this.news = [];
    this.showAddFriend = false;
    this.listeners = new Map();
    this.playerHead = null;
    this.isLaunching = false; // ✅ Flag pour éviter les doubles lancements
    this.viewChangeListener = null; // ✅ Référence du listener pour cleanup
    this.globalMusicPlayer = null; // ✅ Instance globale du lecteur de musique
    this.modsManager = new ModsManager(this);
    this.shortcuts = new KeyboardShortcuts(this);
  
    // ✅ THÈME PERSONNALISÉ
    this.theme = 'normal'; // 'normal', 'blanc', 'noir', 'custom'
    this.customTheme = {
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#0f172a',
      textColor: '#e2e8f0',
      accentColor: '#10b981'

    };

    this.popularServers = [
      { name: 'Hypixel', ip: 'mc.hypixel.net', description: 'Le plus grand serveur Minecraft', players: '100,000+' },
      { name: 'Mineplex', ip: 'us.mineplex.com', description: 'Mini-jeux variés', players: '15,000+' },
      { name: 'CubeCraft', ip: 'play.cubecraft.net', description: 'Mini-jeux et modes de jeu', players: '20,000+' },
      { name: 'Wynncraft', ip: 'play.wynncraft.com', description: 'MMORPG Minecraft', players: '1,000+' },
      { name: 'The Hive', ip: 'hive.bedrock.gg', description: 'Mini-jeux populaires', players: '8,000+' }
    ];

    this.init();
  }


  /**
   * ✅ NETTOYER LES ANCIENS LISTENERS
   */
  cleanupListeners() {
    if (this.listeners.size > 0) {
      this.listeners.forEach((listener, event) => {
        ipcRenderer.removeListener(event, listener);
      });
      this.listeners.clear();
    }
  }

  /**
   * ✅ AJOUTER UN LISTENER TRACKABLE
   */
  addTrackedListener(event, callback) {
    // Supprimer l'ancien listener s'il existe
    if (this.listeners.has(event)) {
      ipcRenderer.removeListener(event, this.listeners.get(event));
    }
    
    ipcRenderer.on(event, callback);
    this.listeners.set(event, callback);
  }

  async init() {
    // ✅ AFFICHER LE LOADING SCREEN
    const loadingScreen = document.getElementById('loading-screen');
    
    this.features = new LauncherFeatures(this);
    await this.loadData();
    
    this.render();
    //this.setupRadioWidget();
    this.setupEventListeners();
    await this.features.setupProfileEvents();
    
    // ✅ APPLIQUER LE FULLSCREEN SI ACTIVÉ
    if (this.settings && this.settings.fullscreen) {
      setTimeout(() => {
        ipcRenderer.send('toggle-fullscreen', true);
      }, 500);
    }
    
    // ✅ VÉRIFIER LES MISES À JOUR APRÈS LE CHARGEMENT (EN SILENCIEUX)
    setTimeout(async () => {
      try {
        const result = await ipcRenderer.invoke('check-updates');
        if (result.hasUpdate) {
          // Afficher une notification discrète
          const notification = document.createElement('div');
          notification.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); z-index: 5000; font-weight: 600; cursor: pointer; transition: all 0.3s;';
          notification.innerHTML = `✅ Une mise à jour est disponible (v${result.latestVersion})`;
          notification.onmouseover = () => notification.style.transform = 'translateY(-4px)';
          notification.onmouseout = () => notification.style.transform = 'translateY(0)';
          notification.addEventListener('click', () => {
            ipcRenderer.send('open-settings', { tab: 'updates' });
            notification.remove();
          });
          document.body.appendChild(notification);
          
          // Auto-remove après 8 secondes
          setTimeout(() => {
            if (notification.parentElement) notification.remove();
          }, 8000);
        }
      } catch (error) {
        console.log('⚠️ Error checking updates:', error);
      }
    }, 2000);
    
    // ✅ MASQUER LE LOADING SCREEN APRÈS UN DÉLAI
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        // Retirer du DOM après la transition
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 6000);
      }
    }, 6000);
    
    setInterval(() => this.updateFriendsStatus(), 30000);
  }

  async loadData() {
    this.authData = await ipcRenderer.invoke('get-auth-data');
    
    if (this.authData) {

      this.currentView = 'main';
      
      this.playerHead = await ipcRenderer.invoke('get-player-head', this.authData.username);
    }

    this.profiles = await ipcRenderer.invoke('get-profiles');
    this.selectedProfile = this.profiles[0];
    
    this.settings = await ipcRenderer.invoke('get-settings');
    this.maxRam = await ipcRenderer.invoke('get-system-ram');
    this.friends = await ipcRenderer.invoke('get-friends');
    
    // ✅ CHARGER LES PRÉFÉRENCES DE THÈME
    this.loadTheme();
  }

  async updateFriendsStatus() {
    if (this.currentView === 'friends') {
      this.friends = await ipcRenderer.invoke('check-friends-status');
      this.render();
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      // ✅ Boutons titlebar - utiliser .closest() pour gérer les clics sur les SVG enfants
      const minimizeBtn = e.target.closest('#minimize-btn');
      const maximizeBtn = e.target.closest('#maximize-btn');
      const closeBtn = e.target.closest('#close-btn');
      
      if (minimizeBtn) ipcRenderer.send('minimize-window');
      else if (maximizeBtn) ipcRenderer.send('maximize-window');
      else if (closeBtn) ipcRenderer.send('close-window');
      //else if (e.target.id === 'radio-player-btn') this.openRadioPlayer();
      else if (e.target.classList.contains('help-tab-btn')) {
        // Récupérer l'ID de l'onglet et afficher le contenu correspondant
        const tabName = e.target.id.replace('-btn', '');
        document.querySelectorAll('.help-tab-content').forEach(el => el.style.display = 'none');
        const tabContent = document.getElementById(tabName + '-content');
        if (tabContent) tabContent.style.display = 'block';
        
        // Mettre à jour le style des boutons
        document.querySelectorAll('.help-tab-btn').forEach(btn => {
          btn.style.background = 'transparent';
          btn.style.color = '#94a3b8';
        });
        e.target.style.background = 'rgba(99, 102, 241, 0.2)';
        e.target.style.color = '#e2e8f0';
      }
      else if (e.target.classList.contains('bug-report-btn')) {
        // Ouvrir le lien GitHub pour créer un rapport
        ipcRenderer.send('open-external', 'https://github.com/pharos-off/minecraft-launcher/issues/new');
      }
      else if (e.target.classList.contains('pr-request-btn')) {
        // Ouvrir le lien GitHub pour les pull requests
        ipcRenderer.send('open-external', 'https://github.com/pharos-off/minecraft-launcher/pulls');
      }
    });

    // ✅ LISTENER POUR LES MISES À JOUR DE SETTINGS
    this.addTrackedListener('settings-updated', (event, settings) => {
      this.settings = settings;
      
      // Mettre à jour le badge RAM
      const ramBadge = document.getElementById('ram-badge-display');
      if (ramBadge) {
        ramBadge.textContent = `${settings.ramAllocation || 4} GB RAM`;
      }
    });
  }

  render() {
    const app = document.getElementById('app');
    if (!this.authData) {
      this.currentView = 'login';
    }
    if (this.currentView === 'login') {
      app.innerHTML = this.renderLogin();
      this.setupLoginEvents();
    } else {
      // Afficher le layout principal d'abord
      const mainHtml = this.renderMainLayout();
      app.innerHTML = mainHtml;
      
      // ✅ APPLIQUER LE THÈME LIGHT/DARK INITIAL (PARTOUT)
      const theme = localStorage.getItem('theme') || 'dark';
      const accent = localStorage.getItem('accent') || 'indigo';
      
      const root = document.documentElement;
      
      // Ajouter un style global pour forcer les couleurs
      let styleId = 'theme-dynamic-styles';
      let existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
      
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      
      if (theme === 'light') {
        styleEl.textContent = `
          * { color: #000000 !important; }
          .brand-user { color: #000000 !important; }
          .menu-item { color: #000000 !important; }
          .view-title { color: #000000 !important; }
          h1, h2, h3, h4, h5, h6 { color: #000000 !important; }
          p, span, div, label { color: #000000 !important; }
        `;
      }
      document.head.appendChild(styleEl);
      
      // Appliquer sur document et body
      if (theme === 'dark') {
        document.body.style.background = '#0f172a';
        document.body.style.color = '#e2e8f0';
        root.style.setProperty('--bg-dark', '#0f172a');
      } else if (theme === 'light') {
        document.body.style.background = '#f1f5f9';
        document.body.style.color = '#000000';
        root.style.setProperty('--bg-dark', '#f1f5f9');
      }
      
      // Appliquer aussi sur .main-layout et .sidebar
      const mainLayout = document.querySelector('.main-layout');
      const sidebar = document.querySelector('.sidebar');
      const mainContent = document.querySelector('.main-content');
      
      if (mainLayout) {
        if (theme === 'dark') {
          mainLayout.style.background = '#0f172a';
          mainLayout.style.color = '#e2e8f0';
        } else {
          mainLayout.style.background = '#f1f5f9';
          mainLayout.style.color = '#000000';
        }
      }
      
      if (sidebar) {
        if (theme === 'dark') {
          sidebar.style.background = 'rgba(15, 23, 42, 0.8)';
          sidebar.style.color = '#e2e8f0';
        } else {
          sidebar.style.background = 'rgba(241, 245, 249, 0.9)';
          sidebar.style.color = '#000000';
        }
      }
      
      if (mainContent) {
        if (theme === 'dark') {
          mainContent.style.background = '#0f172a';
        } else {
          mainContent.style.background = '#f1f5f9';
        }
      }
      
      const accentColors = {
        indigo: '#6366f1',
        purple: '#a855f7',
        blue: '#3b82f6',
        cyan: '#06b6d4'
      };
      const accentColor = accentColors[accent];
      root.style.setProperty('--color-accent', accentColor);
      
      // Ajouter le style pour l'accent
      let accentStyleId = 'accent-dynamic-styles';
      let accentExistingStyle = document.getElementById(accentStyleId);
      if (accentExistingStyle) accentExistingStyle.remove();
      
      const accentStyleEl = document.createElement('style');
      accentStyleEl.id = accentStyleId;
      accentStyleEl.textContent = `
        .btn-primary { background: ${accentColor} !important; }
        .btn-secondary:hover { border-color: ${accentColor} !important; color: ${accentColor} !important; }
        .accent-option[data-accent="${accent}"] { box-shadow: 0 0 0 3px rgba(255,255,255,0.3) !important; }
        .menu-item.active { color: ${accentColor} !important; }
        a { color: ${accentColor} !important; }
      `;
      document.head.appendChild(accentStyleEl);
      
      // Puis charger le contenu asynchrone
      this.renderContentAsync();
    }
  }

  // ✅ CLEANUP: Nettoyer les ressources avant de changer de vue
  cleanupView() {
    const contentDiv = document.getElementById('main-content-view');
    if (!contentDiv) return;

    // Supprimer les event listeners des anciens éléments
    const oldElements = contentDiv.querySelectorAll('[data-listener]');
    oldElements.forEach(el => {
      el.remove();
    });

    // Nettoyer les références
    contentDiv.innerHTML = '';
    
    // Forcer le garbage collector si disponible
    if (global.gc) {
      global.gc();
    }
  }

  async renderContentAsync() {
    const contentDiv = document.getElementById('main-content-view');
    if (!contentDiv) {
      console.error('main-content-view not found');
      return;
    }

    try {
      // ✅ CLEANUP: Nettoyer l'ancienne vue
      this.cleanupView();
      
      const html = await this.renderCurrentView();
      contentDiv.innerHTML = html;
      
      // ✅ RÉAPPLIQUER LE THÈME APRÈS LE RENDU (sans render() pour éviter boucle)
      const theme = localStorage.getItem('theme') || 'dark';
      const accent = localStorage.getItem('accent') || 'indigo';
      
      const root = document.documentElement;
      
      // Appliquer partout
      const mainLayout = document.querySelector('.main-layout');
      const sidebar = document.querySelector('.sidebar');
      const mainContent = document.querySelector('.main-content');
      
      if (mainLayout) {
        if (theme === 'dark') {
          mainLayout.style.background = '#0f172a';
          mainLayout.style.color = '#e2e8f0';
        } else {
          mainLayout.style.background = '#f1f5f9';
          mainLayout.style.color = '#000000';
        }
      }
      
      if (sidebar) {
        if (theme === 'dark') {
          sidebar.style.background = 'rgba(15, 23, 42, 0.8)';
          sidebar.style.color = '#e2e8f0';
        } else {
          sidebar.style.background = 'rgba(241, 245, 249, 0.9)';
          sidebar.style.color = '#000000';
        }
      }
      
      if (mainContent) {
        if (theme === 'dark') {
          mainContent.style.background = '#0f172a';
        } else {
          mainContent.style.background = '#f1f5f9';
        }
      }
      
      if (theme === 'dark') {
        document.body.style.background = '#0f172a';
        document.body.style.color = '#e2e8f0';
      } else if (theme === 'light') {
        document.body.style.background = '#f1f5f9';
        document.body.style.color = '#000000';
      }
      
      const accentColors = {
        indigo: '#6366f1',
        purple: '#a855f7',
        blue: '#3b82f6',
        cyan: '#06b6d4'
      };
      const accentColor = accentColors[accent];
      root.style.setProperty('--color-accent', accentColor);
      
      // Ajouter le style pour l'accent
      let accentStyleId = 'accent-dynamic-styles';
      let accentExistingStyle = document.getElementById(accentStyleId);
      if (accentExistingStyle) accentExistingStyle.remove();
      
      const accentStyleEl = document.createElement('style');
      accentStyleEl.id = accentStyleId;
      accentStyleEl.textContent = `
        .btn-primary { background: ${accentColor} !important; }
        .btn-secondary:hover { border-color: ${accentColor} !important; color: ${accentColor} !important; }
        .accent-option[data-accent="${accent}"] { box-shadow: 0 0 0 3px rgba(255,255,255,0.3) !important; }
        .menu-item.active { color: ${accentColor} !important; }
        a { color: ${accentColor} !important; }
      `;
      document.head.appendChild(accentStyleEl);
      
      this.setupMainEvents();
    } catch (error) {
      console.error('Erreur rendu contenu:', error);
      contentDiv.innerHTML = `<div style="padding: 20px; color: #ef4444;">Erreur: ${error.message}</div>`;
    }
  }
renderMainLayout() {
    return `
      <div class="titlebar">
        <div class="titlebar-title">${LauncherVersion.getName()}</div>
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

      <div class="main-layout">
        <div class="sidebar">
          <!-- ✅ HEADER SANS PHOTO - Juste le nom -->
          <div class="sidebar-header" style="padding: 24px 20px; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
            <div class="brand-name" style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${LauncherVersion.getName()}</div>
          </div>

          <div class="sidebar-menu">
            <div>
              <button class="menu-item ${this.currentView === 'main' ? 'active' : ''}" data-view="main">
                <span class="menu-icon"><i class="bi bi-house-door"></i></span> Accueil
              </button>
              <button class="menu-item ${this.currentView === 'friends' ? 'active' : ''}" data-view="friends">
                <span class="menu-icon"><i class="bi bi-people"></i></span> Amis
              </button>
              <button class="menu-item ${this.currentView === 'servers' ? 'active' : ''}" data-view="servers">
                <span class="menu-icon"><i class="bi bi-search"></i></span> Versions
              </button>
              <button class="menu-item ${this.currentView === 'partners' ? 'active' : ''}" data-view="partners">
                <span class="menu-icon"><i class="bi bi-star"></i></span> Partenaires
              </button>
              <button class="menu-item ${this.currentView === 'shop' ? 'active' : ''}" data-view="shop">
                <span class="menu-icon"><i class="bi bi-bag-check"></i></span> Shop
              </button>
            </div>

            <div style="border-top: 1px solid rgba(99, 102, 241, 0.1); margin: 12px 0; padding-top: 12px;">
              <button class="menu-item ${this.currentView === 'stats' ? 'active' : ''}" data-view="stats">
                <span class="menu-icon"><i class="bi bi-bar-chart"></i></span> Statistiques
              </button>
              <button class="menu-item ${this.currentView === 'news' ? 'active' : ''}" data-view="news">
                <span class="menu-icon"><i class="bi bi-newspaper"></i></span> Actualités
              </button>
              <button class="menu-item ${this.currentView === 'versions' ? 'active' : ''}" data-view="versions" disabled style="opacity: 0.5; cursor: not-allowed;">
                <span class="menu-icon"><i class="bi bi-globe"></i></span> Serveurs
              </button>
              <button class="menu-item ${this.currentView === 'mods' ? 'active' : ''}" data-view="mods">
                <span class="menu-icon"><i class="bi bi-puzzle"></i></span> Mods
              </button>
              <button class="menu-item ${this.currentView === 'theme' ? 'active' : ''}" data-view="theme">
                <span class="menu-icon"><i class="bi bi-palette"></i></span> Thème
              </button>
            </div>

            <div style="border-top: 1px solid rgba(99, 102, 241, 0.1); margin: 12px 0; padding-top: 12px;">
              <button class="menu-item ${this.currentView === 'help' ? 'active' : ''}" data-view="help">
                <span class="menu-icon"><i class="bi bi-question-circle"></i></span> Aide & Support
              </button>
            </div>

            <div style="border-top: 1px solid rgba(99, 102, 241, 0.1); margin: 12px 0; padding-top: 12px;">
              <button class="menu-item" data-view="settings">
                <span class="menu-icon"><i class="bi bi-gear"></i></span> Paramètres
              </button>
            </div>
          </div>

          <div class="sidebar-footer"></div>
        </div>

        <div class="main-content" id="main-content-view">
          <div style="text-align: center; padding: 40px; color: #94a3b8;">Chargement...</div>
        </div>
      </div>
    `;
  }

  renderLogin() {
    return `
      <div class="titlebar">
        <div class="titlebar-title">${LauncherVersion.getName()}</div>
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

      <style>
        @keyframes float-animation {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-20px) translateX(0px); }
          75% { transform: translateY(-10px) translateX(-5px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.8), 0 0 60px rgba(139, 92, 246, 0.5); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
          50% { border-color: rgba(99, 102, 241, 0.8); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 25%, #16213e 50%, #1e293b 75%, #0f172a 100%);
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .login-bg-elements {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.3;
        }
        .blob1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          top: -10%;
          right: 10%;
          animation: float-animation 8s ease-in-out infinite;
        }
        .blob2 {
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #ec4899 0%, #6366f1 100%);
          bottom: 10%;
          left: 5%;
          animation: float-animation 10s ease-in-out infinite reverse;
        }
        .blob3 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%);
          bottom: 20%;
          right: 15%;
          animation: float-animation 12s ease-in-out infinite;
        }
        .login-card {
          position: relative;
          z-index: 10;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 24px;
          padding: 60px 50px;
          width: 100%;
          max-width: 480px;
          animation: slide-in 0.8s ease-out, glow 3s ease-in-out infinite;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(99, 102, 241, 0.1);
        }
        .login-logo {
          text-align: center;
          margin-bottom: 40px;
          animation: float-animation 4s ease-in-out infinite;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .login-logo-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
        }
        .login-title {
          font-size: 36px;
          font-weight: 700;
          color: white;
          margin: 0 0 10px 0;
          width: 100%;
        }
        .login-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 40px 0;
          width: 100%;
        }
        .login-button {
          width: 100%;
          padding: 14px 24px;
          border: 1px solid transparent;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 14px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: white;
        }
        .login-button-primary {
          background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
          box-shadow: 0 10px 20px rgba(0, 102, 255, 0.3);
        }
        .login-button-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(0, 102, 255, 0.5);
        }
        .login-button-primary:active {
          transform: translateY(0px);
        }
        .login-separator {
          display: flex;
          align-items: center;
          margin: 30px 0;
          gap: 12px;
        }
        .login-separator-line {
          flex: 1;
          height: 1px;
          background: rgba(99, 102, 241, 0.2);
        }
        .login-separator-text {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .offline-section {
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 20px;
        }
        .offline-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        .offline-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.8);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
          background: rgba(15, 23, 42, 0.95);
        }
        .offline-input::placeholder {
          color: #475569;
        }
        .login-button-secondary {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }
        .login-button-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(99, 102, 241, 0.5);
        }
        .login-button-secondary:active {
          transform: translateY(0px);
        }
        .login-footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid rgba(99, 102, 241, 0.1);
        }
        .login-version {
          font-size: 12px;
          color: #64748b;
        }
        .login-status {
          font-size: 11px;
          color: #475569;
          margin-top: 8px;
        }
      </style>

      <div class="login-container">
        <div class="login-bg-elements">
          <div class="blob blob1"></div>
          <div class="blob blob2"></div>
          <div class="blob blob3"></div>
        </div>

        <div class="login-card">
          <h1 class="login-title">${LauncherVersion.getName()}</h1>
          <p class="login-subtitle">L'expérience Minecraft ultime</p>

          <button id="ms-login-btn" class="login-button login-button-primary">
            <span>🪟</span>
            <span>Se connecter avec Microsoft</span>
          </button>

          <div class="login-separator">
            <div class="login-separator-line"></div>
            <div class="login-separator-text">Ou</div>
            <div class="login-separator-line"></div>
          </div>

          <div class="offline-section">
            <input 
              type="text" 
              id="offline-username-input" 
              class="offline-input" 
              placeholder="Entrez votre pseudo Minecraft"
            >
            <button id="offline-login-btn" class="login-button login-button-secondary">
              <span>🎮</span>
              <span>Jouer en mode Hors-ligne</span>
            </button>
          </div>

          <div class="login-footer">
            <p class="login-version">${LauncherVersion.getName()} v${LauncherVersion.version}</p>
            <p class="login-status">Prêt à jouer</p>
          </div>
        </div>
      </div>
    `;
  }

  // ✅ PAGES D'AIDE
  renderHelp() {
    return `
      <div class="view-container" style="padding: 40px;">
        <div class="view-header" style="margin-bottom: 30px;">
          <h1 class="view-title" style="display: flex; align-items: center; gap: 12px;">${icons.newspaper} Aide & Support</h1>
          <p style="color: #94a3b8; margin-top: 10px;">Documentation, communauté et support technique</p>
        </div>

        <!-- Onglets -->
        <div style="display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 10px;">
          <button id="help-wiki-btn" class="help-tab-btn" style="background: rgba(99, 102, 241, 0.2); color: #e2e8f0; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; display: flex; align-items: center; gap: 6px;">${icons.newspaper} Wiki</button>
          <button id="help-discord-btn" class="help-tab-btn" style="background: transparent; color: #94a3b8; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; display: flex; align-items: center; gap: 6px;">${icons.messageSquare} Discord</button>
          <button id="help-bug-btn" class="help-tab-btn" style="background: transparent; color: #94a3b8; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; display: flex; align-items: center; gap: 6px;">${icons.check} Signaler un bug</button>
          <button id="help-pr-btn" class="help-tab-btn" style="background: transparent; color: #94a3b8; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; display: flex; align-items: center; gap: 6px;">${icons.handshake} Pull Requests</button>
        </div>

        <!-- Contenu Wiki -->
        <div id="help-wiki-content" class="help-tab-content" style="display: block;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; max-width: 1200px;">
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 25px; cursor: pointer; transition: all 0.3s;">
              <h3 style="color: #e2e8f0; margin-top: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">${icons.globe} Démarrage rapide</h3>
              <p style="color: #94a3b8; font-size: 14px;">Apprenez à installer et configurer ${LauncherVersion.getName()} en quelques minutes.</p>
            </div>
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 25px; cursor: pointer; transition: all 0.3s;">
              <h3 style="color: #e2e8f0; margin-top: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">${icons.download} Guide des versions</h3>
              <p style="color: #94a3b8; font-size: 14px;">Installez et gérez facilement plusieurs versions de Minecraft.</p>
            </div>
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 25px; cursor: pointer; transition: all 0.3s;">
              <h3 style="color: #e2e8f0; margin-top: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">${icons.settings} Configuration</h3>
              <p style="color: #94a3b8; font-size: 14px;">Personnalisez les paramètres et optimisez vos performances.</p>
            </div>
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 25px; cursor: pointer; transition: all 0.3s;">
              <h3 style="color: #e2e8f0; margin-top: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">${icons.search} FAQ</h3>
              <p style="color: #94a3b8; font-size: 14px;">Réponses aux questions fréquemment posées.</p>
            </div>
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 25px; cursor: pointer; transition: all 0.3s;">
              <h3 style="color: #e2e8f0; margin-top: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">${icons.user} Sécurité</h3>
              <p style="color: #94a3b8; font-size: 14px;">Conseils pour sécuriser votre compte et vos données.</p>
            </div>
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 25px; cursor: pointer; transition: all 0.3s;">
              <h3 style="color: #e2e8f0; margin-top: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">${icons.star} Personnalisation</h3>
              <p style="color: #94a3b8; font-size: 14px;">Personnalisez l'apparence de votre lanceur.</p>
            </div>
          </div>

          <div style="margin-top: 40px; padding: 25px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px;">
            <p style="color: #cbd5e1; margin: 0;">Le wiki complet est disponible sur <strong style="color: #6366f1;">github.com</strong></p>
          </div>
        </div>

        <!-- Contenu Discord -->
        <div id="help-discord-content" class="help-tab-content" style="display: none;">
          <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 600px; padding: 20px;">
            <iframe src="https://discord.com/widget?id=1383756097017614426&theme=dark" width="350" height="500" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
          </div>

          <div style="margin-top: 40px; padding: 25px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px;">
            <h4 style="color: #e2e8f0; margin-top: 0; display: flex; align-items: center; gap: 8px;">${icons.check} Règles de la communauté</h4>
            <ul style="color: #cbd5e1; margin-bottom: 0;">
              <li>Sois respectueux avec les autres membres</li>
              <li>Pas de spam ou de contenu malveillant</li>
              <li>Garde les discussions dans les bons canaux</li>
              <li>Aide les nouveaux membres à s'intégrer</li>
            </ul>
          </div>
        </div>

        <!-- Contenu Bug Report -->
        <div id="help-bug-content" class="help-tab-content" style="display: none;">
          <div style="max-width: 900px;">
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h3 style="color: #e2e8f0; margin-top: 0;">Comment signaler un bug</h3>
              <ol style="color: #cbd5e1; line-height: 2;">
                <li><strong style="color: #6366f1;">Vérifiez</strong> que le bug n'a pas déjà été signalé</li>
                <li><strong style="color: #6366f1;">Décrivez</strong> le problème en détail</li>
                <li><strong style="color: #6366f1;">Incluez</strong> les étapes pour reproduire le bug</li>
                <li><strong style="color: #6366f1;">Joignez</strong> les logs et captures d'écran si possible</li>
                <li><strong style="color: #6366f1;">Envoyez</strong> un rapport sur GitHub</li>
              </ol>
            </div>

            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h3 style="color: #e2e8f0; margin-top: 0;">Informations à inclure</h3>
              <div style="background: rgba(15, 23, 42, 0.8); border-left: 3px solid #6366f1; padding: 15px; border-radius: 6px; color: #cbd5e1; font-family: monospace; font-size: 12px; line-height: 1.6;">
                OS: Windows 10<br/>
                Version Launcher: ${LauncherVersion.version}<br/>
                Minecraft Version: 1.20.1<br/>
                Java Version: 17.0.1<br/>
                RAM disponible: 8GB<br/>
                Description du bug: [Décrivez le problème ici]
              </div>
            </div>

            <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 25px; text-align: center;">
              <h3 style="color: #e2e8f0; margin-top: 0; display: flex; align-items: center; gap: 8px;">${icons.clipboard} Créer un rapport</h3>
              <p style="color: #94a3b8; margin-bottom: 20px;">Utilisez le lien ci-dessous pour créer un nouveau rapport de bug sur GitHub</p>
              <div class="bug-report-btn" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 12px 24px; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s;">
                ${icons.zap} Ouvrir GitHub Issues
              </div>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px;">
              <p style="color: #cbd5e1; margin: 0; display: flex; align-items: center; gap: 8px;"><strong style="color: #22c55e; display: flex; align-items: center; gap: 6px;">${icons.star} Conseil:</strong> Les rapports détaillés augmentent les chances que le bug soit corrigé rapidement!</p>
            </div>
          </div>
        </div>

        <!-- Contenu Pull Requests -->
        <div id="help-pr-content" class="help-tab-content" style="display: none;">
          <div style="max-width: 900px;">
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h3 style="color: #e2e8f0; margin-top: 0;">Contribuer avec une Pull Request</h3>
              <p style="color: #cbd5e1; line-height: 1.8;">Vous avez une idée pour améliorer ${LauncherVersion.getName()} ? Vous avez développé une nouvelle fonctionnalité ou corrigé un bug ? Nous accueillons les contributions de la communauté !</p>
              <ol style="color: #cbd5e1; line-height: 2;">
                <li><strong style="color: #6366f1;">Forkez</strong> le dépôt sur GitHub</li>
                <li><strong style="color: #6366f1;">Créez</strong> une nouvelle branche pour votre feature (<code style="color: #a78bfa; background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">git checkout -b feature/ma-feature</code>)</li>
                <li><strong style="color: #6366f1;">Commitez</strong> vos changements avec des messages clairs</li>
                <li><strong style="color: #6366f1;">Pushez</strong> vers votre fork (<code style="color: #a78bfa; background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">git push origin feature/ma-feature</code>)</li>
                <li><strong style="color: #6366f1;">Ouvrez</strong> une Pull Request avec une description détaillée</li>
              </ol>
            </div>

            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h3 style="color: #e2e8f0; margin-top: 0;">Directives pour une Pull Request</h3>
              <ul style="color: #cbd5e1; line-height: 2;">
                <li>Décrivez clairement les changements apportés</li>
                <li>Liez les issues si applicable (#123)</li>
                <li>Vérifiez que votre code suit les standards du projet</li>
                <li>Testez vos changements en développement et en production</li>
                <li>Maintenez une branche à jour avec la branche principale</li>
                <li>Soyez patient pour la revue et ouvert aux suggestions</li>
              </ul>
            </div>

            <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 25px; text-align: center;">
              <h3 style="color: #e2e8f0; margin-top: 0; display: flex; align-items: center; gap: 8px;">${icons.download} Ouvrir une Pull Request</h3>
              <p style="color: #94a3b8; margin-bottom: 20px;">Consultez nos pull requests en cours et créez la vôtre sur GitHub</p>
              <div class="pr-request-btn" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 24px; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s;">
                ${icons.zap} Gérer les Pull Requests
              </div>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px;">
              <p style="color: #cbd5e1; margin: 0; display: flex; align-items: center; gap: 8px;"><strong style="color: #6366f1; display: flex; align-items: center; gap: 6px;">${icons.heart} Merci:</strong> Votre contribution rend ${LauncherVersion.getName()} meilleur pour toute la communauté !</p>
            </div>
          </div>
        </div>
    `;
  }

  async renderCurrentView() {
    switch (this.currentView) {
      case 'main': return this.renderHomeView();
      case 'friends': return this.renderFriendsView();
      case 'versions': return this.renderServersView();
      case 'partners': return this.renderPartnersView();
      case 'shop': return this.renderShopView();
      case 'stats': return await this.renderStatsView();
      case 'news': return this.renderNewsView();
      case 'servers': return this.renderVersionsView();
      case 'mods':
        const modsContent = await this.modsManager.render();
        setTimeout(() => this.modsManager.setupEvents(), 100);
        return modsContent;  // ← RETOURNER LE CONTENU
      case 'theme': return this.renderThemeSettings();
      case 'help': return this.renderHelp();
      default: return '';
    }
  }

  getGreetingMessage() {
  const hour = new Date().getHours();
  const username = this.authData?.username || 'Joueur';

  // Messages selon l'heure
  if (hour >= 5 && hour < 8) {
    const messages = [
      `Déjà debout, ${username} ?`,
      `Lève-tôt aujourd'hui, ${username} !`,
      `Bon réveil, ${username} !`,
      `Prêt pour une matinée gaming, ${username} ?`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  else if (hour >= 8 && hour < 12) {
    const messages = [
      `Bonne matinée, ${username} !`,
      `Salut ${username}, bien dormi ?`,
      `Hello ${username} ! Prêt à jouer ?`,
      `Bonjour ${username} ! Belle journée pour jouer !`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  else if (hour >= 12 && hour < 14) {
    const messages = [
      `Bon appétit, ${username} !`,
      `Pause déjeuner, ${username} ?`,
      `Midi pile, ${username} ! Tu as faim ?`,
      `C'est l'heure de manger, ${username} !`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  else if (hour >= 14 && hour < 18) {
    const messages = [
      `Bon après-midi, ${username} !`,
      `Salut ${username}, comment va ta journée ?`,
      `L'après-midi parfait pour jouer, ${username} !`,
      `Re-bonjour ${username} ! Prêt à construire ?`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  else if (hour >= 18 && hour < 22) {
    const messages = [
      `Bonne soirée, ${username} !`,
      `Salut ${username}, bien rentré ?`,
      `La soirée commence, ${username} !`,
      `Bonsoir ${username} ! Session nocturne ?`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  else if (hour >= 22 || hour < 2) {
    const messages = [
      `Il se fait tard, ${username}...`,
      `Encore debout, ${username} ?`,
      `Session nocturne, ${username} ?`,
      `La nuit est à toi, ${username} !`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  else {
    const messages = [
      `Insomnie, ${username} ?`,
      `Tu devrais dormir, ${username}...`,
      `Nuit blanche, ${username} ?`,
      `Repose-toi un peu, ${username} !`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  }

  renderHomeView() {
    const headUrl = this.playerHead?.success 
      ? this.playerHead.url 
      : 'https://via.placeholder.com/128/1e293b/64748b?text=👤';
    
    const greetingMessage = this.getGreetingMessage();
    
    // Icône Microsoft SVG
    const microsoftIcon = `<svg width="20" height="20" viewBox="0 0 23 23" fill="none">
      <path d="M0 0h11v11H0V0z" fill="#f25022"/>
      <path d="M12 0h11v11H12V0z" fill="#00a4ef"/>
      <path d="M0 12h11v11H0V12z" fill="#7fba00"/>
      <path d="M12 12h11v11H12V12z" fill="#ffb900"/>
    </svg>`;
    
    return `
      <div class="home-view-modern">
        <!-- Hero Section avec Avatar -->
        <div class="hero-section">
          <div class="hero-background"></div>
          <div class="hero-content">
            <div class="player-avatar-large">
              <img 
                src="${headUrl}" 
                alt="Player Head"
                onerror="this.src='https://via.placeholder.com/120/334155/94a3b8?text=👤'"
              >
              <div class="avatar-glow"></div>
            </div>
            <div class="hero-text">
              <h1 class="hero-title">${greetingMessage}</h1>
              <p class="hero-subtitle">
                ${this.authData?.type === 'microsoft' 
                  ? `<span style="display: inline-flex; align-items: center; gap: 6px;">${microsoftIcon} Compte Microsoft</span>` 
                  : '🎮 Mode Hors ligne'}
              </p>
            </div>
          </div>
        </div>

        <!-- Carte de Lancement Principale -->
        <div class="main-launch-card">
          <div class="launch-card-header">
            <div class="version-info">
              <span class="version-badge" id="version-badge-display">Minecraft ${this.selectedProfile?.version || '1.21.4'}</span>
              <span class="ram-badge" id="ram-badge-display">${this.settings.ramAllocation || 4} GB RAM</span>
            </div>
            
            <select id="version-select" class="version-selector">
              <option value="1.21.11" ${this.selectedProfile?.version === '1.21.11' ? 'selected' : ''}>1.21.11</option>
              <option value="1.21.10" ${this.selectedProfile?.version === '1.21.10' ? 'selected' : ''}>1.21.10</option>
              <option value="1.21.9" ${this.selectedProfile?.version === '1.21.9' ? 'selected' : ''}>1.21.9</option>
              <option value="1.21.8" ${this.selectedProfile?.version === '1.21.8' ? 'selected' : ''}>1.21.8</option>
              <option value="1.21.7" ${this.selectedProfile?.version === '1.21.7' ? 'selected' : ''}>1.21.7</option>
              <option value="1.21.6" ${this.selectedProfile?.version === '1.21.6' ? 'selected' : ''}>1.21.6</option>
              <option value="1.21.5" ${this.selectedProfile?.version === '1.21.5' ? 'selected' : ''}>1.21.5</option>
              <option value="1.21.4" ${this.selectedProfile?.version === '1.21.4' ? 'selected' : ''}>1.21.4</option>
              <option value="1.21.3" ${this.selectedProfile?.version === '1.21.3' ? 'selected' : ''}>1.21.3</option>
              <option value="1.21.2" ${this.selectedProfile?.version === '1.21.2' ? 'selected' : ''}>1.21.2</option>
              <option value="1.21.1" ${this.selectedProfile?.version === '1.21.1' ? 'selected' : ''}>1.21.1</option>
              <option value="1.21" ${this.selectedProfile?.version === '1.21' ? 'selected' : ''}>1.21</option>
              <option value="1.20.6" ${this.selectedProfile?.version === '1.20.6' ? 'selected' : ''}>1.20.6</option>
              <option value="1.20.4" ${this.selectedProfile?.version === '1.20.4' ? 'selected' : ''}>1.20.4</option>
              <option value="1.20.2" ${this.selectedProfile?.version === '1.20.2' ? 'selected' : ''}>1.20.2</option>
              <option value="1.20.1" ${this.selectedProfile?.version === '1.20.1' ? 'selected' : ''}>1.20.1</option>
              <option value="1.20" ${this.selectedProfile?.version === '1.20' ? 'selected' : ''}>1.20</option>
              <option value="1.19.4" ${this.selectedProfile?.version === '1.19.4' ? 'selected' : ''}>1.19.4</option>
              <option value="1.19.2" ${this.selectedProfile?.version === '1.19.2' ? 'selected' : ''}>1.19.2</option>
              <option value="1.19" ${this.selectedProfile?.version === '1.19' ? 'selected' : ''}>1.19</option>
              <option value="1.18.2" ${this.selectedProfile?.version === '1.18.2' ? 'selected' : ''}>1.18.2</option>
              <option value="1.16.5" ${this.selectedProfile?.version === '1.16.5' ? 'selected' : ''}>1.16.5</option>
              <option value="1.12.2" ${this.selectedProfile?.version === '1.12.2' ? 'selected' : ''}>1.12.2</option>
              <option value="1.8.9" ${this.selectedProfile?.version === '1.8.9' ? 'selected' : ''}>1.8.9</option>
            </select>
          </div>

          <div id="launch-progress-container" class="launch-progress" style="display: none;">
            <div class="progress-text" id="launch-progress-text">Préparation...</div>
            <div class="progress-bar-container">
              <div id="launch-progress-bar" class="progress-bar"></div>
            </div>
          </div>

          <button class="launch-button-mega" id="launch-btn">
            <span class="launch-icon">${icons.zap}</span>
            <span class="launch-text">Lancer Minecraft</span>
            <span class="launch-hint">Appuyez sur Ctrl+L</span>
          </button>
        </div>

        <!-- Grille d'Informations -->
        <div class="info-grid">
          <!-- Statistiques de Session -->
          <div class="info-card stats-card">
            <div class="card-header">
              <span class="card-icon">${icons.barChart}</span>
              <h3>Session</h3>
            </div>
            <div class="stat-row">
              <span class="stat-label">Dernière connexion</span>
              <span class="stat-value">${this.selectedProfile?.lastPlayed || 'Jamais'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Temps de jeu total</span>
              <span class="stat-value">N/A</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Parties jouées</span>
              <span class="stat-value">N/A</span>
            </div>
          </div>

          <!-- Accès Rapide -->
          <div class="info-card quick-actions-card">
            <div class="card-header">
              <span class="card-icon">${icons.zap}</span>
              <h3>Accès rapide</h3>
            </div>
            <div class="quick-actions">
              <button class="quick-action-btn" id="home-settings-btn">
                <span>${icons.settings}</span>
                <span>Paramètres</span>
              </button>
              <button class="quick-action-btn" id="home-mods-btn">
                <span>${icons.mods}</span>
                <span>Mods</span>
              </button>
              <button class="quick-action-btn" id="home-storage-btn">
                <span>${icons.folder}</span>
                <span>Dossier</span>
              </button>
            </div>
          </div>

          <!-- Serveurs Suggérés -->
          <div class="info-card servers-card disabled">
            <div class="card-header">
              <span class="card-icon">${icons.globe}</span>
              <h3>Serveurs populaires</h3>
            </div>
            <div class="server-list">
              <div class="server-item" data-server="mc.hypixel.net">
                <div class="server-dot online"></div>
                <div class="server-info">
                  <div class="server-name">Hypixel</div>
                  <div class="server-players">98,234 joueurs</div>
                </div>
                <button class="server-join-btn" data-join-quick="mc.hypixel.net" disabled>Rejoindre</button>
              </div>
              <div class="server-item" data-server="play.cubecraft.net">
                <div class="server-dot online"></div>
                <div class="server-info">
                  <div class="server-name">CubeCraft</div>
                  <div class="server-players">12,581 joueurs</div>
                </div>
                <button class="server-join-btn" data-join-quick="play.cubecraft.net" disabled>Rejoindre</button>
              </div>
            </div>
          </div>

          <!-- Actualités -->
          <div class="info-card news-card">
            <div class="card-header">
              <span class="card-icon">${icons.newspaper}</span>
              <h3>Dernières actus</h3>
            </div>
            <div class="news-item">
              <div class="news-date">Il y a 2 jours</div>
              <div class="news-title">${LauncherVersion.getName()} v${LauncherVersion.version} disponible</div>
              <div class="news-excerpt">Nouvelles fonctionnalités et corrections de bugs</div>
            </div>
            <div class="news-item">
              <div class="news-date">Il y a 5 jours</div>
              <div class="news-title">Minecraft 1.21.11 sortie officielle</div>
              <div class="news-excerpt">Découvrez les nouvelles fonctionnalités</div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .home-view-modern {
          padding: 0;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
          border-radius: 24px;
          padding: 48px;
          margin-bottom: 32px;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.2) 0%, transparent 50%);
          animation: hero-pulse 8s ease-in-out infinite;
        }

        @keyframes hero-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .hero-content {
          position: relative;
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .player-avatar-large {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .player-avatar-large img {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          object-fit: cover;
          border: 4px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .avatar-glow {
          position: absolute;
          inset: -8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 24px;
          opacity: 0.3;
          filter: blur(20px);
          z-index: -1;
          animation: glow-pulse 3s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .hero-text {
          flex: 1;
        }

        .hero-title {
          font-size: 36px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 16px;
          color: #94a3b8;
          margin: 0;
        }

        /* Main Launch Card */
        .main-launch-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 32px;
        }

        .launch-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .version-info {
          display: flex;
          gap: 12px;
        }

        .version-badge, .ram-badge {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .version-badge {
          background: rgba(99, 102, 241, 0.2);
          color: #6366f1;
        }

        .ram-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .version-selector {
          padding: 10px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .version-selector:hover {
          border-color: #6366f1;
          background: rgba(15, 23, 42, 0.95);
        }

        .version-selector:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .launch-progress {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .progress-text {
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: rgba(99, 102, 241, 0.2);
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 10px;
          transition: width 0.3s ease;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
        }

        .launch-button-mega {
          width: 100%;
          padding: 24px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
        }

        .launch-button-mega::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .launch-button-mega:hover::before {
          left: 100%;
        }

        .launch-button-mega:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
        }

        .launch-button-mega:active {
          transform: translateY(0);
        }

        .launch-icon {
          font-size: 24px;
        }

        .launch-text {
          font-size: 20px;
        }

        .launch-hint {
          position: absolute;
          right: 24px;
          font-size: 12px;
          opacity: 0.6;
          font-weight: 400;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .info-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s;
        }

        .info-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .card-icon {
          font-size: 24px;
        }

        .card-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(99, 102, 241, 0.05);
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .quick-actions {
          display: grid;
          gap: 12px;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .quick-action-btn:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
          transform: translateX(4px);
        }

        .server-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .server-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(99, 102, 241, 0.05);
          border-radius: 10px;
          transition: all 0.3s;
        }

        .server-item:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .servers-card.disabled {
          opacity: 0.5;
          filter: grayscale(0.7);
          pointer-events: none;
        }

        .server-join-btn[disabled] {
          background: rgba(75, 85, 99, 0.4) !important;
          color: #9ca3af !important;
          cursor: not-allowed;
        }

        .server-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .server-dot.online {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .server-info {
          flex: 1;
        }

        .server-name {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 2px;
        }

        .server-players {
          font-size: 12px;
          color: #64748b;
        }

        .server-join-btn {
          padding: 6px 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .server-join-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .news-item {
          padding: 12px 0;
          border-bottom: 1px solid rgba(99, 102, 241, 0.05);
        }

        .news-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .news-date {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .news-title {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 4px;
        }

        .news-excerpt {
          font-size: 12px;
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .hero-content {
            flex-direction: column;
            text-align: center;
          }

          .hero-title {
            font-size: 28px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .launch-hint {
            display: none;
          }
        }
      </style>
    `;
  }

  renderFriendsView() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1 class="view-title">${icons.users} Mes amis</h1>
          <button class="btn-add-modern" id="add-friend-btn">${icons.users} Ajouter un ami</button>
        </div>

        ${this.showAddFriend ? `
          <div class="create-card">
            <h3>Ajouter un ami</h3>
            <div class="input-group">
              <label class="input-label">Pseudo du joueur</label>
              <input type="text" class="input-field" id="friend-username" placeholder="Pseudo Minecraft">
            </div>
            <div class="button-group">
              <button class="btn-primary" id="save-friend-btn">${icons.check} Ajouter</button>
              <button class="btn-secondary" id="cancel-friend-btn">${icons.x} Annuler</button>
            </div>
          </div>
        ` : ''}

        ${this.friends.length === 0 ? `
          <div class="empty-state">
            <div style="font-size: 64px; margin-bottom: 20px;">👥</div>
            <h3>Aucun ami ajouté</h3>
            <p>Cliquez sur "Ajouter un ami" pour commencer à inviter vos amis !</p>
            <button class="btn-primary" id="add-friend-btn-empty" style="margin-top: 20px;">➕ Ajouter votre premier ami</button>
          </div>
        ` : `
          <div class="friends-grid">
            ${this.friends.map(f => `
              <div class="friend-card">
                <div class="friend-avatar" style="background: linear-gradient(135deg, ${f.online ? '#22c55e' : '#ef4444'}, ${f.online ? '#16a34a' : '#dc2626'});">${f.username[0].toUpperCase()}</div>
                <div class="friend-info">
                  <h3>${f.username}</h3>
                  <div class="friend-status ${f.online ? 'online' : 'offline'}">
                    ${f.online ? '🟢 En ligne' : '⚫ Hors ligne'}
                  </div>
                </div>
                <button class="btn-icon" data-remove-friend="${f.id}" style="color: #ef4444;">🗑️</button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // Utilitaire pour formater la taille des fichiers
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  renderServersView() {
    return `
      <div class="view-container" style="position: relative;">
        <h1 class="view-title">Serveurs populaires</h1>
        <p style="color: #64748b; margin-bottom: 30px;">Cliquez pour rejoindre directement un serveur</p>

        <div class="servers-grid" style="position: relative; pointer-events: auto;">
          ${this.popularServers.map(s => `
            <div class="server-card" data-server-ip="${s.ip}">
              <div class="server-icon">${s.name[0]}</div>
              <div class="server-info">
                <h3>${s.name}</h3>
                <p class="server-ip">${s.ip}</p>
                <p class="server-desc">${s.description}</p>
                <div class="server-players">${icons.users} ${s.players} joueurs</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px; margin-left: auto;">
                <button class="btn-join" data-join-server="${s.ip}" style="">${icons.zap} Rejoindre</button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 40; pointer-events: auto;">
          <h2 style="font-size: 20px; margin-bottom: 15px;">Serveur personnalisé</h2>
          <div class="custom-server-input">
            <input type="text" class="input-field" id="custom-server-ip" placeholder="Ex: play.hypixel.net" style="flex: 1;">
            <button class="btn-primary" id="join-custom-server" style="display: flex; align-items: center; justify-content: center; gap: 8px;" ${this.authData?.type === 'offline' ? 'disabled' : ''}>${icons.globe} Rejoindre</button>
          </div>
        </div>

        <div style="margin-top: 40px; pointer-events: auto; display: flex; gap: 15px; flex-wrap: wrap;">
        </div>
      </div>

      <style>
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      </style>
    `;
  }

  // ✅ PAGE VERSIONS MINECRAFT
  renderVersionsView() {
    // Liste des versions Minecraft populaires
    const versions = [
      { version: '1.21.11', release: '2025', type: 'stable' },
      { version: '1.21.10', release: '2025', type: 'unsupported' },
      { version: '1.21.9', release: '2025', type: 'unsupported' },
      { version: '1.21.8', release: '2025', type: 'unsupported' },
      { version: '1.21.7', release: '2025', type: 'unsupported' },
      { version: '1.21.6', release: '2025', type: 'unsupported' },
      { version: '1.21.5', release: '2025', type: 'unsupported' },
      { version: '1.21.4', release: '2024', type: 'unsupported' },
      { version: '1.21.3', release: '2024', type: 'unsupported' },
      { version: '1.21.2', release: '2024', type: 'unsupported' },
      { version: '1.21.1', release: '2024', type: 'unsupported' },
      { version: '1.21', release: '2024', type: 'unsupported' },
      { version: '1.20.4', release: '2023', type: 'unsupported' },
      { version: '1.20.2', release: '2023', type: 'unsupported' },
      { version: '1.20.1', release: '2023', type: 'unsupported' },
      { version: '1.20', release: '2023', type: 'unsupported' },
      { version: '1.19.4', release: '2023', type: 'unsupported' },
      { version: '1.19.2', release: '2022', type: 'unsupported' },
      { version: '1.19', release: '2022', type: 'unsupported' },
      { version: '1.18.2', release: '2022', type: 'unsupported' },
      { version: '1.16.5', release: '2021', type: 'unsupported' },
      { version: '1.12.2', release: '2017', type: 'unsupported' },
      { version: '1.8.9', release: '2015', type: 'unsupported' },
    ];

    return `
      <div class="view-container" style="position: relative;">
        <h1 class="view-title">Versions Minecraft</h1>
        <p style="color: #64748b; margin-bottom: 30px;">Cliquez sur une version pour télécharger le serveur</p>

        <div class="versions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
          ${versions.map(v => `
            <div class="version-card" style="
              background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
              border: 1px solid rgba(100, 116, 139, 0.2);
              border-radius: 12px;
              padding: 24px;
              cursor: pointer;
              transition: all 0.3s ease;
            ">
              <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 24px; font-weight: 700; color: #e2e8f0; margin: 0 0 8px 0;">Minecraft ${v.version}</h3>
                  <p style="color: #94a3b8; margin: 0; font-size: 14px;">Sortie: ${v.release}</p>
                </div>
                <div style="
                  padding: 6px 12px;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 12px;
                  white-space: nowrap; /* ⚡ Empêche le retour à la ligne */
                  color: ${v.type === 'stable' ? '#22c55e' : '#ef4444'};
                  background: ${v.type === 'stable' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};
                ">
                  ${v.type === 'stable' ? '✓ Supported' : '✗ Unsupported'}
                </div>
              </div>
              
              <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;" data-download-version="${v.version}">
                  📥 Télécharger JAR
                </button>
              </div>
              
              <p style="color: #64748b; font-size: 12px; margin-top: 12px; margin-bottom: 0;">Cliquez pour ouvrir PaperMC et télécharger le serveur</p>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 40px; padding: 24px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px;">
          <h3 style="margin-top: 0; color: #6366f1;">📝 Informations</h3>
          <ul style="color: #cbd5e1; margin: 0; padding-left: 20px;">
            <li>Les versions affichées sont les versions officielles Minecraft</li>
            <li>Cliquez sur "Télécharger JAR" pour accéder à PaperMC (serveur optimisé)</li>
            <li>PaperMC offre des performances meilleures que le serveur vanilla</li>
            <li>Chaque version est directement téléchargeable via le lien</li>
          </ul>
        </div>
      </div>
    `;
  }

  renderPartnersView() {
    const partners = [
      { 
        name: 'Hypixel Studios',
        logo: '🏢',
        description: 'Le plus grand serveur Minecraft avec des millions de joueurs',
        website: 'https://hypixel.net',
        joinUrl: 'mc.hypixel.net'
      },
      { 
        name: 'LunaVerse',
        logo: '🌕',
        description: 'Un serveur communautaire rassemblant plusieurs projets !',
        website: '',
        joinUrl: ''
      }
    ];

    return `
      <div class="view-container">
        <div class="view-header">
          <h1 class="view-title">${icons.handshake} Nos Partenaires</h1>
        </div>

        <p style="color: #94a3b8; margin-bottom: 30px; font-size: 15px;">
          Découvrez nos partenaires officiels et les meilleures communautés Minecraft
        </p>

        <div class="partners-grid">
          ${partners.map((partner, index) => `
            <div class="partner-card" style="animation: slideIn 0.5s ease-out ${index * 0.1}s both;">
              <div class="partner-logo">${partner.logo}</div>
              
              <div class="partner-content">
                <h3>${partner.name}</h3>
                <p class="partner-description">${partner.description}</p>
                
                <div class="partner-badges">
                  <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #6366f1;">✓ Partenaire Officiel</span>
                </div>
              </div>

              <div class="partner-actions">
                <button class="btn-partner" data-visit-partner="${partner.website}" style="flex: 1;">
                  🌐 Visiter
                </button>
                <button class="btn-partner" data-join-partner="${partner.joinUrl}" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                  🎮 Rejoindre
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 50px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; padding: 30px; text-align: center;">
          <h2 style="font-size: 22px; color: #e2e8f0; margin-bottom: 10px;">Devenir Partenaire 🌟</h2>
          <p style="color: #94a3b8; margin-bottom: 20px;">
            Vous avez un serveur ou une communauté Minecraft ? Contactez-nous pour devenir partenaire officiel !
          </p>
          <button class="btn-primary" id="contact-partner-btn" style="margin: 0 auto;">
            📧 Nous Contacter
          </button>
        </div>
      </div>

      <style>
        .partners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .partner-card {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.1);
          border-radius: 16px;
          padding: 25px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .partner-card:hover {
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-8px);
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.2);
          background: rgba(30, 41, 59, 0.8);
        }

        .partner-logo {
          font-size: 48px;
          text-align: center;
        }

        .partner-content {
          flex: 1;
        }

        .partner-content h3 {
          font-size: 18px;
          color: #e2e8f0;
          margin: 0 0 8px 0;
          font-weight: 700;
        }

        .partner-description {
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
        }

        .partner-badges {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .partner-actions {
          display: flex;
          gap: 10px;
        }

        .btn-partner {
          flex: 1;
          padding: 10px 16px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .btn-partner:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
        }

        .btn-partner:active {
          transform: translateY(0px);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      </style>
    `;
  }

  renderNewsView() {
    return `
      <div class="view-container">
        <h1 class="view-title">Actualités</h1>
        
        <div class="news-container" id="news-container">
          <div style="text-align: center; padding: 40px; color: #9ca3af;">
            <p>Chargement des actualités...</p>
          </div>
        </div>
      </div>
    `;
  }

  renderShopView() {
    return `
      <div class="view-container">
        <h1 class="view-title">Shop ${LauncherVersion.getName()}</h1>
        <p style="color: #64748b; margin-bottom: 30px; text-align: center;">Découvrez nos produits et améliorations</p>

        <!-- ✅ MINECRAFT OFFICIAL -->
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 20px; color: #e2e8f0; text-align: center;">
            <span style="color: #6366f1;">●</span> Éditions Minecraft
          </h2>
          <div class="shop-grid">
            <div class="shop-card">
              <div class="shop-icon">🎮</div>
              <h3>Minecraft Java Edition</h3>
              <p>Le jeu classique avec mods et skins personnalisés</p>
              <div class="shop-price">26,95 €</div>
              <button class="btn-primary" onclick="require('electron').shell.openExternal('https://www.minecraft.net/fr-fr/store/minecraft-java-bedrock-edition-pc')" style="width: 100%;">
                ⚡ Acheter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🪟</div>
              <h3>Minecraft Bedrock Edition</h3>
              <p>Version cross-platform pour tous les appareils</p>
              <div class="shop-price">19,99 €</div>
              <button class="btn-primary" onclick="require('electron').shell.openExternal('https://www.minecraft.net/fr-fr/store')" style="width: 100%;">
                ⚡ Acheter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">💎</div>
              <h3>Java + Bedrock Edition</h3>
              <p>Les deux versions pour le prix d'une</p>
              <div class="shop-price">39,99 €</div>
              <button class="btn-primary" onclick="require('electron').shell.openExternal('https://www.minecraft.net/fr-fr/store/minecraft-java-bedrock-edition-pc')" style="width: 100%;">
                ⚡ Acheter
              </button>
            </div>
          </div>
        </div>

        <!-- ✅ REALMS & SERVERS -->
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 20px; color: #e2e8f0; text-align: center;">
            <span style="color: #10b981;">●</span> Serveurs & Realms
          </h2>
          <div class="shop-grid">
            <div class="shop-card">
              <div class="shop-icon">🏰</div>
              <h3>Minecraft Realms Plus</h3>
              <p>Serveur privé cloud pour vous et vos amis</p>
              <div class="shop-price">7,99 €/mois</div>
              <button class="btn-primary" onclick="require('electron').shell.openExternal('https://www.minecraft.net/fr-fr/realms-plus')" style="width: 100%;">
                🌐 S'abonner
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🌐</div>
              <h3>Serveur Hyperion</h3>
              <p>Serveur compétitif avec 10k+ joueurs</p>
              <div class="shop-price">Gratuit</div>
              <button class="btn-primary" onclick="require('electron').shell.openExternal('https://hypixel.net')" style="width: 100%;">
                🌐 Visiter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">⚔️</div>
              <h3>Serveur Skyblock</h3>
              <p>Mode de jeu unique avec progression</p>
              <div class="shop-price">Gratuit</div>
              <button class="btn-primary" onclick="require('electron').shell.openExternal('https://hypixel.net/forums/')" style="width: 100%;">
                🌐 Rejoindre
              </button>
            </div>
          </div>
        </div>

        <!-- ✅ LAUNCHER PREMIUM -->
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 20px; color: #e2e8f0; text-align: center;">
            <span style="color: #f59e0b;">●</span> ${LauncherVersion.getName()} Premium
          </h2>
          <div class="shop-grid">
            <div class="shop-card" style="border: 2px solid #f59e0b;">
              <div class="shop-icon" style="font-size: 40px;">👑</div>
              <h3>Premium Mensuel</h3>
              <p style="color: #fbbf24; font-weight: 600;">Les meilleures fonctionnalités</p>
              <ul style="text-align: center; color: #9ca3af; font-size: 13px; margin: 15px 0; line-height: 1.8; list-style: none; padding: 0;">
                <li>✓ Thèmes exclusifs</li>
                <li>✓ Support prioritaire</li>
                <li>✓ Mods autorisés illimités</li>
                <li>✓ Gestion avancée de RAM</li>
                <li>✓ Snapshots exclusifs</li>
              </ul>
              <div class="shop-price">4,99 €/mois</div>
              <button class="btn-primary" onclick="alert('Premium mensuel - En développement')" style="width: 100%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none;">
                👑 S'abonner
              </button>
            </div>

            <div class="shop-card" style="border: 2px solid #6366f1;">
              <div class="shop-icon" style="font-size: 40px;">🚀</div>
              <h3>Premium Annuel</h3>
              <p style="color: #818cf8; font-weight: 600;">-30% d'économie !</p>
              <ul style="text-align: center; color: #9ca3af; font-size: 13px; margin: 15px 0; line-height: 1.8; list-style: none; padding: 0;">
                <li>✓ Tout de Premium</li>
                <li>✓ Accès anticipé features</li>
                <li>✓ Statistiques avancées</li>
                <li>✓ Badge custom</li>
                <li>✓ Support VIP 24/7</li>
              </ul>
              <div class="shop-price">49,99 €/an</div>
              <button class="btn-primary" onclick="alert('Premium annuel - En développement')" style="width: 100%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none;">
                ⚡ S'abonner
              </button>
            </div>
          </div>
        </div>

        <!-- ✅ COSMÉTIQUES & THÈMES -->
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 20px; color: #e2e8f0; text-align: center;">
            <span style="color: #ec4899;">●</span> Cosmétiques & Thèmes
          </h2>
          <div class="shop-grid">
            <div class="shop-card">
              <div class="shop-icon">🎨</div>
              <h3>Pack Thème Sombre Pro</h3>
              <p>5 thèmes sombres premium exclusifs</p>
              <div class="shop-price">2,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Thème Sombre Pro - En développement')" style="width: 100%;">
                ⭐ Acheter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🌈</div>
              <h3>Pack Arc-en-ciel</h3>
              <p>8 thèmes colorés dynamiques</p>
              <div class="shop-price">3,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Arc-en-ciel - En développement')" style="width: 100%;">
                ⭐ Acheter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🎭</div>
              <h3>Pack Neon Cyberpunk</h3>
              <p>Thèmes futuristes avec animations</p>
              <div class="shop-price">4,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Neon Cyberpunk - En développement')" style="width: 100%;">
                ⭐ Acheter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">✨</div>
              <h3>Badge Custom Discord</h3>
              <p>Badge exclusif pour ton serveur Discord</p>
              <div class="shop-price">1,99 €</div>
              <button class="btn-primary" onclick="alert('Badge Custom Discord - En développement')" style="width: 100%;">
                👑 Obtenir
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🎪</div>
              <h3>Particle Effects</h3>
              <p>Effets de particules pour le launcher</p>
              <div class="shop-price">1,99 €</div>
              <button class="btn-primary" onclick="alert('Particle Effects - En développement')" style="width: 100%;">
                ⭐ Acheter
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🔊</div>
              <h3>Soundpack Premium</h3>
              <p>Sons exclusifs pour les notifications</p>
              <div class="shop-price">2,99 €</div>
              <button class="btn-primary" onclick="alert('Soundpack Premium - En développement')" style="width: 100%;">
                🔊 Acheter
              </button>
            </div>
          </div>
        </div>

        <!-- ✅ MODS & ADDONS -->
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 20px; color: #e2e8f0; text-align: center;">
            <span style="color: #8b5cf6;">●</span> Packs Mods & Addons
          </h2>
          <div class="shop-grid">
            <div class="shop-card">
              <div class="shop-icon">⚙️</div>
              <h3>Pack Tech & Performance</h3>
              <p>15+ mods pour optimiser le jeu</p>
              <div class="shop-price">Gratuit</div>
              <button class="btn-primary" onclick="alert('Pack Tech & Performance - En développement')" style="width: 100%;">
                📥 Télécharger
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🏗️</div>
              <h3>Pack Constructions</h3>
              <p>20+ mods de build et décoration</p>
              <div class="shop-price">3,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Constructions - En développement')" style="width: 100%;">
                📥 Acheter & Installer
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">⚔️</div>
              <h3>Pack Combat Avancé</h3>
              <p>Mods pour des combats intenses</p>
              <div class="shop-price">2,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Combat Avancé - En développement')" style="width: 100%;">
                ⚡ Acheter & Installer
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🌿</div>
              <h3>Pack Nature & Biomes</h3>
              <p>Nouveaux biomes et environnements</p>
              <div class="shop-price">3,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Nature & Biomes - En développement')" style="width: 100%;">
                🌿 Acheter & Installer
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🔮</div>
              <h3>Pack Magie & Surnaturel</h3>
              <p>Mods magiques et fantastiques</p>
              <div class="shop-price">4,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Magie & Surnaturel - En développement')" style="width: 100%;">
                ⭐ Acheter & Installer
              </button>
            </div>

            <div class="shop-card">
              <div class="shop-icon">🚀</div>
              <h3>Pack Space & Tech</h3>
              <p>Technologie avancée et espace</p>
              <div class="shop-price">4,99 €</div>
              <button class="btn-primary" onclick="alert('Pack Space & Tech - En développement')" style="width: 100%;">
                ⚡ Acheter & Installer
              </button>
            </div>
          </div>
        </div>

        <!-- ✅ SUPPORTER LE PROJET -->
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 20px; color: #e2e8f0; text-align: center;">
            <span style="color: #ef4444;">●</span> Supporter ${LauncherVersion.getName}
          </h2>
          <div class="shop-grid">
            <div class="shop-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);">
              <div class="shop-icon">❤️</div>
              <h3>Petit Don</h3>
              <p>Soutiens le développement du projet</p>
              <div class="shop-price">2,99 €</div>
              <button class="btn-primary" onclick="alert('Petit Don - En développement')" style="width: 100%; background: #ef4444; border: none;">
                ❤️ Donner
              </button>
            </div>

            <div class="shop-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);">
              <div class="shop-icon">💝</div>
              <h3>Don Important</h3>
              <p>Aide au développement et serveurs</p>
              <div class="shop-price">9,99 €</div>
              <button class="btn-primary" onclick="alert('Don Important - En développement')" style="width: 100%; background: #f87171; border: none;">
                ❤️ Donner
              </button>
            </div>

            <div class="shop-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);">
              <div class="shop-icon">👑</div>
              <h3>Supporter VIP</h3>
              <p>Merci spécial + avantages lifetime</p>
              <div class="shop-price">29,99 €</div>
              <button class="btn-primary" onclick="alert('Supporter VIP - En développement')" style="width: 100%; background: #dc2626; border: none;">
                👑 Devenir VIP
              </button>
            </div>
          </div>
        </div>

        <!-- ✅ SECTION INFO -->
        <div style="margin-top: 50px; padding: 25px; background: rgba(26, 31, 58, 0.5); border-radius: 16px; border-left: 4px solid #6366f1; text-align: center;">
          <h3 style="margin-bottom: 12px; color: #e2e8f0;">💡 À savoir</h3>
          <ul style="color: #9ca3af; line-height: 1.8; font-size: 14px; list-style: none; padding: 0;">
            <li>✓ Tous les achats premium incluent le support prioritaire</li>
            <li>✓ Les abonnements peuvent être annulés à tout moment</li>
            <li>✓ Garantie remboursement 30 jours</li>
            <li>✓ Paiements sécurisés avec Stripe</li>
            <li>✓ Aucune donnée bancaire stockée localement</li>
          </ul>
        </div>
      </div>

      <style>
        .shop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .shop-card {
          background: rgba(26, 31, 58, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(99, 102, 241, 0.1);
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }

        .shop-card:hover {
          transform: translateY(-5px);
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(26, 31, 58, 0.7);
        }

        .shop-icon {
          font-size: 48px;
          margin-bottom: 15px;
          text-align: center;
        }

        .shop-card h3 {
          font-size: 18px;
          margin-bottom: 10px;
          color: white;
          text-align: center;
        }

        .shop-card p {
          color: #9ca3af;
          font-size: 13px;
          margin-bottom: 15px;
          flex-grow: 1;
          text-align: center;
        }

        .shop-price {
          font-size: 24px;
          font-weight: 700;
          color: #6366f1;
          margin: 15px 0;
          text-align: center;
        }

        .btn-shop {
          padding: 12px 24px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }

        .btn-shop svg {
          width: 20px;
          height: 20px;
        }

        .btn-shop:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
        }

        .btn-shop:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .shop-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }

  // ✅ PAGE ACTUALITÉS
  renderNewsView() {
    const news = [
      {
        title: `🚀 ${LauncherVersion.getName()} v${LauncherVersion.version} est en ligne !`,
        date: '17 Janvier 2026',
        author: `${LauncherVersion.getName()} Team`,
        description: 'La nouvelle version majeure est ici avec un design complètement refondu, système de mods intégré, et bien plus encore !',
        image: '🎉',
        category: 'Mise à jour'
      },
      {
        title: '📊 Système de Statistiques amélioré',
        date: '15 Janvier 2026',
        author: 'Dev Team',
        description: 'Suivez vos statistiques en détail avec des graphiques interactifs et des analyses de votre gameplay.',
        image: '📈',
        category: 'Fonctionnalité'
      },
      {
        title: '👥 Système d\'Amis en bêta',
        date: '10 Janvier 2026',
        author: 'Community Manager',
        description: 'Invitez vos amis et jouez ensemble ! Système d\'amis maintenant disponible en version bêta.',
        image: '👥',
        category: 'Communauté'
      },
      {
        title: '🎨 Thèmes personnalisés disponibles',
        date: '5 Janvier 2026',
        author: 'Design Team',
        description: 'Personnalisez le launcher avec vos propres couleurs et thèmes !',
        image: '🎨',
        category: 'Fonctionnalité'
      },
      {
        title: '🔧 Gestionnaire de Mods à venir',
        date: '1 Janvier 2026',
        author: 'Product Team',
        description: 'Un gestionnaire de mods révolutionnaire est en développement et sera bientôt disponible !',
        image: '🔧',
        category: 'Annonce'
      },
      {
        title: `🏆 Tournoi ${LauncherVersion.getName()} #1 - Inscriptions ouvertes !`,
        date: '28 Décembre 2025',
        author: 'Community Manager',
        description: `Participez au premier tournoi officiel de ${LauncherVersion.getName()} ! Récompenses à la clé !`,
        image: '🏆',
        category: 'Événement'
      }
    ];

    return `
      <div class="view-container">
        <div class="view-header">
          <h1 class="view-title">📰 Actualités ${LauncherVersion.getName()}</h1>
        </div>

        <div style="max-width: 1000px; margin: 0 auto;">
          <div style="display: grid; gap: 20px;">
            ${news.map(article => `
              <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; padding: 24px; transition: all 0.3s; cursor: pointer;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(99, 102, 241, 0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(99, 102, 241, 0.2)'">
                <div style="display: flex; gap: 16px;">
                  <div style="font-size: 48px; min-width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(99, 102, 241, 0.1); border-radius: 10px;">
                    ${article.image}
                  </div>
                  
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: start; justify-content: space-between; gap: 12px;">
                      <div style="flex: 1;">
                        <h2 style="color: #e2e8f0; font-size: 18px; font-weight: 700; margin-bottom: 8px;">${article.title}</h2>
                        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                          <span style="background: rgba(99, 102, 241, 0.2); color: #6366f1; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${article.category}</span>
                          <span style="color: #94a3b8; font-size: 12px;">📅 ${article.date}</span>
                          <span style="color: #64748b; font-size: 12px;">Par ${article.author}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">${article.description}</p>
                    
                    <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;">Lire la suite →</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 14px; padding: 40px; margin-top: 40px; text-align: center;">
            <h2 style="color: #e2e8f0; font-size: 24px; font-weight: 700; margin-bottom: 12px;">📧 Restez informé</h2>
            <p style="color: #cbd5e1; margin-bottom: 20px;">Abonnez-vous à notre newsletter pour recevoir les dernières actualités</p>
            <div style="display: flex; gap: 10px; max-width: 500px; margin: 0 auto;">
              <input type="email" id="newsletter-email" class="input-field" placeholder="Votre email" style="flex: 1;">
              <button id="newsletter-btn" class="btn-primary" style="white-space: nowrap;">S'abonner</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupLoginEvents() {
    const microsoftBtn = document.getElementById('ms-login-btn');
    const offlineBtn = document.getElementById('offline-login-btn');
    const offlineInput = document.getElementById('offline-username-input');

    if (microsoftBtn) {
      microsoftBtn.addEventListener('click', async () => {
        microsoftBtn.disabled = true;
        microsoftBtn.innerHTML = '<span style="font-size: 20px;">⏳</span> Connexion en cours...';
        
        const result = await ipcRenderer.invoke('login-microsoft');
        
        if (result.success) {
          this.authData = result.data;
          this.currentView = 'main';
          await this.loadData();
          this.render();
        } else {
          alert('❌ Erreur de connexion Microsoft');
          microsoftBtn.disabled = false;
          microsoftBtn.innerHTML = '<span style="font-size: 20px;">🪟</span> Se connecter avec Microsoft';
        }
      });
    }

    if (offlineBtn) {
      const handleOffline = async () => {
        const username = offlineInput.value.trim();
        if (username) {
          const result = await ipcRenderer.invoke('login-offline', username);
          if (result.success) {
            this.authData = result.data;
            this.currentView = 'main';
            await this.loadData();
            this.render();
          }
        } else {
          alert('Entrez un pseudo');
        }
      };

      offlineBtn.addEventListener('click', handleOffline);
      offlineInput.addEventListener('keypress', e => e.key === 'Enter' && handleOffline());
    }
  }

  async loadHomePageInfo() {
    try {
      // Stockage enlevé car cause du lag - les users peuvent voir dans les paramètres
      // const storageInfo = await ipcRenderer.invoke('get-storage-info');
    } catch (error) {
      console.error('Erreur loadHomePageInfo:', error);
    }
  }

  setupMainEvents() {
    // ✅ CLEANUP: Supprimer l'ancien listener de changement de vue s'il existe
    if (this.viewChangeListener) {
      document.removeEventListener('click', this.viewChangeListener);
    }

    // ✨ GESTIONNAIRE DE CHANGEMENT DE VUE (TODOS LES MENUS)
    this.viewChangeListener = (e) => {
      const button = e.target.closest('[data-view]');
      if (button && !button.disabled) {
        const view = button.getAttribute('data-view');
        
        // Cas spécial pour Paramètres
        if (view === 'settings') {
          this.currentView = 'main';
          this.render();
          ipcRenderer.send('open-settings');
        } else {
          this.currentView = view;
          this.render();
        }
      }

      // ✨ THÈME - MODE D'AFFICHAGE
      const themeBtn = e.target.closest('.theme-option');
      if (themeBtn) {
        const theme = themeBtn.dataset.theme;
        console.log('[Theme] Switching to:', theme);
        localStorage.setItem('theme', theme);
        this.applyThemeSelection(theme);
        // Mettre à jour l'UI immédiatement sans re-render
        document.querySelectorAll('.theme-option').forEach(b => {
          const isDark = theme === 'dark';
          b.style.borderColor = b === themeBtn ? (isDark ? '#6366f1' : '#4f46e5') : 'rgba(99, 102, 241, 0.3)';
        });
      }

      // ✨ THÈME - COULEUR D'ACCENT
      const accentBtn = e.target.closest('.accent-option');
      if (accentBtn) {
        const accent = accentBtn.dataset.accent;
        console.log('[Accent] Switching to:', accent);
        localStorage.setItem('accent', accent);
        this.applyAccentColor(accent);
        // Mettre à jour l'UI
        document.querySelectorAll('.accent-option').forEach(b => {
          b.style.boxShadow = b === accentBtn ? '0 0 0 3px rgba(255,255,255,0.3)' : 'none';
        });
      }
    };
    document.addEventListener('click', this.viewChangeListener);

    // ✨ BOUTON PARAMÈTRES DU MENU
    const openSettingsBtn = document.getElementById('open-settings-btn');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        this.currentView = 'main';
        this.render();
        ipcRenderer.send('open-settings');
      });
    }

    // ✨ OPTIONS DE THÈME (checkboxes)
    setTimeout(() => {
      const blurToggle = document.getElementById('blur-background');
      const animToggle = document.getElementById('animations');
      const transToggle = document.getElementById('transparency');

      if (blurToggle && !blurToggle._themeListenerAdded) {
        blurToggle._themeListenerAdded = true;
        blurToggle.addEventListener('change', (e) => {
          console.log('[Blur] Changed to:', e.target.checked);
          localStorage.setItem('blur-background', e.target.checked);
          document.documentElement.setAttribute('data-blur', e.target.checked);
        });
      }

      if (animToggle && !animToggle._themeListenerAdded) {
        animToggle._themeListenerAdded = true;
        animToggle.addEventListener('change', (e) => {
          console.log('[Anim] Changed to:', e.target.checked);
          localStorage.setItem('animations', e.target.checked);
          document.documentElement.setAttribute('data-animations', e.target.checked);
        });
      }

      if (transToggle && !transToggle._themeListenerAdded) {
        transToggle._themeListenerAdded = true;
        transToggle.addEventListener('change', (e) => {
          console.log('[Trans] Changed to:', e.target.checked);
          localStorage.setItem('transparency', e.target.checked);
          document.documentElement.setAttribute('data-transparency', e.target.checked);
        });
      }
    }, 100);

    // ✨ RACCOURCIS CLAVIER GLOBAUX
    this.addTrackedListener('keyboard-launch', () => {
      const launchBtn = document.getElementById('launch-btn');
      if (launchBtn) launchBtn.click();
    });

    this.addTrackedListener('keyboard-settings', () => {
      ipcRenderer.send('open-settings');
    });

    this.addTrackedListener('keyboard-home', () => {
      this.currentView = 'main';
      this.render();
    });

    // ✅ NEWSLETTER - S'ABONNER
    setTimeout(() => {
      const newsletterBtn = document.getElementById('newsletter-btn');
      const newsletterEmail = document.getElementById('newsletter-email');
      
      if (newsletterBtn && newsletterEmail) {
        newsletterBtn.addEventListener('click', async () => {
          const email = newsletterEmail.value.trim();
          
          // Validation email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email || !emailRegex.test(email)) {
            alert('❌ Veuillez entrer une adresse email valide');
            return;
          }
          
          const originalText = newsletterBtn.textContent;
          newsletterBtn.disabled = true;
          newsletterBtn.textContent = '✓ Enregistrement...';
          
          try {
            // Sauvegarder l'email dans le localStorage
            const subscribers = JSON.parse(localStorage.getItem('newsletter-subscribers') || '[]');
            if (!subscribers.includes(email)) {
              subscribers.push(email);
              localStorage.setItem('newsletter-subscribers', JSON.stringify(subscribers));
            }
            
            // Envoyer l'email au serveur (optionnel)
            await ipcRenderer.invoke('subscribe-newsletter', { email });
            
            alert('✅ Merci ! Vous êtes abonné à la newsletter');
            newsletterEmail.value = '';
          } catch (error) {
            console.error('Erreur newsletter:', error);
            // Même si l'envoi échoue, on a sauvegardé localement
            alert('✅ Merci ! Vous êtes abonné à la newsletter');
            newsletterEmail.value = '';
          } finally {
            newsletterBtn.disabled = false;
            newsletterBtn.textContent = originalText;
          }
        });
        
        // Permettre d'appuyer sur Entrée pour s'abonner
        newsletterEmail.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            newsletterBtn.click();
          }
        });
      }
    }, 100);
/*
    // ✅ BOUTON RADIO - DÉLÉGATION D'ÉVÉNEMENTS (fonctionne sur toutes les pages)
    const existingRadioListener = this.listeners.get('radio-click');
    if (existingRadioListener) {
      document.removeEventListener('click', existingRadioListener);
    }
    
    const radioClickListener = (e) => {
      if (e.target.closest('[data-action="open-radio"]')) {
        this.openRadioPlayer();
      }
    };
    
    document.addEventListener('click', radioClickListener);
    this.listeners.set('radio-click', radioClickListener);
*/
        // ✅ PARTENAIRES - VISITER
    document.querySelectorAll('[data-visit-partner]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.visitPartner;
        require('electron').shell.openExternal(url);
      });
    });

    // ✅ VERSIONS - TÉLÉCHARGER JAR
    document.querySelectorAll('[data-download-version]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const version = btn.dataset.downloadVersion;
        // Ouvrir PaperMC pour cette version spécifique
        const paperMcUrl = `https://fill-ui.papermc.io/projects/paper/version/${version}`;
        require('electron').shell.openExternal(paperMcUrl);
      });
    });

    // ✅ PARTENAIRES - REJOINDRE SERVEUR
    document.querySelectorAll('[data-join-partner]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serverIP = btn.dataset.joinPartner;
        
        if (serverIP !== 'realms') {
          this.launchGame(serverIP);
        } else {
          require('electron').shell.openExternal('https://www.minecraft.net/realms');
        }
      });
    });

    // ✅ CONTACT PARTENAIRES
    document.getElementById('contact-partner-btn')?.addEventListener('click', () => {
      require('electron').shell.openExternal('mailto:contact.craftlauncher@gmail.com?subject=Devenir Partenaire');
    });

    // ✅ NETTOYER LES ANCIENS LISTENERS AVANT D'EN AJOUTER DE NOUVEAUX
    this.cleanupListeners();

    // ✅ ÉCOUTER LE SIGNAL DE DÉCONNEXION DEPUIS LES PARAMÈTRES
    this.addTrackedListener('logout-from-settings', async () => {
      console.log('📡 Disconnect signal received');
      
      this.currentView = 'login';
      this.authData = null;
      this.friends = [];
      this.news = [];
      this.profiles = [];
      this.selectedProfile = null;
      
      this.render();
      
      console.log('✅ Return to login page');
    });

    // ✅ ÉCOUTER LES MISES À JOUR DE PROGRESSION
    this.addTrackedListener('launch-progress', (event, progress) => {
      const progressContainer = document.getElementById('launch-progress-container');
      const progressBar = document.getElementById('launch-progress-bar');
      const progressText = document.getElementById('launch-progress-text');
      
      if (progressContainer && progressBar && progressText) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${progress.percent || 0}%`;
        progressText.textContent = `${progress.type || 'Téléchargement'}: ${progress.percent || 0}%`;
      }
    });

    // ✅ ÉCOUTER LES ERREURS DE LANCEMENT
    this.addTrackedListener('launch-error', (event, error) => {
      console.error('❌ Erreur lancement:', error);
      alert('❌ ' + error);
    });

    // ✅ ÉCOUTER LES CHANGEMENTS DE PARAMÈTRES
    this.addTrackedListener('settings-updated', (event, newSettings) => {
      console.log('⚡ Settings updated in real-time:', newSettings);
      this.settings = newSettings;
      
      // ✅ Mettre à jour le badge RAM IMMÉDIATEMENT
      const ramBadge = document.getElementById('ram-badge-display');
      if (ramBadge) {
        ramBadge.textContent = `${newSettings.ramAllocation || 4} GB RAM`;
        console.log('✅ RAM badge updated to:', newSettings.ramAllocation);
      }
      
      // Mettre à jour aussi dans le header si nécessaire
      const headerRam = document.getElementById('header-ram');
      if (headerRam) {
        headerRam.textContent = newSettings.ramAllocation || 4;
      }
      
      // Si on est sur l'accueil, on pourrait aussi re-render pour être sûr
      if (this.currentView === 'main') {
        // Optionnel: forcer la mise à jour visuelle
        this.renderContentAsync();
      }
    });

    // ✅ BOUTON LAUNCH
    const launchBtn = document.getElementById('launch-btn');
    if (launchBtn) {
      launchBtn.addEventListener('click', async () => {
        launchBtn.disabled = true;
        launchBtn.innerHTML = '⏳ Vérification...';
        
        try {
          const authData = await ipcRenderer.invoke('get-auth-data');
          
          if (authData && authData.type === 'offline') {
            const confirm = await ipcRenderer.invoke('show-confirm-dialog', {
              title: 'Mode Hors Ligne',
              message: '⚠️ Vous êtes en mode HORS LIGNE.\n\nLes nouvelles versions ne peuvent pas être téléchargées. Utilisez une version déjà installée ou connectez-vous avec Microsoft pour télécharger les mises à jour.'
            });
            
            if (!confirm) {
              launchBtn.disabled = false;
              launchBtn.innerHTML = `${icons.zap} Lancer Minecraft`;
              return;
            }
          }
          
          const result = await ipcRenderer.invoke('launch-minecraft', 
            this.selectedProfile || { version: '1.21.4', ram: 4 },
            null
          );
          
          if (!result.success) {
            alert('❌ ' + result.error);
          }
        } catch (error) {
          alert('❌ Erreur: ' + error.message);
        } finally {
          launchBtn.disabled = false;
          launchBtn.innerHTML = `${icons.zap} Lancer Minecraft`;
        }
      });
    }

    // ✅ HOME - BOUTON OUVRIR STOCKAGE
    const homeStorageBtn = document.getElementById('home-storage-btn');
    if (homeStorageBtn) {
      homeStorageBtn.addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('open-minecraft-folder');
        if (result.success) {
          console.log('✅ Dossier Minecraft ouvert');
        }
      });
    }

    // ✅ BOUTON PARAMÈTRES
    const homeSettingsBtn = document.getElementById('home-settings-btn');
    if (homeSettingsBtn) {
      homeSettingsBtn.addEventListener('click', () => {
        ipcRenderer.send('open-settings', { tab: 'account' });
      });
    }

    // ✅ BOUTON DISCORD
    const homeDiscordBtn = document.getElementById('home-discord-btn');
    if (homeDiscordBtn) {
      homeDiscordBtn.addEventListener('click', () => {
        ipcRenderer.send('open-settings', { tab: 'discord' });
      });
    }

    // Bouton Mods depuis accueil
    document.getElementById('home-mods-btn')?.addEventListener('click', () => {
      this.currentView = 'mods';
      this.render();
    });

    // Boutons rejoindre serveur rapide
    document.querySelectorAll('[data-join-quick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const serverIP = btn.dataset.joinQuick;
        this.launchGame(serverIP);
      });
    });

    // ✅ MENU NAVIGATION
    document.querySelectorAll('.menu-item').forEach(btn => {
      // ✅ CLEANUP: Supprimer les anciens listeners avant d'en ajouter de nouveaux
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', async () => {
        if (newBtn.dataset.view === 'settings') {
          ipcRenderer.send('open-settings');
          return;
        }
        
        if (newBtn.dataset.view === 'main') {
          await this.loadData();
          this.loadHomePageInfo();
        }
        
        this.currentView = newBtn.dataset.view;
        this.render();
      });
    });
    
    // ✅ CHANGEMENT DE VERSION
    document.getElementById('version-select')?.addEventListener('change', async (e) => {
      const version = e.target.value;
      
      try {
        const result = await ipcRenderer.invoke('update-profile-version', version);
        
        if (result.success) {
          this.selectedProfile = result.profile;
          
          // ✅ Mettre à jour le badge de version
          const versionBadge = document.getElementById('version-badge-display');
          if (versionBadge) {
            versionBadge.textContent = `Minecraft ${version}`;
          }
          
          console.log('✅ Version changed:', version);
        }
      } catch (error) {
        console.error('Erreur changement version:', error);
        e.target.value = this.selectedProfile?.version || '1.21.4';
      }
    });

    // ✅ HOME PAGE - CHARGER LES INFOS
    if (this.currentView === 'main') {
      this.loadHomePageInfo();
    }

    // ✅ AMIS
    document.getElementById('add-friend-btn')?.addEventListener('click', () => {
      this.showAddFriend = true;
      this.render();
      this.setupMainEvents();
    });

    document.getElementById('add-friend-btn-empty')?.addEventListener('click', () => {
      this.showAddFriend = true;
      this.render();
      this.setupMainEvents();
    });

    document.getElementById('save-friend-btn')?.addEventListener('click', async () => {
      const username = document.getElementById('friend-username').value.trim();
      if (!username) {
        alert('Entrez un pseudo valide');
        return;
      }
      
      try {
        const result = await ipcRenderer.invoke('add-friend', { username, online: false });
        if (result.success) {
          this.showAddFriend = false;
          await this.loadData();
          this.render();
          this.setupMainEvents();
        } else {
          alert('Erreur: ' + (result.error || 'Impossible d\'ajouter l\'ami'));
        }
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    });

    document.getElementById('cancel-friend-btn')?.addEventListener('click', () => {
      this.showAddFriend = false;
      this.render();
      this.setupMainEvents();
    });

    document.querySelectorAll('[data-remove-friend]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet ami ?')) {
          try {
            const result = await ipcRenderer.invoke('remove-friend', parseInt(btn.dataset.removeFriend));
            if (result.success) {
              await this.loadData();
              this.render();
              this.setupMainEvents();
            }
          } catch (error) {
            alert('Erreur: ' + error.message);
          }
        }
      });
    });

    // ✅ SERVEURS - REJOINDRE UN SERVEUR
    document.querySelectorAll('[data-join-server]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const serverIP = btn.dataset.joinServer;
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `${icons.zap} Connexion...`;
        
        try {
          const result = await ipcRenderer.invoke('ping-server', serverIP);
          
          if (result.online) {
            btn.innerHTML = `${icons.check} En ligne !`;
            btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            setTimeout(() => {
              this.launchGame(serverIP);
            }, 500);
          } else {
            btn.innerHTML = `${icons.x} Serveur hors ligne`;
            btn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
          }
          
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.style.background = '';
          }, 2000);
        } catch (error) {
          console.error('Erreur ping serveur:', error);
          btn.innerHTML = `${icons.x} Erreur`;
          btn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
          
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.style.background = '';
          }, 2000);
        }
      });
    });

    // ✅ SERVEUR PERSONNALISÉ
    document.getElementById('join-custom-server')?.addEventListener('click', async () => {
      const ip = document.getElementById('custom-server-ip').value.trim();
      if (!ip) {
        alert('Veuillez entrer une adresse IP de serveur');
        return;
      }
      
      const btn = document.getElementById('join-custom-server');
      const originalText = btn.innerHTML;
      
      btn.disabled = true;
      btn.innerHTML = `${icons.zap} Vérification...`;
      
      try {
        const result = await ipcRenderer.invoke('ping-server', ip);
        
        if (result.online) {
          btn.innerHTML = `${icons.check} Serveur actif !`;
          
          setTimeout(() => {
            this.launchGame(ip);
            btn.disabled = false;
            btn.innerHTML = originalText;
          }, 500);
        } else {
          alert('❌ Le serveur est actuellement hors ligne');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (error) {
        alert('❌ Impossible de vérifier le serveur: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

    // ✅ NEWS
    document.querySelectorAll('[data-view="news"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.currentView = 'news';
        this.render();
        this.setupMainEvents();
        
        const newsContainer = document.getElementById('news-container');
        if (newsContainer && this.news.length > 0) {
          newsContainer.innerHTML = this.news.map(item => `
            <div class="news-card">
              <h3>${item.title}</h3>
              <p class="news-date">${new Date(item.date).toLocaleDateString('fr-FR')}</p>
              <p>${item.text}</p>
              <a href="${item.url}" class="btn-secondary" style="display: inline-block; margin-top: 10px;">Lire plus</a>
            </div>
          `).join('');
        }
      });
    });

    // ✅ SYSTÈME DE THÈME - SÉLECTIONNER UN THÈME
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const theme = btn.dataset.theme;
        this.theme = theme;
        this.saveTheme();
        this.applyTheme();
        this.render();
        this.setupMainEvents();
      });
    });
    

    // ✅ SYSTÈME DE THÈME - PERSONNALISER
    const saveCustomThemeBtn = document.getElementById('save-custom-theme');
    if (saveCustomThemeBtn) {
      saveCustomThemeBtn.addEventListener('click', () => {
        this.customTheme.primaryColor = document.getElementById('custom-primary')?.value || this.customTheme.primaryColor;
        this.customTheme.secondaryColor = document.getElementById('custom-secondary')?.value || this.customTheme.secondaryColor;
        this.customTheme.accentColor = document.getElementById('custom-accent')?.value || this.customTheme.accentColor;
        this.customTheme.textColor = document.getElementById('custom-text')?.value || this.customTheme.textColor;
        
        this.theme = 'custom';
        this.saveTheme();
        this.applyTheme();
        this.render();
        this.setupMainEvents();
      });
    }

    // ✅ SYSTÈME DE THÈME - SYNC INPUTS
    document.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const nextInput = e.target.nextElementSibling;
        if (nextInput && nextInput.type === 'text') {
          nextInput.value = e.target.value;
        }
      });
    });
  }

  async launchGame(serverIP = null) {
    // ✅ PROTECTION: Éviter les doubles lancements
    if (this.isLaunching) {
      console.warn('⚠️ Launch already in progress, ignored');
      return;
    }

    const launchBtn = document.getElementById('launch-btn');
    if (!launchBtn || !this.selectedProfile) return;

    this.isLaunching = true;
    const originalText = launchBtn.innerHTML;
    launchBtn.disabled = true;
    launchBtn.innerHTML = '<span style="font-size: 20px;">⏳</span> Lancement en cours...';

    try {
      const result = await ipcRenderer.invoke('launch-minecraft', this.selectedProfile, serverIP);
      
      if (!result.success) {
        launchBtn.disabled = false;
        launchBtn.innerHTML = originalText;
        this.isLaunching = false;
        alert('Erreur: ' + result.error);
        return;
      }

      launchBtn.innerHTML = '<span style="font-size: 20px;">✓</span> Minecraft lancé !';
      
      setTimeout(() => {
        launchBtn.disabled = false;
        launchBtn.innerHTML = originalText;
        this.isLaunching = false;
      }, 2000);

    } catch (error) {
      launchBtn.disabled = false;
      launchBtn.innerHTML = originalText;
      this.isLaunching = false;
      alert('Erreur: ' + error.message);
    }
  }

  // ✨ NOUVELLES VUES

  async renderStatsView() {
    const html = await this.features.renderGameStats();
    return `
      <div class="view-container" style="padding: 20px;">
        ${html}
      </div>
    `;
  }

  renderComingSoonView() {
    return `
      <div class="view-container" style="display: flex; align-items: center; justify-content: center; min-height: 600px; position: relative; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); border-radius: 16px;">
        <div style="text-align: center; color: #e2e8f0;">
          <div style="font-size: 64px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;">🚀</div>
          <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 10px;">Fonctionnalité à venir !</h2>
          <p style="color: #94a3b8; font-size: 16px; max-width: 400px; margin: 0 auto;">
            Cette fonctionnalité arrivera très bientôt. Restez connecté pour les dernières actualités ! 🎮
          </p>
          <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
            <div style="background: rgba(99, 102, 241, 0.2); padding: 12px 20px; border-radius: 10px; color: #6366f1; font-weight: 600;">
              ⏱️ Très bientôt
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ✅ SYSTÈME DE THÈME PERSONNALISÉ
  loadTheme() {
    const savedTheme = localStorage.getItem('craftlauncher-theme') || 'normal';
    const savedCustom = localStorage.getItem('craftlauncher-custom-theme');
    
    this.theme = savedTheme;
    if (savedCustom) {
      this.customTheme = JSON.parse(savedCustom);
    }
    
    this.applyTheme();
  }

  reapplyTheme() {
    // Charger et réappliquer le thème light/dark sauvegardé
    const theme = localStorage.getItem('theme') || 'dark';
    const accent = localStorage.getItem('accent') || 'indigo';
    
    this.applyThemeSelection(theme);
    this.applyAccentColor(accent);
  }

  applyTheme() {
    const root = document.documentElement;
    let colors;

    switch (this.theme) {
      case 'blanc':
        colors = {
          primary: '#4f46e5',
          secondary: '#7c3aed',
          background: '#ffffff',
          text: '#1e293b',
          accent: '#06b6d4'
        };
        break;
      case 'noir':
        colors = {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#000000',
          text: '#ffffff',
          accent: '#10b981'
        };
        break;
      case 'custom':
        colors = {
          primary: this.customTheme.primaryColor,
          secondary: this.customTheme.secondaryColor,
          background: this.customTheme.backgroundColor,
          text: this.customTheme.textColor,
          accent: this.customTheme.accentColor
        };
        break;
      case 'normal':
      default:
        colors = {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#0f172a',
          text: '#e2e8f0',
          accent: '#10b981'
        };
    }

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-accent', colors.accent);

    document.body.style.background = colors.background;
    document.body.style.color = colors.text;
  }

  saveTheme() {
    localStorage.setItem('craftlauncher-theme', this.theme);
    if (this.theme === 'custom') {
      localStorage.setItem('craftlauncher-custom-theme', JSON.stringify(this.customTheme));
    }
  }

  applyThemeSelection(theme) {
    const root = document.documentElement;
    
    console.log('[Theme] Applying theme:', theme);
    localStorage.setItem('theme', theme);
    
    // Ajouter/retirer le style global pour les couleurs
    let styleId = 'theme-dynamic-styles';
    let existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();
    
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    
    if (theme === 'light') {
      styleEl.textContent = `
        * { color: #000000 !important; }
        .brand-user { color: #000000 !important; }
        .menu-item { color: #000000 !important; }
        .view-title { color: #000000 !important; }
        h1, h2, h3, h4, h5, h6 { color: #000000 !important; }
        p, span, div, label { color: #000000 !important; }
      `;
    }
    document.head.appendChild(styleEl);
    
    // Appliquer sur body et document
    if (theme === 'dark') {
      document.body.style.background = '#0f172a';
      document.body.style.color = '#e2e8f0';
    } else if (theme === 'light') {
      document.body.style.background = '#f1f5f9';
      document.body.style.color = '#000000';
    }
    
    // Appliquer aussi sur .main-layout, .sidebar, .main-content
    const mainLayout = document.querySelector('.main-layout');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (mainLayout) {
      if (theme === 'dark') {
        mainLayout.style.background = '#0f172a';
        mainLayout.style.color = '#e2e8f0';
      } else {
        mainLayout.style.background = '#f1f5f9';
        mainLayout.style.color = '#000000';
      }
    }
    
    if (sidebar) {
      if (theme === 'dark') {
        sidebar.style.background = 'rgba(15, 23, 42, 0.8)';
        sidebar.style.color = '#e2e8f0';
      } else {
        sidebar.style.background = 'rgba(241, 245, 249, 0.9)';
        sidebar.style.color = '#000000';
      }
    }
    
    if (mainContent) {
      if (theme === 'dark') {
        mainContent.style.background = '#0f172a';
      } else {
        mainContent.style.background = '#f1f5f9';
      }
    }
  }

  applyAccentColor(accent) {
    const root = document.documentElement;
    const colors = {
      indigo: '#6366f1',
      purple: '#a855f7',
      blue: '#3b82f6',
      cyan: '#06b6d4'
    };
    
    const accentColor = colors[accent];
    
    console.log('[Accent] Applying accent:', accent, accentColor);
    localStorage.setItem('accent', accent);
    
    // Mettre à jour la variable CSS
    root.style.setProperty('--color-accent', accentColor);
    
    // Mettre à jour TOUS les éléments avec l'accent
    document.querySelectorAll('.btn-primary').forEach(el => {
      el.style.background = accentColor;
    });
    
    document.querySelectorAll('.accent-option').forEach(el => {
      if (el.dataset.accent === accent) {
        el.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.3)';
      } else {
        el.style.boxShadow = 'none';
      }
    });
    
    document.querySelectorAll('.menu-item.active').forEach(el => {
      el.style.color = accentColor;
    });
    
    document.querySelectorAll('a').forEach(el => {
      el.style.color = accentColor;
    });
    
    // Ajouter/retirer le style global pour les accents
    let styleId = 'accent-dynamic-styles';
    let existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();
    
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      .btn-primary { background: ${accentColor} !important; }
      .btn-secondary:hover { border-color: ${accentColor} !important; color: ${accentColor} !important; }
      .accent-option[data-accent="${accent}"] { box-shadow: 0 0 0 3px rgba(255,255,255,0.3) !important; }
      .menu-item.active { color: ${accentColor} !important; }
      a { color: ${accentColor} !important; }
      .view-title { color: ${accentColor} !important; }
    `;
    document.head.appendChild(styleEl);
  }

  renderThemeSettings() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const currentAccent = localStorage.getItem('accent') || 'indigo';

    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Thème et apparence</h1>
        </div>

        <div style="max-width: 800px; margin: 0 auto;">
          <!-- Thème Clair/Sombre -->
          <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h3 style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 18px;">Mode d'affichage</h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <!-- Mode Sombre (Défaut) -->
              <button class="theme-option" data-theme="dark" style="background: rgba(15, 23, 42, 0.8); border: 2px solid ${currentTheme === 'dark' ? '#6366f1' : 'rgba(99, 102, 241, 0.3)'}; border-radius: 10px; padding: 20px; cursor: pointer; text-align: center; color: #e2e8f0; transition: all 0.3s; font-weight: 600;">
                <div style="font-size: 32px; margin-bottom: 8px;">🌙</div>
                <div>Mode sombre</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Défaut</div>
              </button>

              <!-- Mode Clair -->
              <button class="theme-option" data-theme="light" style="background: rgba(241, 245, 249, 0.8); border: 2px solid ${currentTheme === 'light' ? '#4f46e5' : 'rgba(99, 102, 241, 0.3)'}; border-radius: 10px; padding: 20px; cursor: pointer; text-align: center; color: #1e293b; transition: all 0.3s; font-weight: 600;">
                <div style="font-size: 32px; margin-bottom: 8px;">☀️</div>
                <div>Mode clair</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Thème light</div>
              </button>
            </div>
          </div>

          <!-- Accents de couleur -->
          <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h3 style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 18px;">Couleur d'accent</h3>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <button class="accent-option" data-accent="indigo" style="background: #6366f1; border: 2px solid #6366f1; border-radius: 10px; padding: 24px; cursor: pointer; transition: all 0.3s; color: white; font-weight: 600; font-size: 14px; ${currentAccent === 'indigo' ? 'box-shadow: 0 0 0 3px rgba(255,255,255,0.3);' : ''}">
                Indigo
              </button>
              <button class="accent-option" data-accent="purple" style="background: #a855f7; border: 2px solid #a855f7; border-radius: 10px; padding: 24px; cursor: pointer; transition: all 0.3s; color: white; font-weight: 600; font-size: 14px; ${currentAccent === 'purple' ? 'box-shadow: 0 0 0 3px rgba(255,255,255,0.3);' : ''}">
                Violet
              </button>
              <button class="accent-option" data-accent="blue" style="background: #3b82f6; border: 2px solid #3b82f6; border-radius: 10px; padding: 24px; cursor: pointer; transition: all 0.3s; color: white; font-weight: 600; font-size: 14px; ${currentAccent === 'blue' ? 'box-shadow: 0 0 0 3px rgba(255,255,255,0.3);' : ''}">
                Bleu
              </button>
              <button class="accent-option" data-accent="cyan" style="background: #06b6d4; border: 2px solid #06b6d4; border-radius: 10px; padding: 24px; cursor: pointer; transition: all 0.3s; color: white; font-weight: 600; font-size: 14px; ${currentAccent === 'cyan' ? 'box-shadow: 0 0 0 3px rgba(255,255,255,0.3);' : ''}">
                Cyan
              </button>
            </div>
          </div>

          <!-- Options supplémentaires -->
          <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 24px;">
            <h3 style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 18px;">Options</h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: #e2e8f0;">
                <input type="checkbox" id="blur-background" ${localStorage.getItem('blur-background') !== 'false' ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>Activer le blur en arrière-plan</span>
              </label>
              
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: #e2e8f0;">
                <input type="checkbox" id="animations" ${localStorage.getItem('animations') !== 'false' ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>Activer les animations</span>
              </label>

              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: #e2e8f0;">
                <input type="checkbox" id="transparency" ${localStorage.getItem('transparency') !== 'false' ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>Activer la transparence</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CraftLauncherApp();
});
