import { apiClient } from "./client";

export type FulfilmentMediaItem = {
  storageKey: string;
  mimeType: string | null;
  kind: "VIDEO" | "IMAGE";
  sortOrder: number;
  url: string | null;
};

export type FulfilmentMediaSubmission = {
  id: string;
  videoRequestId: string;
  fulfilmentId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  reviewedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: FulfilmentMediaItem[];
  canReview?: boolean;
};

export const approveFulfilmentMedia = async (id: string) => {
  const response = await apiClient.patch<any>(`/admin/fulfilment-media/${id}/approve`);
  return response.data?.data ?? response.data;
};

export const rejectFulfilmentMedia = async (id: string, reason?: string) => {
  const response = await apiClient.patch<any>(`/admin/fulfilment-media/${id}/reject`, {
    reason,
  });
  return response.data?.data ?? response.data;
};
