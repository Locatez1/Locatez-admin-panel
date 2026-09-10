import React, { useEffect, useState } from "react";
import { getUsers, createUser, updateUserStatus, deleteUser } from "../api/users.api";
import { User, UserStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { Link } from "react-router-dom";
import { Search, Eye, Trash2, Ban, CheckCircle, AlertTriangle, MapPin } from "lucide-react";

export const Users: React.FC = () => {
  const { role: currentUserRole } = useAuth();
  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "SUPERADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionStatus, setActionStatus] = useState<UserStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ username: "", email: "", password: "", role: "USER" });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await getUsers(params);
      setUsers(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, debouncedSearch, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);
    try {
      await createUser(formData);
      setIsCreateModalOpen(false);
      setFormData({ username: "", email: "", password: "", role: "USER" });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedUser || !actionStatus) return;
    setActionLoading(true);
    try {
      await updateUserStatus(selectedUser.id, actionStatus);
      setIsStatusModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE": return <Badge variant="success">ACTIVE</Badge>;
      case "BLOCKED": return <Badge variant="danger">BLOCKED</Badge>;
      case "SUSPENDED": return <Badge variant="warning">SUSPENDED</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-700">A list of all users in the platform.</p>
        </div>
        {isAdmin && (
          <div className="self-start sm:self-auto">
            <Button onClick={() => setIsCreateModalOpen(true)}>Add user</Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          <option value="USER">USER</option>
          <option value="MODERATOR">MODERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select
          className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="SUSPENDED">SUSPENDED</option>
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
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">User</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <Badge variant="info">{user.role}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-2">
                      <Link to={`/users/${user.id}`} className="text-blue-600 hover:text-blue-900" title="View">
                        <Eye className="h-5 w-5" />
                      </Link>
                      {typeof user.profile?.latitude === "number" &&
                        typeof user.profile?.longitude === "number" && (
                          <Link
                            to={`/users/${user.id}?createRequest=1`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Create request near this user"
                          >
                            <MapPin className="h-5 w-5" />
                          </Link>
                        )}
                      {isAdmin && (
                        <>
                          {user.status !== "ACTIVE" ? (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionStatus("ACTIVE");
                                setIsStatusModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Activate"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionStatus("BLOCKED");
                                setIsStatusModalOpen(true);
                              }}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Block"
                            >
                              <Ban className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
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

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{formError}</div>}
          <Input label="Username" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
          <Input label="Email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Password" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="USER">USER</option>
              <option value="MODERATOR">MODERATOR</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={actionLoading}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Confirm Status Change">
        <p className="text-sm text-gray-500">
          Are you sure you want to change the status of {selectedUser?.username} to <span className="font-bold">{actionStatus}</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleStatusChange} isLoading={actionLoading}>Confirm</Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete User">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertTriangle className="h-6 w-6" />
          <h4 className="text-lg font-medium">Warning: Destructive Action</h4>
        </div>
        <p className="text-sm text-gray-500">
          Are you sure you want to permanently delete {selectedUser?.username}? This action cannot be undone and will remove all their data.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteUser} isLoading={actionLoading}>Delete User</Button>
        </div>
      </Modal>
    </div>
  );
};
