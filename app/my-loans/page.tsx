"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, CheckCircle, XCircle, FileText, Eye, Download } from "lucide-react";
import Navbar from "@/components/navbar";

interface Loan {
  id: string;
  amount: string;
  purpose: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  documents?: Document[];
}

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export default function MyLoans() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && user.role !== "customer") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "customer") {
      fetchLoans();
    }
  }, [user]);

  const fetchLoans = async () => {
    try {
      setLoadingLoans(true);
      const response = await fetch("/api/loans");
      const result = await response.json();
      
      if (result.success) {
        setLoans(result.data || []);
      } else {
        setError(result.error || "Failed to fetch loans");
      }
    } catch (err) {
      setError("Failed to fetch loans");
      console.error("Fetch loans error:", err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleViewDocuments = async (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDocuments(true);
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/loans/documents/${documentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to download document:", error);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold dark:text-white mb-2">My Loan Applications</h1>
          <p className="text-muted-foreground">
            Track the status of your loan applications and view submitted documents.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loans.length}</div>
              <p className="text-xs text-muted-foreground">
                {loans.length === 1 ? "1 application" : `${loans.length} applications`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loans.filter(loan => loan.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loans.filter(loan => loan.status === "approved").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully approved
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Loan Applications</CardTitle>
            <CardDescription>
              View all your loan applications and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLoans ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No loan applications yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any loan applications yet.
                </p>
                <Button onClick={() => router.push("/apply-loan")}>
                  Apply for a Loan
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount (XAF)</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          {loan.amount ? `${parseInt(loan.amount).toLocaleString()} XAF` : "N/A"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {loan.purpose || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(loan.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(loan.status)}
                              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {loan.documents ? loan.documents.length : 0} document(s)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocuments(loan)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Modal */}
        {showDocuments && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Loan Details & Documents</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocuments(false)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Amount:</label>
                    <p className="text-lg font-semibold">
                      {selectedLoan.amount ? `${parseInt(selectedLoan.amount).toLocaleString()} XAF` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status:</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedLoan.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(selectedLoan.status)}
                          {selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1)}
                        </div>
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Purpose:</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLoan.purpose || "N/A"}
                  </p>
                </div>

                {selectedLoan.approvedBy && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Approved By:</label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLoan.approvedBy}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Approved At:</label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLoan.approvedAt ? new Date(selectedLoan.approvedAt).toLocaleString() : "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Documents:</label>
                  {selectedLoan.documents && selectedLoan.documents.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedLoan.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.documentType} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadDocument(doc.id, doc.fileName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No documents uploaded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 