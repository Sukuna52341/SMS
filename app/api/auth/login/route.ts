import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser } from "@/app/api/db-service"
import { createAuditLog } from "@/lib/audit-logger"
import { cookies } from "next/headers"
import { sign } from "jsonwebtoken"
import { executeQuery } from "@/lib/db-config"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const failedLoginAttempts: Record<string, number> = {}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Authenticate user
    const user = await authenticateUser(email, password)

    if (!user) {
      // Track failed attempts
      failedLoginAttempts[email] = (failedLoginAttempts[email] || 0) + 1

      // If 3 or more failed attempts, log a security alert
      if (failedLoginAttempts[email] === 3) {
        createAuditLog({
          action: "SECURITY_ALERT",
          resourceType: "USER",
          resourceId: "unknown",
          userId: null,
          userName: email,
          userRole: "unknown",
          details: `3 unsuccessful login attempts for email: ${email}`,
        })
      }

      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // On successful login, reset failed attempts
    failedLoginAttempts[email] = 0

    // Check if 2FA is enabled for this user
    const [twofaStatus] = await executeQuery<{ twofa_enabled: number }[]>(
      "SELECT twofa_enabled FROM users WHERE id = ?",
      [user.id]
    )

    if (twofaStatus?.twofa_enabled === 1) {
      // If 2FA is enabled, return a response indicating 2FA is required
      return NextResponse.json({
        require2fa: true,
        email: user.email,
      })
    }

    // If 2FA is not enabled, proceed with normal login
    const token = sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    )

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 hours
    })

    // Log the login
    createAuditLog({
      action: "LOGIN",
      resourceType: "USER",
      resourceId: user.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `User logged in: ${user.email}`,
    })

    // Return user info (without password)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
