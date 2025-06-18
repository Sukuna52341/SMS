"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertCircle, CheckCircle, Lock } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [twoFACode, setTwoFACode] = useState("")
  const [isVerifying2FA, setIsVerifying2FA] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Invalid email or password")
      }

      if (data.require2fa) {
        setShow2FA(true)
        setIsLoading(false)
        return
      }

      // If no 2FA required, proceed with normal login
      const success = await login(email, password)
      if (success) {
        // Redirect based on role
        const user = JSON.parse(localStorage.getItem("user") || '{}');
        if (user.role === "admin") {
          router.push("/admin");
        } else if (user.role === "staff") {
          router.push("/dashboard");
        } else if (user.role === "customer") {
          router.push("/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError("Invalid email or password. Please try again.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsVerifying2FA(true)

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: twoFACode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Invalid 2FA code")
      }

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(data.user))

      // 2FA verification successful, proceed with login
      if (data.user.role === "admin") {
        router.push("/admin")
      } else if (data.user.role === "staff") {
        router.push("/dashboard")
      } else if (data.user.role === "customer") {
        router.push("/dashboard")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during 2FA verification")
      console.error(err)
    } finally {
      setIsVerifying2FA(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {show2FA ? "Two-Factor Authentication" : "Login"}
          </CardTitle>
          <CardDescription className="text-center">
            {show2FA
              ? "Enter the verification code from your authenticator app"
              : "Enter your credentials to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {justRegistered && !show2FA && (
            <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription>Registration successful! You can now log in.</AlertDescription>
            </Alert>
          )}
          {show2FA ? (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="2fa-code">Verification Code</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="2fa-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={6}
                    pattern="[0-9]*"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isVerifying2FA}>
                {isVerifying2FA ? "Verifying..." : "Verify"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShow2FA(false)}
                disabled={isVerifying2FA}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-green-600 hover:text-green-500 dark:text-green-400">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          )}

          {!show2FA && (
            <div className="mt-4 text-center text-sm">
              <p>Demo accounts (password: password):</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail("admin@example.com")
                    setPassword("password")
                  }}
                >
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail("staff@example.com")
                    setPassword("password")
                  }}
                >
                  Staff
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail("customer@example.com")
                    setPassword("password")
                  }}
                >
                  Customer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 w-full">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-green-600 hover:text-green-500 dark:text-green-400 font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
