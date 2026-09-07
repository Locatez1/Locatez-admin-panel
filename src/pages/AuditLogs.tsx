import React, { useEffect, useState } from "react";
import { getAuditLogs } from "../api/auditLogs.api";
import { AuditLog } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Modal } from "../components/common/Modal";
import { Eye, Info } from "lucide-react";

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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="APPROVE">APPROVE</option>
          <option value="REJECT">REJECT</option>
        </select>
        
        <input
          type="text"
          placeholder="Entity Type (e.g., USER)"
          className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(1);
          }}
        />
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
                    <button onClick={() => setSelectedLog(log)} className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-5 w-5" />
                    </button>
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
