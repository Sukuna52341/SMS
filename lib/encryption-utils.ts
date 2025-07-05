import crypto from 'crypto';
console.log('Loaded ENCRYPTION_KEY in API:', process.env.ENCRYPTION_KEY);

// You should store this in environment variables in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : Buffer.alloc(32);
const IV_LENGTH = 16;

export async function encryptSSN(ssn: string): Promise<Buffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(ssn), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export async function encryptAccountNumber(accountNumber: string): Promise<Buffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(accountNumber), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export function decryptSSN(encrypted: Buffer): string {
  if (!encrypted || encrypted.length <= IV_LENGTH) return "";
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedText = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

export function decryptAccountNumber(encrypted: Buffer): string {
  if (!encrypted || encrypted.length <= IV_LENGTH) return "";
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedText = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

export async function encryptLoanAmount(amount: string): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(amount), cipher.final()]);
  // Return as base64 string
  return Buffer.concat([iv, encrypted]).toString('base64');
}

export function decryptLoanAmount(encrypted: Buffer | string): string {
  if (!encrypted) return "";
  // Always decode to Buffer if string
  if (typeof encrypted === "string") {
    encrypted = Buffer.from(encrypted, "base64");
  }
  if (encrypted.length <= IV_LENGTH) return "";
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedText = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

export async function encryptLoanPurpose(purpose: string): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(purpose), cipher.final()]);
  // Return as base64 string
  return Buffer.concat([iv, encrypted]).toString('base64');
}

export function decryptLoanPurpose(encrypted: Buffer | string): string {
  if (!encrypted) return "";
  // Always decode to Buffer if string
  if (typeof encrypted === "string") {
    encrypted = Buffer.from(encrypted, "base64");
  }
  if (encrypted.length <= IV_LENGTH) return "";
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedText = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

// Generic encryption/decryption functions for files and other data
export async function encrypt(data: Buffer): Promise<Buffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export async function decrypt(encrypted: Buffer): Promise<Buffer> {
  if (!encrypted || encrypted.length <= IV_LENGTH) {
    throw new Error("Invalid encrypted data");
  }
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedData = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
}