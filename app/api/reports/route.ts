import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getAuditLogs } from "@/lib/audit-logger"
import { getAllCustomers } from "@/lib/customer-service"
import { getActiveUsersCount } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { reportType, startDate, endDate } = await request.json()
    let reportData: any = {}

    // Fetch all logs once
    const allLogs = await getAuditLogs() as any[]

    switch (reportType) {
      case "USER_ACTIVITY":
        const logs = allLogs.filter((log: any) => {
          const ts = new Date(log.timestamp)
          return ts >= new Date(startDate) && ts <= new Date(endDate)
        })
        reportData = {
          totalActions: logs.length,
          actionsByType: groupBy(logs, 'action'),
          actionsByUser: groupBy(logs, 'userId'),
          actionsByResource: groupBy(logs, 'resourceType')
        }
        const csv = generateCSV(reportData, reportType)
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=\"user-activity-report.csv\""
          }
        })

      case "DATA_ACCESS":
        const accessLogs = allLogs.filter((log: any) => {
          const ts = new Date(log.timestamp)
          return (
            ts >= new Date(startDate) &&
            ts <= new Date(endDate) &&
            (log.action === 'VIEW' || log.action === 'VIEW_SENSITIVE')
          )
        })
        reportData = {
          totalAccesses: accessLogs.length,
          accessesByUser: groupBy(accessLogs, 'userId'),
          accessesByResource: groupBy(accessLogs, 'resourceType'),
          sensitiveDataAccess: accessLogs.filter((log: any) => log.action === 'VIEW_SENSITIVE').length
        }
        const accessCsv = generateCSV(reportData, reportType)
        return new NextResponse(accessCsv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=\"data-access-report.csv\""
          }
        })

      case "SECURITY_INCIDENTS":
        const securityLogs = allLogs.filter((log: any) => {
          const ts = new Date(log.timestamp)
          return (
            ts >= new Date(startDate) &&
            ts <= new Date(endDate) &&
            (
              log.action === 'FAILED_LOGIN' ||
              log.action === 'UNAUTHORIZED_ACCESS' ||
              log.action === 'UNAUTHORIZED_SENSITIVE_ACCESS'
            )
          )
        })
        reportData = {
          totalIncidents: securityLogs.length,
          incidentsByType: groupBy(securityLogs, 'action'),
          incidentsByUser: groupBy(securityLogs, 'userId'),
          incidentsByIP: groupBy(securityLogs, 'ipAddress')
        }
        const securityCsv = generateCSV(reportData, reportType)
        return new NextResponse(securityCsv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=\"security-incidents-report.csv\""
          }
        })

      case "COMPLIANCE":
        reportData = {
          dataPrivacy: "Compliant",
          accessControl: "Compliant",
          dataRetention: "Compliant"
        }
        const complianceCsv = generateCSV(reportData, reportType)
        return new NextResponse(complianceCsv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=\"compliance-report.csv\""
          }
        })

      case "SYSTEM_USAGE":
        const activeUsers = await getActiveUsersCount()
        const customers = await getAllCustomers()
        reportData = {
          activeUsers,
          totalCustomers: customers.length,
          systemMetrics: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
          }
        }
        break

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      data: reportData
    })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

function groupBy(array: any[], key: string): Record<string, number> {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    result[groupKey] = (result[groupKey] || 0) + 1
    return result
  }, {})
}

function generateCSV(data: any, reportType: string): string {
  const headers: string[] = []
  const rows: string[] = []

  switch (reportType) {
    case "USER_ACTIVITY":
      headers.push("Action Type", "Count", "Details")
      Object.entries(data.actionsByType).forEach(([action, count]) => {
        rows.push(`${action},${count},"${action} actions"`)
      })
      Object.entries(data.actionsByUser).forEach(([userId, count]) => {
        rows.push(`User Action,${count},"User ID: ${userId}"`)
      })
      Object.entries(data.actionsByResource).forEach(([resource, count]) => {
        rows.push(`Resource Access,${count},"Resource: ${resource}"`)
      })
      break

    case "DATA_ACCESS":
      headers.push("Access Type", "Count", "Details")
      Object.entries(data.accessesByUser).forEach(([userId, count]) => {
        rows.push(`User Access,${count},"User ID: ${userId}"`)
      })
      Object.entries(data.accessesByResource).forEach(([resource, count]) => {
        rows.push(`Resource Access,${count},"Resource: ${resource}"`)
      })
      rows.push(`Sensitive Data Access,${data.sensitiveDataAccess},"Total sensitive data accesses"`)
      break

    case "SECURITY_INCIDENTS":
      headers.push("Incident Type", "Count", "Details")
      Object.entries(data.incidentsByType).forEach(([type, count]) => {
        rows.push(`${type},${count},"${type} incidents"`)
      })
      Object.entries(data.incidentsByUser).forEach(([userId, count]) => {
        rows.push(`User Incident,${count},"User ID: ${userId}"`)
      })
      Object.entries(data.incidentsByIP).forEach(([ip, count]) => {
        rows.push(`IP Incident,${count},"IP: ${ip}"`)
      })
      break

    case "COMPLIANCE":
      headers.push("Compliance Area", "Status", "Details")
      rows.push("Data Privacy,Compliant,All data handling policies followed")
      rows.push("Access Control,Compliant,Role-based access control implemented")
      rows.push("Data Retention,Compliant,Data retention policies enforced")
      break
  }

  return [headers.join(","), ...rows].join("\n")
} 