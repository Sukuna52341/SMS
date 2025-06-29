import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { getAllPendingLoansWithCustomer } from "@/lib/loan-service";
import { decryptLoanAmount, decryptLoanPurpose } from "@/lib/encryption-utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const loans = await getAllPendingLoansWithCustomer();
  const result = loans.map((loan: any) => ({
    id: loan.id,
    customerName: loan.customer_name,
    customerEmail: loan.customer_email,
    amount: decryptLoanAmount(loan.amount_encrypted),
    purpose: decryptLoanPurpose(loan.purpose_encrypted),
    createdAt: loan.created_at,
    status: loan.status,
  }));
  return NextResponse.json({ success: true, data: result });
} 