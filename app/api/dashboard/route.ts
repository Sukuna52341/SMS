import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getActiveUsersCount } from "@/lib/db"
import { getAuditLogs, getSecurityAlerts } from "@/lib/audit-logger"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get active users count
    const activeUsers = await getActiveUsersCount()

    // Get audit logs count (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const allLogs = await getAuditLogs() as any[]
    const auditLogs = allLogs.filter((log: any) => new Date(log.timestamp) >= last24Hours)
    const auditLogsCount = auditLogs.length

    // Get security alerts
    const securityAlerts = await getSecurityAlerts()

    return NextResponse.json({
      activeUsers,
      auditLogsCount,
      securityAlerts,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard statistics" }, { status: 500 })
  }
} 