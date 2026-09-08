import { apiClient } from "./client";

export type FulfilmentMediaItem = {
  storageKey: string;
  mimeType: string | null;
  kind: "VIDEO" | "IMAGE";
  sortOrder?: number;
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
  videoRequest?: {
    id: string;
    title?: string | null;
    status?: string;
    requestType?: string;
  };
  submittedBy?: {
    id: string;
    username?: string;
    fullName?: string | null;
    name?: string;
  };
};

export const listPendingFulfilmentMedia = async (page = 1, limit = 20) => {
  const response = await apiClient.get<any>("/admin/fulfilment-media", {
    params: { page, limit },
  });
  const body = response.data;
  const items: FulfilmentMediaSubmission[] = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body)
      ? body
      : [];
  const meta = body?.meta || { page, limit, total: items.length, totalPages: 1 };
  return { items, meta };
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
