import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { uploadDocument, getDocumentsByLoanId, validateFile } from "@/lib/document-service";
import { createAuditLog } from "@/lib/audit-logger";
import { getCustomerByUserId } from "@/lib/customer-service";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== "customer") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const loanId = formData.get("loanId") as string;
    const documentType = formData.get("documentType") as string;
    const file = formData.get("file") as File;

    if (!loanId || !documentType || !file) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: loanId, documentType, or file" 
      }, { status: 400 });
    }

    // Verify the loan exists and belongs to this customer
    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer record not found" }, { status: 404 });
    }

    const { getLoansByCustomer } = await import("@/lib/loan-service");
    const customerLoans = await getLoansByCustomer(customer.id);
    const loanExists = customerLoans.some(loan => loan.id === loanId);
    
    if (!loanExists) {
      return NextResponse.json({ 
        success: false, 
        error: "Loan not found or access denied" 
      }, { status: 404 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ 
        success: false, 
        error: validation.error 
      }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload document
    const document = await uploadDocument({
      loanId,
      documentType: documentType as any,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileBuffer
    });

    // Create audit log
    await createAuditLog({
      action: "UPLOAD_DOCUMENT",
      resourceType: "LOAN_DOCUMENT",
      resourceId: document.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Uploaded ${documentType} document for loan ${loanId}`,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        id: document.id,
        fileName: document.file_name,
        documentType: document.document_type,
        fileSize: document.file_size,
        uploadedAt: document.uploaded_at
      }
    });

  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to upload document" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get("loanId");

    if (!loanId) {
      return NextResponse.json({ 
        success: false, 
        error: "Loan ID is required" 
      }, { status: 400 });
    }

    // Only allow customers to view their own documents, or admins/staff to view any
    if (user.role === "customer") {
      const customer = await getCustomerByUserId(user.id);
      if (!customer) {
        return NextResponse.json({ success: false, error: "Customer record not found" }, { status: 404 });
      }
      
      // Verify the loan belongs to this customer
      const { getLoansByCustomer } = await import("@/lib/loan-service");
      const customerLoans = await getLoansByCustomer(customer.id);
      const loanExists = customerLoans.some(loan => loan.id === loanId);
      
      if (!loanExists) {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
      }
    }

    const documents = await getDocumentsByLoanId(loanId);

    return NextResponse.json({ 
      success: true, 
      data: documents.map(doc => ({
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedAt: doc.uploaded_at
      }))
    });

  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch documents" 
    }, { status: 500 });
  }
} 