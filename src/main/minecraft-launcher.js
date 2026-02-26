const { Client, Authenticator } = require('minecraft-launcher-core');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

class MinecraftLauncher {

  constructor() {
    this.launcher = new Client();
    this.versionsCache = null;
    this.versionsCacheTime = 0;
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  getRequiredJavaMajor(mcVersion) {
    const m = String(mcVersion).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!m) return 8;

    const major = parseInt(m[1]);
    const minor = parseInt(m[2]);

    if (major > 1 || minor >= 20) return 21;
    if (minor >= 18) return 17;
    return 8;
  }

  async checkVersionInstalled(gameDirectory, version) {
    return fs.existsSync(
      path.join(gameDirectory, 'versions', version, `${version}.json`)
    );
  }

  async getJavaMajor(javaPathCandidate) {
    return new Promise((resolve) => {
      try {
        const { execFile } = require('child_process');
        let bin = 'java';
        if (javaPathCandidate && typeof javaPathCandidate === 'string') {
          // Prefer java.exe for version check
          bin = javaPathCandidate.replace(/javaw(\.exe)?$/i, 'java$1');
        }
        execFile(bin, ['-version'], { windowsHide: true }, (err, stdout, stderr) => {
          if (err && !stderr) return resolve(null);
          const text = String(stderr || stdout || '');
          const m = text.match(/version\s+"([^"]+)"/i);
          if (!m) return resolve(null);
          const ver = m[1]; // e.g., "1.8.0_312", "17.0.3", "21"
          let major = null;
          if (ver.startsWith('1.8')) major = 8;
          else {
            const n = ver.match(/^(\d+)(?:\.\d+)?/);
            major = n ? parseInt(n[1], 10) : null;
          }
          resolve(major);
        });
      } catch (_) {
        resolve(null);
      }
    });
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
    const {
      authData, version, ram, gameDirectory, javaPath, serverIP,
      windowWidth, windowHeight, onProgress, onLog, onClose
    } = options;

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

    // ✅ Résolution javaw (sans console)
    let resolvedJava = (javaPath && String(javaPath).trim())
      ? String(javaPath).trim()
      : "javaw";

    // si chemin vers java.exe → remplacer par javaw.exe
    resolvedJava = resolvedJava.replace(/java\.exe$/i, "javaw.exe");

    // si juste "java"
    if (/^java$/i.test(resolvedJava)) {
      resolvedJava = "javaw";
    }
    resolvedJava = resolvedJava.replace(/java\.exe$/i, 'javaw.exe');

