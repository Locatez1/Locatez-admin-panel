import { apiClient } from "./client";
import { MarketplaceStream, MarketplacePurchase } from "../types";

export interface CreateMarketplaceStreamInput {
  title: string;
  description?: string;
  price: number;
  videoStorageKey: string;
  thumbnailStorageKey?: string;
  durationSeconds: number;
  categoryId?: string;
  customLocation?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  expiresAt?: string;
  status?: string;
}

/**
 * Fetch list of Marketplace VOD Streams (GET /api/v1/marketplace/streams)
 */
export interface MarketplaceStats {
  total: number;
  pending: number;
  published: number;
  expired: number;
  cancelled: number;
  completedSales: number;
  salesAmount: number;
}

/** Admin/moderator overview counts across all listings (GET /marketplace/streams/stats). */
export const getMarketplaceStats = async () => {
  const response = await apiClient.get<{ success: boolean; data: MarketplaceStats }>(
    "/marketplace/streams/stats"
  );
  return response.data.data;
};

export const getMarketplaceStreams = async (params?: any) => {
  const response = await apiClient.get<{
    success: boolean;
    data: { items: MarketplaceStream[]; pagination: any } | MarketplaceStream[];
  }>("/marketplace/streams", { params });
  return response.data;
};

/**
 * Get Marketplace Stream by ID (GET /api/v1/marketplace/streams/:id)
 */
export const getMarketplaceStreamById = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: MarketplaceStream }>(
    `/marketplace/streams/${id}`
  );
  return response.data;
};

/**
 * Create Marketplace VOD Listing (POST /api/v1/marketplace/streams)
 */
export const createMarketplaceStream = async (payload: CreateMarketplaceStreamInput) => {
  const response = await apiClient.post<{ success: boolean; data: MarketplaceStream }>(
    "/marketplace/streams",
    payload
  );
  return response.data;
};

/**
 * Fetch Marketplace Purchases (GET /api/v1/marketplace/purchases)
 */
export const getMarketplacePurchases = async (params?: any) => {
  const response = await apiClient.get<{
    success: boolean;
    data: { items: MarketplacePurchase[]; pagination: any } | MarketplacePurchase[];
  }>("/marketplace/purchases", { params });
  return response.data;
};

/**
 * Get Presigned Playback Access URL (GET /api/v1/marketplace/streams/:id/access)
 */
export const getMarketplacePlaybackAccess = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: { listingId: string; expiresInSeconds: number; playbackUrl: string };
  }>(`/marketplace/streams/${id}/access`);
  return response.data;
};

export const approveMarketplaceStream = async (id: string) => {
  const response = await apiClient.patch<{ success: boolean; data: MarketplaceStream }>(
    `/marketplace/streams/${id}/approve`
  );
  return response.data;
};

export const rejectMarketplaceStream = async (id: string, reason: string) => {
  const response = await apiClient.patch<{ success: boolean; data: MarketplaceStream }>(
    `/marketplace/streams/${id}/reject`,
    { reason }
  );
  return response.data;
};
