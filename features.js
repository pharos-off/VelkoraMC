/**
 * ✅ FONCTIONNALITÉS - Features.js
 * Fonctionnalités actives:
 * 1. Historique de jeu et statistiques
 */

const { ipcRenderer } = require('electron');
const LauncherVersion = require('../main/launcher-version.js');

class LauncherFeatures {
  constructor(app) {
    this.app = app;
  }

  /**
   * ✅ 1. HISTORIQUE DE JEU & STATISTIQUES
   */
  async renderGameStats() {
    const stats = await ipcRenderer.invoke('get-game-stats');
    
    const winRate = stats.totalSessions > 0 ? Math.round((stats.wins / stats.totalSessions) * 100) : 0;
    const lastPlayed = stats.lastPlayed ? new Date(stats.lastPlayed).toLocaleDateString('fr-FR') : 'Jamais';
    const longestSession = stats.longestSession || '0h 0min';
    
    return `
      <div class="view-header">
        <h1 class="view-title" style="display: flex; align-items: center; gap: 12px;">${icons.barChart} Statistiques détaillées</h1>
      </div>

      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- STATISTIQUES PRINCIPALES -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 14px; padding: 24px;">
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">🎮 Parties jouées</div>
            <div style="font-size: 36px; font-weight: 700; color: #6366f1; margin-bottom: 8px;">${stats.totalSessions || 0}</div>
            <div style="font-size: 12px; color: #64748b;">+${stats.weeklySessionCount || 0} cette semaine</div>
          </div>

          <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 14px; padding: 24px;">
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">⏱️ Temps total</div>
            <div style="font-size: 36px; font-weight: 700; color: #3b82f6; margin-bottom: 8px;">${stats.totalPlaytimeFormatted || '0h'}</div>
            <div style="font-size: 12px; color: #64748b;">Temps cumulé</div>
          </div>

          <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15)); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 14px; padding: 24px;">
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">📈 Taux de victoire</div>
            <div style="font-size: 36px; font-weight: 700; color: #22c55e; margin-bottom: 8px;">${winRate}%</div>
            <div style="font-size: 12px; color: #64748b;">${stats.wins || 0} victoires</div>
          </div>

          <div style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(239, 68, 68, 0.15)); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 14px; padding: 24px;">
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">⚡ Moyenne/partie</div>
            <div style="font-size: 36px; font-weight: 700; color: #f97316; margin-bottom: 8px;">${stats.averageSession || 0}min</div>
            <div style="font-size: 12px; color: #64748b;">Durée moyenne</div>
          </div>

          <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.15)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 14px; padding: 24px;">
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">🏆 Plus longue partie</div>
            <div style="font-size: 36px; font-weight: 700; color: #a855f7; margin-bottom: 8px;">${longestSession}</div>
            <div style="font-size: 12px; color: #64748b;">Record personnel</div>
          </div>

          <div style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(59, 130, 246, 0.15)); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 14px; padding: 24px;">
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">🕐 Dernière partie</div>
            <div style="font-size: 22px; font-weight: 700; color: #0ea5e9; margin-bottom: 8px;">${lastPlayed}</div>
            <div style="font-size: 12px; color: #64748b;">Accès récent</div>
          </div>
        </div>

        <!-- GRAPHIQUE ACTIVITÉ HEBDOMADAIRE -->
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; padding: 24px; margin-bottom: 30px;">
          <h3 style="color: #e2e8f0; margin-bottom: 20px; font-size: 16px; font-weight: 600;">📈 Activité hebdomadaire</h3>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
            ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => {
              const hours = stats.weeklyStats ? stats.weeklyStats[idx] : 0;
              const maxHours = Math.max(...(stats.weeklyStats || [0])) || 1;
              const height = Math.max(20, (hours / maxHours) * 80);
              return `
                <div style="text-align: center;">
                  <div style="background: linear-gradient(180deg, rgba(99, 102, 241, 0.3), rgba(99, 102, 241, 0.1)); height: ${height}px; border-radius: 6px; margin-bottom: 8px; position: relative;">
                    <span style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #64748b; font-weight: 600;">${hours}h</span>
                  </div>
                  <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">${day}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- STATISTIQUES DÉTAILLÉES -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; padding: 24px;">
            <h3 style="color: #e2e8f0; margin-bottom: 16px; font-size: 15px; font-weight: 600;">🎯 Préférences</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="background: rgba(15, 23, 42, 0.5); border-left: 3px solid #6366f1; padding: 12px 16px; border-radius: 8px;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Version préférée</div>
                <div style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin-top: 4px;">${stats.favoriteVersion || 'Aucune'}</div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.5); border-left: 3px solid #3b82f6; padding: 12px 16px; border-radius: 8px;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Serveur préféré</div>
                <div style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin-top: 4px;">${stats.favoriteServer || 'Aucun'}</div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.5); border-left: 3px solid #22c55e; padding: 12px 16px; border-radius: 8px;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Mode préféré</div>
                <div style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin-top: 4px;">${stats.favoriteMode || 'Survie'}</div>
              </div>
            </div>
          </div>

          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; padding: 24px;">
            <h3 style="color: #e2e8f0; margin-bottom: 16px; font-size: 15px; font-weight: 600;">🔥 Statistiques avancées</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="background: rgba(15, 23, 42, 0.5); padding: 12px 16px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #94a3b8; font-size: 12px;">Défaites</span>
                  <span style="color: #e2e8f0; font-weight: 600;">${(stats.totalSessions || 0) - (stats.wins || 0)}</span>
                </div>
                <div style="background: rgba(30, 41, 59, 0.8); height: 6px; border-radius: 3px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #ef4444, #dc2626); height: 100%; width: ${Math.min(100, ((stats.totalSessions - stats.wins) / stats.totalSessions) * 100)}%;"></div>
                </div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.5); padding: 12px 16px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #94a3b8; font-size: 12px;">Streak actuel</span>
                  <span style="color: #e2e8f0; font-weight: 600;">${stats.currentStreak || 0} victoires</span>
                </div>
                <div style="background: rgba(30, 41, 59, 0.8); height: 6px; border-radius: 3px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #22c55e, #16a34a); height: 100%; width: ${Math.min(100, (stats.currentStreak || 0) * 10)}%;"></div>
                </div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.5); padding: 12px 16px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #94a3b8; font-size: 12px;">Meilleur streak</span>
                  <span style="color: #e2e8f0; font-weight: 600;">${stats.bestStreak || 0} victoires</span>
                </div>
                <div style="background: rgba(30, 41, 59, 0.8); height: 6px; border-radius: 3px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #fbbf24, #f59e0b); height: 100%; width: ${Math.min(100, (stats.bestStreak || 0) * 10)}%;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * ✅ SETUP EVENTS - PROFILS
   */
  setupProfileEvents() {
    document.addEventListener('click', async (e) => {
      const action = e.target.getAttribute('data-action');
      const targetId = e.target.id;

      if (targetId === 'btn-new-profile') {
        this.showModal('profile-modal');
        return;
      }

      if (targetId === 'modal-save') {
        await this.handleProfileSave();
        return;
      }

      if (targetId === 'modal-cancel') {
        this.hideModal('profile-modal');
        return;
      }

      if (action === 'delete-profile') {
        await this.handleProfileDelete(e.target);
      } else if (action === 'duplicate-profile') {
        await this.handleProfileDuplicate(e.target);
      }
    });
  }

  /**
   * ✅ HANDLERS - PROFILS
   */
  async handleProfileSave() {
    const name = this.getInputValue('profile-name-input');
    const version = this.getInputValue('profile-version-select');

    if (!name) {
      alert('Entrez un nom pour le profil');
      return;
    }

    const result = await ipcRenderer.invoke('create-profile', { name, version });
    
    if (result.success) {
      await this.refreshProfiles();
      this.hideModal('profile-modal');
    }
  }

  async handleProfileDelete(target) {
    const id = parseInt(target.getAttribute('data-id'));
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce profil ?')) return;

    await ipcRenderer.invoke('delete-profile', id);
    await this.refreshProfiles();
  }

  async handleProfileDuplicate(target) {
    const id = parseInt(target.getAttribute('data-id'));
    await ipcRenderer.invoke('duplicate-profile', id);
    await this.refreshProfiles();
  }

  /**
   * ✅ HELPERS UTILES
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  getInputValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
  }

  async refreshProfiles() {
    this.app.profiles = await ipcRenderer.invoke('get-profiles');
    this.app.currentView = 'profiles';
    this.app.render();
  }
}

module.exports = LauncherFeatures;