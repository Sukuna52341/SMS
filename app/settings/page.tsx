"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current 2FA status from your API on mount
    async function fetch2faStatus() {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setTwofaEnabled(!!data.twofaEnabled);
      }
    }
    fetch2faStatus();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({ action: "generate" }),
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to generate 2FA secret.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setQr(data.qr);
      setSecret(data.secret);
    } catch (err) {
      setMessage("Request timed out or failed.");
    }
    setLoading(false);
  };

  const handleEnable = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({ action: "enable", secret, code }),
        headers: { "Content-Type": "application/json" },
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        setMessage("Server error: " + text);
        setLoading(false);
        return;
      }

      if (data.success) {
        setTwofaEnabled(true);
        setQr(null);
        setSecret(null);
        setCode("");
        setMessage("Two-factor authentication enabled!");
      } else {
        setMessage(data.error || "Failed to enable 2FA");
      }
    } catch (err) {
      if (err instanceof Error) {
        setMessage("Request failed: " + err.message);
      } else {
        setMessage("Request failed: " + String(err));
      }
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      body: JSON.stringify({ action: "disable" }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.success) {
      setTwofaEnabled(false);
      setMessage("Two-factor authentication disabled.");
    } else {
      setMessage(data.error || "Failed to disable 2FA");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded">
      <h2 className="text-2xl font-bold mb-4">Two-Factor Authentication</h2>
      {message && <div className="mb-4 text-center text-sm text-green-600">{message}</div>}
      {twofaEnabled ? (
        <div>
          <p className="mb-4">2FA is currently <b>enabled</b> on your account.</p>
          <Button onClick={handleDisable} disabled={loading}>
            {loading ? "Disabling..." : "Disable 2FA"}
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-4">2FA is <b>not enabled</b> on your account.</p>
          {!qr ? (
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Loading..." : "Enable 2FA"}
            </Button>
          ) : (
            <div>
              <p className="mb-2">Scan this QR code with your authenticator app:</p>
              <img src={qr} alt="2FA QR Code" className="mx-auto mb-2" />
              <p className="mb-2">Or enter this code manually: <b>{secret}</b></p>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handleEnable} disabled={loading || !code}>
                {loading ? "Enabling..." : "Verify & Enable"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
