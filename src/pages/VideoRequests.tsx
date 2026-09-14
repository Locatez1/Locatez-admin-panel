import React, { useEffect, useState } from "react";
import { getVideoRequests } from "../api/videoRequests.api";
import {
  listPendingFulfilmentMedia,
  type FulfilmentMediaSubmission,
} from "../api/fulfilmentMedia.api";
import { VideoRequest } from "../types";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { CreateVideoRequestModal } from "../components/videoRequests/CreateVideoRequestModal";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Eye, AlertTriangle, Plus, MessageSquare, Film, Filter } from "lucide-react";

export const VideoRequests: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingMedia, setPendingMedia] = useState<FulfilmentMediaSubmission[]>([]);
  const [pendingMediaLoading, setPendingMediaLoading] = useState(true);
  const [pendingMediaError, setPendingMediaError] = useState<string | null>(null);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const statusFilter = searchParams.get("status") || "";
  const limit = 10;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(newPage));
    setSearchParams(nextParams);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1");
    if (newStatus) {
      nextParams.set("status", newStatus);
    } else {
      nextParams.delete("status");
    }
    setSearchParams(nextParams);
  };

  const fetchPendingMedia = async () => {
    setPendingMediaLoading(true);
    setPendingMediaError(null);
    try {
      const { items } = await listPendingFulfilmentMedia(1, 20);
      setPendingMedia(items);
    } catch (err: any) {
      setPendingMediaError(
        err.response?.data?.message || err.message || "Failed to load pending fulfilment media"
      );
      setPendingMedia([]);
    } finally {
      setPendingMediaLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;

      const response = await getVideoRequests(params);
      const resData = response.data as any;
      setRequests(Array.isArray(resData) ? resData : resData?.items || []);
      setTotal(resData?.pagination?.total || resData?.meta?.total || 0);
      setTotalPages(resData?.pagination?.totalPages || resData?.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch video requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchPendingMedia();
  }, []);

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
    return req.requesterId || req.userId || "N/A";
  };

  const getFulfillerName = (req: VideoRequest) => {
    const named = getPartyName(req.fulfilment?.fulfiller);
    if (named) return named;
    return req.fulfilment?.fulfillerId || "—";
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return <Badge variant="warning">PENDING</Badge>;
      case "OPEN":
        return <Badge variant="info">OPEN</Badge>;
      case "ACCEPTED":
        return <Badge variant="blue">ACCEPTED</Badge>;
      case "ONGOING":
      case "IN_PROGRESS":
      case "FULFILMENT_PENDING":
      case "MODERATOR_APPROVAL_PENDING":
        return <Badge variant="ongoing">{status.replace(/_/g, " ")}</Badge>;
      case "COMPLETED":
      case "APPROVED":
      case "FULFILLED":
        return <Badge variant="success">{status}</Badge>;
      case "REJECTED":
      case "DECLINED":
        return <Badge variant="danger">{status}</Badge>;
      case "CANCELLED":
      case "EXPIRED":
        return <Badge variant="cancelled">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Video Requests</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-700">Manage and moderate video requests.</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" /> Create Request
        </Button>
      </div>

      <div className="overflow-hidden bg-white shadow-xs sm:rounded-xl border border-yellow-500/30">
        <div className="px-4 py-4 sm:px-6 border-b border-yellow-500/20 bg-yellow-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-yellow-900" />
            <div>
              <h2 className="text-base font-semibold text-yellow-900">
                Fulfilment media awaiting approval
              </h2>
              <p className="text-xs text-yellow-800">
                Submitted video/images when “Require approval for fulfilment media” is ON.
              </p>
            </div>
          </div>
          <Badge variant="warning">{pendingMedia.length} pending</Badge>
        </div>
        <div className="p-4">
          {pendingMediaError ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-900 border border-red-500/20">{pendingMediaError}</div>
          ) : pendingMediaLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : pendingMedia.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No fulfilment media waiting for review.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingMedia.map((item) => (
                <li
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.videoRequest?.title || "Video request"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      By {item.submittedBy?.name || item.submittedBy?.username || "fulfiller"}
                      {" · "}
                      {item.items?.length || 0} file(s)
                      {" · "}
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <Link
                    to={`/video-requests/${item.videoRequestId}#fulfilment-media-review`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-900 hover:text-black"
                  >
                    <Eye className="h-4 w-4" /> Review media
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status Filter Container & Tabs */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-neutral-700 text-xs font-semibold uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-500" />
            <span>Filter Status</span>
          </div>
          {statusFilter && (
            <button
              onClick={() => handleStatusFilterChange("")}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium transition cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Status Pill Tabs (Desktop / Scrollable Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: "All Statuses", value: "" },
            { label: "Pending", value: "PENDING" },
            { label: "Open", value: "OPEN" },
            { label: "Accepted", value: "ACCEPTED" },
            { label: "Ongoing", value: "ONGOING" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Rejected", value: "REJECTED" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((tab) => {
            const isActive = statusFilter.toUpperCase() === tab.value.toUpperCase() || (!statusFilter && !tab.value);
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusFilterChange(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-primary-500 text-white shadow-2xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-primary-100/60 hover:text-primary-900 border border-neutral-200/80"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                >
                  Title
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Category
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Requester
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Fulfiller
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Reward
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Created At
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="font-medium text-gray-900">{request.title}</div>
                    {request.isRestrictedArea && (
                      <div className="mt-1 flex items-center text-xs text-red-600 font-medium">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Restricted Area ({request.restrictedAreaType})
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {request.category?.name || "None"}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 max-w-[180px] truncate"
                    title={getRequesterName(request)}
                  >
                    {getRequesterName(request)}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 max-w-[180px] truncate"
                    title={getFulfillerName(request)}
                  >
                    {getFulfillerName(request)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    ₹{(request.rewardAmount || 0).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end gap-2.5">
                    <Link
                      to={`/video-requests/${request.id}${location.search}`}
                      className="text-primary hover:text-primary-dark"
                      title="View Request Details"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <Link
                      to={`/video-requests/${request.id}${location.search}#request-chat-audit`}
                      className="text-primary-700 hover:text-primary-900"
                      title="View Request Chat & Communication"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      <CreateVideoRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchRequests}
      />
    </div>
  );
};
