import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { executeQuery, insertNotification } from "@/lib/db-config";
import { encryptLoanAmount, encryptLoanPurpose, decryptLoanAmount, decryptLoanPurpose } from "@/lib/encryption-utils";
import { createAuditLog } from "@/lib/audit-logger";
import { getCustomerByUserId } from "@/lib/customer-service";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "customer") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { amount, purpose } = await request.json();
  if (!amount || !purpose) return NextResponse.json({ success: false, error: "Invalid loan data" }, { status: 400 });

  // Get the customer id for this user
  const customer = await getCustomerByUserId(user.id);
  if (!customer) return NextResponse.json({ success: false, error: "Customer record not found" }, { status: 404 });

  // Encrypt amount and purpose separately using Node crypto (string-based)
  const amountEncrypted = await encryptLoanAmount(String(amount));
  const purposeEncrypted = await encryptLoanPurpose(String(purpose));

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
  await insertNotification(user.id, `Your loan application for ${amount} XAF has been submitted and is under review.`);

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
    let amount = null;
    let purpose = null;
    try {
      let encrypted = loan.amount_encrypted;
      if (Buffer.isBuffer(encrypted)) {
        const asString = encrypted.toString('utf8');
        if (/^[A-Za-z0-9+/=]+$/.test(asString) && asString.length > 20) {
          encrypted = Buffer.from(asString, 'base64');
        }
      }
      amount = decryptLoanAmount(encrypted);
    } catch {
      amount = null;
    }
    try {
      let encrypted = loan.purpose_encrypted;
      if (Buffer.isBuffer(encrypted)) {
        const asString = encrypted.toString('utf8');
        if (/^[A-Za-z0-9+/=]+$/.test(asString) && asString.length > 20) {
          encrypted = Buffer.from(asString, 'base64');
        }
      }
      purpose = decryptLoanPurpose(encrypted);
    } catch {
      purpose = null;
    }
    // Log the decrypted values
    console.log('Decrypted loan:', { id: loan.id, amount, purpose });
    return {
      id: loan.id,
      amount,
      purpose,
      status: loan.status,
      createdAt: loan.created_at,
    };
  });
  return NextResponse.json({ success: true, data: decryptedLoans });
}