"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { DocumentUpload } from "@/components/document-upload";
import Navbar from "@/components/navbar";

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export default function ApplyLoan() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loanId, setLoanId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [step, setStep] = useState<"loan-details" | "documents" | "review" | "complete">("loan-details");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && user.role !== "customer") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmitLoanDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !purpose) {
      setError("Please fill in all required fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid loan amount");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numAmount,
          purpose,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLoanId(result.loanId);
        setStep("documents");
        setSuccess("Loan details saved! Now please upload your required documents to complete the application.");
      } else {
        setError(result.error || "Failed to save loan details");
      }
    } catch (err) {
      setError("Failed to save loan details");
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentsComplete = () => {
    setStep("review");
  };

  const handleSubmitApplication = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Final submission - could include additional validation here
      setStep("complete");
      setSuccess("Your loan application has been submitted successfully! We will review your application and get back to you within 3-5 business days.");
    } catch (err) {
      setError("Failed to complete application");
      console.error("Final submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentsChange = (newDocuments: Document[]) => {
    setDocuments(newDocuments);
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold dark:text-white mb-2">Apply for a Loan</h1>
          <p className="text-muted-foreground">
            Complete your loan application by providing the required information and documents.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === "loan-details" || step === "documents" || step === "review" || step === "complete" ? "text-green-600" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "loan-details" || step === "documents" || step === "review" || step === "complete" ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                1
              </div>
              <span className="hidden sm:inline">Loan Details</span>
            </div>
            <div className={`w-8 h-1 ${step === "documents" || step === "review" || step === "complete" ? "bg-green-600" : "bg-muted"}`}></div>
            <div className={`flex items-center space-x-2 ${step === "documents" || step === "review" || step === "complete" ? "text-green-600" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "documents" || step === "review" || step === "complete" ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                2
              </div>
              <span className="hidden sm:inline">Documents</span>
            </div>
            <div className={`w-8 h-1 ${step === "review" || step === "complete" ? "bg-green-600" : "bg-muted"}`}></div>
            <div className={`flex items-center space-x-2 ${step === "review" || step === "complete" ? "text-green-600" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "review" || step === "complete" ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                3
              </div>
              <span className="hidden sm:inline">Review</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Loan Details */}
        {step === "loan-details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Loan Details
              </CardTitle>
              <CardDescription>
                Please provide the basic information for your loan application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitLoanDetails} className="space-y-4">
                <div>
                  <Label htmlFor="amount">Loan Amount (XAF)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter loan amount in XAF"
                    min="1000"
                    step="1000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="purpose">Loan Purpose</Label>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe the purpose of your loan"
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Saving..." : "Save Details & Continue to Documents"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Document Upload */}
        {step === "documents" && loanId && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Required Documents
                </CardTitle>
                <CardDescription>
                  Please upload the following documents to support your loan application:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4">
                  <li>Government-issued ID (Passport, National ID, Driver's License)</li>
                  <li>Proof of income (Payslip, Bank statements, Business registration)</li>
                  <li>Collateral documents (if applicable)</li>
                  <li>Bank statements (last 3 months)</li>
                  <li>Any other supporting documents</li>
                </ul>
              </CardContent>
            </Card>

            <DocumentUpload
              loanId={loanId}
              onDocumentsChange={handleDocumentsChange}
            />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("loan-details")}
              >
                Back
              </Button>
              <Button
                onClick={handleDocumentsComplete}
                disabled={documents.length === 0}
              >
                Continue to Review
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Application</CardTitle>
                <CardDescription>
                  Please review your loan application before final submission.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Loan Amount</Label>
                    <p className="text-lg font-semibold">{amount} XAF</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Purpose</Label>
                    <p className="text-sm text-muted-foreground">{purpose}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Documents Uploaded</Label>
                  <p className="text-sm text-muted-foreground">
                    {documents.length} document(s)
                  </p>
                  <ul className="mt-2 space-y-1">
                    {documents.map((doc) => (
                      <li key={doc.id} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Upload className="h-3 w-3" />
                        {doc.fileName}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("documents")}
              >
                Back to Documents
              </Button>
              <Button
                onClick={handleSubmitApplication}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your loan application has been successfully submitted. We will review your application and contact you within 3-5 business days.
              </p>
              <div className="space-y-4">
                <Button onClick={() => router.push("/my-loans")} className="mr-2">
                  View My Applications
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
} 