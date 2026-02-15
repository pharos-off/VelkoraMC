const { BrowserWindow, session } = require('electron');
const LauncherVersion = require('./launcher-version.js');
const fetch = require('node-fetch');
const Store = require('electron-store');

class MicrosoftAuth {
  constructor() {
    this.clientId = '00000000-0000-0000-0000-0000402b5328';
    this.redirectUri = 'https://login.live.com/oauth20_desktop.srf';
    this.store = new Store();
    this.tokenCache = null;
    this.authInProgress = false;
    this.authWindow = null;
    this.authPromise = null;
  }

  /**
   * ✅ AUTHENTIFICATION PRINCIPALE - RÉSILIENTE ET ROBUSTE
   */
  async authenticate() {
    // ✅ Si une fenêtre existe déjà, la fermer et bloquer
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      console.log('⚠️ Une fenêtre d\'authentification existe déjà');
      this.authWindow.focus();
      return { success: false, error: 'Une fenêtre d\'authentification est déjà ouverte' };
    }

    // ✅ Si une authentification est en cours, retourner la même promesse
    if (this.authInProgress && this.authPromise) {
      console.log('⚠️ Authentification déjà en cours, réutilisation de la promesse existante');
      return this.authPromise;
    }

    this.authInProgress = true;

    this.authPromise = new Promise((resolve) => {
      try {
        const authSession = session.fromPartition('persist:auth');
        
        this.authWindow = new BrowserWindow({
          width: 600,
          height: 700,
          show: true,
          icon: require('path').join(__dirname, '..', 'assets', 'icon.png'),
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            session: authSession
          }
        });

        this.authWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=XboxLive.signin%20offline_access&prompt=select_account`;

        console.log('🔐 Starting Microsoft authentication...');
        this.authWindow.loadURL(authUrl);

        let isProcessing = false;
        let windowClosed = false;
        
        const timeout = setTimeout(() => {
          if (!isProcessing && this.authWindow && !this.authWindow.isDestroyed()) {
            windowClosed = true;
            this.authWindow.close();
            this.authWindow = null;
            this.authInProgress = false;
            this.authPromise = null;
            resolve({ success: false, error: 'Timeout authentification (5 minutes)' });
          }
        }, 5 * 60 * 1000);

        const handleUrl = async (url) => {
          // Empêcher le traitement multiple
          if (isProcessing || windowClosed) return;
          
          // Ignore Microsoft error pages and redirects
          if (url.includes('login.live.com/oauth20_desktop.srf') && !url.includes('code=')) {
            return;
          }
          
          if (url.includes('code=') || url.includes('error=')) {
            isProcessing = true;
            clearTimeout(timeout);
            
            // ✅ FERMER LA FENÊTRE IMMÉDIATEMENT
            if (this.authWindow && !this.authWindow.isDestroyed()) {
              windowClosed = true;
              this.authWindow.close();
              this.authWindow = null;
            }
            
            try {
              const urlParams = new URL(url);
              const code = urlParams.searchParams.get('code');
              const error = urlParams.searchParams.get('error');
              const errorDescription = urlParams.searchParams.get('error_description');

              if (error) {
                console.error('❌ Authentication error:', errorDescription || error);
                this.authInProgress = false;
                this.authPromise = null;
                resolve({ 
                  success: false, 
                  error: errorDescription || 'Authentication cancelled' 
                });
                return;
              }

              if (code) {
                console.log('✅ Authorization code received');
                const result = await this.completeAuthFlow(code);
                this.authInProgress = false;
                this.authPromise = null;
                resolve(result);
              }
            } catch (error) {
              this.authInProgress = false;
              this.authPromise = null;
              console.error('❌ Error in handleUrl:', error.message);
              resolve({ success: false, error: error.message });
            }
          }
        };

        // Utiliser seulement will-redirect pour éviter les doubles déclenchements
        this.authWindow.webContents.on('will-redirect', (event, url) => handleUrl(url));

        this.authWindow.on('closed', () => {
          clearTimeout(timeout);
          this.authWindow = null;
          if (!isProcessing) {
            this.authInProgress = false;
            this.authPromise = null;
            resolve({ success: false, error: 'Authentication window closed' });
          }
        });

        this.authWindow.webContents.on('crashed', () => {
          clearTimeout(timeout);
          this.authWindow = null;
          this.authInProgress = false;
          this.authPromise = null;
          resolve({ success: false, error: 'Window crashed' });
        });

      } catch (error) {
        this.authWindow = null;
        this.authInProgress = false;
        this.authPromise = null;
        console.error('❌ Authentication error:', error);
        resolve({ success: false, error: error.message });
      }
    });

    return this.authPromise;
  }

  async completeAuthFlow(code) {
    try {
      console.log('📋 Step 1: Exchanging code for tokens...');
      const tokens = await this.exchangeCodeForTokens(code);
      if (!tokens?.access_token) {
        return { success: false, error: 'Unable to get access token' };
      }
      console.log('✅ Microsoft tokens obtained');

      console.log('📋 Step 2: Xbox Live authentication...');
      const xboxToken = await this.authenticateXbox(tokens.access_token);
      if (!xboxToken) {
        return { success: false, error: 'Xbox Live authentication error' };
      }
      console.log('✅ Xbox token obtained');

      console.log('📋 Step 3: Getting XSTS token...');
      const xstsToken = await this.authenticateXSTS(xboxToken);
      if (!xstsToken?.token) {
        return { success: false, error: 'XSTS token error' };
      }
      console.log('✅ XSTS token obtained');

      console.log('📋 Step 4: Minecraft authentication...');
      const mcToken = await this.authenticateMinecraft(xstsToken);
      if (!mcToken) {
        return { success: false, error: 'Minecraft token error' };
      }
      console.log('✅ Minecraft token obtained');

      console.log('📋 Step 5: Getting Minecraft profile...');
      const profile = await this.getMinecraftProfile(mcToken);
      if (!profile?.name || !profile?.id) {
        return { 
          success: false, 
          error: 'No Minecraft profile found.\n\n⚠️ Make sure you have purchased Minecraft Java Edition on your Microsoft account.' 
        };
      }
      console.log('✅ Profile found:', profile.name);

      // ✅ SAVE DATA
      const authData = {
        type: 'microsoft',
        username: profile.name,
        uuid: profile.id,
        accessToken: mcToken,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        profile: profile,
        connectedAt: new Date().toISOString()
      };

      this.store.set('authData', authData);
      this.tokenCache = authData;
      
      console.log('🎉 Authentication successful!');
      return { success: true, data: authData };

    } catch (error) {
      console.error('❌ Authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ ÉCHANGER LE CODE POUR LES TOKENS (AVEC RETRY ROBUSTE)
   */
  async exchangeCodeForTokens(code, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://login.live.com/oauth20_token.srf', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirectUri,
            scope: 'XboxLive.signin offline_access'
          }).toString(),
          timeout: 10000
        });

        const data = await response.json();
        
        if (!response.ok || !data.access_token) {
          console.error(`⚠️ Tentative ${i + 1}/${retries}:`, data.error || 'Erreur inconnue');
          if (i < retries - 1) {
            await this.delay(Math.pow(2, i) * 1000);
            continue;
          }
          throw new Error(data.error_description || 'Erreur lors de l\'échange du code');
        }

        return data;
      } catch (error) {
        console.error(`⚠️ Tentative ${i + 1}/${retries} - Erreur:`, error.message);
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 1000);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Impossible d\'obtenir les tokens Microsoft');
  }

  /**
   * ✅ RAFRAÎCHIR LE TOKEN AUTOMATIQUEMENT
   */
  async refreshAccessToken() {
    try {
      const authData = this.store.get('authData');
      
      if (!authData?.refreshToken) {
        console.error('❌ Pas de refresh token disponible');
        this.store.delete('authData');
        return null;
      }

      console.log('🔄 Refreshing access token...');

      const response = await fetch('https://login.live.com/oauth20_token.srf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          refresh_token: authData.refreshToken,
          grant_type: 'refresh_token',
          redirect_uri: this.redirectUri,
          scope: 'XboxLive.signin offline_access'
        }).toString(),
        timeout: 10000
      });

      const data = await response.json();

      if (!response.ok || !data.access_token) {
        console.error('❌ Refresh failed:', data.error);
        this.store.delete('authData');
        return null;
      }

      // ✅ RÉAUTHENTIFIER LA CHAÎNE COMPLÈTE
      const xboxToken = await this.authenticateXbox(data.access_token);
      if (!xboxToken) {
        console.error('❌ Erreur Xbox lors du refresh');
        return null;
      }

      const xstsToken = await this.authenticateXSTS(xboxToken);
      if (!xstsToken?.token) {
        console.error('❌ Erreur XSTS lors du refresh');
        return null;
      }

      const mcToken = await this.authenticateMinecraft(xstsToken);
      if (!mcToken) {
        console.error('❌ Erreur Minecraft lors du refresh');
        return null;
      }

      // ✅ METTRE À JOUR LES DONNÉES
      authData.accessToken = mcToken;
      authData.refreshToken = data.refresh_token || authData.refreshToken;
      authData.expiresAt = Date.now() + (data.expires_in * 1000);
      
      this.store.set('authData', authData);
      this.tokenCache = authData;

      console.log('✅ Token refreshed successfully');
      return mcToken;

    } catch (error) {
      console.error('❌ Erreur refresh token:', error.message);
      this.store.delete('authData');
      return null;
    }
  }

  /**
   * ✅ VÉRIFIER ET RAFRAÎCHIR SI NÉCESSAIRE
   */
  async ensureValidToken() {
    const authData = this.store.get('authData');
    
    if (!authData) {
      console.warn('⚠️ No authentication data');
      return null;
    }

    // Si le token expire dans moins de 5 minutes
    if (authData.expiresAt && Date.now() > (authData.expiresAt - 5 * 60 * 1000)) {
      console.log('⏰ Token expiration approaching, refreshing...');
      return await this.refreshAccessToken();
    }

    return authData.accessToken;
  }

  /**
   * ✅ AUTHENTIFIER XBOX LIVE
   */
  async authenticateXbox(accessToken, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'x-xbl-contract-version': '1'
          },
          body: JSON.stringify({
            Properties: {
              AuthMethod: 'RPS',
              SiteName: 'user.auth.xboxlive.com',
              RpsTicket: `d=${accessToken}`
            },
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT'
          }),
          timeout: 10000
        });

        const data = await response.json();
        
        if (!response.ok || !data.Token) {
          console.error(`⚠️ Xbox tentative ${i + 1}/${retries}:`, data.XErr || 'Erreur inconnue');
          if (i < retries - 1) {
            await this.delay(Math.pow(2, i) * 500);
            continue;
          }
          throw new Error(data.Message || 'Erreur Xbox Live');
        }

        return data.Token;
      } catch (error) {
        console.error(`⚠️ Xbox tentative ${i + 1}/${retries}:`, error.message);
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 500);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Impossible d\'authentifier Xbox Live');
  }

  /**
   * ✅ AUTHENTIFIER XSTS
   */
  async authenticateXSTS(xboxToken, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'x-xbl-contract-version': '1'
          },
          body: JSON.stringify({
            Properties: {
              SandboxId: 'RETAIL',
              UserTokens: [xboxToken]
            },
            RelyingParty: 'rp://api.minecraftservices.com/',
            TokenType: 'JWT'
          }),
          timeout: 10000
        });

        const data = await response.json();
        
        if (!response.ok || !data.Token) {
          console.error(`⚠️ XSTS tentative ${i + 1}/${retries}:`, data.XErr || 'Erreur inconnue');
          if (i < retries - 1) {
            await this.delay(Math.pow(2, i) * 500);
            continue;
          }
          throw new Error(data.Message || 'Erreur XSTS');
        }

        return { 
          token: data.Token, 
          uhs: data.DisplayClaims.xui[0].uhs 
        };
      } catch (error) {
        console.error(`⚠️ XSTS tentative ${i + 1}/${retries}:`, error.message);
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 500);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Impossible d\'obtenir le token XSTS');
  }

  /**
   * ✅ AUTHENTIFIER MINECRAFT
   */
  async authenticateMinecraft(xstsData, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          body: JSON.stringify({
            identityToken: `XBL3.0 x=${xstsData.uhs};${xstsData.token}`
          }),
          timeout: 10000
        });

        const data = await response.json();
        
        if (!response.ok || !data.access_token) {
          console.error(`⚠️ Minecraft tentative ${i + 1}/${retries}:`, data.error || 'Erreur inconnue');
          if (i < retries - 1) {
            await this.delay(Math.pow(2, i) * 500);
            continue;
          }
          throw new Error(data.error_message || 'Erreur Minecraft');
        }

        return data.access_token;
      } catch (error) {
        console.error(`⚠️ Minecraft tentative ${i + 1}/${retries}:`, error.message);
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 500);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Impossible d\'authentifier Minecraft');
  }

  /**
   * ✅ OBTENIR LE PROFIL MINECRAFT
   */
  async getMinecraftProfile(mcToken, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://api.minecraftservices.com/minecraft/profile', {
          headers: { 
            'Authorization': `Bearer ${mcToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json'
          },
          timeout: 10000
        });

        if (!response.ok) {
          console.error(`⚠️ Profil tentative ${i + 1}/${retries} - Status: ${response.status}`);
          if (i < retries - 1) {
            await this.delay(Math.pow(2, i) * 500);
            continue;
          }
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const profile = await response.json();
        
        if (!profile.name || !profile.id) {
          throw new Error('Profil invalide - données manquantes');
        }

        console.log('✅ Profil Minecraft:', profile.name);
        return profile;
      } catch (error) {
        console.error(`⚠️ Profil tentative ${i + 1}/${retries}:`, error.message);
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 500);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Impossible d\'obtenir le profil Minecraft');
  }

  /**
   * ✅ UTILITAIRE - DÉLAI
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MicrosoftAuth;