"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

// User type
export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "staff" | "customer"
  twoFactorEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string, role: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize demo users
  useEffect(() => {
    if (typeof window !== "undefined") {
      const users = localStorage.getItem("users")
      if (!users) {
        const demoUsers = [
          {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
            password: "password",
            role: "admin",
          },
          {
            id: "2",
            name: "Staff User",
            email: "staff@example.com",
            password: "password",
            role: "staff",
          },
          {
            id: "3",
            name: "Customer User",
            email: "customer@example.com",
            password: "password",
            role: "customer",
          },
        ]
        localStorage.setItem("users", JSON.stringify(demoUsers))
      }
    }
  }, [])

  // Load user from localStorage and listen for changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      } else {
        setUser(null)
      }
    }

    // Initial load
    handleStorageChange()

    // Listen for changes
    window.addEventListener('storage', handleStorageChange)
    
    setLoading(false)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, []) // Empty dependency array means this runs once on mount

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (response.ok && data.user) {
        setUser(data.user)
        localStorage.setItem("user", JSON.stringify(data.user))
        return true
      }
      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: string
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const usersJson = localStorage.getItem("users") || "[]"
      const users = JSON.parse(usersJson)

      if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        return false
      }

      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
        role,
      }

      users.push(newUser)
      localStorage.setItem("users", JSON.stringify(users))

      return true
    } catch (error) {
      console.error("Signup error:", error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    router.push("/")
  }

  const getAccessToken = async (): Promise<string | null> => {
    // This is a placeholder; in a real app, you'd use JWTs or session tokens.
    const storedUser = localStorage.getItem("user")
    if (!storedUser) return null
    const parsed = JSON.parse(storedUser)
    return parsed.email + "-token" // Just a fake "token"
  }

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, loading, getAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function InactivityLogout() {
  const { logout } = useAuth();

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        alert("You have been logged out due to inactivity.");
      }, 180000); // 3 minutes
    };

    // Listen for user activity
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    resetTimer(); // Start timer on mount

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, [logout]);

  return null;
}
