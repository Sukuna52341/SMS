import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { executeQuery } from "@/lib/db-config";
import { encryptLoanData, decryptLoanData } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "customer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { encryptedData } = await request.json();
  const loanData = decryptLoanData(encryptedData);

  // Save to DB
  const result: any = await executeQuery(
    "INSERT INTO loans (user_id, encrypted_data, status) VALUES (?, ?, 'pending')",
    [user.id, encryptedData]
  );

  // Audit log
  createAuditLog({
    action: "APPLY_LOAN",
    resourceType: "LOAN",
    resourceId: result.insertId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `User applied for a loan`,
  });

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "customer") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const loans: any[] = await executeQuery(
    "SELECT id, encrypted_data, status, created_at FROM loans WHERE user_id = ?",
    [user.id]
  );
  const decryptedLoans = loans.map((loan: any) => {
    const data = decryptLoanData(loan.encrypted_data);
    return {
      id: loan.id,
      ...data,
      status: loan.status,
      createdAt: loan.created_at,
    };
  });
  return NextResponse.json({ success: true, data: decryptedLoans });
} 