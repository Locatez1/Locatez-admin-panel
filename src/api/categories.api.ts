import { apiClient } from "./client";
import { Category, CategorySuggestion } from "../types";

/**
 * User-facing active categories feed (GET /api/v1/categories)
 * Pass `description` to get AI recommendation: `{ categories: Category[] }`.
 */
export const getCategories = async (params?: { description?: string }) => {
  const response = await apiClient.get<{
    success: boolean;
    data: Category[] | { categories: Category[] };
  }>("/categories", { params });
  return response.data;
};

/** Recommended category for a request description (GET /categories?description=). */
export const getRecommendedCategories = async (description: string): Promise<Category[]> => {
  const response = await getCategories({ description });
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
};

/**
 * Admin categories list including active & inactive (GET /api/v1/admin/categories)
 */
export const getAdminCategories = async (params?: any) => {
  const response = await apiClient.get<{ success: boolean; data: Category[] | { items: Category[]; pagination?: any } }>("/admin/categories", { params });
  return response.data;
};

/**
 * 1. Create Category (POST /api/v1/categories)
 * Body: { name: string }
 */
export const createCategory = async (data: { name: string }) => {
  const response = await apiClient.post<{ success: boolean; data: Category }>("/categories", {
    name: data.name,
  });
  return response.data;
};

/**
 * 2. Edit Category Name Only (PATCH /api/v1/categories/:id)
 * Body: { name: string } - Slug generated/updated automatically by backend
 */
export const updateCategory = async (id: string, data: { name: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Category }>(`/categories/${id}`, {
    name: data.name,
  });
  return response.data;
};

/**
 * 3. Enable/Disable Category Status Only (PATCH /api/v1/categories/:id/status)
 * Body: { isActive: boolean }
 */
export const updateCategoryStatus = async (id: string, isActive: boolean) => {
  const response = await apiClient.patch<{ success: boolean; data: Category }>(`/categories/${id}/status`, {
    isActive,
  });
  return response.data;
};

/**
 * 4. Genuine Hard Delete Category (DELETE /api/v1/categories/:id)
 */
export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete<{ success: boolean; message?: string; data?: any }>(`/categories/${id}`);
  return response.data;
};

/**
 * AI Category Suggestions List (GET /api/v1/admin/categories/suggestions)
 */
export const getCategorySuggestions = async (params?: any) => {
  const response = await apiClient.get<{ success: boolean; data: CategorySuggestion[] | { items: CategorySuggestion[]; pagination?: any } }>("/admin/categories/suggestions", { params });
  return response.data;
};

/**
 * Accept AI Category Suggestion (PATCH /api/v1/admin/categories/suggestions/:id/accept)
 */
export const acceptCategorySuggestion = async (id: string) => {
  const response = await apiClient.patch<{ success: boolean; data: CategorySuggestion }>(`/admin/categories/suggestions/${id}/accept`);
  return response.data;
};

/**
 * Reject AI Category Suggestion (PATCH /api/v1/admin/categories/suggestions/:id/reject)
 */
export const rejectCategorySuggestion = async (id: string) => {
  const response = await apiClient.patch<{ success: boolean; data: CategorySuggestion }>(`/admin/categories/suggestions/${id}/reject`);
  return response.data;
};
