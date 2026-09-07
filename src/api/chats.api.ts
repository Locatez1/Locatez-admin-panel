import { apiClient } from "./client";
import { ChatRoom, ChatMessage } from "../types";

// --- USER CHAT ENDPOINTS (Member-only; for demos / self-chat only) ---

export const createChatRoom = async (videoRequestId: string) => {
  const response = await apiClient.post<{ success: boolean; data: ChatRoom; message: string }>("/chats", {
    videoRequestId,
  });
  return response.data;
};

export const listChatRooms = async () => {
  const response = await apiClient.get<{ success: boolean; data: ChatRoom[] }>("/chats");
  return response.data;
};

export const getChatRoom = async (chatId: string) => {
  const response = await apiClient.get<{ success: boolean; data: ChatRoom }>(`/chats/${chatId}`);
  return response.data;
};

export const getChatMessages = async (chatId: string, page = 1, limit = 30) => {
  const response = await apiClient.get<any>(
    `/chats/${chatId}/messages?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const sendChatMessage = async (
  chatId: string,
  content: string,
  type = "TEXT"
) => {
  const response = await apiClient.post<{
    success: boolean;
    data: {
      message: ChatMessage;
      fulfillerMessagesRemaining: number;
      fulfillerMessageCount: number;
      preAcceptanceMessageLimit: number;
      state: string;
    };
  }>(`/chats/${chatId}/messages`, {
    content,
    type,
  });
  return response.data;
};

// --- ADMIN / MODERATOR READ-ONLY AUDIT ENDPOINTS ---

/**
 * Fetch all chat rooms for a video request.
 * GET /api/v1/admin/video-requests/:videoRequestId/chats
 */
export const getAdminChatRoomsForRequest = async (videoRequestId: string) => {
  const response = await apiClient.get<any>(`/admin/video-requests/${videoRequestId}/chats`);
  return response.data;
};

/**
 * Fetch single room details + participants for admin audit.
 * GET /api/v1/admin/chat-rooms/:id
 */
export const getAdminChatRoomDetails = async (roomId: string) => {
  const response = await apiClient.get<any>(`/admin/chat-rooms/${roomId}`);
  return response.data;
};

/**
 * Fetch message history for a chat room (paginated).
 * GET /api/v1/admin/chat-rooms/:id/messages?page=1&limit=30
 */
export const getAdminChatMessages = async (roomId: string, page = 1, limit = 30) => {
  const response = await apiClient.get<any>(
    `/admin/chat-rooms/${roomId}/messages?page=${page}&limit=${limit}`
  );
  return response.data;
};

// --- HELPER UTILITIES ---

export const extractRoomsList = (resData: any): ChatRoom[] => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.data?.rooms)) return resData.data.rooms;
  if (Array.isArray(resData.rooms)) return resData.rooms;
  if (resData.data?.id) return [resData.data];
  if (resData.id) return [resData];
  return [];
};

export const extractMessagesList = (resData: any): ChatMessage[] => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.data?.messages)) return resData.data.messages;
  if (Array.isArray(resData.data?.items)) return resData.data.items;
  if (Array.isArray(resData.messages)) return resData.messages;
  if (Array.isArray(resData.items)) return resData.items;
  if (Array.isArray(resData.results)) return resData.results;
  return [];
};
