// Gestionnaire d'icônes Lucide pour le launcher
const lucide = require('lucide');
const LauncherVersion = require('../main/launcher-version.js');

class LucideIcons {
  constructor() {
    this.icons = {
      home: 'home',
      user: 'user',
      users: 'users',
      globe: 'globe',
      newspaper: 'newspaper',
      shoppingCart: 'shopping-cart',
      settings: 'settings',
      logOut: 'log-out',
      play: 'play',
      plus: 'plus',
      trash2: 'trash-2',
      download: 'download',
      folder: 'folder',
      check: 'check',
      x: 'x',
      gamepad2: 'gamepad-2',
      cpu: 'cpu',
      memory: 'memory-stick',
      discord: 'message-circle',
      palette: 'palette',
      coffee: 'coffee',
      wrench: 'wrench',
      calendar: 'calendar',
      clock: 'clock',
      wifi: 'wifi',
      wifiOff: 'wifi-off',
      star: 'star',
      search: 'search',
      refresh: 'refresh-cw',
      externalLink: 'external-link',
      alertCircle: 'alert-circle',
      checkCircle: 'check-circle',
      info: 'info',
      loader: 'loader',
      trash: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
      clipboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`
    };
  }

  // Créer une icône SVG
  createIcon(iconName, size = 20, className = '') {
    const iconKey = this.icons[iconName] || iconName;
    const svg = lucide.icons[this.toCamelCase(iconKey)];
    
    if (!svg) {
      console.warn(`Icon '${iconName}' not found`);
      return '';
    }

    return `
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="${size}" 
        height="${size}" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        class="${className}"
      >
        ${svg.toSvg()}
      </svg>
    `;
  }

  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  // Initialiser toutes les icônes dans le DOM
  initIcons() {
    document.querySelectorAll('[data-lucide]').forEach(element => {
      const iconName = element.getAttribute('data-lucide');
      const size = element.getAttribute('data-size') || 20;
      element.innerHTML = this.createIcon(iconName, size);
    });
  }

  // Remplacer une icône spécifique
  replaceIcon(element, iconName, size = 20) {
    element.innerHTML = this.createIcon(iconName, size);
  }
}

module.exports = new LucideIcons();