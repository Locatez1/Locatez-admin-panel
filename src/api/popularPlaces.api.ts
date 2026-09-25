import { apiClient } from "./client";
import {
  PopularPlace,
  CreatePopularPlacePayload,
  UpdatePopularPlacePayload,
} from "../types";

/**
 * User-facing active Popular Places feed (GET /api/v1/popular-places)
 */
export const getPopularPlaces = async (params?: any) => {
  const response = await apiClient.get<{
    success: boolean;
    data: PopularPlace[] | { items: PopularPlace[]; pagination?: any };
    meta?: any;
  }>("/popular-places", { params });
  return response.data;
};

/**
 * Admin Popular Places list including active & inactive (GET /api/v1/admin/popular-places)
 */
export const getAdminPopularPlaces = async (params?: any) => {
  const response = await apiClient.get<{
    success: boolean;
    data: PopularPlace[] | { items: PopularPlace[]; pagination?: any };
    meta?: any;
  }>("/admin/popular-places", { params });
  return response.data;
};

/**
 * Admin get Popular Place by ID (GET /api/v1/admin/popular-places/:id)
 */
export const getAdminPopularPlaceById = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: PopularPlace }>(`/admin/popular-places/${id}`);
  return response.data;
};

/**
 * Admin create Popular Place (POST /api/v1/admin/popular-places)
 */
export const createPopularPlace = async (payload: CreatePopularPlacePayload) => {
  const response = await apiClient.post<{ success: boolean; data: PopularPlace }>("/admin/popular-places", payload);
  return response.data;
};

/**
 * Admin update Popular Place (PATCH /api/v1/admin/popular-places/:id)
 */
export const updatePopularPlace = async (id: string, payload: UpdatePopularPlacePayload) => {
  const response = await apiClient.patch<{ success: boolean; data: PopularPlace }>(`/admin/popular-places/${id}`, payload);
  return response.data;
};

/**
 * Admin enable/disable Popular Place status (PATCH /api/v1/admin/popular-places/:id/status)
 */
export const updatePopularPlaceStatus = async (id: string, isActive: boolean) => {
  const response = await apiClient.patch<{ success: boolean; data: PopularPlace }>(`/admin/popular-places/${id}/status`, {
    isActive,
  });
  return response.data;
};

/**
 * Admin delete Popular Place (DELETE /api/v1/admin/popular-places/:id)
 */
export const deletePopularPlace = async (id: string) => {
  const response = await apiClient.delete<{ success?: boolean; message?: string }>(
    `/admin/popular-places/${id}`
  );
  return response.data;
};

/** Bulk drag-reorder — orderedIds[0] shows first in the app. */
export const reorderPopularPlaces = async (orderedIds: string[]) => {
  const response = await apiClient.patch<{ success: boolean; data: PopularPlace[] }>(
    "/admin/popular-places/reorder",
    { orderedIds }
  );
  return response.data;
};


/**
 * Media File Upload (POST /api/v1/media/upload)
 * Returns the public/reference URL (legacy helper for popular places).
 */
export const uploadMedia = async (file: File): Promise<string> => {
  const uploaded = await uploadMediaFile(file);
  return uploaded.url || uploaded.key;
};

/**
 * Full media upload result — use `key` for marketplace / ideas storage fields.
 */
export const uploadMediaFile = async (
  file: File
): Promise<{ key: string; url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{
    success?: boolean;
    data?: { key?: string; url?: string; imageKey?: string; imageUrl?: string } | string;
    key?: string;
    url?: string;
  }>("/media/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const resData = response.data;
  let key = "";
  let url = "";

  if (typeof resData?.data === "object" && resData.data !== null) {
    key = resData.data.key || resData.data.imageKey || "";
    url = resData.data.url || resData.data.imageUrl || "";
  } else if (typeof resData?.data === "string") {
    key = resData.data;
    url = resData.data;
  } else if (typeof resData?.key === "string") {
    key = resData.key;
    url = resData.url || resData.key;
  } else if (typeof resData?.url === "string") {
    url = resData.url;
    key = resData.url;
  }

  if (!key) {
    throw new Error("Invalid response format from media upload API (missing key)");
  }

  return { key, url: url || key };
};
