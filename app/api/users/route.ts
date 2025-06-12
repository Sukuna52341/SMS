import { type NextRequest, NextResponse } from "next/server"
import { getAllUsers, createUser } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    if (authResult.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all users
    const users = await getAllUsers()

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error in users API:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, role, status } = await request.json()
    if (!name || !email || !role || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Only allow valid roles and statuses
    const validRoles = ["admin", "staff", "customer"]
    const validStatuses = ["active", "inactive", "pending"]
    if (!validRoles.includes(role) || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid role or status" }, { status: 400 })
    }

    // Create user in the database
    const user = await createUser(name, email, "password", role)
    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Update status if needed
    if (user.status !== status) {
      user.status = status
      // You may want to update the status in the DB if your createUser doesn't support it
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
