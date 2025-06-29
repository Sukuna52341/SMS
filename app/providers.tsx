"use client"

import { ThemeProvider } from "next-themes" // Assuming next-themes for theme
import { AuthProvider } from "@/lib/auth-context" // Your AuthProvider
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Assuming ThemeProvider is from next-themes
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
} 