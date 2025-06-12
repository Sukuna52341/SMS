"use client"

import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Shield, Download, Trash, Clock, CheckCircle, AlertCircle, FileText, Eye, EyeOff } from "lucide-react"
//import { createAuditLog } from "@/lib/audit-logger"

export default function PrivacyPortalPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [requestType, setRequestType] = useState<string>("")
  const [requestReason, setRequestReason] = useState<string>("")
  const [requestSubmitted, setRequestSubmitted] = useState<boolean>(false)
  const [privacySettings, setPrivacySettings] = useState({
    marketingConsent: true,
    dataSharing: false,
    anonymousAnalytics: true,
  })
  const [privacyRequests, setPrivacyRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) {
      router.push("/login")
    } else if (user) {
      fetchPrivacyData()
    }
  }, [user, loading, router])

  const fetchPrivacyData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/privacy", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-name": user?.name || "",
          "x-user-role": user?.role || "",
        },
      })

      const data = await response.json()

      if (data.success) {
        // Set privacy settings
        if (data.data.settings) {
          setPrivacySettings({
            marketingConsent: data.data.settings.marketingConsent,
            dataSharing: data.data.settings.dataSharing,
            anonymousAnalytics: data.data.settings.anonymousAnalytics,
          })
        }

        // Set privacy requests
        if (data.data.requests) {
          setPrivacyRequests(data.data.requests)
        }
      }
    } catch (error) {
      console.error("Error fetching privacy data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrivacySettingChange = (setting: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => {
      return { ...prev, [setting]: !prev[setting] }
    })
  }

  const handleSaveSettings = async () => {
    if (!user) return

    try {
      setIsSaving(true)

      const response = await fetch("/api/privacy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.name,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          settings: privacySettings,
        }),
      })

      const data = await response.json()

    } catch (error) {
      console.error("Error saving privacy settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestSubmit = async () => {
    if (!requestType || !requestReason || !user) return

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/privacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType,
          requestReason,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        setRequestSubmitted(true)
        setRequestType("")
        setRequestReason("")

        // Refresh privacy requests
        fetchPrivacyData()
      }
    } catch (error) {
      console.error("Error submitting privacy request:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Privacy Portal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your data privacy rights and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Privacy Settings</TabsTrigger>
          <TabsTrigger value="requests">Data Requests</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Your Privacy Rights
                </CardTitle>
                <CardDescription>Understanding your data privacy rights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Right to Access</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You have the right to request a copy of all personal data we hold about you.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Right to Rectification</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You can request corrections to any inaccurate personal data we hold about you.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Right to Erasure</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You can request deletion of your personal data under certain circumstances.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Right to Restrict Processing</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You can request limits on how we use your data.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Learn More About Your Rights
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  Data We Collect
                </CardTitle>
                <CardDescription>Types of personal information we process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Personal Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Name, contact details, identification documents, and demographic information.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Financial Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Account details, transaction history, credit information, and loan data.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Usage Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    How you interact with our services, including login times and features used.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Communication Records</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Records of communications between you and our staff.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Download Your Data
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Preferences</CardTitle>
              <CardDescription>Control how your personal data is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketing-consent">Marketing Communications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive updates about new products, services, and offers
                      </p>
                    </div>
                    <Switch
                      id="marketing-consent"
                      checked={privacySettings.marketingConsent}
                      onCheckedChange={() => handlePrivacySettingChange("marketingConsent")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="data-sharing">Third-Party Data Sharing</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Allow sharing your data with trusted partners
                      </p>
                    </div>
                    <Switch
                      id="data-sharing"
                      checked={privacySettings.dataSharing}
                      onCheckedChange={() => handlePrivacySettingChange("dataSharing")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="anonymous-analytics">Anonymous Analytics</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Help us improve our services with anonymous usage data
                      </p>
                    </div>
                    <Switch
                      id="anonymous-analytics"
                      checked={privacySettings.anonymousAnalytics}
                      onCheckedChange={() => handlePrivacySettingChange("anonymousAnalytics")}
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSaveSettings}
                disabled={isLoading || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Submit a Data Request</CardTitle>
                <CardDescription>Request access, correction, or deletion of your personal data</CardDescription>
              </CardHeader>
              <CardContent>
                {requestSubmitted ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-400">Request Submitted Successfully</p>
                      <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                        Your request has been received. We will process it within 30 days and contact you if we need
                        additional information.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setRequestSubmitted(false)}>
                        Submit Another Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`border rounded-md p-4 cursor-pointer transition-colors ${
                          requestType === "access"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => setRequestType("access")}
                      >
                        <div className="flex flex-col items-center text-center">
                          <Download className="h-8 w-8 mb-2 text-green-500" />
                          <h3 className="font-medium dark:text-white">Data Access</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Request a copy of your data</p>
                        </div>
                      </div>

                      <div
                        className={`border rounded-md p-4 cursor-pointer transition-colors ${
                          requestType === "correction"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => setRequestType("correction")}
                      >
                        <div className="flex flex-col items-center text-center">
                          <FileText className="h-8 w-8 mb-2 text-green-500" />
                          <h3 className="font-medium dark:text-white">Data Correction</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fix inaccurate information</p>
                        </div>
                      </div>

                      <div
                        className={`border rounded-md p-4 cursor-pointer transition-colors ${
                          requestType === "deletion"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => setRequestType("deletion")}
                      >
                        <div className="flex flex-col items-center text-center">
                          <Trash className="h-8 w-8 mb-2 text-green-500" />
                          <h3 className="font-medium dark:text-white">Data Deletion</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Request to delete your data</p>
                        </div>
                      </div>
                    </div>

                    {requestType && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="request-reason">Please explain your request</Label>
                          <Textarea
                            id="request-reason"
                            placeholder="Provide details about your request..."
                            value={requestReason}
                            onChange={(e) => setRequestReason(e.target.value)}
                            rows={4}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            The more details you provide, the faster we can process your request.
                          </p>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-700 dark:text-yellow-500">
                            {requestType === "access"
                              ? "We will provide your data in a machine-readable format within 30 days."
                              : requestType === "correction"
                                ? "Please specify which information needs correction and provide the correct details."
                                : "Some data may need to be retained for legal or regulatory purposes."}
                          </p>
                        </div>

                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={!requestReason.trim() || isSubmitting}
                          onClick={handleRequestSubmit}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="animate-spin mr-2">⟳</span>
                              Submitting...
                            </>
                          ) : (
                            "Submit Request"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Status</CardTitle>
                <CardDescription>Track your previous data requests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                ) : privacyRequests.length > 0 ? (
                  <div className="space-y-4">
                    {privacyRequests.map((request) => (
                      <div key={request.id} className="border rounded-md p-3">
                        <div className="flex items-start gap-3">
                          {request.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium dark:text-white">
                                {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)} Request
                              </p>
                              <Badge
                                variant="outline"
                                className={
                                  request.status === "completed"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : request.status === "in_progress"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                }
                              >
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Submitted: {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                            {request.completedAt && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Completed: {new Date(request.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No requests submitted yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Data Access Activity</CardTitle>
              <CardDescription>Review who has accessed your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium dark:text-white">Staff User viewed your profile</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reason: Account verification</p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-start gap-3">
                    <EyeOff className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium dark:text-white">Admin User viewed sensitive information</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Reason: Loan application processing
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium dark:text-white">You downloaded your data</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Request Detailed Access Log
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
