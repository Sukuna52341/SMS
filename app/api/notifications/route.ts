import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Example: Replace with real DB fetch
  const notifications = [
    { id: "1", message: "Your profile was updated.", read: false, createdAt: new Date().toISOString() },
    { id: "2", message: "A new report is available.", read: false, createdAt: new Date().toISOString() },
    { id: "3", message: "System maintenance scheduled.", read: true, createdAt: new Date().toISOString() },
  ];

  return NextResponse.json({ notifications });
}
