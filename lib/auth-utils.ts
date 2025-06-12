import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import * as jwt from "jsonwebtoken"
import { findUserByEmail } from "./db"

interface AuthResult {
  success: boolean
  user?: {
    id: string
    name: string
    email: string
    role: string
    status?: "active" | "inactive" | "pending"
  }
  error?: string
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      console.log("Auth failed: No token provided")
      return { success: false, error: "No token provided" }
    }

    // Verify token
    const secret = process.env.JWT_SECRET || "your-secret-key"
    const decoded = jwt.verify(token, secret) as {
      email: string
      id?: string
      name?: string
      role?: string
    }

    if (!decoded || !decoded.email) {
      console.log("Auth failed: Invalid token payload", decoded)
      return { success: false, error: "Invalid token" }
    }

    // Get user from database
    const user = await findUserByEmail(decoded.email)

    if (!user) {
      console.log("Auth failed: User not found for email", decoded.email)
      return { success: false, error: "User not found" }
    }

    // Check if user is pending or inactive (based on your signup logic)
    if (user.status === "pending") {
      console.log("Auth failed: User account is pending approval", user.email)
      return { success: false, error: "User account is pending approval" }
    }
    if (user.status === "inactive") {
      console.log("Auth failed: User account is inactive", user.email)
      return { success: false, error: "User account is inactive" }
    }

    // Return success with relevant user data
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  } catch (error) {
    console.error("Error verifying auth:", error)
    return { success: false, error: "Authentication failed" }
  }
}

// Add the getUserFromRequest function that was missing
export async function getUserFromRequest(request: NextRequest) {
  const authResult = await verifyAuth(request)
  return authResult.success ? authResult.user : null
}
