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
  if (loans.length > 0) {
    console.log("Sample loan.amount_encrypted:", loans[0].amount_encrypted);
    console.log("Type of amount_encrypted:", typeof loans[0].amount_encrypted);
    console.log("Sample loan.purpose_encrypted:", loans[0].purpose_encrypted);
    console.log("Type of purpose_encrypted:", typeof loans[0].purpose_encrypted);
    console.log("amount_encrypted base64:", loans[0].amount_encrypted?.toString('base64'));
    console.log("purpose_encrypted base64:", loans[0].purpose_encrypted?.toString('base64'));
  }
  const result = loans.map((loan: any) => {
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
    } catch (e) {
      console.error("Failed to decrypt loan amount for loan", loan.id, e);
      amount = "(decryption error)";
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
    } catch (e) {
      console.error("Failed to decrypt loan purpose for loan", loan.id, e);
      purpose = "(decryption error)";
    }
    return {
      id: loan.id,
      customerName: loan.customer_name,
      customerEmail: loan.customer_email,
      amount,
      purpose,
      createdAt: loan.created_at,
      status: loan.status,
    };
  });
  return NextResponse.json({ success: true, data: result });
}