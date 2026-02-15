/**
 * ✅ GESTIONNAIRE DES MODS
 * Responsabilité: Gérer, importer et contrôler les mods
 */

const { ipcRenderer } = require('electron');
const LauncherVersion = require('../main/launcher-version.js');

class ModsManager {
  constructor(app) {
    this.app = app;
    this.deleteHandler = null;
    this.changeHandler = null;
  }

  /**
   * ✅ 1. RENDRE LE GESTIONNAIRE DE MODS
   */
  async render() {
    const mods = await ipcRenderer.invoke('get-installed-mods') || [];
    const enabledModsCount = mods.filter(mod => mod.enabled).length;

    return `
      <div class="view-container" style="padding: 40px;">
        <div class="view-header" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="view-title" style="display: flex; align-items: center; gap: 12px;"><i class="bi bi-puzzle"></i> Mods Manager</h1>
            <p style="color: #94a3b8; margin-top: 10px;">${mods.length} mod(s) installed • ${enabledModsCount} enabled</p>
          </div>
          <button id="btn-import-mod" class="btn-primary" style="white-space: nowrap; padding: 8px 16px; font-size: 14px; width: auto; max-width: 120px;">+ Import</button>
        </div>

        ${mods.length === 0 ? this.renderEmpty() : this.renderModsList(mods)}
        ${this.renderStats(mods, enabledModsCount)}
        ${this.renderInfo()}
      </div>
    `;
  }

  /**
   * ✅ 2. RENDRE L'ÉTAT VIDE
   */
  renderEmpty() {
    return `
      <div style="max-width: 1000px; margin-bottom: 30px;">
        <div style="background: rgba(30, 41, 59, 0.5); border: 2px dashed rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 60px 20px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 16px;">${icons.download}</div>
          <h3 style="color: #e2e8f0; margin: 0 0 8px 0; font-size: 18px;">No mods installed</h3>
          <p style="color: #94a3b8; margin: 0;">Import your first mods to improve your Minecraft experience</p>
        </div>
      </div>
    `;
  }

