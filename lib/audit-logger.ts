// This is a simplified audit logging system
// In a production environment, this would write to a secure database
// and potentially integrate with a SIEM system

import { pool } from "./db-config"
import { executeQuery } from "./db-config"
import { generateId } from "./db"

interface AuditLogEntry {
  id?: string
  timestamp?: string
  action: string
  resourceType: string
  resourceId: string
  userId: string | null
  userName: string
  userRole: string
  details: string
  ipAddress?: string
  userAgent?: string
}

interface SecurityAlert {
  id: string
  type: string
  severity: 'high' | 'medium' | 'low'
  description: string
  timestamp: Date
  details: any
}

// Create audit log entry in the database
export async function createAuditLog({
  action,
  resourceType,
  resourceId,
  userId,
  userName,
  userRole,
  details,
  ipAddress = "127.0.0.1",
  userAgent = "Demo Browser",
}: Omit<AuditLogEntry, "id" | "timestamp">) {
  try {
    const now = new Date()

    // Format the date to 'YYYY-MM-DD HH:MM:SS' format
    const formattedTimestamp = now.toISOString().slice(0, 19).replace('T', ' ')

    const connection = await pool.getConnection()

    try {
      // Create audit_logs table if it doesn't exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp DATETIME NOT NULL,
          action VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id VARCHAR(50) NOT NULL,
          user_id VARCHAR(50),
          user_name VARCHAR(100) NOT NULL,
          user_role VARCHAR(20) NOT NULL,
          details TEXT NOT NULL,
          ip_address VARCHAR(45),
          user_agent VARCHAR(255)
        )
      `)

      // Generate a unique ID for the audit log entry
      const id = generateId()

      // Insert the audit log entry
      const [result] = await connection.query(
        `INSERT INTO audit_logs 
        (id, timestamp, action, resource_type, resource_id, user_id, user_name, user_role, details, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          formattedTimestamp,
          action,
          resourceType,
          resourceId,
          userId,
          userName,
          userRole,
          details,
          ipAddress,
          userAgent,
        ],
      )

      console.log("Audit log created:", { timestamp: formattedTimestamp, action, resourceType, resourceId, userId })

      return result
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error creating audit log:", error)
    // Still return something even if there's an error
    return null
  }
}

// Get all audit logs with optional filtering
export async function getAuditLogs(filters?: Partial<AuditLogEntry>) {
  try {
    const connection = await pool.getConnection()

    try {
      let query = `SELECT * FROM audit_logs`
      const params = []

      // Add filters if provided
      if (filters && Object.keys(filters).length > 0) {
        query += ` WHERE `
        const filterClauses = []

        if (filters.userId) {
          filterClauses.push(`user_id = ?`)
          params.push(filters.userId)
        }

        if (filters.resourceType) {
          filterClauses.push(`resource_type = ?`)
          params.push(filters.resourceType)
        }

        if (filters.resourceId) {
          filterClauses.push(`resource_id = ?`)
          params.push(filters.resourceId)
        }

        if (filters.action) {
          filterClauses.push(`action = ?`)
          params.push(filters.action)
        }

        query += filterClauses.join(" AND ")
      }

      // Add order by timestamp desc
      query += ` ORDER BY timestamp DESC`

      const [rows] = await connection.query(query, params)
      return rows
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error getting audit logs:", error)
    return []
  }
}

// Get audit logs for a specific resource
export async function getAuditLogsByResourceId(resourceId: string) {
  return getAuditLogs({ resourceId })
}

// Get audit logs for a specific user
export async function getAuditLogsByUserId(userId: string) {
  return getAuditLogs({ userId })
}

export async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  try {
    const alerts: SecurityAlert[] = []
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Get recent audit logs
    const allLogs = await getAuditLogs() as any[]
    const logs = allLogs.filter((log: any) => new Date(log.timestamp) >= last24Hours)

    // Check for failed login attempts
    const failedLogins = logs.filter((log: any) => log.action === 'FAILED_LOGIN')
    const failedLoginGroups = groupBy(failedLogins, 'ipAddress')
    
    for (const [ip, attempts] of Object.entries(failedLoginGroups)) {
      if (attempts.length >= 3) {
        alerts.push({
          id: `failed-login-${ip}`,
          type: 'MULTIPLE_FAILED_LOGINS',
          severity: 'high',
          description: `Multiple failed login attempts from IP ${ip}`,
          timestamp: new Date(),
          details: {
            ip,
            attempts: attempts.length,
            lastAttempt: attempts[attempts.length - 1].timestamp
          }
        })
      }
    }

    // Check for sensitive data access
    const sensitiveAccess = logs.filter((log: any) => log.action === 'VIEW_SENSITIVE')
    const userAccessGroups = groupBy(sensitiveAccess, 'userId')
    
    for (const [userId, accesses] of Object.entries(userAccessGroups)) {
      if (accesses.length >= 5) {
        alerts.push({
          id: `sensitive-access-${userId}`,
          type: 'UNUSUAL_SENSITIVE_ACCESS',
          severity: 'medium',
          description: `Unusual amount of sensitive data access by user ${accesses[0].userName}`,
          timestamp: new Date(),
          details: {
            userId,
            userName: accesses[0].userName,
            accessCount: accesses.length,
            lastAccess: accesses[accesses.length - 1].timestamp
          }
        })
      }
    }

    // Check for unauthorized access attempts
    const unauthorizedAccess = logs.filter((log: any) => log.action === 'UNAUTHORIZED_ACCESS')
    if (unauthorizedAccess.length > 0) {
      alerts.push({
        id: 'unauthorized-access',
        type: 'UNAUTHORIZED_ACCESS_ATTEMPTS',
        severity: 'high',
        description: `${unauthorizedAccess.length} unauthorized access attempts detected`,
        timestamp: new Date(),
        details: {
          attempts: unauthorizedAccess.length,
          lastAttempt: unauthorizedAccess[unauthorizedAccess.length - 1].timestamp
        }
      })
    }

    return alerts
  } catch (error) {
    console.error("Error getting security alerts:", error)
    throw error
  }
}

function groupBy(array: any[], key: string): Record<string, any[]> {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {})
}
