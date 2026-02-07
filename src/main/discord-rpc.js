const DiscordRPC = require('discord-rpc');
const EventEmitter = require('events');

class DiscordPresence extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.clientId = options.clientId || '1459481513513975971';
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 2000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    
    // État
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.enabled = true;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.activityUpdateTimeout = null;
    
    // Activité actuelle
    this.currentActivity = null;
    this.activityQueue = [];
    
    // Timestamps
    this.startTimestamp = Date.now();
    
    // Promise pour attendre le ready event
    this.readyPromise = null;
    this.readyResolve = null;
    
    // Paramètres RPC de l'utilisateur
    this.rpcSettings = {
      showStatus: true,
      showDetails: true,
      showImage: true
    };
  }

  /**
   * Initialiser la connexion Discord RPC avec retries
   */
  async initializeWithRetry(maxRetries = 3, delayBetweenRetries = 1000) {
    console.log(`🔄 Attempting to connect to Discord (max ${maxRetries} retries)...`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📍 Attempt ${attempt}/${maxRetries}...`);
      
      const success = await this.initialize();
      
      if (success) {
        console.log('✅ Connection successful!');
        return true;
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${delayBetweenRetries}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
      }
    }
    
    console.log('❌ Failed to connect after all retries');
    return false;
  }

  /**
   * Initialiser la connexion Discord RPC
   */
  async initialize() {
    if (!this.enabled) {
      console.log('⚠️ Discord RPC disabled');
      return false;
    }

    if (this.isConnecting) {
      console.log('⚠️ Connection already in progress...');
      return false;
    }

    if (this.isConnected) {
      console.log('✅ Already connected to Discord');
      return true;
    }

    try {
      this.isConnecting = true;
      console.log('🔗 Connecting to Discord RPC with Client ID:', this.clientId);

      // Create a new client
      this.client = new DiscordRPC.Client({ 
        transport: 'ipc'
      });

      console.log('✓ Discord RPC client created');

      // Create a Promise to wait for the ready event
      this.readyPromise = new Promise((resolve, reject) => {
        // 15 second timeout for the ready event
        const readyTimeout = setTimeout(() => {
          console.error('⏱️ Ready event timeout reached after 15s');
          reject(new Error('Timeout waiting for ready (15s)'));
        }, 15000);

        this.readyResolve = () => {
          console.log('🎯 Ready event resolved');
          clearTimeout(readyTimeout);
          resolve();
        };
      });

      // Configure event handlers BEFORE connection
      this.setupEventHandlers();

      console.log('✓ Event handlers configured');

      // Connect with timeout
      console.log('⏳ Attempting login...');
      await Promise.race([
        this.client.login({ clientId: this.clientId }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
        )
      ]);

      console.log('✓ Login completed, waiting for ready...');
      
      // Wait for the ready event
      await this.readyPromise;

      console.log('✓ Ready event received');
      return true;

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Error during Discord RPC connection:', error.message);
      console.error('Stack:', error.stack);
      this.handleConnectionError(error);
      return false;
    }
  }

  /**
   * Configurer les gestionnaires d'événements
   */
  setupEventHandlers() {
    if (!this.client) return;

    console.log('📡 Configuring Discord event handlers');

    // Connexion réussie
    this.client.on('ready', () => {
      console.log(`✅ Discord RPC READY - User: ${this.client.user?.username || 'Unknown'}`);
      
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Résoudre la Promise d'attente du ready
      if (this.readyResolve) {
        this.readyResolve();
        this.readyResolve = null;
      }
      
      this.emit('connected', this.client.user);
      
      // Appliquer l'activité en attente
      if (this.currentActivity) {
        this.applyActivity(this.currentActivity);
      }
    });

    // Déconnexion
    this.client.on('disconnected', () => {
      console.log('⚠️ Discord RPC DISCONNECTED');
      
      this.isConnected = false;
      this.isConnecting = false;
      
      this.emit('disconnected');
      
      // Tenter une reconnexion automatique
      if (this.autoReconnect && this.enabled) {
        this.scheduleReconnect();
      }
    });

    // Erreurs
    this.client.on('error', (error) => {
      console.error('❌ Discord RPC ERROR:', error);
      console.error('  Message:', error?.message || 'Unknown');
      console.error('  Code:', error?.code || 'Unknown');
      this.emit('error', error);
    });

    // Debug - tous les événements de debug
    this.client.on('debug', (info) => {
      console.log('🔧 Discord Debug:', info);
    });
    
    // Ajouter un listener pour les événements non gérés
    this.client.on('activity_join', (secret) => {
      console.log('📢 Discord activity_join:', secret);
    });
    
    this.client.on('activity_spectate', (secret) => {
      console.log('📢 Discord activity_spectate:', secret);
    });
    
    this.client.on('activity_join_request', (user) => {
      console.log('📢 Discord activity_join_request:', user);
    });
  }

  /**
   * Gérer les erreurs de connexion
   */
  handleConnectionError(error) {
    console.error('❌ Erreur de connexion Discord:', error.message);
    
    this.emit('connectionError', error);

    // Tenter une reconnexion si activée
    if (this.autoReconnect && this.enabled) {
      this.scheduleReconnect();
    }
  }

  /**
   * Planifier une reconnexion
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Nombre maximum de tentatives de reconnexion atteint (${this.maxReconnectAttempts})`);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);

    console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      this.initialize();
    }, delay);
  }

  /**
   * Appliquer une activité
   */
  async applyActivity(activity) {
    if (!this.isConnected || !this.client) {
      console.log('⚠️ Not connected, activity queued');
      this.currentActivity = activity;
      return false;
    }

    try {
      // Nettoyer le timeout précédent
      if (this.activityUpdateTimeout) {
        clearTimeout(this.activityUpdateTimeout);
      }

      // Appliquer l'activité avec un délai pour éviter le spam
      this.activityUpdateTimeout = setTimeout(async () => {
        try {
          await this.client.setActivity(activity);
          console.log('✅ Discord activity updated:', activity.details);
          this.emit('activityUpdated', activity);
        } catch (error) {
          console.error('❌ Error updating activity:', error.message);
          this.emit('activityUpdateError', error);
        }
      }, 100);

      return true;

    } catch (error) {
      console.error('❌ Error applying activity:', error.message);
      return false;
    }
  }

  /**
   * Mettre à jour l'activité
   */
  async updateActivity(activity) {
    this.currentActivity = activity;
    return await this.applyActivity(activity);
  }

  /**
   * État: Dans le launcher
   */
  /**
   * Update RPC settings
   */
  updateRPCSettings(settings) {
    this.rpcSettings = {
      showStatus: settings.showStatus !== false,
      showDetails: settings.showDetails !== false,
      showImage: settings.showImage !== false
    };
    
    console.log('🔧 RPC settings updated:', this.rpcSettings);
    
    // Reapply the activity with the new settings
    if (this.currentActivity) {
      this.applyActivity(this.currentActivity);
    }
  }

  /**
   * État: Dans le launcher
   */
  async setLauncher(username = 'Joueur', options = {}) {
    const activity = {
      details: this.rpcSettings.showDetails ? '📦 Dans le launcher' : undefined,
      state: this.rpcSettings.showStatus ? `👤 ${username}` : undefined,
      startTimestamp: this.startTimestamp,
      largeImageKey: this.rpcSettings.showImage ? 'minecraft' : undefined,
      largeImageText: this.rpcSettings.showImage ? 'CraftLauncher' : undefined,
      instance: false,
    };

    return await this.updateActivity(activity);
  }

  /**
   * État: En train de jouer
   */
  async setPlaying(version, options = {}) {
    // S'assurer que options est un objet
    if (!options || typeof options !== 'object') {
      options = {};
    }

    const { server, players, modpack } = options;
    
    let state = this.rpcSettings.showStatus ? `🎮 Version ${version}` : undefined;
    
    if (modpack && this.rpcSettings.showStatus) {
      state = `📦 ${modpack}`;
    }
    
    const activity = {
      details: this.rpcSettings.showDetails ? '⚔️ En train de jouer à Minecraft' : undefined,
      state: state,
      startTimestamp: Date.now(),
      largeImageKey: this.rpcSettings.showImage ? 'minecraft' : undefined,
      largeImageText: this.rpcSettings.showImage ? 'CraftLauncher' : undefined,
      smallImageKey: this.rpcSettings.showImage ? 'play' : undefined,
      smallImageText: this.rpcSettings.showImage ? 'En jeu' : undefined,
      instance: false,
    };

    // Ajouter les informations du serveur si disponibles
    if (server && this.rpcSettings.showStatus) {
      activity.partyId = `server_${server}`;
      activity.partySize = players?.current || 1;
      activity.partyMax = players?.max || 100;
      
      activity.state += ` | 🌐 ${server}`;
    }

    // Boutons (optionnel - nécessite configuration sur Discord Developer Portal)
    if (options.buttons) {
      activity.buttons = options.buttons;
    }

    return await this.updateActivity(activity);
  }

  /**
   * État: Téléchargement
   */
  async setDownloading(version, progress = null) {
    let state = this.rpcSettings.showStatus ? '⏳ Installation en cours...' : undefined;
    
    if (progress !== null && this.rpcSettings.showStatus) {
      state = `⏳ ${Math.round(progress)}% téléchargé`;
    }

    const activity = {
      details: this.rpcSettings.showDetails ? `📥 Téléchargement v${version}` : undefined,
      state: state,
      startTimestamp: Date.now(),
      largeImageKey: this.rpcSettings.showImage ? 'minecraft' : undefined,
      largeImageText: this.rpcSettings.showImage ? 'CraftLauncher' : undefined,
      smallImageKey: this.rpcSettings.showImage ? 'download' : undefined,
      smallImageText: this.rpcSettings.showImage ? 'Téléchargement' : undefined,
      instance: false,
    };

    return await this.updateActivity(activity);
  }

  /**
   * État: Menu principal
   */
  async setMainMenu(version) {
    const activity = {
      details: this.rpcSettings.showDetails ? '🏠 Menu principal' : undefined,
      state: this.rpcSettings.showStatus ? `Version ${version}` : undefined,
      startTimestamp: Date.now(),
      largeImageKey: this.rpcSettings.showImage ? 'minecraft' : undefined,
      largeImageText: this.rpcSettings.showImage ? 'CraftLauncher' : undefined,
      instance: false,
    };

    return await this.updateActivity(activity);
  }

  /**
   * État: Dans un serveur
   */
  async setInServer(serverName, playerCount = null) {
    let state = this.rpcSettings.showStatus ? `🌐 ${serverName}` : undefined;
    
    if (playerCount && this.rpcSettings.showStatus) {
      state += ` | 👥 ${playerCount.current}/${playerCount.max}`;
    }

    const activity = {
      details: this.rpcSettings.showDetails ? '⚔️ Sur un serveur' : undefined,
      state: state,
      startTimestamp: Date.now(),
      largeImageKey: this.rpcSettings.showImage ? 'minecraft' : undefined,
      largeImageText: this.rpcSettings.showImage ? 'CraftLauncher' : undefined,
      smallImageKey: this.rpcSettings.showImage ? 'server' : undefined,
      smallImageText: this.rpcSettings.showImage ? serverName : undefined,
      instance: false,
    };

    if (playerCount) {
      activity.partySize = playerCount.current;
      activity.partyMax = playerCount.max;
    }

    return await this.updateActivity(activity);
  }

  /**
   * État: AFK / Inactif
   */
  async setIdle(message = 'Inactif') {
    const activity = {
      details: '💤 Inactif',
      state: message,
      startTimestamp: this.startTimestamp,
      largeImageKey: 'minecraft',
      largeImageText: 'CraftLauncher',
      instance: false,
    };

    return await this.updateActivity(activity);
  }

  /**
   * Clear the activity
   */
  async clear() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.clearActivity();
      this.currentActivity = null;
      console.log('🧹 Discord activity cleared');
      this.emit('activityCleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing activity:', error.message);
      return false;
    }
  }

  /**
   * Disconnect cleanly
   */
  async disconnect() {
    console.log('🔌 Disconnecting from Discord RPC...');

    // Cancel reconnections
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.activityUpdateTimeout) {
      clearTimeout(this.activityUpdateTimeout);
      this.activityUpdateTimeout = null;
    }

    // Clear the activity
    await this.clear();

    // Destroy the client
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.error('Error during destruction:', error.message);
      }
      
      this.client = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.currentActivity = null;

    console.log('✅ Discord RPC disconnected');
    this.emit('destroyed');
    
    return true;
  }

  /**
   * Détruire complètement
   */
  async destroy() {
    this.enabled = false;
    await this.disconnect();
    this.removeAllListeners();
  }

  /**
   * Activer/Désactiver
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (!enabled && this.isConnected) {
      this.disconnect();
    } else if (enabled && !this.isConnected) {
      this.initialize();
    }
  }

  /**
   * Réinitialiser le timestamp de démarrage
   */
  resetStartTime() {
    this.startTimestamp = Date.now();
  }

  /**
   * Obtenir le statut
   */
  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      enabled: this.enabled,
      reconnectAttempts: this.reconnectAttempts,
      currentActivity: this.currentActivity,
      user: this.client?.user || null,
    };
  }

  /**
   * Tester la connexion
   */
  async test() {
    if (!this.isConnected) {
      return { 
        success: false, 
        message: '❌ Discord non connecté',
        status: this.getStatus()
      };
    }

    try {
      await this.setLauncher('Test User');
      
      return { 
        success: true, 
        message: '✅ Discord RPC fonctionne parfaitement !',
        user: this.client.user,
        status: this.getStatus()
      };
    } catch (error) {
      return { 
        success: false, 
        message: `❌ Erreur: ${error.message}`,
        status: this.getStatus()
      };
    }
  }

  // Alias pour compatibilité
  async connect() {
    return await this.initialize();
  }

  async setInLauncher(username) {
    return await this.setLauncher(username);
  }
}

module.exports = DiscordPresence;