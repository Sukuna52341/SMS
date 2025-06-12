import { executeQuery } from "./db-config"
import { generateId } from "./db"

// Interface for privacy settings
export interface PrivacySettings {
  id?: string
  userId: string
  marketingConsent: boolean
  dataSharing: boolean
  anonymousAnalytics: boolean
  updatedAt?: Date
}

// Interface for privacy requests
export interface PrivacyRequest {
  id?: string
  userId: string
  requestType: "access" | "correction" | "deletion"
  requestReason: string
  status?: "pending" | "in_progress" | "completed" | "rejected"
  createdAt?: Date
  updatedAt?: Date
  completedAt?: Date | null
}

// Get privacy settings for a user
export async function getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
  try {
    const results = await executeQuery<any[]>("SELECT * FROM privacy_settings WHERE user_id = ?", [userId])

    if (Array.isArray(results) && results.length > 0) {
      const settings = results[0]
      return {
        id: settings.id,
        userId: settings.user_id,
        marketingConsent: Boolean(settings.marketing_consent),
        dataSharing: Boolean(settings.data_sharing),
        anonymousAnalytics: Boolean(settings.anonymous_analytics),
        updatedAt: settings.updated_at,
      }
    }

    // If no settings found, create default settings
    const defaultSettings: PrivacySettings = {
      userId,
      marketingConsent: true,
      dataSharing: false,
      anonymousAnalytics: true,
    }

    await savePrivacySettings(defaultSettings)
    return defaultSettings
  } catch (error) {
    console.error("Error getting privacy settings:", error)
    return null
  }
}

// Save privacy settings for a user
export async function savePrivacySettings(settings: PrivacySettings): Promise<boolean> {
  try {
    const { userId, marketingConsent, dataSharing, anonymousAnalytics } = settings

    // Check if settings already exist
    const existingSettings = await executeQuery<any[]>("SELECT id FROM privacy_settings WHERE user_id = ?", [userId])

    if (Array.isArray(existingSettings) && existingSettings.length > 0) {
      // Update existing settings
      await executeQuery(
        "UPDATE privacy_settings SET marketing_consent = ?, data_sharing = ?, anonymous_analytics = ? WHERE user_id = ?",
        [marketingConsent, dataSharing, anonymousAnalytics, userId],
      )
    } else {
      // Create new settings
      const id = generateId()
      await executeQuery(
        "INSERT INTO privacy_settings (id, user_id, marketing_consent, data_sharing, anonymous_analytics) VALUES (?, ?, ?, ?, ?)",
        [id, userId, marketingConsent, dataSharing, anonymousAnalytics],
      )
    }

    return true
  } catch (error) {
    console.error("Error saving privacy settings:", error)
    return false
  }
}

// Create a new privacy request
export async function createPrivacyRequest(request: PrivacyRequest): Promise<string | null> {
  try {
    const { userId, requestType, requestReason } = request
    const id = generateId()

    await executeQuery("INSERT INTO privacy_requests (id, user_id, request_type, request_reason) VALUES (?, ?, ?, ?)", [
      id,
      userId,
      requestType,
      requestReason,
    ])

    return id
  } catch (error) {
    console.error("Error creating privacy request:", error)
    return null
  }
}

// Get privacy requests for a user
export async function getPrivacyRequests(userId: string): Promise<PrivacyRequest[]> {
  try {
    const results = await executeQuery<any[]>(
      "SELECT * FROM privacy_requests WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    )

    if (Array.isArray(results)) {
      return results.map((request) => ({
        id: request.id,
        userId: request.user_id,
        requestType: request.request_type,
        requestReason: request.request_reason,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        completedAt: request.completed_at,
      }))
    }

    return []
  } catch (error) {
    console.error("Error getting privacy requests:", error)
    return []
  }
}

// Update privacy request status
export async function updatePrivacyRequestStatus(
  requestId: string,
  status: "pending" | "in_progress" | "completed" | "rejected",
): Promise<boolean> {
  try {
    const completedAt = status === "completed" ? "NOW()" : null

    if (completedAt) {
      await executeQuery("UPDATE privacy_requests SET status = ?, completed_at = NOW() WHERE id = ?", [
        status,
        requestId,
      ])
    } else {
      await executeQuery("UPDATE privacy_requests SET status = ? WHERE id = ?", [status, requestId])
    }

    return true
  } catch (error) {
    console.error("Error updating privacy request status:", error)
    return false
  }
}

export async function savePrivacyRequest({
  userId,
  requestType,
  requestReason,
  status = "pending",
  createdAt = new Date(),
}: {
  userId: string;
  requestType: "access" | "correction" | "deletion";
  requestReason: string;
  status?: "pending" | "in_progress" | "completed" | "rejected";
  createdAt?: Date;
}): Promise<PrivacyRequest> {
  const id = generateId();
  await executeQuery(
    "INSERT INTO privacy_requests (id, user_id, request_type, request_reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, userId, requestType, requestReason, status, createdAt]
  );
  return { id, userId, requestType, requestReason, status, createdAt };
}