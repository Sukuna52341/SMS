import { type NextRequest, NextResponse } from "next/server"
import { sign } from "jsonwebtoken"
import speakeasy from "speakeasy"
import { executeQuery } from "@/lib/db-config"
import { createAuditLog } from "@/lib/audit-logger"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    // Get user's 2FA secret from database
    const [user] = await executeQuery<{ id: string; name: string; role: string; twofa_secret: string }[]>(
      "SELECT id, name, role, twofa_secret FROM users WHERE email = ? AND twofa_enabled = 1",
      [email]
    )

    if (!user) {
      return NextResponse.json({ error: "User not found or 2FA not enabled" }, { status: 404 })
    }

    // Verify the 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: "base32",
      token: code,
    })

    if (!verified) {
      return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 })
    }

    // Create JWT token
    const token = sign(
      {
        id: user.id,
        email: email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    )

    // Prepare response
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: email,
        role: user.role,
      },
    })

    // Set cookie on the response
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 hours
    })

    // Log the successful 2FA verification
    await createAuditLog({
      action: "2FA_VERIFICATION",
      resourceType: "USER",
      resourceId: user.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `2FA verification successful for user: ${email}`,
    })

    return response
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ error: "An error occurred during 2FA verification" }, { status: 500 })
  }
}