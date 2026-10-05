import { apiClient } from "./client";

export type RestrictionPoiLevel = "HARD" | "CONDITIONAL";

export interface RestrictedPoiCategory {
  id: string;
  code: string;
  level: RestrictionPoiLevel;
  label: string;
  googleTypes: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateRestrictedPoiCategoryInput = {
  code: string;
  level: RestrictionPoiLevel;
  label: string;
  googleTypes: string[];
  enabled?: boolean;
};

export type UpdateRestrictedPoiCategoryInput = {
  level?: RestrictionPoiLevel;
  label?: string;
  googleTypes?: string[];
  enabled?: boolean;
};

const normalizeCategory = (raw: any): RestrictedPoiCategory => ({
  ...raw,
  googleTypes: Array.isArray(raw?.googleTypes) ? raw.googleTypes : [],
});

const unwrapList = (resData: any): RestrictedPoiCategory[] => {
  let list: any[] = [];
  if (Array.isArray(resData)) list = resData;
  else if (Array.isArray(resData?.data)) list = resData.data;
  else if (Array.isArray(resData?.data?.items)) list = resData.data.items;
  return list.map(normalizeCategory);
};

const unwrapOne = (resData: any): RestrictedPoiCategory => {
  if (resData?.id && resData?.code) return normalizeCategory(resData);
  if (resData?.data?.id) return normalizeCategory(resData.data);
  throw new Error("Invalid restricted POI category response");
};

export const listRestrictedPoiCategories = async (): Promise<RestrictedPoiCategory[]> => {
  const response = await apiClient.get("/admin/restricted-poi-categories");
  return unwrapList(response.data);
};

export const listSupportedGoogleTypes = async (): Promise<string[]> => {
  const response = await apiClient.get("/admin/restricted-poi-categories/google-types");
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
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
