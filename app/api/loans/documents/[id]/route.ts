import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { downloadDocument } from "@/lib/document-service";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    if (!documentId) {
      return NextResponse.json({ 
        success: false, 
        error: "Document ID is required" 
      }, { status: 400 });
    }

    // Download the document
    const document = await downloadDocument(documentId);
    if (!document) {
      return NextResponse.json({ 
        success: false, 
        error: "Document not found" 
      }, { status: 404 });
    }

    // Create audit log for document access
    await createAuditLog({
      action: "VIEW_DOCUMENT",
      resourceType: "LOAN_DOCUMENT",
      resourceId: documentId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Viewed document: ${document.fileName}`,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
    });

    // Return the file as a response
    return new NextResponse(document.fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Content-Length': document.fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to download document" 
    }, { status: 500 });
  }
} 