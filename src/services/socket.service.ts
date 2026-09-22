import { io, Socket } from "socket.io-client";
import { ChatMessage } from "../types";

export type SocketStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export class SocketService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private status: SocketStatus = "DISCONNECTED";
  private onStatusChangeCallbacks: Set<(status: SocketStatus) => void> = new Set();
  private onNewMessageCallbacks: Set<(message: ChatMessage) => void> = new Set();

  public getStatus(): SocketStatus {
    return this.status;
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public onStatusChange(callback: (status: SocketStatus) => void): () => void {
    this.onStatusChangeCallbacks.add(callback);
    callback(this.status);
    return () => {
      this.onStatusChangeCallbacks.delete(callback);
    };
  }

  public onNewMessage(callback: (message: ChatMessage) => void): () => void {
    this.onNewMessageCallbacks.add(callback);
    return () => {
      this.onNewMessageCallbacks.delete(callback);
    };
  }

  private setStatus(newStatus: SocketStatus) {
    this.status = newStatus;
    this.onStatusChangeCallbacks.forEach((cb) => cb(newStatus));
  }

  public connect(token: string): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
    // Strip trailing /api/v1 if present to get server origin
    const serverOrigin = rawApiUrl.replace(/\/api\/v1\/?$/, "");

    this.setStatus("CONNECTING");

    this.socket = io(serverOrigin, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      this.setStatus("CONNECTED");

      // Automatically rejoin active room after reconnect
      if (this.currentRoomId) {
        this.socket?.emit("room:join", { chatRoomId: this.currentRoomId });
      }
    });

    this.socket.on("disconnect", () => {
      this.setStatus("DISCONNECTED");
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket.IO] Connection error:", error.message);
      this.setStatus("ERROR");
    });

    this.socket.on("message:new", (data: any) => {
      const message: ChatMessage = data.message || data;
      this.onNewMessageCallbacks.forEach((cb) => cb(message));
    });
  }

  public joinRoom(chatRoomId: string): void {
    if (!chatRoomId) return;

    if (this.currentRoomId && this.currentRoomId !== chatRoomId) {
      this.leaveRoom(this.currentRoomId);
    }

    this.currentRoomId = chatRoomId;

    if (this.socket && this.socket.connected) {
      this.socket.emit("room:join", { chatRoomId });
    }
  }

  public leaveRoom(chatRoomId: string): void {
    if (!chatRoomId) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit("room:leave", { chatRoomId });
    }

    if (this.currentRoomId === chatRoomId) {
      this.currentRoomId = null;
    }
  }

  public disconnect(): void {
    if (this.currentRoomId && this.socket && this.socket.connected) {
      this.socket.emit("room:leave", { chatRoomId: this.currentRoomId });
    }
    this.currentRoomId = null;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus("DISCONNECTED");
  }
}
