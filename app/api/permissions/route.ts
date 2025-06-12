import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { pool } from "@/lib/db-config"

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, permission, value } = await request.json()

    // Validate input
    if (!role || !permission || typeof value !== 'boolean') {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    // Update permission in database
    const [result] = await pool.query(
      `INSERT INTO role_permissions (role, permission, value) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = ?`,
      [role, permission, value, value]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating permission:", error)
    return NextResponse.json({ error: "Failed to update permission" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all permissions from database
    const [rows] = await pool.query(
      "SELECT role, permission, value FROM role_permissions"
    )

    // Transform the data into the expected format
    const permissions = (rows as any[]).reduce((acc, row) => {
      if (!acc[row.role]) {
        acc[row.role] = {}
      }
      acc[row.role][row.permission] = row.value === 1
      return acc
    }, {})

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
  }
} 