  /**
   * ✅ 3. RENDRE LA LISTE DES MODS (EN COLONNE)
   */
  renderModsList(mods) {
    return `
      <div style="max-width: 1000px; margin-bottom: 30px; width: 100%;">
        <div style="display: block; width: 100%;">
          ${mods.map((mod) => this.renderModItem(mod)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * ✅ 4. RENDRE UN ITEM MOD
   */
  renderModItem(mod) {
    return `
      <div class="mod-item" data-mod-id="${mod.id}" style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 16px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; transition: all 0.3s; width: 100%; min-width: 0; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
          <input type="checkbox" class="mod-toggle" data-mod-id="${mod.id}" ${mod.enabled ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span style="flex-shrink: 0;">${mod.enabled ? '✅' : '❌'}</span>
              <span style="overflow: hidden; text-overflow: ellipsis;">${mod.name}</span>
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
              Version: ${mod.version || 'N/A'} • Size: ${mod.size || 'N/A'}
            </div>
          </div>
        </div>
        <button class="btn-delete-mod" data-mod-id="${mod.id}" title="Delete this mod" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 8px; transition: all 0.3s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; min-width: 40px; min-height: 40px; flex-shrink: 0;">
          🗑️
        </button>
      </div>
    `;
  }

  /**
   * ✅ 5. RENDRE LES STATISTIQUES
   */
  renderStats(mods, enabledModsCount) {
    return `
      <div style="max-width: 1000px; margin-bottom: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        ${this.renderStatCard('Mods installés', mods.length, icons.download)}
        ${this.renderStatCard('Mods activés', enabledModsCount, icons.check, '#22c55e')}
        ${this.renderStatCard('Mods désactivés', mods.length - enabledModsCount, icons.x, '#ef4444')}
      </div>
    `;
  }

  /**
   * ✅ 6. RENDRE UNE CARTE STATISTIQUE
   */
  renderStatCard(label, value, icon, color = '#e2e8f0') {
    return `
      <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>
        <div style="color: ${color}; font-weight: 600; margin-bottom: 4px;">${value}</div>
        <div style="color: #94a3b8; font-size: 12px;">${label}</div>
      </div>
    `;
  }

  /**
   * ✅ 7. RENDRE LES INFOS
   */
  renderInfo() {
    return `
      <div style="max-width: 1000px; padding: 20px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px;">
        <p style="color: #cbd5e1; margin: 0; font-size: 14px;">
          <strong style="color: #6366f1;">💡 Info:</strong> Vous pouvez activer/désactiver les mods sans les supprimer. Vérifiez la compatibilité avec votre version de Minecraft avant d'activer un mod.
        </p>
      </div>
    `;
  }

  /**
   * ✅ 8. CONFIGURER LES ÉVÉNEMENTS
   */
  setupEvents() {
    // Nettoyer les anciens écouteurs
    this.cleanup();

    // Créer les handlers
    this.deleteHandler = (e) => this.handleClick(e);
    this.changeHandler = (e) => this.handleChange(e);

    // Ajouter les écouteurs
    document.addEventListener('click', this.deleteHandler);
    document.addEventListener('change', this.changeHandler);
  }

  /**
   * ✅ 9. GESTIONNAIRE DE CLICS
   */
  async handleClick(e) {
    // Bouton importer
    if (e.target.id === 'btn-import-mod' || e.target.closest('#btn-import-mod')) {
      e.preventDefault();
      e.stopPropagation();
      await this.handleImport();
      return;
    }
    
    // Bouton supprimer (cherche aussi dans les parents)
    let deleteBtn = e.target.classList.contains('btn-delete-mod') ? e.target : null;
    if (!deleteBtn && e.target.closest) {
      deleteBtn = e.target.closest('.btn-delete-mod');
    }
    
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const modId = parseInt(deleteBtn.getAttribute('data-mod-id'));
      console.log('🗑️ Suppression mod ID:', modId);
      await this.handleDelete(modId);
      return;
    }
  }

  /**
   * ✅ 10. GESTIONNAIRE DE CHANGEMENTS
   */
  async handleChange(e) {
    if (e.target.classList.contains('mod-toggle')) {
      const modId = parseInt(e.target.getAttribute('data-mod-id'));
      const enabled = e.target.checked;
      await this.handleToggle(modId, enabled);
    }
  }

  /**
   * ✅ 11. HANDLERS DES ACTIONS
   */
  async handleImport() {
    console.log('📥 Start mod import');
    try {
      const result = await ipcRenderer.invoke('import-mod');
      console.log('✅ Import result:', result);
      if (result && result.success) {
        this.app.currentView = 'mods';
        await this.app.render();
      }
    } catch (error) {
      console.error('❌ Import error:', error);
    }
  }

  async handleDelete(modId) {
    console.log('🗣️ Begin mod deletion:', modId);
    
    if (!confirm('Are you sure you want to delete this mod?')) {
      console.log('❌ Deletion cancelled');
      return;
    }
    
    try {
      console.log('✅ Deletion confirmed, calling IPC...');
      const result = await ipcRenderer.invoke('delete-mod', modId);
      console.log('📦 Deletion result:', result);
      
      if (result && result.success) {
        console.log('✅ Mod deleted, refreshing view');
        this.app.currentView = 'mods';
        await this.app.render();
      } else {
        console.error('❌ Deletion failed:', result?.message);
        alert(`Error: ${result?.message || 'Unable to delete mod'}`);
      }
    } catch (error) {
      console.error('❌ Deletion error:', error);
      alert(`Error: ${error.message}`);
    }
  }

  async handleToggle(modId, enabled) {
    // Update UI instantly
    const modItem = document.querySelector(`[data-mod-id="${modId}"]`);
    if (modItem) {
      const toggle = modItem.querySelector('.mod-toggle');
      const statusIcon = modItem.querySelector('span[style*="flex-shrink: 0"]');
      
      if (toggle) toggle.checked = enabled;
      if (statusIcon) statusIcon.textContent = enabled ? '✅' : '❌';
    }
    
    // Save to backend
    const result = await ipcRenderer.invoke('toggle-mod', { modId, enabled });
    
    // If backend failed, revert UI
    if (!result.success) {
      if (modItem) {
        const toggle = modItem.querySelector('.mod-toggle');
        const statusIcon = modItem.querySelector('span[style*="flex-shrink: 0"]');
        
        if (toggle) toggle.checked = !enabled;
        if (statusIcon) statusIcon.textContent = !enabled ? '✅' : '❌';
      }
      console.error('❌ Error toggling mod:', result.message);
    }
  }

  /**
   * ✅ 12. NETTOYER
   */
  cleanup() {
    if (this.deleteHandler) {
      document.removeEventListener('click', this.deleteHandler);
    }
    if (this.changeHandler) {
      document.removeEventListener('change', this.changeHandler);
    }
  }
}

module.exports = ModsManager;