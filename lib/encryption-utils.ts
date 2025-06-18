import crypto from 'crypto';

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

export async function encryptLoanAmount(amount: string): Promise<Buffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(amount), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export function decryptLoanAmount(encrypted: Buffer): string {
  if (!encrypted || encrypted.length <= IV_LENGTH) return "";
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedText = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

export async function encryptLoanPurpose(purpose: string): Promise<Buffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(purpose), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export function decryptLoanPurpose(encrypted: Buffer): string {
  if (!encrypted || encrypted.length <= IV_LENGTH) return "";
  const iv = encrypted.slice(0, IV_LENGTH);
  const encryptedText = encrypted.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
} 