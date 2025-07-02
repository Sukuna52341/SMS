const crypto = require('crypto');

// Your 32-byte hex key
const ENCRYPTION_KEY = Buffer.from('a4feac9bc687931cadd18a229718adabf7da433609a3a776be2007237b986b52', 'hex');
const IV_LENGTH = 16;

// Your encrypted value (base64)
const encryptedBase64 = 'Xz78iirPT+fXzA64uAUp1qDt2s5pwj1rkDgvjx7JtoY=';
const encrypted = Buffer.from(encryptedBase64, 'base64');

const iv = encrypted.slice(0, IV_LENGTH);
const encryptedText = encrypted.slice(IV_LENGTH);

try {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  console.log('Decrypted value:', decrypted.toString());
} catch (err) {
  console.error('Decryption failed:', err.message);
}
