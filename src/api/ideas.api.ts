import { apiClient } from "./client";
import {
  Idea,
  CreateIdeaPayload,
  UpdateIdeaPayload,
  GetIdeasParams,
} from "../types";

/**
 * Admin Get Ideas List with optional filtering by categoryId and search query
 * GET /api/v1/admin/ideas?categoryId=<categoryId>&search=<query>
 */
export const getAdminIdeas = async (params?: GetIdeasParams) => {
  const cleanParams: Record<string, string | number> = {};
  if (params?.categoryId) cleanParams.categoryId = params.categoryId;
  if (params?.search) cleanParams.search = params.search;
  if (params?.limit) cleanParams.limit = params.limit;

  const response = await apiClient.get<{
    success?: boolean;
    data: Idea[] | { items: Idea[]; pagination?: any };
  }>("/admin/ideas", { params: cleanParams });

  return response.data;
};

/**
 * Admin Get Idea by ID
 * GET /api/v1/admin/ideas/:id
 */
export const getAdminIdeaById = async (id: string) => {
  const response = await apiClient.get<{ success?: boolean; data: Idea }>(
    `/admin/ideas/${id}`
  );
  return response.data;
};

/**
 * Admin Create Idea
 * POST /api/v1/admin/ideas
 */
export const createIdea = async (payload: CreateIdeaPayload) => {
  const response = await apiClient.post<{ success?: boolean; data: Idea }>(
    "/admin/ideas",
    payload
  );
  return response.data;
};

/**
 * Admin Update Idea
 * PATCH /api/v1/admin/ideas/:id
 */
export const updateIdea = async (id: string, payload: UpdateIdeaPayload) => {
  const response = await apiClient.patch<{ success?: boolean; data: Idea }>(
    `/admin/ideas/${id}`,
    payload
  );
  return response.data;
};

/**
 * Admin Delete Idea
 * DELETE /api/v1/admin/ideas/:id
 */
export const deleteIdea = async (id: string) => {
  const response = await apiClient.delete<{ success?: boolean; message?: string }>(
    `/admin/ideas/${id}`
  );
  return response.data;
};

/** Bulk drag-reorder — orderedIds[0] shows first in the app. */
export const reorderIdeas = async (orderedIds: string[]) => {
  const response = await apiClient.patch<{ success?: boolean; data: Idea[] }>(
    "/admin/ideas/reorder",
    { orderedIds }
  );
  return response.data;
};

/**
 * Upload Image Media for Ideas
 * POST /api/v1/media/upload
 * Workflow:
 * Select file -> POST /media/upload -> receive imageKey & imageUrl -> save imageKey to Idea
 */
export const uploadIdeaMedia = async (
  file: File
): Promise<{ imageKey: string; imageUrl?: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/media/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const resData = response.data;
  let key = "";
  let url = "";

  if (typeof resData?.data === "object" && resData.data !== null) {
    key =
      resData.data.imageKey ||
      resData.data.key ||
      resData.data.url ||
      "";
    url =
      resData.data.imageUrl ||
      resData.data.url ||
      resData.data.key ||
      "";
  } else if (typeof resData?.data === "string") {
    key = resData.data;
    url = resData.data;
  } else if (typeof resData?.imageKey === "string") {
    key = resData.imageKey;
    url = resData.imageUrl || resData.url || resData.imageKey;
  } else if (typeof resData?.key === "string") {
    key = resData.key;
    url = resData.url || resData.key;
  } else if (typeof resData?.url === "string") {
    key = resData.url;
    url = resData.url;
  }

  if (!key) {
    throw new Error("Invalid response format from media upload API");
  }

  return { imageKey: key, imageUrl: url || key };
};
