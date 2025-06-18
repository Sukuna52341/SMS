// Install with: npm install crypto-js
import CryptoJS from "crypto-js";

/**
 * Encrypts a loan data object using AES.
 * @param data The loan data to encrypt
 * @returns The encrypted string
 */
export function encryptLoanData(data: Record<string, any>): string {
  const SECRET = process.env.LOAN_ENCRYPTION_SECRET || "default_secret";
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET).toString();
}

/**
 * Decrypts an AES-encrypted loan data string.
 * @param ciphertext The encrypted string
 * @returns The decrypted loan data object
 */
export function decryptLoanData(ciphertext: string): Record<string, any> {
  const SECRET = process.env.LOAN_ENCRYPTION_SECRET || "default_secret";
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
} 