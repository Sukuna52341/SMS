import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { getAuditLogs } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Get last 10 logs for this user
  const allLogs = await getAuditLogs() as any[];
  const logs = allLogs
    .filter(log => log.userId === user.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
  return NextResponse.json({ logs });
}
