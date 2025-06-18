import { type NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit-logger"
import { getUserFromRequest } from "@/lib/auth-utils"
import { savePrivacyRequest, type PrivacyRequest, type PrivacySettings } from "@/lib/privacy-service"

// Type for settings in PUT request
interface PrivacySettingsUpdate {
  marketingConsent: boolean
  dataSharing: boolean
  anonymousAnalytics: boolean
  profileVisibility: "public" | "private" | "friends_only"
}

export async function GET(request: NextRequest) {
  try {
    // Get user from request with proper type checking
    const user = await getUserFromRequest(request)
    if (!user || !user.id || !user.name || !user.role) {
      return NextResponse.json({ error: "Unauthorized - Invalid user data" }, { status: 401 })
    }

    // Fetch privacy requests for the user from the database
    // const requests = await getPrivacyRequestsForUser(user.id)
    const requests: PrivacyRequest[] = [] // Explicitly typed as PrivacyRequest array

    // Server-side audit log with guaranteed string values
    createAuditLog({
      action: "VIEW_PRIVACY_REQUESTS",
      resourceType: "PRIVACY",
      resourceId: user.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `User viewed their privacy requests`,
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Error getting privacy requests:", error)
    return NextResponse.json(
      { error: "An error occurred while fetching privacy requests" }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from request with validation
    const user = await getUserFromRequest(request)
    if (!user || !user.id || !user.name || !user.role) {
      return NextResponse.json({ error: "Unauthorized - Invalid user data" }, { status: 401 })
    }

    // Parse and validate request data
    const requestData = await request.json()
    const { requestType, requestReason } = requestData as {
      requestType?: "access" | "correction" | "deletion"
      requestReason?: string
    }

    // Validate input with specific error messages
    if (!requestType) {
      return NextResponse.json({ error: "Request type is required" }, { status: 400 })
    }
    if (!requestReason) {
      return NextResponse.json({ error: "Request reason is required" }, { status: 400 })
    }

    // Save privacy request with all required fields
    const privacyRequest = await savePrivacyRequest({
      userId: user.id,
      requestType,
      requestReason,
      status: "pending",
      createdAt: new Date(),
    })

    if (!privacyRequest.id) {
      throw new Error("Failed to create privacy request - no ID returned")
    }

    // Server-side audit log with all required fields
    createAuditLog({
      action: "PRIVACY_REQUEST",
      resourceType: "PRIVACY",
      resourceId: privacyRequest.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Privacy request created: ${requestType}`,
    })

    return NextResponse.json(
      { 
        message: "Privacy request created successfully", 
        request: privacyRequest 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating privacy request:", error)
    return NextResponse.json(
      { error: "An error occurred while creating privacy request" }, 
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user from request with validation
    const user = await getUserFromRequest(request)
    if (!user || !user.id || !user.name || !user.role) {
      return NextResponse.json({ error: "Unauthorized - Invalid user data" }, { status: 401 })
    }

    // Parse and validate request data
    const requestData = await request.json()
    const { settings } = requestData as {
      settings?: PrivacySettingsUpdate
    }

    if (!settings) {
      return NextResponse.json(
        { error: "Settings object is required" }, 
        { status: 400 }
      )
    }

    // Validate settings structure
    if (typeof settings.marketingConsent !== 'boolean' ||
        typeof settings.dataSharing !== 'boolean' ||
        typeof settings.anonymousAnalytics !== 'boolean' ||
        !["public", "private", "friends_only"].includes(settings.profileVisibility)) {
      return NextResponse.json(
        { error: "Invalid settings format" }, 
        { status: 400 }
      )
    }

    // Update privacy settings in the database (implement DB logic here)
    // await updatePrivacySettings(user.id, settings)

    // Server-side audit log with all required fields
    createAuditLog({
      action: "UPDATE_PRIVACY_SETTINGS",
      resourceType: "PRIVACY",
      resourceId: user.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `User updated their privacy settings`,
    })

    return NextResponse.json(
      { message: "Privacy settings updated successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating privacy settings:", error)
    return NextResponse.json(
      { error: "An error occurred while updating privacy settings" }, 
      { status: 500 }
    )
  }
}