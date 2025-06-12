import crypto from "crypto"
import { executeQuery, initializeTables, pool } from "./db-config"

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

// Hash password using SHA-256 (in a real app, use bcrypt or Argon2)
export function hashPassword(password: string): string {
  // Use a consistent hashing method for both registration and login
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Generate a unique ID
export function generateId(): string {
  return crypto.randomUUID()
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
      console.log("Provided password hash:", hashPassword(password))
      console.log("Stored password hash:", user.password_hash)
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

// Initialize the database with default users if empty
export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize database tables
    await initializeTables()

    // Check if default users exist
    const adminExists = await emailExists("admin@example.com")
    if (!adminExists) {
      // Create default users with consistent password hashing
      await createUser("Admin User", "admin@example.com", "password", "admin")
      await createUser("Staff User", "staff@example.com", "password", "staff")
      await createUser("Customer User", "customer@example.com", "password", "customer")
    }
  } catch (error) {
    console.error("Error initializing database:", error)
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

// Verify password
function verifyPassword(password: string, hashedPassword: string): boolean {
  const passwordHash = hashPassword(password)

  // For default users with "hashed_password" placeholder
  if (hashedPassword === "hashed_password") {
    return password === "password"
  }

  return passwordHash === hashedPassword
}

export async function getActiveUsersCount(): Promise<number> {
  try {
    const [result] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active'"
    )
    return (result as any)[0].count
  } catch (error) {
    console.error("Error getting active users count:", error)
    throw error
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await executeQuery<any>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    return result[0]?.[0] || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}
