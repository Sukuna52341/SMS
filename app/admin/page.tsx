"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import {
  Users,
  Shield,
  FileText,
  Settings,
  AlertTriangle,
  Lock,
  Database,
  Key,
  UserPlus,
  UserX,
  BarChart3,
  Activity,
} from "lucide-react"

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    activeUsers: 0,
    auditLogsCount: 0,
    securityAlerts: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentReports, setRecentReports] = useState<Array<{
    id: string;
    name: string;
    type: string;
    generatedAt: string;
  }>>([])
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [permissions, setPermissions] = useState({
    admin: {
      viewUsers: true,
      editUsers: true,
      viewAuditLogs: true,
      managePermissions: true,
      generateReports: true,
      manageSystem: true,
    },
    staff: {
      viewUsers: true,
      editUsers: false,
      viewAuditLogs: true,
      managePermissions: false,
      generateReports: true,
      manageSystem: false,
    },
    customer: {
      viewUsers: false,
      editUsers: false,
      viewAuditLogs: false,
      managePermissions: false,
      generateReports: false,
      manageSystem: false,
    }
  })
  const [pendingLoans, setPendingLoans] = useState<any[]>([])
  const [loanActionLoading, setLoanActionLoading] = useState<string | null>(null)
  const [loanActionError, setLoanActionError] = useState<string | null>(null)
  const [loanActionSuccess, setLoanActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user && user.role === 'admin') {
      fetchDashboardStats()
    }
  }, [user])

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/permissions')
        if (!response.ok) {
          throw new Error('Failed to fetch permissions')
        }
        const data = await response.json()
        if (data.permissions) {
          setPermissions(data.permissions)
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
      }
    }

    if (user && user.role === 'admin') {
      fetchPermissions()
    }
  }, [user])

  const fetchPendingLoans = useCallback(async () => {
    try {
      const res = await fetch("/api/loans/pending")
      const data = await res.json()
      if (data.success) setPendingLoans(data.data)
    } catch (e) {
      // ignore for now
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "staff")) fetchPendingLoans()
  }, [user, fetchPendingLoans])

  const handleLoanAction = async (loanId: string, approve: boolean) => {
    setLoanActionLoading(loanId + (approve ? "-approve" : "-reject"))
    setLoanActionError(null)
    setLoanActionSuccess(null)
    try {
      const res = await fetch("/api/loans/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, approve }),
      })
      const data = await res.json()
      if (data.success) {
        setLoanActionSuccess(approve ? "Loan approved!" : "Loan rejected.")
        fetchPendingLoans()
      } else {
        setLoanActionError(data.error || "Failed to update loan status")
      }
    } catch (e) {
      setLoanActionError("Failed to update loan status")
    } finally {
      setLoanActionLoading(null)
    }
  }

  const downloadReport = async (reportType: string, fileName: string) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      })
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Add the report to recent reports
      setRecentReports(prev => [{
        id: Date.now().toString(),
        name: fileName.replace('.csv', ''),
        type: reportType,
        generatedAt: new Date().toISOString()
      }, ...prev].slice(0, 5)); // Keep only the 5 most recent reports
    } else {
      alert("Failed to generate report.");
    }
  };

  const handlePermissionChange = async (role: string, permission: string, checked: boolean) => {
    try {
      // Update local state
      setPermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role as keyof typeof prev],
          [permission]: checked
        }
      }))

      // Save to backend
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          permission,
          value: checked
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update permission')
      }
    } catch (error) {
      console.error('Error updating permission:', error)
      // Revert the change if the API call fails
      setPermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role as keyof typeof prev],
          [permission]: !checked
        }
      }))
      alert('Failed to update permission. Please try again.')
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
          <h1 className="text-3xl font-bold dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">System administration and security management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">{isLoading ? '-' : stats.activeUsers}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active users in the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {isLoading ? '-' : stats.securityAlerts.length === 0 ? 'Good' : 'Alert'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">System security status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">{isLoading ? '-' : stats.auditLogsCount}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Events in the last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {isLoading ? '-' : stats.securityAlerts.length}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Security alerts requiring attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="loans">Loan Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-500" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure system-wide security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Password Policy</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure password complexity requirements and expiration policies.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => alert("Password policy configuration coming soon!")}>
                    Configure
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Require two-factor authentication for all users or specific roles.
                  </p>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Session Management</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure session timeout and concurrent session policies.
                  </p>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-500" />
                  Data Encryption
                </CardTitle>
                <CardDescription>Manage encryption settings for sensitive data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Database Encryption</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AES-256 encryption is enabled for all sensitive customer data.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-green-600 dark:text-green-400">Active</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Key Management</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage encryption keys and rotation policies.
                  </p>
                  <Button variant="outline" size="sm">
                    Manage Keys
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Field-Level Encryption</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure which fields require additional encryption.
                  </p>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Security Alerts
                </CardTitle>
                <CardDescription>Recent security alerts requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
                ) : stats.securityAlerts.length === 0 ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-center text-blue-800 dark:text-blue-300">
                    <p>No security alerts detected in the last 24 hours.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.securityAlerts.map((alert: any) => (
                      <div key={alert.id} className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800 dark:text-yellow-400">{alert.type.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">{alert.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm">Investigate</Button>
                            {alert.type === 'MULTIPLE_FAILED_LOGINS' && (
                              <Button variant="outline" size="sm">Block IP</Button>
                            )}
                            {alert.type === 'UNUSUAL_SENSITIVE_ACCESS' && (
                              <Button variant="outline" size="sm">Review Activity</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Audit Logs
                </CardTitle>
                <CardDescription>Review system activity logs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Access the complete audit trail of all system activities, including data access, modifications, and
                  security events.
                </p>
                <Link href="/admin/audit-logs">
                  <Button className="w-full bg-green-600 hover:bg-green-700">View Audit Logs</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-green-500" />
                  Access Control
                </CardTitle>
                <CardDescription>Manage role-based access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure which roles can access specific features and data within the system.
                </p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setShowPermissionsModal(true)}
                >
                  Manage Permissions
                </Button>
              </CardContent>
            </Card>

            {/* Permissions Modal */}
            <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Manage Role Permissions</DialogTitle>
                  <DialogDescription>
                    Configure what each role can access and modify in the system.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {Object.entries(permissions).map(([role, rolePermissions]) => (
                      <div key={role} className="space-y-4">
                        <h3 className="text-lg font-semibold capitalize">{role} Permissions</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(rolePermissions).map(([permission, value]) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${role}-${permission}`}
                                checked={value}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(role, permission, checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={`${role}-${permission}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {permission.replace(/([A-Z])/g, ' $1').trim()}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-500" />
                  Add User
                </CardTitle>
                <CardDescription>Create a new user account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add a new user to the system and assign appropriate roles and permissions.
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/users")}>
                  Add New User
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Manage Users
                </CardTitle>
                <CardDescription>View and edit existing users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View, edit, and manage all user accounts in the system.
                </p>
                <Link href="/admin/users">
                  <Button className="w-full bg-green-600 hover:bg-green-700">View All Users</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-green-500" />
                  Deactivate Users
                </CardTitle>
                <CardDescription>Temporarily disable user accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Temporarily disable user accounts without deleting them.
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.push("/admin/users")}>
                  Manage Deactivations
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-500" />
                  System Configuration
                </CardTitle>
                <CardDescription>Configure global system settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Email Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure email server settings for system notifications.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => alert("Email settings configuration coming soon!")}>
                    Configure
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Backup Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure automated backup schedule and retention policies.
                  </p>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">System Maintenance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Schedule system maintenance windows and notifications.
                  </p>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-500" />
                  Database Management
                </CardTitle>
                <CardDescription>Manage database settings and operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Database Status</h3>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-green-600 dark:text-green-400">Healthy</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last checked: {new Date().toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Backup Now</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Initiate an immediate database backup.</p>
                  <Button variant="outline" size="sm" onClick={() => alert("Database backup initiated (demo).")}>
                    Backup Now
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Optimize Database</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Run database optimization routines.</p>
                  <Button variant="outline" size="sm" onClick={() => alert("Database optimization started (demo).")}>
                    Optimize
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  System Health
                </CardTitle>
                <CardDescription>Monitor system performance and health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium dark:text-white mb-2">CPU Usage</h3>
                    <div className="text-2xl font-bold dark:text-white mb-1">24%</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "24%" }}></div>
                    </div>
                  </div>

                  <div className="border rounded-md p-4">
                    <h3 className="font-medium dark:text-white mb-2">Memory Usage</h3>
                    <div className="text-2xl font-bold dark:text-white mb-1">42%</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "42%" }}></div>
                    </div>
                  </div>

                  <div className="border rounded-md p-4">
                    <h3 className="font-medium dark:text-white mb-2">Disk Usage</h3>
                    <div className="text-2xl font-bold dark:text-white mb-1">68%</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: "68%" }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium dark:text-white mb-2">System Uptime</h3>
                  <div className="text-lg font-bold dark:text-white">14 days, 7 hours, 32 minutes</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Last restart: {new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  System Usage Reports
                </CardTitle>
                <CardDescription>Generate reports on system usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">User Activity Report</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Report on user logins, actions, and system usage.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReport("USER_ACTIVITY", "user-activity-report.csv")}
                  >
                    Generate & Download
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Data Access Report</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Report on who accessed what data and when.</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadReport("DATA_ACCESS", "data-access-report.csv")}
                  >
                    Generate & Download
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Security Incident Report</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Report on security incidents and resolution status.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadReport("SECURITY_INCIDENTS", "security-incidents-report.csv")}
                  >
                    Generate & Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Compliance Reports
                </CardTitle>
                <CardDescription>Generate reports for compliance purposes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Data Privacy Compliance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Report on compliance with data privacy regulations.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadReport("COMPLIANCE", "compliance-report.csv")}
                  >
                    Generate & Download
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Access Control Audit</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Report on user permissions and access controls.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadReport("COMPLIANCE", "access-control-audit.csv")}
                  >
                    Generate & Download
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium dark:text-white">Data Retention Compliance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Report on data retention policies and compliance.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadReport("COMPLIANCE", "data-retention-compliance.csv")}
                  >
                    Generate & Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Recent Reports
                </CardTitle>
                <CardDescription>Recently generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No reports generated yet
                    </div>
                  ) : (
                    recentReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium dark:text-white">{report.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Generated: {new Date(report.generatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => downloadReport(report.type, `${report.name}.csv`)}
                        >
                          Download Again
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle>Pending Loan Applications</CardTitle>
              <CardDescription>Review and approve/reject customer loan requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loanActionError && <div className="text-red-500 text-sm mb-2">{loanActionError}</div>}
              {loanActionSuccess && <div className="text-green-600 text-sm mb-2">{loanActionSuccess}</div>}
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 border">Customer</th>
                      <th className="px-3 py-2 border">Email</th>
                      <th className="px-3 py-2 border">Amount</th>
                      <th className="px-3 py-2 border">Purpose</th>
                      <th className="px-3 py-2 border">Submitted</th>
                      <th className="px-3 py-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLoans.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-4">No pending loans</td></tr>
                    ) : (
                      pendingLoans.map((loan) => (
                        <tr key={loan.id}>
                          <td className="border px-3 py-2">{loan.customerName}</td>
                          <td className="border px-3 py-2">{loan.customerEmail}</td>
                          <td className="border px-3 py-2">${loan.amount}</td>
                          <td className="border px-3 py-2">{loan.purpose}</td>
                          <td className="border px-3 py-2">{new Date(loan.createdAt).toLocaleString()}</td>
                          <td className="border px-3 py-2 flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={loanActionLoading === loan.id + "-approve"} onClick={() => handleLoanAction(loan.id, true)}>
                              {loanActionLoading === loan.id + "-approve" ? "Approving..." : "Approve"}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={loanActionLoading === loan.id + "-reject"} onClick={() => handleLoanAction(loan.id, false)}>
                              {loanActionLoading === loan.id + "-reject" ? "Rejecting..." : "Reject"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
