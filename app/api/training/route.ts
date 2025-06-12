import { type NextRequest, NextResponse } from "next/server"
import { getAllTrainingModules, getUserTrainingProgress, updateTrainingProgress } from "@/app/api/db-service"
import { getUserFromRequest } from "@/lib/auth-utils"
import { createAuditLog } from "@/lib/audit-logger"

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request)
    if (!user) {
      console.error("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all training modules
    const modules = await getAllTrainingModules()
    if (!modules || modules.length === 0) {
      console.error("No training modules found in database")
    }

    // Get user's training progress
    const progress = await getUserTrainingProgress(user.id)
    if (!progress) {
      console.error("No training progress found for user")
    }

    // Combine modules with progress and categorize them
    const requiredModules: any[] = []
    const optionalModules: any[] = []
    const completedModules: any[] = []

    modules.forEach((module) => {
      const userProgress = progress.find((p) => p.moduleId === module.id) || {
        status: "not_started",
        progress: 0,
      }
      const moduleWithProgress = {
        ...module,
        ...userProgress, // Merge user progress into module object
      }

      if (moduleWithProgress.status === "completed") {
        completedModules.push(moduleWithProgress)
      } else if (module.category === "required") {
        requiredModules.push(moduleWithProgress)
      } else {
        optionalModules.push(moduleWithProgress)
      }
    })

    // Return data in the format expected by the client component
    return NextResponse.json({
      success: true,
      data: {
        required: requiredModules,
        optional: optionalModules,
        completed: completedModules,
      },
    })
  } catch (error) {
    console.error("Error getting training modules:", error)
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request data
    const { moduleId, progress, status, score } = await request.json()

    // Validate input
    if (!moduleId || progress === undefined || !status) {
      return NextResponse.json({ error: "Module ID, progress, and status are required" }, { status: 400 })
    }

    // Update training progress
    const success = await updateTrainingProgress(
      user.id,
      moduleId,
      progress,
      status as "not_started" | "in_progress" | "completed",
      score,
    )

    if (!success) {
      return NextResponse.json({ error: "Failed to update training progress" }, { status: 500 })
    }

    // Log the action
    createAuditLog({
      action: "TRAINING_UPDATE",
      resourceType: "TRAINING",
      resourceId: moduleId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Training progress updated: ${status}, progress: ${progress}%${
        score !== undefined ? `, score: ${score}` : ""
      }`,
    })

    return NextResponse.json({ message: "Training progress updated successfully" })
  } catch (error) {
    console.error("Error updating training progress:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
