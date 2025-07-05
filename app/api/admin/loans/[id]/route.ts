import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { getLoanWithDocuments } from "@/lib/loan-service";
import { decryptLoanAmount, decryptLoanPurpose } from "@/lib/encryption-utils";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const loanId = params.id;
    if (!loanId) {
      return NextResponse.json({ 
        success: false, 
        error: "Loan ID is required" 
      }, { status: 400 });
    }

    // Get loan with documents
    const loan = await getLoanWithDocuments(loanId);
    if (!loan) {
      return NextResponse.json({ 
        success: false, 
        error: "Loan not found" 
      }, { status: 404 });
    }

    // Decrypt loan amount and purpose
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

    // Create audit log
    await createAuditLog({
      action: "VIEW_LOAN_DETAILS",
      resourceType: "LOAN",
      resourceId: loanId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Viewed loan details and documents for loan ${loanId}`,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        id: loan.id,
        customerId: loan.customer_id,
        customerName: loan.customer_name,
        customerEmail: loan.customer_email,
        amount,
        purpose,
        status: loan.status,
        createdAt: loan.created_at,
        updatedAt: loan.updated_at,
        approvedBy: loan.approved_by,
        approvedAt: loan.approved_at,
        documents: loan.documents
      }
    });

  } catch (error) {
    console.error("Error fetching loan details:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch loan details" 
    }, { status: 500 });
  }
} 