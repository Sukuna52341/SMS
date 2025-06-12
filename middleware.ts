// Simple middleware that doesn't block any routes
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Allow all requests to pass through
  return NextResponse.next()
}

// This empty config ensures the middleware doesn't run on any routes
export const config = {
  matcher: [],
}
