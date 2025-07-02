"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Shield, Users, FileText, BookOpen, User, Settings, Bell, Activity, LogOut } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"

export default function Dashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const quickAccessRoutes: Record<string, string> = {
    Profile: "/profile",
    Settings: "/settings",
    Customers: "/customers",
    Security: "/admin",
    Training: "/training",
    Privacy: "/privacy",
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "staff" && window.location.pathname !== "/dashboard") {
        router.push("/dashboard");
      } else if (user.role === "customer" && window.location.pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications")
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
        }
      } finally {
        setLoadingNotifications(false)
      }
    }
    fetchNotifications()
  }, [])

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch("/api/activity")
        if (res.ok) {
          const data = await res.json()
          setRecentActivity(data.logs || [])
        }
      } finally {
        setLoadingActivity(false)
      }
    }
    if (user) fetchActivity()
  }, [user])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      // If 2FA is enabled, we should clear the 2FA session first
      if (user?.twoFactorEnabled) {
        await fetch('/api/auth/2fa/clear-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }
      await logout()
      router.push("/login")
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      setIsLoggingOut(false)
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
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold dark:text-white">Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500"></div>
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Logout
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            icon={<User className="h-8 w-8 text-green-500" />}
            title="Welcome Back"
            description={`Hello, ${user.name}`}
            value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          />

          

          <DashboardCard
            icon={<Bell className="h-8 w-8 text-green-500" />}
            title="Notifications"
            description={
              loadingNotifications
                ? "Loading notifications..."
                : notifications.length === 0
                  ? "No new notifications"
                  : notifications.filter(n => !n.read).length === 1
                    ? "1 new notification"
                    : `${notifications.filter(n => !n.read).length} new notifications`
            }
            value={
              loadingNotifications
                ? "-"
                : notifications.filter(n => !n.read).length > 0
                  ? `${notifications.filter(n => !n.read).length} New`
                  : "0"
            }
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quick-access">Quick Access</TabsTrigger>
            <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.role === "admin" && (
                <>
                  <QuickAccessCard
                    icon={<Shield className="h-6 w-6 text-green-500" />}
                    title="Admin Panel"
                    description="Manage system settings and users"
                    link="/admin"
                  />
                  <QuickAccessCard
                    icon={<Users className="h-6 w-6 text-green-500" />}
                    title="Customer Management"
                    description="View and manage customer data"
                    link="/customers"
                  />
                  <QuickAccessCard
                    icon={<FileText className="h-6 w-6 text-green-500" />}
                    title="Audit Logs"
                    description="Review system activity and data access"
                    link="/admin/audit-logs"
                  />
                </>
              )}

              {user.role === "staff" && (
                <>
                  <QuickAccessCard
                    icon={<Users className="h-6 w-6 text-green-500" />}
                    title="Customer Management"
                    description="View and manage customer data"
                    link="/customers"
                  />
                  <QuickAccessCard
                    icon={<BookOpen className="h-6 w-6 text-green-500" />}
                    title="Training Modules"
                    description="Complete required privacy training"
                    link="/training"
                  />
                  <QuickAccessCard
                    icon={<FileText className="h-6 w-6 text-green-500" />}
                    title="Reports"
                    description="Generate and view customer reports"
                    link="/reports"
                  />
                </>
              )}

              {user.role === "customer" && (
                <>
                  <QuickAccessCard
                    icon={<User className="h-6 w-6 text-green-500" />}
                    title="My Profile"
                    description="View and update your personal information"
                    link="/profile"
                  />
                  <QuickAccessCard
                    icon={<Shield className="h-6 w-6 text-green-500" />}
                    title="Privacy Portal"
                    description="Manage your data privacy settings"
                    link="/privacy"
                  />
                  <QuickAccessCard
                    icon={<Settings className="h-6 w-6 text-green-500" />}
                    title="Account Settings"
                    description="Update your account preferences"
                    link="/settings"
                  />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quick-access" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push(quickAccessRoutes["Profile"])}
              >
                <User className="h-6 w-6" />
                <span>Profile</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push(quickAccessRoutes["Settings"])}
              >
                <Settings className="h-6 w-6" />
                <span>Settings</span>
              </Button>
              {user.role !== "customer" && (
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => router.push(quickAccessRoutes["Customers"])}
                >
                  <Users className="h-6 w-6" />
                  <span>Customers</span>
                </Button>
              )}
              {user.role === "admin" && (
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => router.push(quickAccessRoutes["Security"])}
                >
                  <Shield className="h-6 w-6" />
                  <span>Security</span>
                </Button>
              )}
              {user.role === "staff" && (
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => router.push(quickAccessRoutes["Training"])}
                >
                  <BookOpen className="h-6 w-6" />
                  <span>Training</span>
                </Button>
              )}
              {user.role === "customer" && (
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => router.push(quickAccessRoutes["Privacy"])}
                >
                  <Shield className="h-6 w-6" />
                  <span>Privacy</span>
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent-activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingActivity ? (
                    <div>Loading...</div>
                  ) : recentActivity.length === 0 ? (
                    <div>No recent activity.</div>
                  ) : (
                    recentActivity.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 border-b pb-4">
                        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                          <FileText className="h-4 w-4 text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                          <p className="font-medium dark:text-white">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {log.details || ""}<br />
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function DashboardCard({
  icon,
  title,
  description,
  value,
}: {
  icon: React.ReactNode
  title: string
  description: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold dark:text-white">{value}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </CardContent>
    </Card>
  )
}

function QuickAccessCard({
  icon,
  title,
  description,
  link,
}: {
  icon: React.ReactNode
  title: string
  description: string
  link: string
}) {
  return (
    <Link href={link}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-4">
          {icon}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
