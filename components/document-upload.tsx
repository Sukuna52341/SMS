"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, File, X, Eye, Download } from "lucide-react";
// Client-side file validation
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than 4MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed types: PDF, Images, Word, Excel` };
  }
  
  return { valid: true };
}

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  loanId: string;
  onDocumentsChange?: (documents: Document[]) => void;
  existingDocuments?: Document[];
  readOnly?: boolean;
}

const DOCUMENT_TYPES = [
  { value: "government_id", label: "Government ID" },
  { value: "income_proof", label: "Income Proof" },
  { value: "collateral_document", label: "Collateral Document" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "other", label: "Other" },
];

export function DocumentUpload({ 
  loanId, 
  onDocumentsChange, 
  existingDocuments = [], 
  readOnly = false 
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>(existingDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("government_id");

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if we have a valid loan ID
    if (!loanId) {
      setError("No loan application found. Please submit a loan application first.");
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("loanId", loanId);
      formData.append("documentType", selectedDocumentType);
      formData.append("file", file);

      const response = await fetch("/api/loans/documents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const newDocument: Document = {
          id: result.data.id,
          documentType: result.data.documentType,
          fileName: result.data.fileName,
          fileSize: result.data.fileSize,
          mimeType: file.type,
          uploadedAt: result.data.uploadedAt,
        };

        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);
        onDocumentsChange?.(updatedDocuments);
        setSuccess(`Successfully uploaded ${file.name}`);
        
        // Reset form
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError(result.error || "Failed to upload document. Please ensure you have submitted a loan application first.");
      }
    } catch (err) {
      setError("Failed to upload document");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/loans/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedDocuments = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocuments);
        onDocumentsChange?.(updatedDocuments);
        setSuccess("Document deleted successfully");
      } else {
        setError("Failed to delete document");
      }
    } catch (err) {
      setError("Failed to delete document");
      console.error("Delete error:", err);
    }
  };

  const handleViewDocument = (documentId: string) => {
    window.open(`/api/loans/documents/${documentId}`, "_blank");
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="h-5 w-5" />
          Loan Documents
        </CardTitle>
        <CardDescription>
          Upload required documents for your loan application. Maximum file size: 4MB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!readOnly && (
          <div className="space-y-4">
            {!loanId ? (
              <Alert>
                <AlertDescription>
                  Please submit a loan application first before uploading documents.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                />
              </>
            )}
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Documents</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.fileName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">
                          {getDocumentTypeLabel(doc.documentType)}
                        </Badge>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
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
                    
                    {!readOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 