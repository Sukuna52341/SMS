import { executeQuery } from "./db-config"
import { generateId } from "./db"

// Interface for training module
export interface TrainingModule {
  id: string
  title: string
  description: string
  duration: string
  category: "required" | "optional"
  createdAt?: Date
  updatedAt?: Date
}

// Interface for user training progress
export interface UserTraining {
  id?: string
  userId: string
  moduleId: string
  status: "not_started" | "in_progress" | "completed"
  progress: number
  score?: number | null
  startedAt?: Date | null
  completedAt?: Date | null
  dueDate?: Date | null
}

// Get all training modules
export async function getAllTrainingModules(): Promise<TrainingModule[]> {
  try {
    const results = await executeQuery<any[]>("SELECT * FROM training_modules ORDER BY category, title")

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

// Get training module by ID
export async function getTrainingModule(moduleId: string): Promise<TrainingModule | null> {
  try {
    const results = await executeQuery<any[]>("SELECT * FROM training_modules WHERE id = ?", [moduleId])

    if (Array.isArray(results) && results.length > 0) {
      const module = results[0]
      return {
        id: module.id,
        title: module.title,
        description: module.description,
        duration: module.duration,
        category: module.category,
        createdAt: module.created_at,
        updatedAt: module.updated_at,
      }
    }

    return null
  } catch (error) {
    console.error("Error getting training module:", error)
    return null
  }
}

// Get user training progress
export async function getUserTrainingProgress(userId: string): Promise<UserTraining[]> {
  try {
    const results = await executeQuery<any[]>(
      `
      SELECT ut.*, tm.title, tm.description, tm.duration, tm.category
      FROM user_training ut
      JOIN training_modules tm ON ut.module_id = tm.id
      WHERE ut.user_id = ?
      ORDER BY ut.due_date ASC
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

// Get user training for a specific module
export async function getUserTrainingForModule(userId: string, moduleId: string): Promise<UserTraining | null> {
  try {
    const results = await executeQuery<any[]>("SELECT * FROM user_training WHERE user_id = ? AND module_id = ?", [
      userId,
      moduleId,
    ])

    if (Array.isArray(results) && results.length > 0) {
      const training = results[0]
      return {
        id: training.id,
        userId: training.user_id,
        moduleId: training.module_id,
        status: training.status,
        progress: training.progress,
        score: training.score,
        startedAt: training.started_at,
        completedAt: training.completed_at,
        dueDate: training.due_date,
      }
    }

    return null
  } catch (error) {
    console.error("Error getting user training for module:", error)
    return null
  }
}

// Start a training module
export async function startTrainingModule(userId: string, moduleId: string): Promise<boolean> {
  try {
    // Check if user training record exists
    const existingTraining = await getUserTrainingForModule(userId, moduleId)

    if (existingTraining) {
      // Update existing record if not completed
      if (existingTraining.status !== "completed") {
        await executeQuery(
          "UPDATE user_training SET status = 'in_progress', started_at = COALESCE(started_at, NOW()) WHERE user_id = ? AND module_id = ?",
          [userId, moduleId],
        )
      }
    } else {
      // Create new record
      const id = generateId()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // Set due date to 30 days from now

      await executeQuery(
        "INSERT INTO user_training (id, user_id, module_id, status, progress, started_at, due_date) VALUES (?, ?, ?, 'in_progress', 0, NOW(), ?)",
        [id, userId, moduleId, dueDate.toISOString().slice(0, 19).replace("T", " ")],
      )
    }

    return true
  } catch (error) {
    console.error("Error starting training module:", error)
    return false
  }
}

// Update training progress
export async function updateTrainingProgress(userId: string, moduleId: string, progress: number): Promise<boolean> {
  try {
    // Check if user training record exists
    const existingTraining = await getUserTrainingForModule(userId, moduleId)

    if (existingTraining) {
      // Update existing record if not completed
      if (existingTraining.status !== "completed") {
        await executeQuery(
          "UPDATE user_training SET progress = ?, status = 'in_progress' WHERE user_id = ? AND module_id = ?",
          [progress, userId, moduleId],
        )
      }
    } else {
      // Create new record
      await startTrainingModule(userId, moduleId)
      await executeQuery("UPDATE user_training SET progress = ? WHERE user_id = ? AND module_id = ?", [
        progress,
        userId,
        moduleId,
      ])
    }

    return true
  } catch (error) {
    console.error("Error updating training progress:", error)
    return false
  }
}

// Complete a training module
export async function completeTrainingModule(userId: string, moduleId: string, score?: number): Promise<boolean> {
  try {
    // Check if user training record exists
    const existingTraining = await getUserTrainingForModule(userId, moduleId)

    if (existingTraining) {
      // Update existing record
      await executeQuery(
        "UPDATE user_training SET status = 'completed', progress = 100, score = ?, completed_at = NOW() WHERE user_id = ? AND module_id = ?",
        [score || null, userId, moduleId],
      )
    } else {
      // Create new record
      const id = generateId()
      await executeQuery(
        "INSERT INTO user_training (id, user_id, module_id, status, progress, score, started_at, completed_at) VALUES (?, ?, ?, 'completed', 100, ?, NOW(), NOW())",
        [id, userId, moduleId, score || null],
      )
    }

    return true
  } catch (error) {
    console.error("Error completing training module:", error)
    return false
  }
}

// Get all required training modules with user progress
export async function getUserRequiredTraining(userId: string): Promise<any[]> {
  try {
    const results = await executeQuery<any[]>(
      `
      SELECT 
        tm.id, tm.title, tm.description, tm.duration, tm.category,
        COALESCE(ut.status, 'not_started') as status,
        COALESCE(ut.progress, 0) as progress,
        ut.score, ut.started_at, ut.completed_at, ut.due_date
      FROM 
        training_modules tm
      LEFT JOIN 
        user_training ut ON tm.id = ut.module_id AND ut.user_id = ?
      WHERE 
        tm.category = 'required'
      ORDER BY 
        FIELD(COALESCE(ut.status, 'not_started'), 'completed', 'in_progress', 'not_started'),
        ut.due_date ASC
    `,
      [userId],
    )

    if (Array.isArray(results)) {
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        duration: item.duration,
        category: item.category,
        status: item.status,
        progress: item.progress,
        score: item.score,
        startedAt: item.started_at,
        completedAt: item.completed_at,
        dueDate: item.due_date,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting user required training:", error)
    return []
  }
}

// Get all optional training modules with user progress
export async function getUserOptionalTraining(userId: string): Promise<any[]> {
  try {
    const results = await executeQuery<any[]>(
      `
      SELECT 
        tm.id, tm.title, tm.description, tm.duration, tm.category,
        COALESCE(ut.status, 'not_started') as status,
        COALESCE(ut.progress, 0) as progress,
        ut.score, ut.started_at, ut.completed_at, ut.due_date
      FROM 
        training_modules tm
      LEFT JOIN 
        user_training ut ON tm.id = ut.module_id AND ut.user_id = ?
      WHERE 
        tm.category = 'optional'
      ORDER BY 
        FIELD(COALESCE(ut.status, 'not_started'), 'completed', 'in_progress', 'not_started'),
        tm.title ASC
    `,
      [userId],
    )

    if (Array.isArray(results)) {
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        duration: item.duration,
        category: item.category,
        status: item.status,
        progress: item.progress,
        score: item.score,
        startedAt: item.started_at,
        completedAt: item.completed_at,
        dueDate: item.due_date,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting user optional training:", error)
    return []
  }
}

// Get completed training modules
export async function getUserCompletedTraining(userId: string): Promise<any[]> {
  try {
    const results = await executeQuery<any[]>(
      `
      SELECT 
        tm.id, tm.title, tm.description, tm.duration, tm.category,
        ut.status, ut.progress, ut.score, ut.started_at, ut.completed_at, ut.due_date
      FROM 
        user_training ut
      JOIN 
        training_modules tm ON ut.module_id = tm.id
      WHERE 
        ut.user_id = ? AND ut.status = 'completed'
      ORDER BY 
        ut.completed_at DESC
    `,
      [userId],
    )

    if (Array.isArray(results)) {
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        duration: item.duration,
        category: item.category,
        status: item.status,
        progress: item.progress,
        score: item.score,
        startedAt: item.started_at,
        completedAt: item.completed_at,
        dueDate: item.due_date,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting user completed training:", error)
    return []
  }
}
