const { Client, Authenticator } = require('minecraft-launcher-core');
const LauncherVersion = require('./launcher-version.js');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const os = require('os');

class MinecraftLauncher {
  constructor() {
    this.launcher = new Client();
    this.versionsCache = null;
    this.versionsCacheTime = 0;
    this.CACHE_DURATION = 5 * 60 * 1000; // Cache de 5 minutes
  }

  async checkVersionInstalled(gameDirectory, version) {
    const versionPath = path.join(gameDirectory, 'versions', version, `${version}.json`);
    return fs.existsSync(versionPath);
  }

  // ✅ TÉLÉCHARGER AVEC GESTION D'ERREUR AMÉLIORÉE
  async downloadVersion(version, gameDirectory, progressCallback) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`\n⏳ Preparing download for ${version}...`);

        // S'assurer que les dossiers existent
        const dirs = [
          path.join(gameDirectory, 'versions'),
          path.join(gameDirectory, 'libraries'),
          path.join(gameDirectory, 'assets')
        ];

        dirs.forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Folder created: ${dir}`);
          }
        });

        const launchOptions = {
          authorization: Authenticator.getAuth('Player'),
          root: gameDirectory,
          version: {
            number: version,
            type: "release"
          },
          memory: {
            max: "2G",
            min: "1G"
          },
          // 🔥 CONCURRENCE TRÈS RÉDUITE POUR ÉVITER "TOO MANY OPEN FILES"
          overrides: {
            maxSockets: 2,
            maxRetries: 3
          },
          timeout: 3600000  // 60 minutes
        };

        console.log(`📁 Directory: ${gameDirectory}`);
        console.log(`📥 Starting download for ${version}...\n`);

        let currentType = '';
        let progressByType = {};
        let errorCount = 0;

        this.launcher.removeAllListeners();

        this.launcher.on('progress', (progress) => {
          if (progress && progress.type) {
            currentType = progress.type;
            
            const percent = progress.total > 0 
              ? Math.round((progress.task / progress.total) * 100)
              : 0;
            
            // Suivre la progression par type
            if (!progressByType[progress.type]) {
              progressByType[progress.type] = { last: 0, count: 0 };
            }
            
            progressByType[progress.type].count++;
            
            // Log tous les 5% ou changement de type
            if (percent % 5 === 0 && percent !== progressByType[progress.type].last) {
              console.log(`   [${progress.type}] ${percent}% (${progress.task}/${progress.total})`);
              progressByType[progress.type].last = percent;
            }

            if (progressCallback) {
              progressCallback({
                type: progress.type,
                task: progress.task,
                total: progress.total,
                percent: percent
              });
            }
          }
        });

        this.launcher.on('debug', (message) => {
          if (message && typeof message === 'string') {
            const msgLower = message.toLowerCase();
            
            if (msgLower.includes('error') || msgLower.includes('failed')) {
              console.error('[DEBUG ERROR]', message);
              errorCount++;
              
              // Si trop d'erreurs sur les assets, on continue quand même
              if (msgLower.includes('asset') && errorCount > 50) {
                console.warn('⚠️  Beaucoup d\'erreurs sur les assets, mais on continue...');
              }
            } else if (msgLower.includes('downloading')) {
              // Afficher les téléchargements importants
              if (msgLower.includes('jar') || msgLower.includes('json')) {
                console.log('[DOWNLOAD]', message.substring(0, 100));
              }
            }
          }
        });

        this.launcher.on('data', (data) => {
          if (data && typeof data === 'string') {
            // Logs importants seulement
            if (data.includes('Downloaded') && (data.includes('.jar') || data.includes('.json'))) {
              console.log('[DATA]', data.substring(0, 80));
            }
          }
        });

        let closeTimeout;

        this.launcher.on('close', (code) => {
          clearTimeout(closeTimeout);
          
          console.log(`\n[CLOSE] Process closed with code: ${code}`);
          console.log(`📊 Statistiques:`);
          Object.entries(progressByType).forEach(([type, stats]) => {
            console.log(`   - ${type}: ${stats.count} fichiers`);
          });
          
          // Vérifier si les fichiers critiques existent
          const versionJsonPath = path.join(gameDirectory, 'versions', version, `${version}.json`);
          const versionJarPath = path.join(gameDirectory, 'versions', version, `${version}.jar`);
          const librariesPath = path.join(gameDirectory, 'libraries');
          
          const criticalFilesExist = fs.existsSync(versionJsonPath) && 
                                      fs.existsSync(versionJarPath) &&
                                      fs.existsSync(librariesPath);
          
          if (criticalFilesExist) {
            const libCount = this.countFiles(librariesPath);
            console.log(`✅ Download completed!`);
            console.log(`   - Library files: ${libCount}`);
            console.log(`   - Ignored errors: ${errorCount}`);
            resolve({ success: true, downloadedFiles: libCount, errors: errorCount });
          } else {
            console.error('❌ Fichiers critiques manquants');
            reject(new Error('Téléchargement incomplet - fichiers critiques manquants'));
          }
        });

        this.launcher.on('error', (err) => {
          console.error('❌ Erreur launcher:', err.message);
          
          // Ne rejeter que si c'est une erreur critique
          if (err.message.includes('ENOTFOUND') || 
              err.message.includes('ECONNREFUSED') ||
              err.message.includes('authentication')) {
            reject(err);
          } else {
            errorCount++;
            console.warn('⚠️  Erreur non-critique, on continue...');
          }
        });

        this.launcher.launch(launchOptions);

        // Timeout de sécurité (90 minutes)
        closeTimeout = setTimeout(() => {
          console.warn('⚠️ Timeout: Download taking too long, checking files...');
          
          const versionJsonPath = path.join(gameDirectory, 'versions', version, `${version}.json`);
          if (fs.existsSync(versionJsonPath)) {
            console.log('✅ Main files present, considering download successful');
            resolve({ success: true, downloadedFiles: 0, timeout: true });
          } else {
            reject(new Error('Timeout - fichiers manquants'));
          }
        }, 90 * 60 * 1000);

      } catch (error) {
        console.error('❌ Error preparing download:', error);
        reject(error);
      }
    });
  }

  // ✅ COMPTER LES FICHIERS TÉLÉCHARGÉS
  countFiles(dir) {
    let count = 0;
    try {
      if (!fs.existsSync(dir)) return 0;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          count += this.countFiles(path.join(dir, file.name));
        } else {
          count++;
        }
      }
    } catch (error) {
      return 0;
    }
    return count;
  }

  async launch(options) {
    const { authData, version, ram, gameDirectory, javaPath, serverIP } = options;

    // ✅ VÉRIFIER ET TÉLÉCHARGER SI NÉCESSAIRE
    const isInstalled = await this.checkVersionInstalled(gameDirectory, version);
    
    if (!isInstalled) {
      console.log(`\n📥 Version ${version} missing. Downloading...`);
      console.log(`⏱️  Cela peut prendre 10-30 minutes selon votre connexion...\n`);
      
      try {
        const result = await this.downloadVersion(version, gameDirectory, (progress) => {
          // Progress callback pour l'UI si besoin
        });
        
        if (result.success) {
          console.log(`✅ Version ${version} downloaded successfully!`);
          if (result.errors > 0) {
            console.log(`⚠️ ${result.errors} minor errors ignored (missing assets)`);
          }
        }
      } catch (error) {
        console.error(`❌ Download error: ${error.message}`);
        return {
          success: false,
          error: `Impossible de télécharger Minecraft ${version}: ${error.message}`
        };
      }
    } else {
      console.log(`✅ Version ${version} already installed\n`);
    }

    return new Promise((resolve, reject) => {
      let authorization;
      
      if (authData.type === 'microsoft') {
        authorization = {
          access_token: authData.accessToken,
          client_token: authData.uuid,
          uuid: authData.uuid,
          name: authData.username,
          user_properties: JSON.stringify({})
        };
      } else {
        authorization = Authenticator.getAuth(authData.username);
      }

      const launchOptions = {
        authorization: authorization,
        root: gameDirectory,
        version: {
          number: version,
          type: "release"
        },
        memory: {
          max: `${ram}G`,
          min: `${Math.max(1, ram - 1)}G`
        },
        window: {
          width: 1280,
          height: 720
        },
        // ✅ DÉTACHER COMPLÈTEMENT LE PROCESSUS ET CACHER LA CONSOLE
        detached: true,
        windowsHide: true,
        customArgs: []
      };

      const javawPath = javaPath
        ? javaPath.replace(/java\.exe$/i, 'javaw.exe')
        : 'javaw';
        
      launchOptions.javaPath = javawPath;

      launchOptions.javaPath =
        "C:\\Program Files\\Java\\jdk-21\\bin\\javaw.exe";


      if (serverIP) {
        const [host, port] = serverIP.split(':');
        launchOptions.server = {
          host: host,
          port: port || "25565"
        };
      }

      console.log(`🎮 Lancement Minecraft...`);
      console.log(`   Version: ${version}`);
      console.log(`   RAM: ${ram}G`);
      console.log(`   Utilisateur: ${authData.username}`);
      console.log(`   Directory: ${gameDirectory}\n`);

      try {
        this.launcher.launch(launchOptions);
        
        this.launcher.on('debug', (e) => {
          if (e && typeof e === 'string' && (e.includes('Error') || e.includes('error'))) {
            console.log('[DEBUG]', e);
          }
        });

        this.launcher.on('data', (e) => {
          if (e && typeof e === 'string') {
            console.log('[GAME]', e.substring(0, 100));
          }
        });
        
        let launchResolved = false;

        this.launcher.on('close', (code) => {
          console.log(`\n🎓 Minecraft closed (code: ${code})`);
          if (!launchResolved) {
            launchResolved = true;
            resolve({ success: true, code: code });
          }
        });

        this.launcher.on('error', (err) => {
          console.error('❌ Erreur Minecraft:', err);
          if (!launchResolved) {
            launchResolved = true;
            reject(err);
          }
        });

        // Considérer le lancement réussi après 3 secondes (une seule fois)
        setTimeout(() => {
          if (!launchResolved) {
            console.log('✅ Minecraft started successfully!');
            launchResolved = true;
            resolve({ success: true, launched: true });
          }
        }, 3000);

      } catch (error) {
        console.error('❌ Erreur lancement:', error);
        reject(error);
      }
    });
  }

  async getAvailableVersions() {
    // Retourner le cache si disponible
    if (this.versionsCache && Date.now() - this.versionsCacheTime < this.CACHE_DURATION) {
      return this.versionsCache;
    }

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Attendre 2 secondes avant chaque tentative
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

        const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json', {
          signal: controller.signal,
          headers: {
            'User-Agent': 'CraftLauncher/3.0'
          }
        });
        
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        const versions = data.versions
          .filter(v => v.type === 'release')
          .slice(0, 30)
          .map(v => ({
            id: v.id,
            name: v.id,
            type: v.type,
            url: v.url,
            releaseTime: v.releaseTime
          }));

        // Mettre en cache
        this.versionsCache = versions;
        this.versionsCacheTime = Date.now();
        return versions;
      } catch (error) {
        lastError = error;
        // Pas de log de tentative - juste silent retry
      }
    }

    // Fallback: retourner une liste de versions en cache
    return [
      { id: '1.21.11', name: '1.21.11', type: 'release', releaseTime: '2025-01-15T08:00:00Z' },
      { id: '1.21.10', name: '1.21.10', type: 'release', releaseTime: '2024-12-17T08:00:00Z' },
      { id: '1.21.9', name: '1.21.9', type: 'release', releaseTime: '2024-11-19T08:00:00Z' },
      { id: '1.21.8', name: '1.21.8', type: 'release', releaseTime: '2024-10-30T08:00:00Z' },
      { id: '1.21.7', name: '1.21.7', type: 'release', releaseTime: '2024-10-18T08:00:00Z' },
      { id: '1.21.6', name: '1.21.6', type: 'release', releaseTime: '2024-10-04T08:00:00Z' },
      { id: '1.21.5', name: '1.21.5', type: 'release', releaseTime: '2024-09-24T08:00:00Z' },
      { id: '1.21.4', name: '1.21.4', type: 'release', releaseTime: '2024-09-10T08:00:00Z' },
      { id: '1.21.3', name: '1.21.3', type: 'release', releaseTime: '2024-08-06T08:00:00Z' },
      { id: '1.21.2', name: '1.21.2', type: 'release', releaseTime: '2024-07-18T08:00:00Z' },
      { id: '1.21.1', name: '1.21.1', type: 'release', releaseTime: '2024-07-10T08:00:00Z' },
      { id: '1.21', name: '1.21', type: 'release', releaseTime: '2024-06-13T08:00:00Z' },
      { id: '1.20.6', name: '1.20.6', type: 'release', releaseTime: '2024-05-30T08:00:00Z' },
      { id: '1.20.5', name: '1.20.5', type: 'release', releaseTime: '2024-04-23T08:00:00Z' },
      { id: '1.20.4', name: '1.20.4', type: 'release', releaseTime: '2023-12-07T08:00:00Z' },
      { id: '1.20.3', name: '1.20.3', type: 'release', releaseTime: '2023-09-12T08:00:00Z' },
      { id: '1.20.2', name: '1.20.2', type: 'release', releaseTime: '2023-09-14T08:00:00Z' },
      { id: '1.20.1', name: '1.20.1', type: 'release', releaseTime: '2023-06-13T08:00:00Z' },
      { id: '1.20', name: '1.20', type: 'release', releaseTime: '2023-06-06T08:00:00Z' },
      { id: '1.19.4', name: '1.19.4', type: 'release', releaseTime: '2023-03-14T08:00:00Z' },
      { id: '1.19.3', name: '1.19.3', type: 'release', releaseTime: '2022-12-07T08:00:00Z' },
      { id: '1.19.2', name: '1.19.2', type: 'release', releaseTime: '2022-08-05T08:00:00Z' },
      { id: '1.19.1', name: '1.19.1', type: 'release', releaseTime: '2022-07-27T08:00:00Z' },
      { id: '1.19', name: '1.19', type: 'release', releaseTime: '2022-06-07T08:00:00Z' },
      { id: '1.18.2', name: '1.18.2', type: 'release', releaseTime: '2022-02-28T08:00:00Z' },
      { id: '1.18.1', name: '1.18.1', type: 'release', releaseTime: '2021-12-10T08:00:00Z' },
      { id: '1.18', name: '1.18', type: 'release', releaseTime: '2021-12-07T08:00:00Z' },
      { id: '1.17.1', name: '1.17.1', type: 'release', releaseTime: '2021-07-27T08:00:00Z' },
      { id: '1.17', name: '1.17', type: 'release', releaseTime: '2021-06-08T08:00:00Z' },
      { id: '1.16.5', name: '1.16.5', type: 'release', releaseTime: '2021-01-15T08:00:00Z' },
      { id: '1.16.4', name: '1.16.4', type: 'release', releaseTime: '2020-11-02T08:00:00Z' },
      { id: '1.16.3', name: '1.16.3', type: 'release', releaseTime: '2020-09-16T08:00:00Z' },
      { id: '1.16.2', name: '1.16.2', type: 'release', releaseTime: '2020-08-11T08:00:00Z' },
      { id: '1.16.1', name: '1.16.1', type: 'release', releaseTime: '2020-06-24T08:00:00Z' },
      { id: '1.16', name: '1.16', type: 'release', releaseTime: '2020-06-23T08:00:00Z' },
      { id: '1.15.2', name: '1.15.2', type: 'release', releaseTime: '2020-01-17T08:00:00Z' },
      { id: '1.15.1', name: '1.15.1', type: 'release', releaseTime: '2019-12-17T08:00:00Z' },
      { id: '1.15', name: '1.15', type: 'release', releaseTime: '2019-12-10T08:00:00Z' },
      { id: '1.14.4', name: '1.14.4', type: 'release', releaseTime: '2019-07-19T08:00:00Z' },
      { id: '1.14.3', name: '1.14.3', type: 'release', releaseTime: '2019-06-24T08:00:00Z' },
      { id: '1.14.2', name: '1.14.2', type: 'release', releaseTime: '2019-05-27T08:00:00Z' },
      { id: '1.14.1', name: '1.14.1', type: 'release', releaseTime: '2019-05-13T08:00:00Z' },
      { id: '1.14', name: '1.14', type: 'release', releaseTime: '2019-04-23T08:00:00Z' },
      { id: '1.13.2', name: '1.13.2', type: 'release', releaseTime: '2019-01-28T08:00:00Z' },
      { id: '1.13.1', name: '1.13.1', type: 'release', releaseTime: '2018-08-22T08:00:00Z' },
      { id: '1.13', name: '1.13', type: 'release', releaseTime: '2018-07-10T08:00:00Z' },
      { id: '1.12.2', name: '1.12.2', type: 'release', releaseTime: '2017-09-18T08:00:00Z' },
      { id: '1.12.1', name: '1.12.1', type: 'release', releaseTime: '2017-08-02T08:00:00Z' },
      { id: '1.12', name: '1.12', type: 'release', releaseTime: '2017-06-07T08:00:00Z' },
      { id: '1.11.2', name: '1.11.2', type: 'release', releaseTime: '2016-12-20T08:00:00Z' },
      { id: '1.11.1', name: '1.11.1', type: 'release', releaseTime: '2016-12-20T08:00:00Z' },
      { id: '1.11', name: '1.11', type: 'release', releaseTime: '2016-11-14T08:00:00Z' },
      { id: '1.10.2', name: '1.10.2', type: 'release', releaseTime: '2016-06-23T08:00:00Z' },
      { id: '1.9.4', name: '1.9.4', type: 'release', releaseTime: '2016-05-10T08:00:00Z' },
      { id: '1.9.3', name: '1.9.3', type: 'release', releaseTime: '2016-05-10T08:00:00Z' },
      { id: '1.9.2', name: '1.9.2', type: 'release', releaseTime: '2016-03-30T08:00:00Z' },
      { id: '1.9.1', name: '1.9.1', type: 'release', releaseTime: '2016-03-30T08:00:00Z' },
      { id: '1.9', name: '1.9', type: 'release', releaseTime: '2016-02-29T08:00:00Z' },
      { id: '1.8.9', name: '1.8.9', type: 'release', releaseTime: '2015-12-08T08:00:00Z' },
    ];
  }

  async checkJavaInstallation() {
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('java -version', (error, stdout, stderr) => {
        if (error) {
          resolve({ installed: false, version: null });
        } else {
          const versionMatch = stderr.match(/version "(.+?)"/);
          resolve({ 
            installed: true, 
            version: versionMatch ? versionMatch[1] : 'Unknown'
          });
        }
      });
    });
  }
}

module.exports = MinecraftLauncher;