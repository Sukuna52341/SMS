import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { executeQuery } from "@/lib/db-config";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await executeQuery(
      "SELECT id, message, `read`, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [user.id]
    );

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { notificationId } = await request.json();
    
    await executeQuery(
      "UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?",
      [notificationId, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
