import { executeQuery } from "./db-config";
import { generateId } from "./db";

export interface Loan {
  id: string;
  customer_id: string;
  amount_encrypted: string;
  purpose_encrypted: string;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
  updated_at: Date;
  approved_by?: string | null;
  approved_at?: Date | null;
}

export interface SaveLoanInput {
  customerId: string;
  amount_encrypted: string;
  purpose_encrypted: string;
  status: "pending" | "approved" | "rejected";
}

export async function saveLoan({ customerId, amount_encrypted, purpose_encrypted, status }: SaveLoanInput): Promise<Loan> {
  const id = generateId();
  await executeQuery(
    `INSERT INTO loans (id, customer_id, amount_encrypted, purpose_encrypted, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, customerId, amount_encrypted, purpose_encrypted, status]
  );
  return {
    id,
    customer_id: customerId,
    amount_encrypted,
    purpose_encrypted,
    status,
    created_at: new Date(),
    updated_at: new Date(),
    approved_by: null,
    approved_at: null,
  };
}

export async function getLoansByStatus(status: "pending" | "approved" | "rejected"): Promise<Loan[]> {
  const rows = await executeQuery<Loan[]>(
    `SELECT * FROM loans WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
  return rows;
}

export async function updateLoanStatus(loanId: string, status: "approved" | "rejected", approvedBy: string): Promise<void> {
  await executeQuery(
    `UPDATE loans SET status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [status, approvedBy, loanId]
  );
}

export async function getLoansByCustomer(customerId: string): Promise<Loan[]> {
  const rows = await executeQuery<Loan[]>(
    `SELECT * FROM loans WHERE customer_id = ? ORDER BY created_at DESC`,
    [customerId]
  );
  return rows;
}

export async function getAllPendingLoansWithCustomer(): Promise<any[]> {
  // Join loans with customers and users for display
  const rows = await executeQuery<any[]>(
    `SELECT loans.*, customers.name AS customer_name, users.email AS customer_email
     FROM loans
     JOIN customers ON loans.customer_id = customers.id
     JOIN users ON customers.user_id = users.id
     WHERE loans.status = 'pending'
     ORDER BY loans.created_at ASC`
  );
  return rows;
}

export async function getCustomerIdByLoanId(loanId: string): Promise<string | null> {
  const rows = await executeQuery<any[]>(
    `SELECT customer_id FROM loans WHERE id = ?`,
    [loanId]
  );
  return rows[0]?.customer_id || null;
} 