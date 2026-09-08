import { apiClient } from "./client";
import { ServiceAreaSettings, ServiceAreaMode } from "../types";

export interface VideoRequestSettings {
  requireApprovalForAll: boolean;
  requireFulfilmentMediaApproval: boolean;
  fulfilmentMediaPendingExpiresInMinutes: number;
  minRewardVideo: number;
  minRewardImage: number;
  nearbyRadiusMeters: number;
}

export type UpdateVideoRequestSettingsInput = {
  requireApprovalForAll?: boolean;
  requireFulfilmentMediaApproval?: boolean;
  fulfilmentMediaPendingExpiresInMinutes?: number;
  minRewardVideo?: number;
  minRewardImage?: number;
  nearbyRadiusMeters?: number;
};

export interface ChatSettings {
  preAcceptanceMessageLimit: number;
}

const DEFAULT_VR_SETTINGS: VideoRequestSettings = {
  requireApprovalForAll: false,
  requireFulfilmentMediaApproval: false,
  fulfilmentMediaPendingExpiresInMinutes: 10,
  minRewardVideo: 50,
  minRewardImage: 20,
  nearbyRadiusMeters: 5000,
};

const unwrapVideoRequestSettings = (resData: any): VideoRequestSettings | null => {
  const candidate =
    resData && typeof resData.requireApprovalForAll === "boolean"
      ? resData
      : resData?.data && typeof resData.data.requireApprovalForAll === "boolean"
        ? resData.data
        : null;
  if (!candidate) return null;
  return {
    requireApprovalForAll: !!candidate.requireApprovalForAll,
    requireFulfilmentMediaApproval: !!candidate.requireFulfilmentMediaApproval,
    fulfilmentMediaPendingExpiresInMinutes:
      typeof candidate.fulfilmentMediaPendingExpiresInMinutes === "number"
        ? candidate.fulfilmentMediaPendingExpiresInMinutes
        : DEFAULT_VR_SETTINGS.fulfilmentMediaPendingExpiresInMinutes,
    minRewardVideo:
      typeof candidate.minRewardVideo === "number"
        ? candidate.minRewardVideo
        : DEFAULT_VR_SETTINGS.minRewardVideo,
    minRewardImage:
      typeof candidate.minRewardImage === "number"
        ? candidate.minRewardImage
        : DEFAULT_VR_SETTINGS.minRewardImage,
    nearbyRadiusMeters:
      typeof candidate.nearbyRadiusMeters === "number"
        ? candidate.nearbyRadiusMeters
        : DEFAULT_VR_SETTINGS.nearbyRadiusMeters,
  };
};

export const getVideoRequestSettings = async (): Promise<VideoRequestSettings> => {
  const response = await apiClient.get<VideoRequestSettings | { success: boolean; data: VideoRequestSettings }>(
    "/settings/video-requests"
  );
  return unwrapVideoRequestSettings(response.data as any) ?? { ...DEFAULT_VR_SETTINGS };
};

export const updateVideoRequestSettings = async (
  input: UpdateVideoRequestSettingsInput
): Promise<VideoRequestSettings> => {
  const response = await apiClient.patch<VideoRequestSettings | { success: boolean; data: VideoRequestSettings }>(
    "/settings/video-requests",
    input
  );
  return unwrapVideoRequestSettings(response.data as any) ?? {
    ...DEFAULT_VR_SETTINGS,
    ...input,
    requireApprovalForAll:
      typeof input.requireApprovalForAll === "boolean"
        ? input.requireApprovalForAll
        : DEFAULT_VR_SETTINGS.requireApprovalForAll,
  };
};

export const getChatSettings = async (): Promise<ChatSettings> => {
  const response = await apiClient.get<ChatSettings | { success: boolean; data: ChatSettings }>("/settings/chat");
  const resData = response.data as any;
  if (resData && typeof resData.preAcceptanceMessageLimit === "number") {
    return resData as ChatSettings;
  }
  if (resData && resData.data && typeof resData.data.preAcceptanceMessageLimit === "number") {
    return resData.data as ChatSettings;
  }
  return { preAcceptanceMessageLimit: 50 };
};

export const updateChatSettings = async (preAcceptanceMessageLimit: number): Promise<ChatSettings> => {
  const response = await apiClient.patch<ChatSettings | { success: boolean; data: ChatSettings }>(
    "/settings/chat",
    { preAcceptanceMessageLimit }
  );
  const resData = response.data as any;
  if (resData && typeof resData.preAcceptanceMessageLimit === "number") {
    return resData as ChatSettings;
  }
  if (resData && resData.data && typeof resData.data.preAcceptanceMessageLimit === "number") {
    return resData.data as ChatSettings;
  }
  return { preAcceptanceMessageLimit };
};

/**
 * Service Area Restriction System API (ADMIN ONLY)
 * GET /api/v1/admin/service-area
 * PATCH /api/v1/admin/service-area
 */
export const getServiceAreaSettings = async (): Promise<ServiceAreaSettings> => {
  const response = await apiClient.get<ServiceAreaSettings | { success: boolean; data: ServiceAreaSettings }>("/admin/service-area");
  const resData = response.data as any;

  if (resData && (resData.mode === "PAN_INDIA" || resData.mode === "RESTRICTED")) {
    return {
      mode: resData.mode,
      areas: Array.isArray(resData.areas) ? resData.areas : [],
    };
  }

  if (resData && resData.data && (resData.data.mode === "PAN_INDIA" || resData.data.mode === "RESTRICTED")) {
    return {
      mode: resData.data.mode,
      areas: Array.isArray(resData.data.areas) ? resData.data.areas : [],
    };
  }

  throw new Error("Invalid response format from service area API");
};

export const updateServiceAreaSettings = async (payload: {
  mode: ServiceAreaMode;
  areas?: { id: string; enabled: boolean }[];
}): Promise<ServiceAreaSettings> => {
  const response = await apiClient.patch<ServiceAreaSettings | { success: boolean; data: ServiceAreaSettings }>(
    "/admin/service-area",
    payload
  );
  const resData = response.data as any;

  if (resData && (resData.mode === "PAN_INDIA" || resData.mode === "RESTRICTED")) {
    return {
      mode: resData.mode,
      areas: Array.isArray(resData.areas) ? resData.areas : [],
    };
  }

  if (resData && resData.data && (resData.data.mode === "PAN_INDIA" || resData.data.mode === "RESTRICTED")) {
    return {
      mode: resData.data.mode,
      areas: Array.isArray(resData.data.areas) ? resData.data.areas : [],
    };
  }

  return {
    mode: payload.mode,
    areas: (payload.areas as any) || [],
  };
};