    // ✅ Check Java version si possible
    const requiredMajor = this.getRequiredJavaMajor(version);
    let javaMajor = null;
    try {
      if (resolvedJava.includes('\\') || resolvedJava.includes('/')) {
        const binDir = path.dirname(resolvedJava);
        const rootDir = path.dirname(binDir);
        const releaseFile = path.join(rootDir, 'release');
        if (fs.existsSync(releaseFile)) {
          const txt = fs.readFileSync(releaseFile, 'utf8');
          const m = txt.match(/JAVA_VERSION="([^"]+)"/);
          if (m && m[1]) {
            const ver = m[1];
            if (ver.startsWith('1.8')) javaMajor = 8;
            else {
              const n = ver.match(/^(\d+)/);
              javaMajor = n ? parseInt(n[1], 10) : null;
            }
          }
        }
      }
    } catch (_) { }

    if (onLog) onLog('info', `Java requis: ${requiredMajor}+, Java détecté: ${javaMajor ?? 'inconnu'}`);
    if (javaMajor && javaMajor < requiredMajor) {
      return { success: false, error: `Java ${requiredMajor}+ requis pour Minecraft ${version}. Java détecté: ${javaMajor}.` };
    }

    return new Promise((resolve, reject) => {
      let authorization;

      if (authData.type === 'microsoft') {

        // sécurité : si pas encore de clientToken, on en crée un
        if (!authData.clientToken) {
          const crypto = require('crypto');
          authData.clientToken = crypto.randomUUID();
        }

        authorization = {
          access_token: authData.accessToken,   // token Minecraft services
          client_token: authData.clientToken,   // ✅ UUID random stable
          uuid: authData.uuid,                  // UUID joueur (OK)
          name: authData.username,
          user_properties: "{}"
        };
      }

      const launchOptions = {
        authorization: authorization,
        root: gameDirectory,
        javaPath: resolvedJava,
        version: {
          number: version,
          type: "release"
        },
        memory: {
          max: `${ram}G`,
          min: `${Math.max(1, ram - 1)}G`
        },
        window: {
          width: parseInt(windowWidth || 1280, 10),
          height: parseInt(windowHeight || 720, 10)
        },

        // ✅ IMPORTANT:
        // customArgs = JVM args (donc PAS de --server / --quickPlayMultiplayer ici)
        // customLaunchArgs = arguments Minecraft (OK ici si besoin)
        customArgs: [],
        customLaunchArgs: [],

        // ✅ DÉTACHER COMPLÈTEMENT LE PROCESSUS ET CACHER LA CONSOLE
        windowsHide: true
      };

      function parseMcVersion(v) {
        // extrait les 3 premiers nombres (supporte "1.8.9", "1.21.11", "1.8.9-forge", etc.)
        const m = String(v || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
        if (!m) return [0, 0, 0];
        return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3] || '0', 10)];
      }

      function isAtLeast(v, target) {
        const a = parseMcVersion(v);
        const b = target;
        for (let i = 0; i < 3; i++) {
          const x = a[i] || 0, y = b[i] || 0;
          if (x > y) return true;
          if (x < y) return false;
        }
        return true;
      }

      launchOptions.customArgs = launchOptions.customArgs || [];
      launchOptions.customLaunchArgs = [];

      if (serverIP) {
        const [hostRaw, portRaw] = String(serverIP).split(':');
        const host = hostRaw?.trim();
        const port = parseInt(portRaw || '25565', 10) || 25565;

        // parse version safe
        const m = String(version).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
        const major = m ? parseInt(m[1], 10) : 1;
        const minor = m ? parseInt(m[2], 10) : 0;

        console.log(`MC version parsed = ${major}.${minor}`);

        // ===== 1.20+ =====
        if (major > 1 || minor >= 20) {
          launchOptions.customLaunchArgs.push(
            "--quickPlayMultiplayer",
            `${host}:${port}`
          );
          console.log("Using QuickPlay");
        }

        // ===== <= 1.19 =====
        else {
          launchOptions.customLaunchArgs.push(
            "--server", host,
            "--port", String(port)
          );
          console.log("Using legacy server args");
        }
      }

      console.log(`🎮 Lancement Minecraft...`);
      console.log(`   Version: ${version}`);
      console.log(`   RAM: ${ram}G`);
      console.log(`   Utilisateur: ${authData.username}`);
      console.log(`   Directory: ${gameDirectory}`);
      if (serverIP) console.log(`   Serveur: ${serverIP}`);
      console.log('');

      try {
        this.launcher.launch(launchOptions);

        this.launcher.on('debug', (e) => {
          if (e && typeof e === 'string' && (e.includes('Error') || e.includes('error'))) {
            console.log('[DEBUG]', e);
            if (onLog) onLog('debug', e);
          }
        });

        this.launcher.on('data', (e) => {
          if (e && typeof e === 'string') {
            console.log('[GAME]', e.substring(0, 100));
            if (onLog) onLog('info', e.substring(0, 300));
          }
        });

        let launchResolved = false;

        this.launcher.on('close', (code) => {
          console.log(`\n🎓 Minecraft closed (code: ${code})`);
          if (onLog) onLog(code === 0 ? 'success' : 'error', `Minecraft closed (code: ${code})`);
          try { if (typeof onClose === 'function') onClose(code); } catch (_) { }
          if (!launchResolved) {
            launchResolved = true;
            resolve({ success: true, code: code });
          }
        });

        this.launcher.on('error', (err) => {
          console.error('❌ Erreur Minecraft:', err);
          if (onLog) onLog('error', String(err?.message || err));
          if (!launchResolved) {
            launchResolved = true;
            reject(err);
          }
        });

        // Considérer le lancement réussi après 3 secondes (une seule fois)
        setTimeout(() => {
          if (!launchResolved) {
            console.log('✅ Minecraft started successfully!');
            if (onLog) onLog('success', 'Minecraft started');
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
          headers: { 'User-Agent': 'CraftLauncher/3.0' }
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
        // silent retry
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
      exec('javaw -version', (error, stdout, stderr) => {
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