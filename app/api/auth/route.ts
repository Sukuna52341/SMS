import { type NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit-logger"

// In a real application, this would use a database and proper authentication
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Mock users for demonstration
    const mockUsers: Record<string, any> = {
      "admin@example.com": {
        id: "1",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
      "staff@example.com": {
        id: "2",
        name: "Staff User",
        email: "staff@example.com",
        role: "staff",
      },
      "customer@example.com": {
        id: "3",
        name: "Customer User",
        email: "customer@example.com",
        role: "customer",
      },
    }

    // Simple mock authentication
    if (mockUsers[email] && password === "password") {
      const user = mockUsers[email]

      // Log successful login to audit trail
      createAuditLog({
        action: "LOGIN",
        resourceType: "SYSTEM",
        resourceId: "system",
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: `User logged in successfully`,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "Unknown",
      })

      return NextResponse.json({
        success: true,
        user,
      })
    }

    // Log failed login attempt
    createAuditLog({
      action: "FAILED_LOGIN",
      resourceType: "SYSTEM",
      resourceId: "system",
      userId: "unknown",
      userName: "Unknown",
      userRole: "none",
      details: `Failed login attempt for user: ${email}`,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
    })

    return NextResponse.json(
      {
        success: false,
        error: "Invalid email or password",
      },
      { status: 401 },
    )
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during authentication",
      },
      { status: 500 },
    )
  }
}
