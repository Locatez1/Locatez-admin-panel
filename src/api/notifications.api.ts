import { apiClient } from "./client";

export const registerDeviceToken = async (fcmToken: string): Promise<any> => {
  const response = await apiClient.post("/notifications/devices", { fcmToken });
  return response.data;
};

export const unregisterDeviceToken = async (fcmToken: string): Promise<any> => {
  const response = await apiClient.delete(
    `/notifications/devices/${encodeURIComponent(fcmToken)}`
  );
  return response.data;
};

export type BroadcastAudience = "marketing" | "all";

export type BroadcastPushPayload = {
  title: string;
  body: string;
  audience: BroadcastAudience;
  data?: Record<string, string | number | boolean | null>;
};

export type BroadcastPushResult = {
  audience: BroadcastAudience;
  recipientUserCount: number;
  successCount: number;
  failureCount: number;
  deactivatedCount: number;
  title: string;
  body: string;
};

export const broadcastPushNotification = async (
  payload: BroadcastPushPayload
): Promise<{ success: boolean; data: BroadcastPushResult; message?: string }> => {
  const response = await apiClient.post<{
    success: boolean;
    data: BroadcastPushResult;
    message?: string;
  }>("/admin/notifications/broadcast", payload);
  return response.data;
};
