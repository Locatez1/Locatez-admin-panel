import { apiClient } from "./client";

export type RestrictionPoiLevel = "HARD" | "CONDITIONAL";

export interface RestrictedPoiCategory {
  id: string;
  code: string;
  level: RestrictionPoiLevel;
  label: string;
  tokens: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateRestrictedPoiCategoryInput = {
  code: string;
  level: RestrictionPoiLevel;
  label: string;
  tokens: string[];
  enabled?: boolean;
};

export type UpdateRestrictedPoiCategoryInput = {
  level?: RestrictionPoiLevel;
  label?: string;
  tokens?: string[];
  enabled?: boolean;
};

const unwrapList = (resData: any): RestrictedPoiCategory[] => {
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.data)) return resData.data;
  if (Array.isArray(resData?.data?.items)) return resData.data.items;
  return [];
};

const unwrapOne = (resData: any): RestrictedPoiCategory => {
  if (resData?.id && resData?.code) return resData as RestrictedPoiCategory;
  if (resData?.data?.id) return resData.data as RestrictedPoiCategory;
  throw new Error("Invalid restricted POI category response");
};

export const listRestrictedPoiCategories = async (): Promise<RestrictedPoiCategory[]> => {
  const response = await apiClient.get("/admin/restricted-poi-categories");
  return unwrapList(response.data);
};

export const createRestrictedPoiCategory = async (
  input: CreateRestrictedPoiCategoryInput
): Promise<RestrictedPoiCategory> => {
  const response = await apiClient.post("/admin/restricted-poi-categories", input);
  return unwrapOne(response.data);
};

export const updateRestrictedPoiCategory = async (
  id: string,
  input: UpdateRestrictedPoiCategoryInput
): Promise<RestrictedPoiCategory> => {
  const response = await apiClient.patch(`/admin/restricted-poi-categories/${id}`, input);
  return unwrapOne(response.data);
};

export const deleteRestrictedPoiCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/restricted-poi-categories/${id}`);
};
