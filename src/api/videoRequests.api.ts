import { apiClient } from "./client";
import { PaginatedResponse, VideoRequest } from "../types";

export const getVideoRequests = async (params: any) => {
  const response = await apiClient.get<PaginatedResponse<VideoRequest>>("/video-requests", { params });
  return response.data;
};

export const getVideoRequestById = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: VideoRequest }>(`/video-requests/${id}`);
  return response.data;
};

export const createVideoRequest = async (data: {
  title: string;
  description?: string;
  requestType?: "VIDEO" | "IMAGE";
  requestedImageCount?: number;
  categoryId?: string;
  durationSeconds: number;
  rewardAmount: number;
  customLocation?: {
    address?: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  locationId?: string;
  payoutType?: string;
}) => {
  const response = await apiClient.post<{ success: boolean; data: VideoRequest }>("/video-requests", data);
  return response.data;
};

export const getStats = async () => {
  const response = await apiClient.get<{ success: boolean; data: any }>("/video-requests/stats");
  return response.data;
};

export const approveVideoRequest = async (id: string) => {
  const response = await apiClient.patch<{ success: boolean; data: VideoRequest }>(`/video-requests/${id}/approve`);
  return response.data;
};

export const rejectVideoRequest = async (id: string, reason: string) => {
  const response = await apiClient.patch<{ success: boolean; data: VideoRequest }>(`/video-requests/${id}/reject`, { reason });
  return response.data;
};

/** Requester, fulfiller, or ADMIN/MODERATOR — uses existing completion/reward path. */
export const completeVideoRequest = async (id: string) => {
  const response = await apiClient.post<{ success: boolean; data: VideoRequest }>(
    `/video-requests/${id}/complete`
  );
  return response.data;
};
