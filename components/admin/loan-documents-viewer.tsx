"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { File, Eye, Download, Calendar, User, DollarSign } from "lucide-react";

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface LoanDetails {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  amount: string;
  purpose: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  documents: Document[];
}

interface LoanDocumentsViewerProps {
  loanId: string;
}

const DOCUMENT_TYPES = [
  { value: "government_id", label: "Government ID", color: "bg-blue-100 text-blue-800" },
  { value: "income_proof", label: "Income Proof", color: "bg-green-100 text-green-800" },
  { value: "collateral_document", label: "Collateral Document", color: "bg-purple-100 text-purple-800" },
  { value: "bank_statement", label: "Bank Statement", color: "bg-orange-100 text-orange-800" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
];

export function LoanDocumentsViewer({ loanId }: LoanDocumentsViewerProps) {
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLoanDetails();
  }, [loanId]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/loans/${loanId}`);
      const result = await response.json();

      if (result.success) {
        setLoanDetails(result.data);
      } else {
        setError(result.error || "Failed to fetch loan details");
      }
    } catch (err) {
      setError("Failed to fetch loan details");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (documentId: string) => {
    window.open(`/api/loans/documents/${documentId}`, "_blank");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type)?.label || type;
  };

  const getDocumentTypeColor = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type)?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading loan details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !loanDetails) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Failed to load loan details"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loan Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Loan Application Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Customer:</span>
                <span>{loanDetails.customerName}</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                {loanDetails.customerEmail}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Amount (XAF):</span>
              <span>{loanDetails.amount} XAF</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Applied:</span>
              <span>{new Date(loanDetails.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(loanDetails.status)}>
                {loanDetails.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          {loanDetails.purpose && (
            <div>
              <span className="font-medium">Purpose:</span>
              <p className="text-sm text-muted-foreground mt-1">{loanDetails.purpose}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Supporting Documents
          </CardTitle>
          <CardDescription>
            {loanDetails.documents.length} document(s) uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loanDetails.documents.length > 0 ? (
            <div className="space-y-3">
              {loanDetails.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge className={getDocumentTypeColor(doc.documentType)}>
                          {getDocumentTypeLabel(doc.documentType)}
                        </Badge>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(doc.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(doc.id)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded for this loan application</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 