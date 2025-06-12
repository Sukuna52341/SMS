import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { getUserFromRequest } from "@/lib/auth-utils";
import { executeQuery } from "@/lib/db-config";

// POST /api/settings/2fa?action=generate
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read the body ONCE
  const body = await request.json();
  const { action, token, secret, code } = body;

  console.log("Received body:", body);
  console.log("Action:", action, "Secret:", secret, "Code:", code);

  if (action === "generate") {
    // Generate a new secret
    const secretObj = speakeasy.generateSecret({ name: `SecureMicrofinance (${user.email})` });
    // Save secret temporarily in session or return to client for verification step
    // For demo, return to client (in production, store in session or temp DB)
    if (!secretObj.otpauth_url) {
      return NextResponse.json({ error: "Failed to generate otpauth_url" }, { status: 500 });
    }
    const qr = await qrcode.toDataURL(secretObj.otpauth_url);
    return NextResponse.json({ qr, secret: secretObj.base32 });
  }

  if (action === "enable") {
    // Use secret and code from the already-read body
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
    });
    if (!verified) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    // Save secret and enable 2FA in DB
    await executeQuery(
      "UPDATE users SET twofa_enabled = 1, twofa_secret = ? WHERE id = ?",
      [secret, user.id]
    );
    return NextResponse.json({ success: true });
  }

  if (action === "disable") {
    await executeQuery(
      "UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?",
      [user.id]
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Fetch 2FA status from DB
  const rows = await executeQuery<{twofa_enabled: number}[]>(
    "SELECT twofa_enabled FROM users WHERE id = ?",
    [user.id]
  );
  const twofaEnabled = rows[0]?.twofa_enabled === 1;
  return NextResponse.json({ twofaEnabled });
}
