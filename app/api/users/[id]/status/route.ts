import { type NextRequest, NextResponse } from "next/server"
import { updateUserStatus } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-utils"
import { createAuditLog } from "@/lib/audit-logger"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get user ID from params
    const userId = params.id

    // Get status from request body
    const { status } = (await request.json()) as { status: "active" | "inactive" | "pending" }

    // Validate status
    if (!status || !["active", "inactive", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Update user status
    const success = await updateUserStatus(userId, status)

    if (!success) {
      return NextResponse.json({ error: "Failed to update user status" }, { status: 500 })
    }

    // Log the action
    await createAuditLog({
      action: status === "active" ? "APPROVE_USER" : "REJECT_USER",
      resourceType: "USER",
      resourceId: userId,
      userId: authResult.user.id,
      userName: authResult.user.name,
      userRole: authResult.user.role,
      details: `${status === "active" ? "Approved" : "Rejected"} user account: ${userId}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
