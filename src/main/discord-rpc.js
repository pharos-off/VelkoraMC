const DiscordRPC = require('discord-rpc');

// Configuration
const CONFIG = {
  clientId: '1459481513513975971',
  updateInterval: 15000,
  reconnectDelay: 5000,
};

// États possibles
const STATES = {
  LAUNCHER: 'launcher',
  IN_GAME: 'in_game',
  MENU: 'menu',
  LOADING: 'loading',
  DOWNLOADING: 'downloading',
};

class DiscordRichPresence {
  constructor() {
    this.client = new DiscordRPC.Client({ transport: 'ipc' });
    this.currentState = STATES.LAUNCHER;
    this.startTimestamp = Date.now();
    this.connected = false;
    this.activityData = {
      username: 'Joueur',
      version: null,
      server: null,
      players: null,
      maxPlayers: null,
    };
  }

  get isConnected() {
    return this.connected;
  }

  async connect() {
    if (this.connected) return true;
    
    try {
      // Nettoyer les anciens listeners
      this.client.removeAllListeners('ready');
      this.client.removeAllListeners('disconnected');
      
      this.client.on('ready', () => {
        this.connected = true;
        this.updatePresence();
      });

      this.client.on('disconnected', () => {
        this.connected = false;
        this.reconnect();
      });

      await this.client.login({ clientId: CONFIG.clientId });
      this.connected = true;
      return true;
    } catch (error) {
      this.reconnect();
      return false;
    }
  }

  reconnect() {
    setTimeout(() => {
      this.connect();
    }, CONFIG.reconnectDelay);
  }

  async initialize() {
    return await this.connect();
  }

  setState(state, data = {}) {
    this.currentState = state;
    this.activityData = { ...this.activityData, ...data };
    this.updatePresence();
  }

  setPlayerData(data) {
    this.activityData = { ...this.activityData, ...data };
    this.updatePresence();
  }

  getActivity() {
    const baseActivity = {
      startTimestamp: this.startTimestamp,
      largeImageKey: 'minecraft',
      largeImageText: 'CraftLauncher',
      instance: false,
    };

    switch (this.currentState) {
      case STATES.LAUNCHER:
        return {
          ...baseActivity,
          details: 'Dans le launcher',
          state: 'Prêt à jouer',
          smallImageKey: 'launcher',
          smallImageText: 'CraftLauncher',
        };

      case STATES.DOWNLOADING:
        return {
          ...baseActivity,
          details: `Téléchargement ${this.activityData.version || ''}`,
          state: 'Installation en cours...',
          smallImageKey: 'downloading',
          smallImageText: 'Téléchargement',
        };

      case STATES.LOADING:
        return {
          ...baseActivity,
          details: 'Chargement du jeu',
          state: `Version: ${this.activityData.version || 'Latest'}`,
          smallImageKey: 'loading',
          smallImageText: 'Chargement',
        };

      case STATES.MENU:
        return {
          ...baseActivity,
          details: 'Dans les menus',
          state: `Joueur: ${this.activityData.username}`,
          smallImageKey: 'menu',
          smallImageText: 'Menu',
        };

      case STATES.IN_GAME:
        const stateInfo = [];
        
        if (this.activityData.version) {
          stateInfo.push(`v${this.activityData.version}`);
        }
        
        if (this.activityData.server) {
          stateInfo.push(`Serveur: ${this.activityData.server}`);
        }
        
        if (this.activityData.players !== null && this.activityData.maxPlayers) {
          stateInfo.push(`[${this.activityData.players}/${this.activityData.maxPlayers}]`);
        }

        return {
          ...baseActivity,
          details: 'En train de jouer à Minecraft',
          state: stateInfo.join(' • ') || 'En jeu',
          smallImageKey: 'playing',
          smallImageText: 'En jeu',
        };

      default:
        return baseActivity;
    }
  }

  updatePresence() {
    if (!this.connected) return;

    const activity = this.getActivity();
    
    this.client.setActivity(activity).catch(() => {});
  }

  clearPresence() {
    if (this.connected) {
      this.client.clearActivity();
    }
  }

  destroy() {
    if (this.connected) {
      this.clearPresence();
      this.client.destroy();
    }
  }

  async disconnect() {
    this.destroy();
    return true;
  }
}

module.exports = DiscordRichPresence;