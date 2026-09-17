import { apiClient } from "./client";
import { PaginatedResponse, User, Wallet, WalletTransaction, AuditLog } from "../types";

export const getUsers = async (params: any) => {
  const response = await apiClient.get<PaginatedResponse<User>>("/users", { params });
  return response.data;
};

export const getUserById = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: User }>(`/users/${id}`);
  return response.data;
};

export const createUser = async (data: any) => {
  const response = await apiClient.post<{ success: boolean; data: User }>("/users", data);
  return response.data;
};

export const updateUserStatus = async (id: string, status: string) => {
  const response = await apiClient.patch<{ success: boolean; data: User }>(`/users/${id}/status`, { status });
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await apiClient.delete<{ success: boolean; data: null }>(`/users/${id}`);
  return response.data;
};

export const getUserWallet = async (userId: string) => {
  const response = await apiClient.get<{ success: boolean; data: Wallet }>(`/users/${userId}/wallet`);
  return response.data;
};

export const getUserTransactions = async (userId: string, params?: any) => {
  const response = await apiClient.get<{
    success: boolean;
    data: WalletTransaction[] | { items: WalletTransaction[]; pagination?: any; meta?: any };
  }>(`/users/${userId}/transactions`, { params });
  return response.data;
};

export const getUserActivity = async (userId: string, params?: any) => {
  const response = await apiClient.get<PaginatedResponse<AuditLog>>("/audit-logs", {
    params: { userId, limit: 50, ...params },
  });
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get<{ success: boolean; data: User }>("/users/me");
  return response.data;
};

export type UpdateAccountPayload = {
  username?: string;
  email?: string;
  phone?: string;
};

export type UpdateProfilePayload = {
  fullName?: string;
  profilePhotoUrl?: string;
  bio?: string | null;
  gender?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

export const updateMyAccount = async (payload: UpdateAccountPayload) => {
  const response = await apiClient.patch<{ success: boolean; data: User }>(
    "/users/me",
    payload
  );
  return response.data;
};

export const updateMyProfile = async (payload: UpdateProfilePayload) => {
  const response = await apiClient.patch<{ success: boolean; data: User }>(
    "/users/me/profile",
    payload
  );
  return response.data;
};
