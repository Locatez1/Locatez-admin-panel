import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createChatRoom,
  listChatRooms,
  getChatMessages,
  sendChatMessage,
  getChatRoom,
} from "../api/chats.api";
import { SocketService, SocketStatus } from "../services/socket.service";
import { ChatRoom, ChatMessage } from "../types";
import { ChatMessageContent } from "../components/common/ChatMessageContent";
import { MessageSquare, RefreshCw, Send, ArrowLeft, ShieldAlert, CheckCircle2, Radio, UserCheck, Lock } from "lucide-react";

export const LiveKitChatDemo: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [videoRequestId, setVideoRequestId] = useState("");
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage>>(new Map());
  const [inputMessage, setInputMessage] = useState("");
  
  // Realtime Socket.IO Connection State
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("DISCONNECTED");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const socketServiceRef = useRef<SocketService>(new SocketService());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Authoritative User ID normalization
  const currentUserId = String(user?.id || (user as any)?._id || (user as any)?.userId || "");
  const requesterId = String(activeRoom?.requesterId || "");
  const fulfillerId = String(activeRoom?.fulfillerId || "");

  // Authoritative Chat Role Model
  const currentRole =
    currentUserId.length > 0 && requesterId.length > 0 && currentUserId.toLowerCase() === requesterId.toLowerCase()
      ? "REQUESTER"
      : currentUserId.length > 0 && fulfillerId.length > 0 && currentUserId.toLowerCase() === fulfillerId.toLowerCase()
        ? "FULFILLER"
        : "UNKNOWN";

  // Socket.IO Lifecycle Management
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      socketServiceRef.current.connect(token);
    }

    const unsubStatus = socketServiceRef.current.onStatusChange((status) => {
      setSocketStatus(status);
    });

    const unsubNewMessage = socketServiceRef.current.onNewMessage((incomingMsg) => {
      if (!incomingMsg) return;

      const key = String(incomingMsg.id || (incomingMsg as any)._id || (incomingMsg as any).clientMsgId || "");
      if (key) {
        setMessagesMap((prev) => {
          const next = new Map(prev);
          if (next.has(key)) {
            console.log(`[Socket.IO] Duplicate message ignored: ${key}`);
          } else {
            console.log(`[Socket.IO] Incoming real-time message received: ${key}`);
          }
          next.set(key, incomingMsg);
          return next;
        });
      }
    });

    return () => {
      unsubStatus();
      unsubNewMessage();
      socketServiceRef.current.disconnect();
    };
  }, []);

  const loadRooms = async () => {
    setLoadingRooms(true);
    setErrorMsg(null);
    try {
      const res = await listChatRooms();
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.rooms || [];
      setRooms(list);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to load chat rooms");
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap]);

  const loadMessages = async (chatId: string) => {
    try {
      console.log("[Chat] Loading historical messages from REST API...");
      const res = await getChatMessages(chatId, 1, 50);
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.messages || [];

      setMessagesMap((prev) => {
        const next = new Map(prev);
        list.forEach((msg: ChatMessage) => {
          const key = String(msg.id || (msg as any)._id || (msg as any).clientMsgId || "");
          if (key) next.set(key, msg);
        });
        return next;
      });
      console.log(`[Chat] Loaded ${list.length} historical messages.`);
    } catch (err: any) {
      console.error("[Chat] Failed to load historical messages:", err);
    }
  };

  const syncRoomDetails = async (chatId: string) => {
    try {
      const roomRes = await getChatRoom(chatId);
      if (roomRes?.data) {
        setActiveRoom(roomRes.data);
      }
    } catch (err) {
      console.warn("[Chat Debug] Could not refresh room details:", err);
    }
  };

  const openRoom = async (room: ChatRoom) => {
    // Leave previous room if any
    if (activeRoom && activeRoom.id !== room.id) {
      socketServiceRef.current.leaveRoom(activeRoom.id);
    }

    setActiveRoom(room);
    setMessagesMap(new Map());
    setComposerError(null);

    await syncRoomDetails(room.id);
    await loadMessages(room.id);

    // Join room via Socket.IO
    socketServiceRef.current.joinRoom(room.id);
  };

  const closeRoom = () => {
    if (activeRoom) {
      socketServiceRef.current.leaveRoom(activeRoom.id);
    }
    setActiveRoom(null);
    setMessagesMap(new Map());
    loadRooms();
  };

  const handleStartChat = async () => {
    if (!videoRequestId.trim()) return;
    setErrorMsg(null);
    try {
      const res = await createChatRoom(videoRequestId.trim());
      const newRoom = res.data;
      await openRoom(newRoom);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to start chat room");
    }
  };

  const handleSend = async () => {
    if (!activeRoom || !inputMessage.trim()) return;
    setSendingMsg(true);
    setComposerError(null);

    const content = inputMessage.trim();
    console.log("[Chat] Sending REST message...");

    try {
      const res = await sendChatMessage(activeRoom.id, content, "TEXT");
      const data = res.data;
      const savedMsg = data.message || (data as any);

      const msgKey = String(savedMsg.id || (savedMsg as any)._id || (savedMsg as any).clientMsgId || `msg_${Date.now()}`);
      console.log(`[Chat] REST message persisted successfully: ${msgKey}`);

      setActiveRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          fulfillerMessagesRemaining: data.fulfillerMessagesRemaining ?? prev.fulfillerMessagesRemaining,
          fulfillerMessageCount: data.fulfillerMessageCount ?? prev.fulfillerMessageCount,
          preAcceptanceMessageLimit: data.preAcceptanceMessageLimit ?? prev.preAcceptanceMessageLimit,
          state: (data.state as any) || prev.state,
        };
      });

      // Insert confirmed message into state (keyed by ID for automatic deduplication)
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(msgKey, savedMsg);
        return next;
      });

      setInputMessage("");
    } catch (err: any) {
      // Handle fraud rejection, quota limit, or lifecycle errors from backend
      const msg = err.response?.data?.message || err.message || "Failed to send message";
      setComposerError(msg);
      // DO NOT append fake/unconfirmed message to state on error
    } finally {
      setSendingMsg(false);
    }
  };

  const sortedMessages = Array.from(messagesMap.values()).sort(
    (a, b) => new Date(a.createdAt || (a as any).timestamp || 0).getTime() - new Date(b.createdAt || (b as any).timestamp || 0).getTime()
  );

  // Video Request Lifecycle Enforcement
  const requestStatus = (activeRoom?.videoRequest as any)?.status || "";
  const isLifecycleClosed = ["COMPLETED", "CANCELLED", "EXPIRED", "REJECTED"].includes(requestStatus.toUpperCase());

  // Fulfiller Quota Exhaustion Check
  const isFulfillerExhausted =
    activeRoom?.state === "PRE_ACCEPTANCE" &&
    currentRole === "FULFILLER" &&
    (activeRoom?.fulfillerMessagesRemaining ?? 5) <= 0;

  const isMessagingBlocked = isLifecycleClosed || isFulfillerExhausted;

  return (
    <div className="space-y-6">
      {/* Diagnostic Panel */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-700 shadow-md text-xs space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-indigo-400 text-sm">
            <UserCheck className="h-4 w-4" />
            <span>SOCKET.IO & AUTH DIAGNOSTIC PANEL</span>
          </div>
          <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Chat Role: {currentRole}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
          <div><span className="text-slate-400">Authenticated User ID:</span> <span className="text-amber-300 font-bold">{currentUserId || "N/A"}</span></div>
          <div><span className="text-slate-400">Authenticated Email:</span> <span className="text-slate-200">{user?.email || "N/A"}</span></div>
          <div><span className="text-slate-400">User Auth Role:</span> <span className="text-slate-200 font-bold">{user?.role || "N/A"}</span></div>
          
          <div><span className="text-slate-400">Chat Room Role:</span> <span className="text-indigo-300 font-bold">{currentRole}</span></div>
          <div><span className="text-slate-400">Chat ID:</span> <span className="text-slate-300">{activeRoom?.id || "None selected"}</span></div>
          <div><span className="text-slate-400">Requester ID:</span> <span className="text-slate-300">{requesterId || "N/A"}</span></div>
          <div><span className="text-slate-400">Fulfiller ID:</span> <span className="text-slate-300">{fulfillerId || "N/A"}</span></div>

          <div><span className="text-slate-400">Socket.IO State:</span> <span className={socketStatus === "CONNECTED" ? "text-emerald-400 font-bold" : "text-amber-400"}>{socketStatus}</span></div>
          <div className="col-span-1 md:col-span-2"><span className="text-slate-400">Video Request Status:</span> <span className={isLifecycleClosed ? "text-red-400 font-bold" : "text-emerald-300"}>{requestStatus || "ACTIVE"}</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-indigo-600" />
            Locatez Socket.IO Chat Demo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Socket.IO transport with REST API persistence & backend policy enforcement.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Chat Role: {currentRole}
        </span>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center justify-between text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}

      {!activeRoom ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
              Start Fulfiller Chat Room
            </h2>
            <p className="text-xs text-gray-500">
              Only Fulfillers can start a chat room for an open video request.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Video Request ID</label>
              <input
                type="text"
                value={videoRequestId}
                onChange={(e) => setVideoRequestId(e.target.value)}
                placeholder="e.g. b4fde451-703b-4d4c-9911-4ce5dceecdcc"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleStartChat}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md text-sm transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" /> Start / Open Chat
            </button>
          </div>

          <div className="md:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-semibold text-gray-900">
                My Active Chat Rooms
              </h2>
              <button
                onClick={loadRooms}
                disabled={loadingRooms}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? "animate-spin" : ""}`} /> Refresh List
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                No active chat rooms found. Enter a Video Request ID to start a chat as Fulfiller.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => openRoom(r)}
                    className="py-3 px-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">
                          {r.videoRequest?.title || `Video Request ${r.videoRequestId.slice(0, 8)}...`}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            r.state === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.state}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Chat ID: {r.id} • Fulfiller Quota Remaining: {r.fulfillerMessagesRemaining ?? 5}
                      </p>
                    </div>
                    <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium">
                      Open Chat →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={closeRoom}
                className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    {activeRoom.videoRequest?.title || `Video Request ${activeRoom.videoRequestId.slice(0, 8)}`}
                  </h2>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      activeRoom.state === "ACCEPTED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {activeRoom.state}
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  Chat Role: <strong className="text-indigo-600 font-bold">{currentRole}</strong> | Requester ID: <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">{requesterId || "N/A"}</code> | Fulfiller ID: <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">{fulfillerId || "N/A"}</code> | Current User ID: <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">{currentUserId || "N/A"}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Radio className={`h-4 w-4 ${
                  socketStatus === "CONNECTED"
                    ? "text-emerald-500 animate-pulse"
                    : socketStatus === "CONNECTING"
                    ? "text-amber-500"
                    : "text-red-500"
                }`} />
                <span className={socketStatus === "CONNECTED" ? "text-emerald-700 font-bold" : "text-gray-600"}>
                  {socketStatus === "CONNECTED"
                    ? "Socket.IO Connected"
                    : `Socket.IO ${socketStatus}`}
                </span>
              </div>

              <button
                onClick={() => {
                  const token = localStorage.getItem("token");
                  if (token) socketServiceRef.current.connect(token);
                }}
                className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-2.5 py-1 rounded font-medium"
              >
                Reconnect
              </button>
            </div>
          </div>

          <div className={`px-4 py-2 text-xs font-medium border-b flex items-center justify-between ${
            isLifecycleClosed
              ? "bg-red-50 text-red-800 border-red-200"
              : activeRoom.state === "ACCEPTED"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : isFulfillerExhausted
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-indigo-50 text-indigo-800 border-indigo-200"
          }`}>
            {isLifecycleClosed ? (
              <span className="flex items-center gap-1.5 font-bold">
                <Lock className="h-4 w-4 text-red-600" />
                Messaging is disabled because this video request is {requestStatus}.
              </span>
            ) : activeRoom.state === "ACCEPTED" ? (
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Chat is ACCEPTED. Pre-acceptance limit no longer applies (unlimited chat).</span>
            ) : (
              <span>
                Pre-acceptance questions: <strong>{activeRoom.fulfillerMessageCount ?? 0} / {activeRoom.preAcceptanceMessageLimit ?? 5}</strong> (Remaining: <strong>{activeRoom.fulfillerMessagesRemaining ?? 5}</strong>).
                {currentRole === "FULFILLER"
                  ? " Only your questions consume quota."
                  : " As Requester, your replies do not consume quota."}
              </span>
            )}
          </div>

          {/* Authoritative Message Stream with Independent Ownership Alignment */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
            {sortedMessages.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">
                No messages yet. Send a message below to start conversation.
              </div>
            ) : (
              sortedMessages.map((msg) => {
                const senderId = String(
                  msg.senderId ??
                  (msg as any).sender?.id ??
                  (typeof (msg as any).sender === "string" ? (msg as any).sender : "") ??
                  ""
                );

                // Authoritative Message Sender Role
                const senderRole =
                  senderId.length > 0 && requesterId.length > 0 && senderId.toLowerCase() === requesterId.toLowerCase()
                    ? "REQUESTER"
                    : senderId.length > 0 && fulfillerId.length > 0 && senderId.toLowerCase() === fulfillerId.toLowerCase()
                      ? "FULFILLER"
                      : "UNKNOWN";

                // Independent Ownership Determination based on senderId === currentUserId
                const isOwnMessage =
                  senderId.length > 0 &&
                  currentUserId.length > 0 &&
                  senderId.toLowerCase() === currentUserId.toLowerCase();

                // Labeling Rules
                const displayLabel = isOwnMessage
                  ? "You"
                  : senderRole === "REQUESTER"
                  ? "Requester"
                  : senderRole === "FULFILLER"
                  ? "Fulfiller"
                  : msg.sender?.displayName || msg.sender?.username || msg.senderName || `User ${senderId.slice(0, 8)}`;

                const timestampText = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                  >
                    <div className="text-[10px] font-semibold text-gray-500 mb-0.5 px-1 flex items-center gap-1">
                      <span>{displayLabel}</span>
                      {timestampText && <span className="opacity-75">• {timestampText}</span>}
                    </div>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isOwnMessage
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                      }`}
                    >
                      <ChatMessageContent
                        content={msg.content}
                        type={msg.type}
                        isOwnMessage={isOwnMessage}
                      />
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {composerError && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-t border-red-200 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <span>{composerError}</span>
            </div>
          )}

          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isMessagingBlocked && !sendingMsg && handleSend()}
                disabled={isMessagingBlocked || sendingMsg}
                placeholder={
                  isLifecycleClosed
                    ? `Messaging disabled (${requestStatus})`
                    : isFulfillerExhausted
                    ? "You have reached the pre-acceptance question limit."
                    : "Type message..."
                }
                className="flex-1 px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 cursor-text disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={isMessagingBlocked || sendingMsg || !inputMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
