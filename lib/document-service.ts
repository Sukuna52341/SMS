import { executeQuery } from "./db-config";
import { generateId } from "./db";
import { encrypt, decrypt } from "./encryption-utils";
import crypto from "crypto";

export interface LoanDocument {
  id: string;
  loan_id: string;
  document_type: "government_id" | "income_proof" | "collateral_document" | "bank_statement" | "other";
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

export interface UploadDocumentInput {
  loanId: string;
  documentType: "government_id" | "income_proof" | "collateral_document" | "bank_statement" | "other";
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileBuffer: Buffer;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than 4MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed types: PDF, Images, Word, Excel` };
  }
  
  return { valid: true };
}

export async function uploadDocument({
  loanId,
  documentType,
  fileName,
  fileSize,
  mimeType,
  fileBuffer
}: UploadDocumentInput): Promise<LoanDocument> {
  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than 4MB. Current size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed. Allowed types: PDF, Images, Word, Excel`);
  }

  // Encrypt the file data
  const encryptedData = await encrypt(fileBuffer);

  const id = generateId();
  await executeQuery(
    `INSERT INTO loan_documents (id, loan_id, document_type, file_name, file_size, mime_type, file_data_encrypted)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, loanId, documentType, fileName, fileSize, mimeType, encryptedData]
  );

  return {
    id,
    loan_id: loanId,
    document_type: documentType,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
    uploaded_at: new Date(),
  };
}

export async function getDocumentsByLoanId(loanId: string): Promise<LoanDocument[]> {
  const rows = await executeQuery<LoanDocument[]>(
    `SELECT id, loan_id, document_type, file_name, file_size, mime_type, uploaded_at 
     FROM loan_documents 
     WHERE loan_id = ? 
     ORDER BY uploaded_at DESC`,
    [loanId]
  );
  return rows;
}

export async function downloadDocument(documentId: string): Promise<{ fileBuffer: Buffer; fileName: string; mimeType: string } | null> {
  const rows = await executeQuery<any[]>(
    `SELECT file_data_encrypted, file_name, mime_type 
     FROM loan_documents 
     WHERE id = ?`,
    [documentId]
  );

  if (rows.length === 0) {
    return null;
  }

  const { file_data_encrypted, file_name, mime_type } = rows[0];
  
  // Decrypt the file data
  const decryptedData = await decrypt(file_data_encrypted);

  return {
    fileBuffer: decryptedData,
    fileName: file_name,
    mimeType: mime_type,
  };
}

export async function deleteDocument(documentId: string): Promise<void> {
  await executeQuery(
    `DELETE FROM loan_documents WHERE id = ?`,
    [documentId]
  );
}

export async function getDocumentCountByLoanId(loanId: string): Promise<number> {
  const rows = await executeQuery<any[]>(
    `SELECT COUNT(*) as count FROM loan_documents WHERE loan_id = ?`,
    [loanId]
  );
  return rows[0]?.count || 0;
}

export async function getDocumentsByType(loanId: string, documentType: string): Promise<LoanDocument[]> {
  const rows = await executeQuery<LoanDocument[]>(
    `SELECT id, loan_id, document_type, file_name, file_size, mime_type, uploaded_at 
     FROM loan_documents 
     WHERE loan_id = ? AND document_type = ? 
     ORDER BY uploaded_at DESC`,
    [loanId, documentType]
  );
  return rows;
} 