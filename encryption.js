/* AuraCall dual encryption helpers: E2E-style conversation keys + PBKDF2 backup keys. */
(function () {
  'use strict';

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const subtle = window.crypto && window.crypto.subtle;

  function toBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  }

  async function importAesKey(raw) {
    return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  async function deriveConversationKey(conversationId) {
    const material = enc.encode(`auracall-e2e-demo:${conversationId}:local-peer-key`);
    const digest = await subtle.digest('SHA-256', material);
    return importAesKey(digest);
  }

  async function deriveBackupKey(password, salt) {
    const baseKey = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(plainText, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
    return { cipherText: toBase64(cipher), iv: toBase64(iv) };
  }

  async function decryptText(payload, key) {
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.cipherText));
    return dec.decode(plain);
  }

  window.AuraEncryption = {
    supported: Boolean(subtle),
    async encryptE2E(plainText, conversationId) {
      if (!subtle) return null;
      const key = await deriveConversationKey(conversationId);
      return { mode: 'e2e', ...(await encryptText(plainText, key)) };
    },
    async decryptE2E(payload, conversationId) {
      const key = await deriveConversationKey(conversationId);
      return decryptText(payload, key);
    },
    async encryptBackup(plainText, password = 'auracall-demo-backup') {
      if (!subtle) return null;
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveBackupKey(password, salt);
      return { mode: 'backup', salt: toBase64(salt), ...(await encryptText(plainText, key)) };
    },
    async decryptBackup(payload, password = 'auracall-demo-backup') {
      const key = await deriveBackupKey(password, fromBase64(payload.salt));
      return decryptText(payload, key);
    }
  };
})();
