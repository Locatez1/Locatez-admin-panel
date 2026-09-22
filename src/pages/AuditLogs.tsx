import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuditLogs } from "../api/auditLogs.api";
import { AuditLog } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Modal } from "../components/common/Modal";
import { CustomSelect } from "../components/common/CustomSelect";
import { Eye, Info, Filter, X, RotateCcw, Layers, Search, Film, User, ExternalLink, ShoppingBag, Tag } from "lucide-react";

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Helper to extract Video Request ID from log entity or metadata
  const getVideoRequestId = (log: AuditLog): string | null => {
    if (log.metadata?.videoRequestId) return String(log.metadata.videoRequestId);
    if (log.metadata?.requestId) return String(log.metadata.requestId);
    const entityTypeUpper = (log.entityType || "").toUpperCase();
    if (entityTypeUpper === "VIDEO_REQUEST" && log.entityId) return String(log.entityId);
    if (log.action?.toUpperCase().includes("VIDEO_REQUEST") && log.entityId) return String(log.entityId);
    return null;
  };

  // Helper to extract User ID from log entity or metadata
  const getUserId = (log: AuditLog): string | null => {
    if (log.metadata?.targetUserId) return String(log.metadata.targetUserId);
    if (log.metadata?.userId) return String(log.metadata.userId);
    if (log.actor?.id) return String(log.actor.id);
    if (log.actorId) return String(log.actorId);
    const entityTypeLower = (log.entityType || "").toLowerCase();
    if (entityTypeLower === "user" && log.entityId) return String(log.entityId);
    return null;
  };

  const renderEntityLink = (log: AuditLog) => {
    const entityTypeUpper = (log.entityType || "").toUpperCase();
    const videoReqId = getVideoRequestId(log);
    const userId = getUserId(log);

    if (videoReqId) {
      const isChat = entityTypeUpper === "CHAT_ROOM" || log.action?.includes("CHAT");
      const isMedia = entityTypeUpper === "FULFILMENT_MEDIA";
      const hash = isChat ? "#request-chat-audit" : isMedia ? "#fulfilment-media-review" : "";

      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-neutral-800">{log.entityType}</span>
          <Link
            to={`/video-requests/${videoReqId}${hash}`}
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary-600 hover:text-primary-800 hover:underline bg-primary-50 px-2 py-0.5 rounded border border-primary-200 transition"
            title={`Open Video Request Details (${videoReqId})`}
          >
            <Film className="h-3 w-3 text-primary-500" />
            <span>{log.entityId || videoReqId.slice(0, 8)}</span>
            <ExternalLink className="h-2.5 w-2.5 text-primary-400" />
          </Link>
        </div>
      );
    }

    if (entityTypeUpper === "USER" || (userId && entityTypeUpper === "USER")) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-neutral-800">{log.entityType}</span>
          <Link
            to={`/users/${userId || log.entityId}`}
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition"
            title={`Open User Profile (${userId || log.entityId})`}
          >
            <User className="h-3 w-3 text-blue-500" />
            <span>{log.entityId || userId?.slice(0, 8)}</span>
            <ExternalLink className="h-2.5 w-2.5 text-blue-400" />
          </Link>
        </div>
      );
    }

    if (entityTypeUpper === "MARKETPLACE_STREAM" || entityTypeUpper === "MARKETPLACE_PURCHASE") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-neutral-800">{log.entityType}</span>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition"
            title="Open Marketplace Feed"
          >
            <ShoppingBag className="h-3 w-3 text-indigo-500" />
            <span>{log.entityId ? log.entityId.slice(0, 8) : "Marketplace"}</span>
            <ExternalLink className="h-2.5 w-2.5 text-indigo-400" />
          </Link>
        </div>
      );
    }

    if (entityTypeUpper === "CATEGORY" || entityTypeUpper === "CATEGORY_SUGGESTION") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-neutral-800">{log.entityType}</span>
          <Link
            to="/categories"
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-purple-600 hover:text-purple-800 hover:underline bg-purple-50 px-2 py-0.5 rounded border border-purple-200 transition"
            title="Open Category Management"
          >
            <Tag className="h-3 w-3 text-purple-500" />
            <span>{log.entityId || "Categories"}</span>
            <ExternalLink className="h-2.5 w-2.5 text-purple-400" />
          </Link>
        </div>
      );
    }

    // Default Entity rendering
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-neutral-800">{log.entityType}</span>
        {log.entityId && <span className="text-xs font-mono text-gray-400">({log.entityId})</span>}
      </div>
    );
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;

      const response = await getAuditLogs(params);
      setLogs(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, debouncedSearch, actionFilter, entityTypeFilter]);

  const hasActiveFilters = Boolean(search || actionFilter || entityTypeFilter);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-700">
            Track activities and changes across the platform.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-500" />
            <span>Audit Trail Filters</span>
            {hasActiveFilters && (
              <span className="bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary-200">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActionFilter("");
                setEntityTypeFilter("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-semibold transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="relative md:col-span-5">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search actor (name, username, email)…"
              className="block w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-8 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-neutral-50/50 hover:bg-white focus:bg-white transition"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <CustomSelect
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              placeholder="All Actions"
              options={[
                { label: "All Actions", value: "" },
                { label: "LOGIN", value: "LOGIN" },
                { label: "REGISTER", value: "REGISTER" },
                { label: "VIDEO_REQUEST_CREATED", value: "VIDEO_REQUEST_CREATED" },
                { label: "VIDEO_REQUEST_ACCEPTED", value: "VIDEO_REQUEST_ACCEPTED" },
                { label: "VIDEO_REQUEST_COMPLETED", value: "VIDEO_REQUEST_COMPLETED" },
                { label: "SYSTEM_SETTING_UPDATED", value: "SYSTEM_SETTING_UPDATED" },
              ]}
            />
          </div>

          <div className="md:col-span-4">
            <CustomSelect
              value={entityTypeFilter}
              onChange={(val) => {
                setEntityTypeFilter(val);
                setPage(1);
              }}
              placeholder="All Entity Types"
              icon={<Layers className="h-4 w-4" />}
              options={[
                { label: "All Entity Types", value: "" },
                { label: "VIDEO_REQUEST", value: "VIDEO_REQUEST" },
                { label: "FULFILMENT_MEDIA", value: "FULFILMENT_MEDIA" },
                { label: "MARKETPLACE_STREAM", value: "MARKETPLACE_STREAM" },
                { label: "CHAT_ROOM", value: "CHAT_ROOM" },
                { label: "WALLET", value: "WALLET" },
                { label: "user", value: "user" },
                { label: "system_setting", value: "system_setting" },
                { label: "CATEGORY_SUGGESTION", value: "CATEGORY_SUGGESTION" },
                { label: "payout", value: "payout" },
                { label: "service_area_config", value: "service_area_config" },
                { label: "restricted_poi_category", value: "restricted_poi_category" },
              ]}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading audit logs…</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs py-16 text-center text-sm text-gray-500">
          No audit logs found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    Action
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Actor
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Entity
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Created At
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <Badge variant="default" className="font-mono">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {log.actor ? (
                        <Link
                          to={`/users/${log.actor.id || log.actorId}`}
                          className="group flex flex-col"
                        >
                          <span className="font-semibold text-primary-600 group-hover:text-primary-800 group-hover:underline">
                            {(log.actor as { fullName?: string | null }).fullName ||
                              log.actor.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            @{log.actor.username}
                            {log.actor.role ? ` · ${log.actor.role}` : ""}
                          </span>
                        </Link>
                      ) : log.actorId ? (
                        <Link
                          to={`/users/${log.actorId}`}
                          className="font-mono text-xs text-primary-600 hover:underline"
                        >
                          {log.actorId}
                        </Link>
                      ) : (
                        <span className="text-gray-400">{log.userId || "System"}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {renderEntityLink(log)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary-dark"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Log Details">
        {selectedLog && (
          <div className="space-y-4">
            {/* Quick Navigation Bar */}
            {(getVideoRequestId(selectedLog) || getUserId(selectedLog)) && (
              <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Quick Links:</span>
                {getVideoRequestId(selectedLog) && (
                  <Link
                    to={`/video-requests/${getVideoRequestId(selectedLog)}`}
                    onClick={() => setSelectedLog(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition cursor-pointer"
                  >
                    <Film className="h-4 w-4" /> Open Video Request ({getVideoRequestId(selectedLog)?.slice(0, 8)}) <ExternalLink className="h-3 w-3 opacity-75" />
                  </Link>
                )}
                {getUserId(selectedLog) && (
                  <Link
                    to={`/users/${getUserId(selectedLog)}`}
                    onClick={() => setSelectedLog(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition cursor-pointer"
                  >
                    <User className="h-4 w-4" /> View User Profile ({getUserId(selectedLog)?.slice(0, 8)}) <ExternalLink className="h-3 w-3 opacity-75" />
                  </Link>
                )}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Basic Info
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Action:</dt>
                <dd className="font-mono font-medium">{selectedLog.action}</dd>
                <dt className="text-gray-500">Actor:</dt>
                <dd>
                  {getUserId(selectedLog) ? (
                    <Link
                      to={`/users/${getUserId(selectedLog)}`}
                      onClick={() => setSelectedLog(null)}
                      className="font-semibold text-primary-600 hover:underline inline-flex items-center gap-1"
                    >
                      <User className="h-3.5 w-3.5 text-primary-500" />
                      {selectedLog.actor
                        ? `${(selectedLog.actor as { fullName?: string | null }).fullName || selectedLog.actor.username} (@${selectedLog.actor.username})`
                        : getUserId(selectedLog)}
                    </Link>
                  ) : (
                    "System"
                  )}
                </dd>
                <dt className="text-gray-500">Entity Type:</dt>
                <dd className="font-semibold">{selectedLog.entityType}</dd>
                <dt className="text-gray-500">Entity ID:</dt>
                <dd>
                  {getVideoRequestId(selectedLog) ? (
                    <Link
                      to={`/video-requests/${getVideoRequestId(selectedLog)}`}
                      onClick={() => setSelectedLog(null)}
                      className="font-mono font-semibold text-primary-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Film className="h-3.5 w-3.5 text-primary-500" />
                      {selectedLog.entityId}
                    </Link>
                  ) : (
                    <span className="font-mono">{selectedLog.entityId || "N/A"}</span>
                  )}
                </dd>
                <dt className="text-gray-500">Timestamp:</dt>
                <dd>{new Date(selectedLog.createdAt).toLocaleString()}</dd>
              </dl>
            </div>

            <div className="bg-gray-900 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Metadata Payload
                </h4>
              </div>
              <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap font-mono">
                {selectedLog.metadata
                  ? JSON.stringify(selectedLog.metadata, null, 2)
                  : "No metadata attached"}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
