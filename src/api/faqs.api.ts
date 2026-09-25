import { apiClient } from "./client";
import { PaginatedResponse } from "../types";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateFaqPayload = {
  question: string;
  answer: string;
  sortOrder?: number;
};

export type UpdateFaqPayload = {
  question?: string;
  answer?: string;
  sortOrder?: number;
};

export const getAdminFaqs = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) => {
  const response = await apiClient.get<PaginatedResponse<Faq>>("/admin/faqs", { params });
  return response.data;
};

export const createFaq = async (payload: CreateFaqPayload) => {
  const response = await apiClient.post<{ success: boolean; data: Faq }>("/admin/faqs", payload);
  return response.data;
};

export const updateFaq = async (id: string, payload: UpdateFaqPayload) => {
  const response = await apiClient.patch<{ success: boolean; data: Faq }>(`/admin/faqs/${id}`, payload);
  return response.data;
};

export const updateFaqStatus = async (id: string, isActive: boolean) => {
  const response = await apiClient.patch<{ success: boolean; data: Faq }>(`/admin/faqs/${id}/status`, {
    isActive,
  });
  return response.data;
};

export const deleteFaq = async (id: string) => {
  const response = await apiClient.delete<{ success: boolean; data: { id: string } }>(
    `/admin/faqs/${id}`
  );
  return response.data;
};

/** Bulk drag-reorder — orderedIds[0] shows first in the app. */
export const reorderFaqs = async (orderedIds: string[]) => {
  const response = await apiClient.patch<{ success: boolean; data: Faq[] }>("/admin/faqs/reorder", {
    orderedIds,
  });
  return response.data;
};
