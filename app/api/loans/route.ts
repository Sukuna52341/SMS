import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { executeQuery, insertNotification } from "@/lib/db-config";
import { encryptLoanData, decryptLoanData } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit-logger";
import { getCustomerByUserId } from "@/lib/customer-service";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "customer") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { encryptedData } = await request.json();
  const loanData = decryptLoanData(encryptedData);
  if (!loanData) return NextResponse.json({ success: false, error: "Invalid loan data" }, { status: 400 });

  // Get the customer id for this user
  const customer = await getCustomerByUserId(user.id);
  if (!customer) return NextResponse.json({ success: false, error: "Customer record not found" }, { status: 404 });

  // Encrypt amount and purpose separately
  const amountEncrypted = encryptLoanData({ amount: loanData.amount });
  const purposeEncrypted = encryptLoanData({ purpose: loanData.purpose });

  // Save to DB
  const result: any = await executeQuery(
    "INSERT INTO loans (id, customer_id, amount_encrypted, purpose_encrypted, status) VALUES (UUID(), ?, ?, ?, 'pending')",
    [customer.id, amountEncrypted, purposeEncrypted]
  );

  // Audit log
  await createAuditLog({
    action: "APPLY_LOAN",
    resourceType: "LOAN",
    resourceId: result.insertId || "unknown",
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `User applied for a loan`,
    ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: request.headers.get("user-agent") || "Unknown",
  });

  // Send notification to customer
  await insertNotification(user.id, `Your loan application for ${loanData.amount} XAF has been submitted and is under review.`);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "customer") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  // Get the customer id for this user
  const customer = await getCustomerByUserId(user.id);
  if (!customer) return NextResponse.json({ success: false, error: "Customer record not found" }, { status: 404 });

  const loans: any[] = await executeQuery(
    "SELECT id, amount_encrypted, purpose_encrypted, status, created_at FROM loans WHERE customer_id = ?",
    [customer.id]
  );
  const decryptedLoans = loans.map((loan: any) => {
    const amountData = decryptLoanData(loan.amount_encrypted?.toString?.() ?? "");
    const purposeData = decryptLoanData(loan.purpose_encrypted?.toString?.() ?? "");
    return {
      id: loan.id,
      amount: amountData?.amount ?? null,
      purpose: purposeData?.purpose ?? null,
      status: loan.status,
      createdAt: loan.created_at,
    };
  });
  return NextResponse.json({ success: true, data: decryptedLoans });
}