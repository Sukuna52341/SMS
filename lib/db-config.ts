import mysql from "mysql2/promise"

// Configuration for MySQL database
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "@Iloveyou12",
  database: process.env.DB_NAME || "secure_microfinance",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}

// Create and export the connection pool directly
export const pool = mysql.createPool(dbConfig)

// Function to execute a query
export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    const [rows] = await pool.execute(query, params)
    return rows as T
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  } finally {
    // Note: We don't release the connection here because we're using the pool directly
    // The pool will manage connections automatically
  }
}


// Function to encrypt sensitive data
export function encryptData(data: string): string {
  // In a real implementation, this would use a proper encryption library
  // For demonstration purposes, we're just showing the concept

  // Example using MySQL's AES_ENCRYPT function
  // In a real app, you would use a more secure approach with proper key management
  return `AES_ENCRYPT('${data}', '${process.env.ENCRYPTION_KEY || "default_key"}')`
}

// Function to decrypt sensitive data
export function decryptData(data: string): string {
  // In a real implementation, this would use a proper decryption library
  // For demonstration purposes, we're just showing the concept

  // Example using MySQL's AES_DECRYPT function
  return `AES_DECRYPT(${data}, '${process.env.ENCRYPTION_KEY || "default_key"}')`
}

// Initialize database tables if they don't exist
export async function initializeTables() {
  try {
    // Create users table if it doesn't exist
    await executeQuery(
      `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'staff', 'customer') NOT NULL,
        status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
      [],
    )

    // Create privacy_settings table if it doesn't exist
    await executeQuery(
      `
      CREATE TABLE IF NOT EXISTS privacy_settings (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        marketing_consent BOOLEAN DEFAULT TRUE,
        data_sharing BOOLEAN DEFAULT FALSE,
        anonymous_analytics BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
      [],
    )

    // Create privacy_requests table if it doesn't exist
    await executeQuery(
      `
      CREATE TABLE IF NOT EXISTS privacy_requests (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        request_type ENUM('access', 'correction', 'deletion') NOT NULL,
        request_reason TEXT NOT NULL,
        status ENUM('pending', 'in_progress', 'completed', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
      [],
    )

    // Create training_modules table if it doesn't exist
    await executeQuery(
      `
      CREATE TABLE IF NOT EXISTS training_modules (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        duration VARCHAR(20) NOT NULL,
        category ENUM('required', 'optional') DEFAULT 'required',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
      [],
    )

    // Create user_training table if it doesn't exist
    await executeQuery(
      `
      CREATE TABLE IF NOT EXISTS user_training (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        module_id VARCHAR(36) NOT NULL,
        status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
        progress INT DEFAULT 0,
        score INT NULL,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        due_date TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
        UNIQUE KEY user_module (user_id, module_id)
      )
    `,
      [],
    )

    // Check if admin user exists, if not create default users
    const adminExists = await executeQuery<any[]>("SELECT * FROM users WHERE email = ?", ["admin@example.com"])

    if (Array.isArray(adminExists) && adminExists.length === 0) {
      // Import the hashPassword function
      const { hashPassword } = await import("./db")

      // Create default users
      await executeQuery("INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)", [
        "1",
        "Admin User",
        "admin@example.com",
        hashPassword("Admin123!"),
        "admin",
        "active",
      ])

      await executeQuery("INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)", [
        "2",
        "Staff User",
        "staff@example.com",
        hashPassword("Staff123!"),
        "staff",
        "active",
      ])

      await executeQuery("INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)", [
        "3",
        "Customer User",
        "customer@example.com",
        hashPassword("Customer123!"),
        "customer",
        "active",
      ])
    }

    console.log("Database tables initialized")
  } catch (error) {
    console.error("Error initializing database tables:", error)
  }
}
