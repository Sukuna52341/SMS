import { type NextRequest, NextResponse } from "next/server"
import { getAuditLogs, getAuditLogsByResourceId, getAuditLogsByUserId } from "@/lib/audit-logger"
import { getUserFromRequest } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin and staff can access audit logs
    if (user.role !== "admin" && user.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const resourceId = searchParams.get("resourceId")
    const userId = searchParams.get("userId")
    const resourceType = searchParams.get("resourceType")
    const action = searchParams.get("action")

    let logs

    // Get logs based on filters
    if (resourceId) {
      logs = await getAuditLogsByResourceId(resourceId)
    } else if (userId) {
      logs = await getAuditLogsByUserId(userId)
    } else {
      // Apply filters if provided
      const filters: any = {}
      if (resourceType) filters.resourceType = resourceType
      if (action) filters.action = action

      logs = await getAuditLogs(filters)
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
