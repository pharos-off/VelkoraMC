// discord-handlers.js
const { ipcMain } = require('electron');

let currentSettingsWindow = null;
let currentDiscordRPC = null;

// ✅ Fonction pour mettre à jour la référence à la fenêtre settings
function setSettingsWindow(window) {
  currentSettingsWindow = window;
  console.log('🧦 Settings window registered for Discord RPC');
  
  // Envoyer le statut initial si Discord est connecté
  if (window && currentSettingsWindow && !currentSettingsWindow.isDestroyed()) {
    setTimeout(() => {
      broadcastDiscordStatus();
    }, 500);
  }
}

// ✅ Fonction pour envoyer le statut à la fenêtre settings
function broadcastDiscordStatus(discordRPC) {
  const rpc = discordRPC || currentDiscordRPC;
  if (currentSettingsWindow && !currentSettingsWindow.isDestroyed() && rpc) {
    const status = rpc.getStatus();
    console.log('📡 Sending Discord status to settings:', status.connected);
    currentSettingsWindow.webContents.send('discord-status-changed', {
      connected: status.connected,
      connecting: status.connecting,
      enabled: status.enabled,
      user: status.user
    });
  }
}

function setupDiscordHandlers(discordRPC, store, settingsWindow) {
  // Stocker discordRPC au niveau du module pour l'utiliser dans les handlers
  currentDiscordRPC = discordRPC;
  
  // ✅ Enregistrer la fenêtre settings
  if (settingsWindow) {
    setSettingsWindow(settingsWindow);
  }
  
  // ✅ Ajouter des listeners pour mettre à jour l'UI quand Discord change
  if (discordRPC) {
    discordRPC.on('connected', (user) => {
      console.log('✅ Discord connected - Reporting to settings');
      broadcastDiscordStatus();
    });

    discordRPC.on('disconnected', () => {
      console.log('❌ Discord disconnected - Reporting to settings');
      broadcastDiscordStatus();
    });

    discordRPC.on('error', (error) => {
      console.error('⚠️ Erreur Discord - Signalement aux settings');
      broadcastDiscordStatus();
    });
  }
  
  // ✅ Handler pour quand settings s'ouvre
  ipcMain.handle('settings-window-ready', async (event) => {
    console.log('📨 Settings window ready');
    broadcastDiscordStatus();
    return { success: true };
  });
  
  ipcMain.handle('get-discord-status', async (event) => {
    try {
      if (!discordRPC) {
        return {
          connected: false,
          connecting: false,
          enabled: false,
          reconnectAttempts: 0,
          user: null
        };
      }

      const status = discordRPC.getStatus();
      console.log('📊 Discord status returned:', status);
      return status;
    } catch (error) {
      console.error('Erreur get-discord-status:', error);
      return {
        connected: false,
        connecting: false,
        enabled: false,
        reconnectAttempts: 0,
        user: null,
        error: error.message
      };
    }
  });

  ipcMain.handle('test-discord-rpc', async (event) => {
    try {
      if (!discordRPC) {
        return {
          success: false,
          message: 'Discord RPC non initialisé',
          status: null
        };
      }

      const result = await discordRPC.test();
      console.log('🧪 Discord test result:', result);
      return result;
    } catch (error) {
      console.error('Erreur test-discord-rpc:', error);
      return {
        success: false,
        message: error.message,
        status: discordRPC ? discordRPC.getStatus() : null
      };
    }
  });

  ipcMain.handle('reconnect-discord-rpc', async (event) => {
    try {
      if (!discordRPC) {
        return { success: false, message: 'Discord RPC non initialisé' };
      }

      console.log('🔄 Reconnexion Discord en cours...');
      await discordRPC.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await discordRPC.initialize();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const status = discordRPC.getStatus();
      
      return {
        success: status.connected,
        message: status.connected ? 'Reconnecté avec succès' : 'Échec de la reconnexion',
        status: status
      };
    } catch (error) {
      console.error('Erreur reconnect-discord-rpc:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle('get-discord-settings', async (event) => {
    try {
      const rpc = currentDiscordRPC || discordRPC;
      const status = rpc ? rpc.getStatus() : {
        connected: false,
        connecting: false,
        enabled: false
      };

      return {
        rpcEnabled: store.get('discord.rpcEnabled', true),
        showStatus: store.get('discord.showStatus', true),
        showDetails: store.get('discord.showDetails', true),
        showImage: store.get('discord.showImage', true),
        isConnected: status.connected
      };
    } catch (error) {
      console.error('Erreur get-discord-settings:', error);
      return {
        rpcEnabled: true,
        showStatus: true,
        showDetails: true,
        showImage: true,
        isConnected: false
      };
    }
  });

  ipcMain.handle('save-discord-settings', async (event, settings) => {
    try {
      store.set('discord.rpcEnabled', settings.rpcEnabled);
      store.set('discord.showStatus', settings.showStatus);
      store.set('discord.showDetails', settings.showDetails);
      store.set('discord.showImage', settings.showImage);

      // Mettre à jour les paramètres RPC en direct
      if (currentDiscordRPC) {
        currentDiscordRPC.updateRPCSettings({
          showStatus: settings.showStatus,
          showDetails: settings.showDetails,
          showImage: settings.showImage
        });
      }

      if (!settings.rpcEnabled && currentDiscordRPC) {
        await currentDiscordRPC.disconnect();
      } else if (settings.rpcEnabled && (!currentDiscordRPC || !currentDiscordRPC.isConnected)) {
        await currentDiscordRPC.initializeWithRetry(2, 500);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur save-discord-settings:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reset-discord-settings', async (event) => {
    try {
      store.set('discord.rpcEnabled', true);
      store.set('discord.showStatus', true);
      store.set('discord.showDetails', true);
      store.set('discord.showImage', true);

      // Mettre à jour les paramètres RPC
      if (currentDiscordRPC) {
        currentDiscordRPC.updateRPCSettings({
          showStatus: true,
          showDetails: true,
          showImage: true
        });
        
        // Reconnecter si nécessaire
        await currentDiscordRPC.disconnect();
        await currentDiscordRPC.initializeWithRetry(2, 500);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur reset-discord-settings:', error);
      return { success: false, error: error.message };
    }
  });
};

// Exporter les deux fonctions
module.exports = setupDiscordHandlers;
module.exports.setSettingsWindow = setSettingsWindow;
module.exports.broadcastDiscordStatus = broadcastDiscordStatus;