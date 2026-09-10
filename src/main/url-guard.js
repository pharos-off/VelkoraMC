class UrlGuard {
  constructor() {
    this.allowedHosts = new Set([
      'github.com',
      'www.github.com',
      'discord.com',
      'discordapp.com',
      'www.discord.com',
      'minecraft.net',
      'www.minecraft.net',
      'login.live.com',
      'login.microsoftonline.com',
      'paypal.me',
      'localhost'
    ]);
  }

  normalize(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }

  isAllowed(url) {
    const parsed = this.normalize(url);
    if (!parsed) return false;

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    const isAllowedHost = this.allowedHosts.has(parsed.hostname);
    if (!isAllowedHost) {
      return false;
    }

    return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  }

  sanitize(url) {
    const parsed = this.normalize(url);
    if (!parsed) return null;
    if (!this.isAllowed(parsed.href)) return null;
    return parsed.href;
  }
}

module.exports = UrlGuard;
module.exports.default = UrlGuard;
