// Utilitário TOTP (Google Authenticator) sem dependências externas
const crypto = require('crypto');

// Gera uma chave secreta aleatória em base32
function generateSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) {
    secret += chars[bytes[i] & 31];
  }
  return secret;
}

// Converte base32 para buffer
function base32ToBuffer(base32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const output = [];
  for (let i = 0; i < base32.length; i++) {
    value = (value << 5) | chars.indexOf(base32[i].toUpperCase());
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// Gera o código TOTP atual
function generateTOTP(secret) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));
  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               (hmac[offset + 1] << 16) |
               (hmac[offset + 2] << 8) |
               hmac[offset + 3];
  return String(code % 1000000).padStart(6, '0');
}

// Verifica o código (aceita ±1 intervalo de 30s)
function verifyTOTP(secret, token) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -1; i <= 1; i++) {
    const c = counter + i;
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(c));
    const key = base32ToBuffer(secret);
    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 (hmac[offset + 1] << 16) |
                 (hmac[offset + 2] << 8) |
                 hmac[offset + 3];
    const totp = String(code % 1000000).padStart(6, '0');
    if (totp === String(token).padStart(6, '0')) return true;
  }
  return false;
}

// Gera URL para QR Code
function generateOTPAuthURL(secret, label, issuer) {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = { generateSecret, generateTOTP, verifyTOTP, generateOTPAuthURL };
