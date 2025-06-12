import { createPool } from "./lib/db-config.js"

async function testDatabaseConnection() {
  const pool = createPool()
  try {
    console.log("Attempting to connect to database with:")
    console.log(`Host: ${process.env.DB_HOST}`)
    console.log(`User: ${process.env.DB_USER}`)
    console.log(`Database: ${process.env.DB_NAME}`)

    const [result] = await pool.query("SELECT 1 as test")
    console.log("Database connection successful!")
    console.log("Test query result:", result)
    return true
  } catch (error) {
    console.error("Database connection error:", error)
    return false
  }
}

testDatabaseConnection().then((success) => {
  if (success) {
    console.log("✅ Database connection test passed")
  } else {
    console.log("❌ Database connection test failed")
  }
})
