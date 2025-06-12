import { type NextRequest, NextResponse } from "next/server"
import { createUser, emailExists } from "@/app/api/db-service"
import { createAuditLog } from "@/lib/audit-logger"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = "customer" } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    // Check if email already exists
    const exists = await emailExists(email)
    if (exists) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    // Create user
    const user = await createUser(name, email, password, role as "admin" | "staff" | "customer")

    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Log the signup
    createAuditLog({
      action: "SIGNUP",
      resourceType: "USER",
      resourceId: user.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `New user registered: ${user.email}`,
    })

    // Return success
    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "An error occurred during signup" }, { status: 500 })
  }
}
