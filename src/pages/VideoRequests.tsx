import React, { useEffect, useState } from "react";
import { getVideoRequests } from "../api/videoRequests.api";
import { VideoRequest } from "../types";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { CreateVideoRequestModal } from "../components/videoRequests/CreateVideoRequestModal";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Eye, AlertTriangle, Plus, MessageSquare } from "lucide-react";

export const VideoRequests: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // URL Search Parameter Driven Pagination & Filters
  const page = parseInt(searchParams.get("page") || "1", 10);
  const statusFilter = searchParams.get("status") || "";
  const limit = 10;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Create Video Request Modal State
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

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;

      const response = await getVideoRequests(params);
      const resData = response.data as any;
      setRequests(Array.isArray(resData) ? resData : (resData?.items || []));
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
    switch (status) {
      case "PENDING": return <Badge variant="warning">PENDING</Badge>;
      case "OPEN": return <Badge variant="info">OPEN</Badge>;
      case "ACCEPTED": return <Badge variant="info" className="bg-blue-100 text-blue-800">ACCEPTED</Badge>;
      case "COMPLETED": return <Badge variant="success">COMPLETED</Badge>;
      case "REJECTED": return <Badge variant="danger">REJECTED</Badge>;
      case "CANCELLED": return <Badge variant="default">CANCELLED</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Video Requests</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-700">Manage and moderate video requests.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="self-start sm:self-auto flex items-center gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Create Video Request
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="OPEN">OPEN</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
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
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Title</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Requester</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fulfiller</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reward</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
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
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 max-w-[180px] truncate" title={getRequesterName(request)}>
                    {getRequesterName(request)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 max-w-[180px] truncate" title={getFulfillerName(request)}>
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
                      className="text-blue-600 hover:text-blue-900"
                      title="View Request Details"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <Link
                      to={`/video-requests/${request.id}${location.search}#request-chat-audit`}
                      className="text-indigo-600 hover:text-indigo-900"
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

      {/* Reusable Create Video Request Modal */}
      <CreateVideoRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchRequests}
      />
    </div>
  );
};

