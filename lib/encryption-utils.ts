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