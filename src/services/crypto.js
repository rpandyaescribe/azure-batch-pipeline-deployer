// Simple encryption/decryption for PAT storage
// Note: This is basic obfuscation, not military-grade encryption
// For production use, consider using Web Crypto API or a proper encryption library

class CryptoService {
  constructor() {
    // Generate or retrieve a persistent key for this browser
    this.key = this.getOrCreateKey();
  }

  getOrCreateKey() {
    let key = localStorage.getItem('_app_key');
    if (!key) {
      // Generate a random key for this browser instance
      key = this.generateKey();
      localStorage.setItem('_app_key', key);
    }
    return key;
  }

  generateKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Simple XOR encryption with the key
  encrypt(text) {
    if (!text) return '';
    
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = this.key.charCodeAt(i % this.key.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }
    // Convert to base64 for safe storage
    return btoa(encrypted);
  }

  decrypt(encryptedText) {
    if (!encryptedText) return '';
    
    try {
      // Decode from base64
      const decoded = atob(encryptedText);
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyChar = this.key.charCodeAt(i % this.key.length);
        decrypted += String.fromCharCode(charCode ^ keyChar);
      }
      
      return decrypted;
    } catch (e) {
      console.error('Decryption failed:', e);
      return '';
    }
  }

  // Store encrypted config
  saveConfig(config) {
    const toStore = {
      organization: config.organization,
      project: config.project,
      pat: this.encrypt(config.pat)
    };
    localStorage.setItem('azureConfig', JSON.stringify(toStore));
  }

  // Load and decrypt config
  loadConfig() {
    const stored = localStorage.getItem('azureConfig');
    if (!stored) return null;
    
    try {
      const config = JSON.parse(stored);
      return {
        organization: config.organization,
        project: config.project,
        pat: this.decrypt(config.pat)
      };
    } catch (e) {
      console.error('Failed to load config:', e);
      return null;
    }
  }

  clearConfig() {
    localStorage.removeItem('azureConfig');
  }
}

export default new CryptoService();