class KeyboardShortcuts {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    this.shortcuts = new Map();
    this.blockedKeys = new Set();
    
    // Définir les raccourcis
    this.defineShortcuts();
    
    // Définir les touches bloquées
    this.defineBlockedKeys();
    
    // Initialiser
    this.init();
  }

  /**
   * Définir tous les raccourcis de l'application
   */
  defineShortcuts() {
    // Navigation
    this.shortcuts.set('Control+H', {
      name: 'Accueil',
      description: 'Retourner à l\'accueil',
      action: () => this.goToHome()
    });

    this.shortcuts.set('Control+F', {
      name: 'Amis',
      description: 'Ouvrir la page Amis',
      action: () => this.goToFriends()
    });

    this.shortcuts.set('Control+M', {
      name: 'Mods',
      description: 'Ouvrir la page Mods',
      action: () => this.goToMods()
    });

    this.shortcuts.set('Control+N', {
      name: 'Actualités',
      description: 'Ouvrir les actualités',
      action: () => this.goToNews()
    });

    // Actions
    this.shortcuts.set('Control+L', {
      name: 'Lancer',
      description: 'Lancer Minecraft',
      action: () => this.launchMinecraft()
    });

    this.shortcuts.set('Control+P', {
      name: 'Paramètres',
      description: 'Ouvrir les paramètres',
      action: () => this.openSettings()
    });

    this.shortcuts.set('Control+R', {
      name: 'Rafraîchir',
      description: 'Rafraîchir la page',
      action: () => this.refresh()
    });

    // Affichage
    this.shortcuts.set('F11', {
      name: 'Plein écran',
      description: 'Basculer en mode plein écran',
      action: () => this.toggleFullscreen()
    });

    this.shortcuts.set('Escape', {
      name: 'Échapper',
      description: 'Fermer les modales/Retour',
      action: () => this.handleEscape()
    });

    // Raccourcis avancés
    this.shortcuts.set('Control+Shift+D', {
      name: 'Debug',
      description: 'Afficher les informations de debug',
      action: () => this.toggleDebug(),
      hidden: true // Ne pas afficher dans l'aide
    });

    this.shortcuts.set('Control+K', {
      name: 'Commandes',
      description: 'Ouvrir la palette de commandes',
      action: () => this.openCommandPalette()
    });
  }

  /**
   * Définir les touches à bloquer
   */
  defineBlockedKeys() {
    // Bloquer les DevTools en production
    this.blockedKeys.add('Control+Shift+I'); // DevTools
    this.blockedKeys.add('F12');             // DevTools
    this.blockedKeys.add('Control+Shift+J'); // Console (Chrome)
    this.blockedKeys.add('Control+U');       // Voir source
  }

  /**
   * Initialiser les event listeners
   */
  init() {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    console.log(`✅ ${this.shortcuts.size} raccourcis clavier chargés`);
    console.log(`🚫 ${this.blockedKeys.size} touches bloquées`);
  }

  /**
   * Gérer les touches pressées
   */
  handleKeyPress(e) {
    if (!this.enabled) return;

    const keyCombo = this.getKeyCombo(e);
    
    // Vérifier si la touche est bloquée
    if (this.blockedKeys.has(keyCombo)) {
      e.preventDefault();
      console.log(`🚫 Touche bloquée: ${keyCombo}`);
      return;
    }

    // Vérifier si un raccourci existe
    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      e.preventDefault();
      console.log(`⌨️ Raccourci activé: ${keyCombo} (${shortcut.name})`);
      
      try {
        shortcut.action();
      } catch (error) {
        console.error(`Erreur raccourci ${keyCombo}:`, error);
      }
    }
  }

  /**
   * Obtenir la combinaison de touches
   */
  getKeyCombo(e) {
    const parts = [];
    
    // Modificateurs
    if (e.ctrlKey || e.metaKey) parts.push('Control');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    // Touches spéciales
    const specialKeys = ['Escape', 'F11', 'F12', 'Enter', 'Tab', 'Backspace'];
    if (specialKeys.includes(e.key)) {
      parts.push(e.key);
    } else {
      // Touche normale
      parts.push(e.key.toUpperCase());
    }
    
    return parts.join('+');
  }

  // ================================
  // ACTIONS DES RACCOURCIS
  // ================================

  goToHome() {
    this.app.currentView = 'main';
    this.app.render();
  }

  goToFriends() {
    this.app.currentView = 'friends';
    this.app.render();
  }

  goToMods() {
    this.app.currentView = 'mods';
    this.app.render();
  }

  goToNews() {
    this.app.currentView = 'news';
    this.app.render();
  }

  launchMinecraft() {
    const launchBtn = document.getElementById('launch-btn');
    if (launchBtn && !launchBtn.disabled) {
      launchBtn.click();
    } else {
      console.warn('⚠️ Bouton de lancement non disponible');
    }
  }

  openSettings() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('open-settings');
  }

  refresh() {
    location.reload();
  }

  toggleFullscreen() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('toggle-fullscreen');
  }

  handleEscape() {
    // Fermer les modales
    document.querySelectorAll('.modal, .popup, .overlay').forEach(el => {
      el.style.display = 'none';
      el.remove();
    });
    
    // Autres actions si nécessaire
    console.log('Échap pressé');
  }

  toggleDebug() {
    // Afficher/masquer un panneau de debug
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    } else {
      this.createDebugPanel();
    }
  }

  openCommandPalette() {
    // Ouvrir une palette de commandes style VSCode
    console.log('🎨 Palette de commandes (à implémenter)');
    // TODO: Implémenter la palette de commandes
  }

  // ================================
  // UTILITAIRES
  // ================================

  /**
   * Activer/désactiver les raccourcis
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`Raccourcis ${enabled ? 'activés' : 'désactivés'}`);
  }

  /**
   * Ajouter un nouveau raccourci dynamiquement
   */
  addShortcut(keyCombo, name, action, description = '') {
    this.shortcuts.set(keyCombo, {
      name,
      description,
      action
    });
    console.log(`✅ Raccourci ajouté: ${keyCombo} → ${name}`);
  }

  /**
   * Supprimer un raccourci
   */
  removeShortcut(keyCombo) {
    if (this.shortcuts.delete(keyCombo)) {
      console.log(`❌ Raccourci supprimé: ${keyCombo}`);
      return true;
    }
    return false;
  }

  /**
   * Obtenir la liste de tous les raccourcis
   */
  getShortcutsList() {
    const list = [];
    this.shortcuts.forEach((shortcut, key) => {
      if (!shortcut.hidden) {
        list.push({
          key,
          name: shortcut.name,
          description: shortcut.description
        });
      }
    });
    return list;
  }

  /**
   * Générer le HTML pour afficher les raccourcis
   */
  generateShortcutsHTML() {
    const shortcuts = this.getShortcutsList();
    
    return `
      <div class="shortcuts-help-panel">
        <h2>⌨️ Raccourcis clavier</h2>
        <div class="shortcuts-grid">
          ${shortcuts.map(s => `
            <div class="shortcut-item">
              <div class="shortcut-keys">
                ${this.formatKeyCombo(s.key)}
              </div>
              <div class="shortcut-info">
                <div class="shortcut-name">${s.name}</div>
                <div class="shortcut-description">${s.description}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <style>
        .shortcuts-help-panel {
          padding: 20px;
        }
        
        .shortcuts-help-panel h2 {
          color: #e2e8f0;
          margin-bottom: 20px;
          font-size: 24px;
        }
        
        .shortcuts-grid {
          display: grid;
          gap: 12px;
        }
        
        .shortcut-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          transition: all 0.3s;
        }
        
        .shortcut-item:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
        }
        
        .shortcut-keys {
          display: flex;
          gap: 4px;
          min-width: 120px;
        }
        
        .shortcut-keys kbd {
          padding: 4px 8px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 4px;
          font-family: monospace;
          font-size: 11px;
          font-weight: 600;
          color: #e2e8f0;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
        }
        
        .shortcut-info {
          flex: 1;
        }
        
        .shortcut-name {
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 2px;
        }
        
        .shortcut-description {
          font-size: 12px;
          color: #94a3b8;
        }
      </style>
    `;
  }

  /**
   * Formater une combinaison de touches en HTML
   */
  formatKeyCombo(keyCombo) {
    return keyCombo.split('+').map(key => `<kbd>${key}</kbd>`).join(' + ');
  }

  /**
   * Créer un panneau de debug
   */
  createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      padding: 16px;
      max-width: 300px;
      z-index: 10000;
      color: #e2e8f0;
      font-family: monospace;
      font-size: 12px;
    `;
    
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <strong>🔍 Debug Panel</strong>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Vue actuelle:</strong> ${this.app.currentView}
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Raccourcis actifs:</strong> ${this.shortcuts.size}
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Raccourcis activés:</strong> ${this.enabled ? '✅' : '❌'}
      </div>
      <div>
        <strong>Version:</strong> ${this.app.version?.version || 'N/A'}
      </div>
    `;
    
    document.body.appendChild(panel);
  }
}

// Export
module.exports = KeyboardShortcuts;