import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { getVideoRequestById, approveVideoRequest, rejectVideoRequest } from "../api/videoRequests.api";
import {
  approveFulfilmentMedia,
  rejectFulfilmentMedia,
} from "../api/fulfilmentMedia.api";
import {
  getAdminChatRoomsForRequest,
  getAdminChatMessages,
  extractRoomsList,
  extractMessagesList,
} from "../api/chats.api";
import { VideoRequest, ChatRoom, ChatMessage } from "../types";
import { ChatMessageContent } from "../components/common/ChatMessageContent";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  X,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Film,
  Download,
  Play,
  Video,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";

export const VideoRequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [request, setRequest] = useState<VideoRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [isMediaRejectModalOpen, setIsMediaRejectModalOpen] = useState(false);
  const [mediaRejectionReason, setMediaRejectionReason] = useState("");
  const [mediaActionLoading, setMediaActionLoading] = useState(false);

  // Video State
  const [chatVideoUrl, setChatVideoUrl] = useState<string | null>(null);

  // Admin Chat Audit State
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessagesPage, setChatMessagesPage] = useState(1);
  const [chatMessagesLimit] = useState(30);
  const [totalChatMessages, setTotalChatMessages] = useState<number | null>(null);
  const [totalChatPages, setTotalChatPages] = useState<number>(1);
  const [chatLoading, setChatLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const selectedRoom = chatRooms.find((r) => r.id === selectedRoomId) || null;

  const getPartyName = (party?: {
    fullName?: string | null;
    name?: string | null;
    username?: string | null;
    firstName?: string;
    displayName?: string;
    email?: string;
  } | null) => {
    if (!party) return null;
    const name =
      party.fullName ||
      party.name ||
      party.displayName ||
      party.firstName ||
      party.username ||
      "";
    if (name) return name;
    if (party.email) return party.email.split("@")[0];
    return null;
  };

  const getRequesterName = (req: VideoRequest) => {
    const named = getPartyName(req.requester || req.user || req.requestedBy || req.creator);
    if (named) return named;
    return req.requesterId || req.userId || "Requester";
  };

  const fetchAdminMessages = async (roomId: string, page = 1) => {
    if (!roomId) return;
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await getAdminChatMessages(roomId, page, chatMessagesLimit);
      const list = extractMessagesList(res);

      const meta = res?.meta || res?.data?.meta || res?.pagination;
      if (meta) {
        setTotalChatMessages(typeof meta.total === "number" ? meta.total : list.length);
        setTotalChatPages(typeof meta.totalPages === "number" ? meta.totalPages : 1);
      } else {
        setTotalChatMessages(list.length);
        setTotalChatPages(1);
      }

      setChatMessages(list);

      // Scan chat messages for submitted video URL if missing directly on request
      for (const msg of list) {
        if (msg.type === "VIDEO" || msg.type === "MEDIA") {
          if (msg.content) {
            setChatVideoUrl(formatMediaUrl(msg.content));
            break;
          }
        }
        const match =
          msg.content?.match(/(https?:\/\/[^\s]+(?:\.mp4|\.mov|\.webm|\.m3u8)[^\s]*)/i) ||
          msg.content?.match(/([^\s]+\.(?:mp4|mov|webm|m3u8))/i);
        if (match && match[0]) {
          setChatVideoUrl(formatMediaUrl(match[0]));
          break;
        }
      }
    } catch (err: any) {
      console.warn("[Admin Chat Audit] Failed to load messages for room:", roomId, err);
      setChatError(err.response?.data?.message || err.message || "Failed to load chat messages for this room.");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchAdminChatRooms = async (reqId: string) => {
    setRoomsLoading(true);
    setChatError(null);
    try {
      const res = await getAdminChatRoomsForRequest(reqId);
      const list = extractRoomsList(res);
      setChatRooms(list);

      if (list.length > 0) {
        const acceptedRoom = list.find((r) => r.state === "ACCEPTED");
        const defaultRoom = acceptedRoom || list[0];
        setSelectedRoomId(defaultRoom.id);
        setChatMessagesPage(1);
        await fetchAdminMessages(defaultRoom.id, 1);
      } else {
        setSelectedRoomId(null);
        setChatMessages([]);
      }
    } catch (err: any) {
      console.warn("[Admin Chat Audit] Failed to fetch rooms:", err);
      const msg = err.response?.data?.message || err.message || "Admin chat audit feature is pending backend deployment.";
      setChatError(msg);
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleSelectRoom = async (roomId: string) => {
    setSelectedRoomId(roomId);
    setChatMessagesPage(1);
    await fetchAdminMessages(roomId, 1);
  };

  const handleChatPageChange = async (newPage: number) => {
    if (!selectedRoomId || newPage < 1 || newPage > totalChatPages) return;
    setChatMessagesPage(newPage);
    await fetchAdminMessages(selectedRoomId, newPage);
  };

  const fetchRequest = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getVideoRequestById(id);
      setRequest(response.data);

      await fetchAdminChatRooms(id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch request details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to approve this video request?")) return;
    
    setActionLoading(true);
    try {
      await approveVideoRequest(id);
      fetchRequest();
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert("This request was already processed by another moderator/admin.");
      } else {
        alert(err.response?.data?.message || "Failed to approve request");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !rejectionReason.trim()) return;
    
    setActionLoading(true);
    try {
      await rejectVideoRequest(id, rejectionReason);
      setIsRejectModalOpen(false);
      fetchRequest();
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert("This request was already processed by another moderator/admin.");
      } else {
        alert(err.response?.data?.message || "Failed to reject request");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveFulfilmentMedia = async (mediaId: string) => {
    if (!window.confirm("Approve this fulfilment media and deliver it to the requester?")) return;
    setMediaActionLoading(true);
    try {
      await approveFulfilmentMedia(mediaId);
      await fetchRequest();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve fulfilment media");
    } finally {
      setMediaActionLoading(false);
    }
  };

  const handleRejectFulfilmentMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const mediaId = request?.fulfilmentMedia?.latest?.id;
    if (!mediaId) return;
    setMediaActionLoading(true);
    try {
      await rejectFulfilmentMedia(mediaId, mediaRejectionReason.trim());
      setIsMediaRejectModalOpen(false);
      setMediaRejectionReason("");
      await fetchRequest();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject fulfilment media");
    } finally {
      setMediaActionLoading(false);
    }
  };

  const getLocationAddress = (req: VideoRequest) => {
    if (req.customLocation?.address) return req.customLocation.address;
    if (req.location?.address) return req.location.address;
    if (req.location?.name) return req.location.name;
    if (req.address) return req.address;
    return "N/A";
  };

  const getCoordinates = (req: VideoRequest) => {
    let lat = req.customLocation?.latitude ?? req.location?.latitude ?? req.latitude;
    let lng = req.customLocation?.longitude ?? req.location?.longitude ?? req.longitude;
    if ((lat === undefined || lat === null) && req.location?.coordinates) {
      if (Array.isArray(req.location.coordinates) && req.location.coordinates.length >= 2) {
        lng = req.location.coordinates[0];
        lat = req.location.coordinates[1];
      }
    }
    if (lat !== undefined && lat !== null && lng !== undefined && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return null;
  };

  const getRestrictionReasonText = (req: VideoRequest) => {
    if (req.restrictedReason) return req.restrictedReason;
    if (req.restrictionReason) return req.restrictionReason;
    if (req.restrictedAreaType) {
      const typeStr = req.restrictedAreaType.toUpperCase();
      if (typeStr.includes("SERVICE") || typeStr.includes("OUT")) return "This request location is outside the active service areas configured for the application.";
      if (typeStr.includes("FLY") || typeStr.includes("CAMERA") || typeStr.includes("PROHIBITED")) return "This location falls within a prohibited filming or camera-restricted zone.";
      if (typeStr.includes("SECURITY") || typeStr.includes("MILITARY")) return "This request location is in a high-security military or government zone.";
      return `This request is flagged as a restricted location (${req.restrictedAreaType}).`;
    }
    if (req.isRestrictedArea) return "This location falls within a restricted geographic zone or outside service coverage.";
    return "This request is pending moderation to verify location safety, service area coverage, and guidelines compliance.";
  };

  const getRejectionReasonText = (req: VideoRequest | null): string | null => {
    if (!req) return null;
    const reason =
      req.rejectionReason ||
      (req as any).rejectReason ||
      (req as any).reason ||
      (req as any).cancellationReason ||
      (req as any).rejection_reason ||
      (req as any).rejectedReason;
    if (reason && typeof reason === "string" && reason.trim().length > 0) {
      return reason.trim();
    }
    if (req.status === "REJECTED") {
      return "No explicit rejection reason provided.";
    }
    return null;
  };

  const getVideoUrl = (req: VideoRequest): string | null => {
    const f = req.fulfilment;
    if (f) {
      const url = f.videoUrl || f.playbackUrl || f.mediaUrl || f.hlsUrl || f.videoStorageKey || f.videoKey;
      if (url) return formatMediaUrl(url);
    }
    const directUrl = req.videoUrl || req.playbackUrl || req.mediaUrl || req.videoStorageKey || req.videoKey;
    if (directUrl) return formatMediaUrl(directUrl);
    const sub = (req as any).submission || (req as any).videoSubmission;
    if (sub) {
      const subUrl = sub.videoUrl || sub.mediaUrl || sub.url || sub.videoStorageKey;
      if (subUrl) return formatMediaUrl(subUrl);
    }
    return null;
  };

  const formatMediaUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
      return url;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || "";
    const origin = apiBase ? new URL(apiBase).origin : window.location.origin;
    return `${origin}/uploads/${url.replace(/^\/+/, "")}`;
  };

  const getThumbnailUrl = (req: VideoRequest): string | undefined => {
    const thumb = req.fulfilment?.thumbnailUrl || req.thumbnailUrl || (req as any).submission?.thumbnailUrl;
    if (thumb) return formatMediaUrl(thumb);
    return undefined;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading request</h3>
        <p className="mt-2 text-sm text-red-700">{error || "Request not found"}</p>
        <Link to="/video-requests" className="mt-4 inline-block text-sm text-primary hover:underline">
          &larr; Back to requests
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING": return <Badge variant="warning">PENDING</Badge>;
      case "OPEN": return <Badge variant="info">OPEN</Badge>;
      case "ACCEPTED": return <Badge variant="blue">ACCEPTED</Badge>;
      case "ONGOING": case "IN_PROGRESS": case "FULFILMENT_PENDING": case "MODERATOR_APPROVAL_PENDING": return <Badge variant="ongoing">{status.replace(/_/g, " ")}</Badge>;
      case "COMPLETED": case "APPROVED": case "FULFILLED": return <Badge variant="success">{status}</Badge>;
      case "REJECTED": case "DECLINED": return <Badge variant="danger">{status}</Badge>;
      case "CANCELLED": case "EXPIRED": return <Badge variant="cancelled">{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const renderParty = (
    party?: { id?: string; fullName?: string | null; name?: string | null; username?: string | null; firstName?: string; displayName?: string; email?: string } | null,
    fallbackId?: string | null
  ) => {
    const raw =
      party?.fullName ||
      party?.name ||
      party?.displayName ||
      party?.firstName ||
      party?.username ||
      (party?.email ? party.email.split("@")[0] : "") ||
      "";
    const label = raw || (fallbackId ? null : "N/A");
    const userId = party?.id || fallbackId;

    if (userId && label) {
      return (
        <Link to={`/users/${userId}`} className="text-primary hover:underline font-medium">
          {label}
        </Link>
      );
    }
    if (userId) {
      return (
        <Link to={`/users/${userId}`} className="text-primary hover:underline font-mono text-xs bg-gray-100 px-2.5 py-1 rounded inline-block font-semibold">
          {userId}
        </Link>
      );
    }
    return <span className="text-gray-500 font-medium">{label || "N/A"}</span>;
  };

  const renderRequester = () => {
    if (!request) return <span>User</span>;
    const u = request.requester || request.user || request.requestedBy || request.creator;
    return renderParty(u, request.requesterId || request.userId);
  };

  const renderFulfiller = () => {
    if (!request) return <span>—</span>;
    return renderParty(request.fulfilment?.fulfiller, request.fulfilment?.fulfillerId || null);
  };

  const coords = getCoordinates(request);
  const isPending = request.status === "PENDING";
  const isRestricted = Boolean(request.isRestrictedArea || request.restrictedAreaType || request.restrictedReason || request.restrictionReason);
  const rawVideoUrl = getVideoUrl(request);
  const thumbnailUrl = getThumbnailUrl(request);
  const activeVideoUrl = rawVideoUrl || chatVideoUrl;
  const fulfilmentLatest = request.fulfilmentMedia?.latest ?? null;
  const fulfilmentItems = fulfilmentLatest?.items ?? [];
  const canReviewFulfilmentMedia = fulfilmentLatest?.status === "PENDING";

  const getFulfilmentMediaStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">MEDIA PENDING APPROVAL</Badge>;
      case "APPROVED":
        return <Badge variant="success">MEDIA APPROVED</Badge>;
      case "REJECTED":
        return <Badge variant="danger">MEDIA REJECTED</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => {
            if (location.search) {
              navigate(`/video-requests${location.search}`);
            } else {
              navigate(-1);
            }
          }}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-3.5 py-1.5 rounded-md hover:bg-gray-50 transition shadow-sm"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4 text-gray-500" />
          Back to Video Requests
        </button>
      </div>

      {/* Main Request Information Card */}
      <div className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Request Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Information, location coordinates, chat history, and moderation controls.</p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(request.status)}
            
            {request.status === "PENDING" && (
              <div className="flex gap-2 ml-4 border-l pl-4 border-gray-200">
                <Button variant="primary" size="sm" onClick={handleApprove} isLoading={actionLoading} className="bg-green-600 hover:bg-green-700 border-green-600">
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => setIsRejectModalOpen(true)} disabled={actionLoading}>
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Restriction Notice for Pending / Restricted requests */}
        {isPending && isRestricted && (
          <div className="bg-amber-50 border-y border-amber-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-amber-900">
                    Pending Request Restriction Notice
                  </h3>
                  {request.restrictedAreaType && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900 border border-amber-300">
                      Restriction Type: {request.restrictedAreaType}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-amber-800 space-y-1">
                  <p>
                    <strong className="font-semibold">Why this request is restricted:</strong> {getRestrictionReasonText(request)}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Please inspect the location details and coordinates below before approving or rejecting this pending request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Restricted Area Notice if not pending or if restrictedAreaType exists without pending banner */}
        {!isPending && isRestricted && (
          <div className="bg-yellow-50 border-y border-yellow-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Restricted Area Notice</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Located in restricted zone: <strong>{request.restrictedAreaType || "Restricted Area"}</strong>
                </p>
                <p className="mt-1 text-xs text-yellow-600">
                  Reason: {getRestrictionReasonText(request)}
                </p>
              </div>
            </div>
          </div>
        )}

        {(request.status === "REJECTED" || getRejectionReasonText(request)) && (
          <div className="bg-red-50 border-y border-red-200 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900">Request Rejection Reason</h3>
                <p className="mt-1 text-sm text-red-800 font-medium">
                  {getRejectionReasonText(request)}
                </p>
                {request.reviewedBy && (
                  <p className="mt-2 text-xs text-red-600">
                    Reviewed & Rejected by{" "}
                    <strong>{request.reviewedBy.name || request.reviewedBy.username}</strong>
                    {request.reviewedAt
                      ? ` · ${new Date(request.reviewedAt).toLocaleString()}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {(request.status === "OPEN" || request.status === "ACCEPTED" || request.status === "ONGOING" || request.status === "COMPLETED") &&
          request.reviewedBy && (
          <div className="bg-emerald-50 border-y border-emerald-200 p-3 px-4 sm:px-6">
            <p className="text-xs text-emerald-800">
              Approved by{" "}
              <strong>{request.reviewedBy.name || request.reviewedBy.username}</strong>
              {request.reviewedAt
                ? ` · ${new Date(request.reviewedAt).toLocaleString()}`
                : ""}
            </p>
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Title</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">{request.title}</dd>
            </div>

            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{request.description || "No description provided."}</dd>
            </div>

            {/* Location Address */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6 bg-slate-50/50">
              <dt className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                Location / Address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">
                {getLocationAddress(request)}
              </dd>
            </div>

            {/* Latitude and Longitude */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6 bg-slate-50/50">
              <dt className="text-sm font-medium text-gray-700">Latitude & Longitude</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {coords ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono bg-white px-2.5 py-1 rounded text-xs text-gray-900 font-semibold border border-gray-300 shadow-sm">
                      Latitude: {coords.lat.toFixed(6)}
                    </span>
                    <span className="font-mono bg-white px-2.5 py-1 rounded text-gray-900 font-semibold border border-gray-300 shadow-sm">
                      Longitude: {coords.lng.toFixed(6)}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary-dark hover:underline gap-1 bg-blue-50 px-2.5 py-1 rounded border border-blue-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">No latitude/longitude coordinates recorded</span>
                )}
              </dd>
            </div>

            {/* Detailed Restriction row if restricted */}
            {isRestricted && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6 bg-amber-50/40">
                <dt className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  Restriction Details
                </dt>
                <dd className="mt-1 text-sm text-amber-900 sm:col-span-2 sm:mt-0 space-y-1">
                  <div>
                    <span className="font-semibold text-amber-950">Type:</span> {request.restrictedAreaType || "Service Area Boundary / Restricted Zone"}
                  </div>
                  <div>
                    <span className="font-semibold text-amber-950">Reason:</span> {getRestrictionReasonText(request)}
                  </div>
                </dd>
              </div>
            )}

            {/* Submitted Video Link row in details list */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                <Film className="h-4 w-4 text-gray-400" />
                Submitted Video
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {activeVideoUrl ? (
                  <a
                    href="#submitted-video-player"
                    className="inline-flex items-center text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-200 gap-1.5 hover:bg-green-100"
                  >
                    <Play className="h-3.5 w-3.5 text-green-600 fill-current" /> Video Available — Scroll down to watch player
                  </a>
                ) : (
                  <span className="text-gray-400 italic">No video submitted yet</span>
                )}
              </dd>
            </div>

            {/* Chat Communication quick link row */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                Request Chat History
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <a
                  href="#request-chat-audit"
                  className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200 gap-1.5 hover:bg-indigo-100"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                  {chatRooms.length > 0 ? `Audit Chat History (${chatRooms.length} rooms available)` : "View Chat History & Messages"}
                </a>
              </dd>
            </div>

            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Requester</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {renderRequester()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Fulfiller</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {renderFulfiller()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{request.category?.name || "None"}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Reward</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-semibold text-gray-900">₹{(request.rewardAmount || 0).toFixed(2)}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Payout Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{request.payoutType || "STANDARD"}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {new Date(request.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Fulfilment Media Moderation */}
      <div id="fulfilment-media-review" className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between border-b border-gray-200 bg-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Fulfilment Media</h3>
              <p className="text-xs text-gray-500">
                Media submitted by the fulfiller for delivery. When approval is required, review here before the requester sees it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {fulfilmentLatest ? getFulfilmentMediaStatusBadge(fulfilmentLatest.status) : (
              <span className="text-xs text-gray-500 italic">No fulfilment media submitted</span>
            )}
            {canReviewFulfilmentMedia && fulfilmentLatest && (
              <div className="flex gap-2 border-l pl-3 border-gray-300">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApproveFulfilmentMedia(fulfilmentLatest.id)}
                  isLoading={mediaActionLoading}
                  className="bg-green-600 hover:bg-green-700 border-green-600"
                >
                  <Check className="mr-1 h-4 w-4" /> Approve Media
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsMediaRejectModalOpen(true)}
                  disabled={mediaActionLoading}
                >
                  <X className="mr-1 h-4 w-4" /> Reject Media
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {fulfilmentLatest?.status === "PENDING" && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p>
                  This media is waiting for moderator approval. It has <strong>not</strong> been delivered to the requester yet.
                </p>
                {(fulfilmentLatest.pendingExpiresAtIst || fulfilmentLatest.pendingExpiresAt) && (
                  <p className="mt-1 text-xs text-amber-800">
                    Auto-approves at{" "}
                    <strong>{fulfilmentLatest.pendingExpiresAtIst || fulfilmentLatest.pendingExpiresAt}</strong>
                    {typeof fulfilmentLatest.pendingExpiresInMinutes === "number" && (
                      <> ({fulfilmentLatest.pendingExpiresInMinutes} min remaining)</>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {fulfilmentLatest?.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
              <p className="font-medium">Media rejected</p>
              {fulfilmentLatest.rejectionReason && (
                <p className="mt-1 text-red-700">Reason: {fulfilmentLatest.rejectionReason}</p>
              )}
              {fulfilmentLatest.reviewedBy && (
                <p className="mt-2 text-xs text-red-600">
                  Rejected by{" "}
                  <strong>
                    {fulfilmentLatest.reviewedBy.name || fulfilmentLatest.reviewedBy.username}
                  </strong>
                  {fulfilmentLatest.reviewedAt
                    ? ` · ${new Date(fulfilmentLatest.reviewedAt).toLocaleString()}`
                    : ""}
                </p>
              )}
            </div>
          )}

          {fulfilmentLatest?.status === "APPROVED" && fulfilmentLatest.reviewedBy && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm text-emerald-800">
              <p className="text-xs">
                Media approved by{" "}
                <strong>
                  {fulfilmentLatest.reviewedBy.name || fulfilmentLatest.reviewedBy.username}
                </strong>
                {fulfilmentLatest.reviewedAt
                  ? ` · ${new Date(fulfilmentLatest.reviewedAt).toLocaleString()}`
                  : " · auto-approved"}
              </p>
            </div>
          )}

          {fulfilmentLatest?.status === "APPROVED" &&
            !fulfilmentLatest.reviewedBy &&
            fulfilmentLatest.reviewedAt && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm text-emerald-800">
              <p className="text-xs">
                Media auto-approved
                {fulfilmentLatest.reviewedAt
                  ? ` · ${new Date(fulfilmentLatest.reviewedAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          )}

          {fulfilmentItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fulfilmentItems.map((item, idx) => {
                const url = item.url ? formatMediaUrl(item.url) : null;
                const isVideo =
                  item.kind === "VIDEO" ||
                  Boolean(item.mimeType?.startsWith("video/")) ||
                  /\.(mp4|webm|mov)(\?|$)/i.test(item.storageKey || "");
                return (
                  <div
                    key={`${item.storageKey}-${idx}`}
                    className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                  >
                    <div className="aspect-video bg-black flex items-center justify-center">
                      {url ? (
                        isVideo ? (
                          <video
                            src={url}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full max-h-[360px] object-contain"
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Fulfilment media ${idx + 1}`}
                            className="w-full h-full max-h-[360px] object-contain"
                          />
                        )
                      ) : (
                        <div className="text-center text-gray-400 p-4">
                          {isVideo ? <Video className="mx-auto h-8 w-8" /> : <ImageIcon className="mx-auto h-8 w-8" />}
                          <p className="mt-2 text-xs">Preview URL unavailable</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2 text-xs text-gray-600">
                      <span className="font-medium text-gray-800">
                        {item.kind || (isVideo ? "VIDEO" : "IMAGE")} #{idx + 1}
                      </span>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Film className="mx-auto h-9 w-9 text-gray-300" />
              <h4 className="mt-2 text-sm font-medium text-gray-900">No fulfilment media yet</h4>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                When the fulfiller submits via <code className="bg-gray-200 px-1 rounded">POST /fulfilment/media</code>, it will show here for review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submitted Video Player Section */}
      <div id="submitted-video-player" className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between border-b border-gray-200 bg-gray-50 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium leading-6 text-gray-900">Submitted Video Coverage</h3>
          </div>
          <div className="flex items-center gap-3">
            {activeVideoUrl && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                Media Available
              </span>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeVideoUrl ? (
            <div className="space-y-4">
              {chatVideoUrl && !rawVideoUrl && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 text-xs text-indigo-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MessageSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                    <strong>Extracted from Chat History:</strong> Found video stream from request chat messages.
                  </span>
                </div>
              )}

              <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[480px] flex items-center justify-center shadow-lg border border-gray-800">
                <video
                  key={activeVideoUrl}
                  src={activeVideoUrl}
                  controls
                  poster={thumbnailUrl}
                  preload="metadata"
                  playsInline
                  className="w-full h-full max-h-[480px] object-contain"
                >
                  <source src={activeVideoUrl} type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-500 font-mono truncate max-w-md">
                  <span className="font-semibold text-gray-700">Video Source URL:</span> {activeVideoUrl}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={activeVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Video in New Tab
                  </a>
                  <a
                    href={activeVideoUrl}
                    download={`submitted_video_${request.id}.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Video
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Video className="mx-auto h-10 w-10 text-gray-300" />
              <h4 className="mt-2 text-sm font-medium text-gray-900">No Video Submitted Yet</h4>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                {request.status === "COMPLETED"
                  ? "This request status is COMPLETED, but no video stream URL was attached to this record."
                  : `Current request status is ${request.status}. Once the fulfiller submits video media, the video player will appear here.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Request Chat Audit & Conversation Section (Admin Read-Only) */}
      <div id="request-chat-audit" className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between border-b border-gray-200 bg-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Request Chat History Audit</h3>
              <p className="text-xs text-gray-500">Read-only admin audit of candidate chat rooms.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 text-slate-200">
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              Admin Audit Mode (Read-Only)
            </span>
          </div>
        </div>

        {/* Candidate Chat Rooms Selector Bar */}
        {chatRooms.length > 0 && (
          <div className="bg-slate-100 p-3 border-b border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Candidate Chat Rooms ({chatRooms.length}):</span>
              <span className="text-[11px] text-gray-500 font-normal">Select a candidate room to audit messages</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {chatRooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                const fulfillerName = getPartyName(room.fulfiller) || room.fulfillerId || "Fulfiller Candidate";
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition flex items-center gap-2 ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      room.state === "ACCEPTED"
                        ? isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800"
                        : isSelected ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
                    }`}>
                      {room.state}
                    </span>
                    <span className="font-semibold">{fulfillerName}</span>
                    <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-gray-400"}`}>
                      ({room.id.slice(0, 8)}...)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Room Metadata Bar */}
        {selectedRoom && (
          <div className="bg-slate-900 text-slate-200 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-slate-400">Requester: </span>
                <span className="text-blue-300 font-bold">{getRequesterName(request)}</span>
                <span className="text-slate-500 text-[10px] ml-1">({request.requesterId || request.userId || "N/A"})</span>
              </div>
              <div className="text-slate-600">|</div>
              <div>
                <span className="text-slate-400">Fulfiller: </span>
                <span className="text-emerald-300 font-bold">
                  {getPartyName(selectedRoom.fulfiller) || selectedRoom.fulfillerId || "N/A"}
                </span>
                <span className="text-slate-500 text-[10px] ml-1">({selectedRoom.fulfillerId})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">Room State:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                selectedRoom.state === "ACCEPTED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {selectedRoom.state}
              </span>
            </div>
          </div>
        )}

        {/* Messages Stream Container */}
        <div className="p-4 sm:p-6 bg-slate-50/50">
          {chatError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 flex items-start gap-3 text-xs">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">Admin Chat Audit Status</h4>
                <p className="mt-1 text-amber-700">{chatError}</p>
                <p className="mt-1 text-[11px] text-amber-600">
                  Ensure backend chat service is configured for admin chat audit capability.
                </p>
              </div>
            </div>
          ) : chatLoading && chatMessages.length === 0 ? (
            <div className="flex justify-center items-center py-12 gap-2 text-indigo-600 text-sm font-medium">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Fetching chat messages from admin API...</span>
            </div>
          ) : chatMessages.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {chatMessages.map((msg) => {
                const requesterId = request.requesterId || request.userId || "";
                const fulfillerId = selectedRoom?.fulfillerId || request.fulfilment?.fulfillerId || "";
                const senderId = String(msg.senderId || (msg.sender as any)?.id || "");

                const isRequester = (senderId.length > 0 && requesterId.length > 0 && senderId.toLowerCase() === requesterId.toLowerCase()) || msg.senderName?.toLowerCase().includes("requester");
                const isFulfiller = (senderId.length > 0 && fulfillerId.length > 0 && senderId.toLowerCase() === fulfillerId.toLowerCase()) || msg.senderName?.toLowerCase().includes("fulfiller");
                const isSystem = msg.type === "SYSTEM";

                const roleLabel = isRequester
                  ? "Requester"
                  : isFulfiller
                  ? "Fulfiller"
                  : isSystem
                  ? "System Notice"
                  : msg.senderName || `User ${senderId.slice(0, 8)}`;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isRequester ? "items-start" : isFulfiller ? "items-end" : "items-center"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-medium text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isRequester
                          ? "bg-blue-100 text-blue-800"
                          : isFulfiller
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200 text-gray-800"
                      }`}>
                        {roleLabel}
                      </span>

                      {/* Message Type Badge */}
                      {msg.type && msg.type !== "TEXT" && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {msg.type}
                        </span>
                      )}

                      {/* Billing Badge */}
                      {msg.billing && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          msg.billing === "PAID"
                            ? "bg-indigo-100 text-indigo-800"
                            : msg.billing === "MEDIA_DELIVERY"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {msg.billing}
                        </span>
                      )}

                      {msg.createdAt && (
                        <span className="text-gray-400 text-[10px]">
                          • {new Date(msg.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm space-y-2 ${
                        isRequester
                          ? "bg-white text-gray-900 border border-blue-200 rounded-tl-none"
                          : isFulfiller
                          ? "bg-emerald-700 text-white rounded-tr-none"
                          : "bg-gray-800 text-gray-100 rounded-lg"
                      }`}
                    >
                      <ChatMessageContent
                        content={msg.content}
                        type={msg.type}
                        isOwnMessage={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-white rounded-lg border-2 border-dashed border-gray-200">
              <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
              <h4 className="mt-2 text-sm font-medium text-gray-900">
                {roomsLoading ? "Loading Rooms..." : "No Chat Messages In This Room"}
              </h4>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                {chatRooms.length === 0
                  ? "No candidate chat rooms exist for this video request yet."
                  : `No chat messages have been recorded for Room ID ${selectedRoomId || "N/A"} yet.`}
              </p>
            </div>
          )}

          {/* Pagination Toolbar */}
          {selectedRoomId && totalChatMessages !== null && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-gray-500 font-mono">
                Total Messages: <strong className="text-gray-900">{totalChatMessages}</strong> | Page <strong className="text-gray-900">{chatMessagesPage}</strong> of <strong className="text-gray-900">{totalChatPages}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChatPageChange(chatMessagesPage - 1)}
                  disabled={chatMessagesPage <= 1 || chatLoading}
                  className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 rounded text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => handleChatPageChange(chatMessagesPage + 1)}
                  disabled={chatMessagesPage >= totalChatPages || chatLoading}
                  className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 rounded text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fetchAdminMessages(selectedRoomId, chatMessagesPage)}
                  disabled={chatLoading}
                  className="p-1 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded shadow-sm"
                  title="Refresh Messages"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${chatLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Video Request">
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason
            </label>
            <textarea
              id="reason"
              rows={4}
              required
              className="block w-full rounded-md border border-gray-300 p-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Explain why this request is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" isLoading={actionLoading}>Confirm Reject</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isMediaRejectModalOpen}
        onClose={() => setIsMediaRejectModalOpen(false)}
        title="Reject Fulfilment Media"
      >
        <form onSubmit={handleRejectFulfilmentMedia} className="space-y-4">
          <div>
            <label htmlFor="media-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason (required)
            </label>
            <textarea
              id="media-reason"
              rows={4}
              required
              className="block w-full rounded-md border border-gray-300 p-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="e.g. Wrong location, blurry, incomplete..."
              value={mediaRejectionReason}
              onChange={(e) => setMediaRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsMediaRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={mediaActionLoading}
              disabled={!mediaRejectionReason.trim()}
            >
              Confirm Reject Media
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
