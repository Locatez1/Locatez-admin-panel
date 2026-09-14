import React, { useEffect, useState } from "react";
import { getAuditLogs } from "../api/auditLogs.api";
import { AuditLog } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Modal } from "../components/common/Modal";
import { CustomSelect } from "../components/common/CustomSelect";
import { Eye, Info, Filter, X, RotateCcw, Layers } from "lucide-react";

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const debouncedEntityTypeFilter = useDebounce(entityTypeFilter, 400);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (actionFilter) params.action = actionFilter;
      if (debouncedEntityTypeFilter) params.entityType = debouncedEntityTypeFilter;

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
  }, [page, limit, actionFilter, debouncedEntityTypeFilter]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-700">Track activities and changes across the platform.</p>
        </div>
      </div>

      {/* Styled Filter Container */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-500" />
            <span>Audit Trail Filters</span>
            {(actionFilter || entityTypeFilter) && (
              <span className="bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary-200">
                Active
              </span>
            )}
          </div>
          {(actionFilter || entityTypeFilter) && (
            <button
              type="button"
              onClick={() => {
                setActionFilter("");
                setEntityTypeFilter("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-semibold transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Action Filter Dropdown */}
          <div className="md:col-span-5">
            <CustomSelect
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              placeholder="All Actions"
              options={[
                { label: "All Actions", value: "" },
                { label: "CREATE", value: "CREATE" },
                { label: "UPDATE", value: "UPDATE" },
                { label: "DELETE", value: "DELETE" },
                { label: "LOGIN", value: "LOGIN" },
                { label: "APPROVE", value: "APPROVE" },
                { label: "REJECT", value: "REJECT" },
              ]}
            />
          </div>

          {/* Entity Type Input */}
          <div className="relative md:col-span-7">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Layers className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Filter by Entity Type (e.g. USER, VIDEO_REQUEST)..."
              className="block w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-8 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-neutral-50/50 hover:bg-white focus:bg-white transition"
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
            />
            {entityTypeFilter && (
              <button
                type="button"
                onClick={() => {
                  setEntityTypeFilter("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mr-1">Action:</span>
          {["", "CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE", "REJECT"].map((act) => {
            const isActive = actionFilter.toUpperCase() === act.toUpperCase();
            return (
              <button
                key={act || "ALL"}
                type="button"
                onClick={() => {
                  setActionFilter(act);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary-500 text-white shadow-2xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200/60"
                }`}
              >
                {act || "All Actions"}
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
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Action</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actor</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Entity</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <Badge variant="default" className="font-mono">{log.action}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {log.actor ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{log.actor.username}</span>
                          <span className="text-xs text-gray-500">{log.actor.role}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">{log.userId}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className="font-semibold">{log.entityType}</span> 
                      <span className="text-xs ml-1 text-gray-400">({log.entityId})</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button onClick={() => setSelectedLog(log)} className="text-primary hover:text-primary-dark">
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

      {/* Metadata Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Log Details">
        {selectedLog && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Basic Info</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Action:</dt>
                <dd className="font-mono font-medium">{selectedLog.action}</dd>
                <dt className="text-gray-500">Actor ID:</dt>
                <dd>{selectedLog.userId}</dd>
                <dt className="text-gray-500">Entity Type:</dt>
                <dd>{selectedLog.entityType}</dd>
                <dt className="text-gray-500">Entity ID:</dt>
                <dd>{selectedLog.entityId}</dd>
                <dt className="text-gray-500">Timestamp:</dt>
                <dd>{new Date(selectedLog.createdAt).toLocaleString()}</dd>
              </dl>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Metadata Payload</h4>
              </div>
              <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
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
