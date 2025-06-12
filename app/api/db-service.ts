// This file contains server-side database operations
// It will only be used in API routes and Server Actions

import { executeQuery, initializeTables } from "@/lib/db-config"
import { generateId, hashPassword } from "@/lib/db"

// Initialize the database
export async function initializeDatabase() {
  await initializeTables()
}

// User-related database functions
export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "staff" | "customer"
  status?: "active" | "inactive" | "pending"
}

interface UserWithPassword extends User {
  password_hash: string
}

// Find user by email
export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  try {
    const results = await executeQuery<any[]>("SELECT * FROM users WHERE email = ?", [email])

    if (Array.isArray(results) && results.length > 0) {
      const user = results[0]
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        password_hash: user.password_hash,
      }
    }

    return null
  } catch (error) {
    console.error("Error finding user:", error)
    return null
  }
}

// Check if email exists
export async function emailExists(email: string): Promise<boolean> {
  const user = await findUserByEmail(email)
  return !!user
}

// Create a new user
export async function createUser(
  name: string,
  email: string,
  password: string,
  role: "admin" | "staff" | "customer",
): Promise<User | null> {
  try {
    const id = generateId()
    const passwordHash = hashPassword(password)

    // Determine status based on role
    const status = role === "staff" ? "pending" : "active"

    // Insert user into MySQL database
    await executeQuery("INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)", [
      id,
      name,
      email,
      passwordHash,
      role,
      status,
    ])

    // Return user without password
    return {
      id,
      name,
      email,
      role,
      status,
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

// Verify password
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const passwordHash = hashPassword(password)
  return passwordHash === hashedPassword
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    // Find user by email
    const user = await findUserByEmail(email)

    // If user not found, return null
    if (!user) {
      console.log("User not found:", email)
      return null
    }

    // Check password
    if (!verifyPassword(password, user.password_hash)) {
      console.log("Invalid password for user:", email)
      return null
    }

    // If user is pending, return null
    if (user.status === "pending") {
      console.log("User account is pending approval")
      return null
    }

    // If user is inactive, return null
    if (user.status === "inactive") {
      console.log("User account is inactive")
      return null
    }

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error("Error authenticating user:", error)
    return null
  }
}

// Get all users (for admin purposes)
export async function getAllUsers(): Promise<User[]> {
  try {
    const results = await executeQuery<any[]>("SELECT id, name, email, role, status FROM users")

    if (Array.isArray(results)) {
      return results as User[]
    }

    return []
  } catch (error) {
    console.error("Error getting all users:", error)
    return []
  }
}

// Update user status
export async function updateUserStatus(userId: string, status: "active" | "inactive" | "pending"): Promise<boolean> {
  try {
    await executeQuery("UPDATE users SET status = ? WHERE id = ?", [status, userId])
    return true
  } catch (error) {
    console.error("Error updating user status:", error)
    return false
  }
}

// Privacy requests functions
export interface PrivacyRequest {
  id: string
  userId: string
  requestType: "access" | "correction" | "deletion"
  requestReason: string
  status: "pending" | "in_progress" | "completed" | "rejected"
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

// Create a new privacy request
export async function createPrivacyRequest(
  userId: string,
  requestType: "access" | "correction" | "deletion",
  requestReason: string,
): Promise<PrivacyRequest | null> {
  try {
    const id = generateId()

    await executeQuery(
      "INSERT INTO privacy_requests (id, user_id, request_type, request_reason, status) VALUES (?, ?, ?, ?, ?)",
      [id, userId, requestType, requestReason, "pending"],
    )

    const results = await executeQuery<any[]>("SELECT * FROM privacy_requests WHERE id = ?", [id])

    if (Array.isArray(results) && results.length > 0) {
      const request = results[0]
      return {
        id: request.id,
        userId: request.user_id,
        requestType: request.request_type,
        requestReason: request.request_reason,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        completedAt: request.completed_at,
      }
    }

    return null
  } catch (error) {
    console.error("Error creating privacy request:", error)
    return null
  }
}

// Get privacy requests for a user
export async function getPrivacyRequestsByUserId(userId: string): Promise<PrivacyRequest[]> {
  try {
    const results = await executeQuery<any[]>(
      "SELECT * FROM privacy_requests WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    )

    if (Array.isArray(results)) {
      return results.map((request) => ({
        id: request.id,
        userId: request.user_id,
        requestType: request.request_type,
        requestReason: request.request_reason,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        completedAt: request.completed_at,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting privacy requests:", error)
    return []
  }
}

// Training functions
export interface TrainingModule {
  id: string
  title: string
  description: string
  duration: string
  category: "required" | "optional"
  createdAt: Date
  updatedAt: Date
}

export interface UserTraining {
  id: string
  userId: string
  moduleId: string
  status: "not_started" | "in_progress" | "completed"
  progress: number
  score?: number
  startedAt?: Date
  completedAt?: Date
  dueDate?: Date
}

// Get all training modules
export async function getAllTrainingModules(): Promise<TrainingModule[]> {
  try {
    const results = await executeQuery<any[]>("SELECT * FROM training_modules ORDER BY title")

    if (Array.isArray(results)) {
      return results.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        duration: module.duration,
        category: module.category,
        createdAt: module.created_at,
        updatedAt: module.updated_at,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting training modules:", error)
    return []
  }
}

// Get user training progress
export async function getUserTrainingProgress(userId: string): Promise<UserTraining[]> {
  try {
    const results = await executeQuery<any[]>(
      `
      SELECT ut.* 
      FROM user_training ut
      JOIN training_modules tm ON ut.module_id = tm.id
      WHERE ut.user_id = ?
      ORDER BY tm.title
    `,
      [userId],
    )

    if (Array.isArray(results)) {
      return results.map((training) => ({
        id: training.id,
        userId: training.user_id,
        moduleId: training.module_id,
        status: training.status,
        progress: training.progress,
        score: training.score,
        startedAt: training.started_at,
        completedAt: training.completed_at,
        dueDate: training.due_date,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting user training progress:", error)
    return []
  }
}

// Update user training progress
export async function updateTrainingProgress(
  userId: string,
  moduleId: string,
  progress: number,
  status: "not_started" | "in_progress" | "completed",
  score?: number,
): Promise<boolean> {
  try {
    // Check if record exists
    const existingRecord = await executeQuery<any[]>(
      "SELECT * FROM user_training WHERE user_id = ? AND module_id = ?",
      [userId, moduleId],
    )

    const now = new Date()

    if (Array.isArray(existingRecord) && existingRecord.length > 0) {
      // Update existing record
      const updateFields = []
      const updateValues = []

      updateFields.push("progress = ?")
      updateValues.push(progress)

      updateFields.push("status = ?")
      updateValues.push(status)

      if (status === "in_progress" && !existingRecord[0].started_at) {
        updateFields.push("started_at = ?")
        updateValues.push(now)
      }

      if (status === "completed" && !existingRecord[0].completed_at) {
        updateFields.push("completed_at = ?")
        updateValues.push(now)
      }

      if (score !== undefined) {
        updateFields.push("score = ?")
        updateValues.push(score)
      }

      // Add user_id and module_id to values array
      updateValues.push(userId)
      updateValues.push(moduleId)

      await executeQuery(
        `UPDATE user_training SET ${updateFields.join(", ")} WHERE user_id = ? AND module_id = ?`,
        updateValues,
      )
    } else {
      // Create new record
      const id = generateId()
      const values = [
        id,
        userId,
        moduleId,
        status,
        progress,
        score || null,
        status !== "not_started" ? now : null,
        status === "completed" ? now : null,
        null, // due_date
      ]

      await executeQuery(
        `
        INSERT INTO user_training 
        (id, user_id, module_id, status, progress, score, started_at, completed_at, due_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        values,
      )
    }

    return true
  } catch (error) {
    console.error("Error updating training progress:", error)
    return false
  }
}
