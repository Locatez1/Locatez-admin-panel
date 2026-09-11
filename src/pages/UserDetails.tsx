import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getUserById, getUserWallet, getUserTransactions, getUserActivity } from "../api/users.api";
import { User, Wallet, WalletTransaction, AuditLog, TransactionType } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { CreateVideoRequestModal } from "../components/videoRequests/CreateVideoRequestModal";
import {
  ArrowLeft,
  Wallet as WalletIcon,
  Activity,
  User as UserIcon,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  AlertCircle,
  CreditCard,
  MapPin,
  Plus,
} from "lucide-react";

export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"profile" | "wallet" | "activity">("profile");

  // User State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);

  // Wallet State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Activity Logs State
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getUserById(id);
      setUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    if (!id) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      const walletRes = await getUserWallet(id);
      const w = walletRes.data as any;
      setWallet({
        id: w.id,
        userId: w.userId || id,
        balance: typeof w.balance === "number" ? w.balance : Number(w.availableBalance ?? 0),
        availableBalance: w.availableBalance,
        heldBalance: w.heldBalance,
        currency: w.currency || "INR",
        totalEarned: w.totalEarned,
        totalSpent: w.totalSpent,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      });

      const txRes = await getUserTransactions(id, { page: 1, limit: 100 });
      const txData = txRes.data as any;
      const txList = Array.isArray(txData) ? txData : (txData?.items || []);
      setTransactions(
        txList.map((t: any) => ({
          id: t.id,
          walletId: t.walletId,
          userId: t.userId || id,
          type: t.type,
          amount: Number(t.amount),
          balanceAfter: t.balanceAfter != null ? Number(t.balanceAfter) : undefined,
          currency: t.currency || "INR",
          description: t.description || "",
          status: t.status || "COMPLETED",
          referenceId: t.referenceId,
          referenceType: t.referenceType,
          createdAt: t.createdAt,
        }))
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Wallet API endpoint not available yet.";
      setWalletError(msg);
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchActivity = async () => {
    if (!id) return;
    setActivityLoading(true);
    setActivityError(null);
    try {
      const actRes = await getUserActivity(id);
      const actData = actRes.data as any;
      const actList = Array.isArray(actData) ? actData : (actData?.items || []);
      setActivities(actList);
    } catch (err: any) {
      setActivities([]);
      setActivityError(err.response?.data?.message || err.message || "Failed to fetch activity logs");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const userLat = useMemo(() => {
    const v = user?.profile?.latitude;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }, [user]);
  const userLng = useMemo(() => {
    const v = user?.profile?.longitude;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }, [user]);
  const hasLocation = userLat != null && userLng != null;

  useEffect(() => {
    if (!user || loading) return;
    if (searchParams.get("createRequest") === "1") {
      if (hasLocation) setIsCreateRequestOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("createRequest");
      setSearchParams(next, { replace: true });
    }
  }, [user, loading, hasLocation, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab === "wallet" && !wallet && !walletError) {
      fetchWallet();
    } else if (activeTab === "activity" && activities.length === 0 && !activityError && !activityLoading) {
      fetchActivity();
    }
  }, [activeTab, id]);

  const activeWallet = wallet;
  const rawTransactions = transactions;

  const filteredTransactions = rawTransactions.filter((tx) => {
    if (typeFilter && tx.type !== typeFilter) return false;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchRef = tx.referenceId?.toLowerCase().includes(q);
      const matchId = tx.id.toLowerCase().includes(q);
      if (!matchDesc && !matchRef && !matchId) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading user</h3>
        <p className="mt-2 text-sm text-red-700">{error || "User not found"}</p>
        <Link to="/users" className="mt-4 inline-block text-sm text-primary hover:underline">
          &larr; Back to users
        </Link>
      </div>
    );
  }

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case "CREDIT":
      case "REWARD":
      case "REFUND":
      case "DEPOSIT":
      case "RELEASE":
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800">{type}</Badge>;
      case "DEBIT":
      case "PAYOUT":
      case "WITHDRAWAL":
        return <Badge variant="danger" className="bg-rose-100 text-rose-800">{type}</Badge>;
      case "HOLD":
        return <Badge variant="warning" className="bg-amber-100 text-amber-800">{type}</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/users" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Users
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={user.status === "ACTIVE" ? "success" : user.status === "BLOCKED" ? "danger" : "warning"}>
            {user.status}
          </Badge>
          <Badge variant="info">{user.role}</Badge>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-gray-200 bg-white px-4 rounded-t-lg shadow-sm">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            User Profile
          </button>

          <button
            onClick={() => setActiveTab("wallet")}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "wallet"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <WalletIcon className="h-4 w-4" />
            Wallet Ledger
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "activity"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Activity className="h-4 w-4" />
            User Activity & Logs
          </button>
        </nav>
      </div>

      {/* TAB 1: User Profile */}
      {activeTab === "profile" && (
        <div className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">User Information</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and account status.</p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!hasLocation}
              onClick={() => setIsCreateRequestOpen(true)}
              title={
                hasLocation
                  ? "Create a request near this user"
                  : "User has no profile latitude/longitude yet"
              }
            >
              <Plus className="h-4 w-4" /> Create request nearby
            </Button>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">{user.username}</dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{user.email}</dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{user.phone || "Not provided"}</dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <Badge variant="info">{user.role}</Badge>
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Profile Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {user.isProfileComplete ? (
                    <Badge variant="success">COMPLETE</Badge>
                  ) : (
                    <Badge variant="warning">INCOMPLETE</Badge>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </span>
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {hasLocation ? (
                    <span>
                      {userLat}, {userLng}
                      {(user.profile?.city || user.profile?.addressLine1) && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {[user.profile?.addressLine1, user.profile?.city, user.profile?.state]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">No latitude/longitude on profile yet</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>
              {user.lastLoginAt && (
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {new Date(user.lastLoginAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      <CreateVideoRequestModal
        isOpen={isCreateRequestOpen}
        onClose={() => setIsCreateRequestOpen(false)}
        initialData={
          hasLocation
            ? {
                title: user.profile?.city
                  ? `Nearby request — ${user.profile.city}`
                  : `Nearby request for ${user.username}`,
                address: [user.profile?.addressLine1, user.profile?.city, user.profile?.state]
                  .filter(Boolean)
                  .join(", "),
                latitude: userLat!,
                longitude: userLng!,
              }
            : null
        }
      />

      {/* TAB 2: Wallet Ledger */}
      {activeTab === "wallet" && (
        <div className="space-y-6">
          {/* Notice if Backend wallet error */}
          {walletError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Wallet Data Status</h4>
                <p className="text-xs text-amber-700 mt-1">
                  {walletError}
                </p>
              </div>
            </div>
          )}

          {/* Wallet Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{(activeWallet?.balance || 0).toFixed(2)}
                </p>
                <span className="text-xs text-emerald-600 font-medium">Spendable</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-full border border-emerald-100">
                <WalletIcon className="h-6 w-6 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Held Balance</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  ₹{(activeWallet?.heldBalance || 0).toFixed(2)}
                </p>
                <span className="text-xs text-gray-500">Open request holds</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-full border border-amber-100">
                <CreditCard className="h-6 w-6 text-amber-600" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Credits</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{(activeWallet?.totalEarned || 0).toFixed(2)}
                </p>
                <span className="text-xs text-gray-500">Sum of CREDIT ledger</span>
              </div>
              <div className="p-3 bg-green-50 rounded-full border border-green-100">
                <ArrowDownRight className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Debits</p>
                <p className="text-2xl font-bold text-gray-700 mt-1">
                  ₹{(activeWallet?.totalSpent || 0).toFixed(2)}
                </p>
                <span className="text-xs text-gray-500">Sum of DEBIT ledger</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-full border border-rose-100">
                <ArrowUpRight className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Transaction Ledger History
                </h3>
                <p className="text-xs text-gray-500">Credits, Debits, Rewards, and Payouts for this user.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative shrink-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-48"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  <option value="">All Types</option>
                  <option value="CREDIT">CREDIT</option>
                  <option value="DEBIT">DEBIT</option>
                  <option value="HOLD">HOLD</option>
                  <option value="RELEASE">RELEASE</option>
                </select>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fetchWallet}
                  isLoading={walletLoading}
                  className="text-xs px-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {walletLoading ? (
              <div className="py-12 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-2 text-xs text-gray-500">Loading ledger data...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                No transactions recorded in wallet ledger.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tx ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Reference ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredTransactions.map((tx) => {
                      const isPositive = ["CREDIT", "REWARD", "REFUND", "DEPOSIT", "RELEASE"].includes(tx.type);
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-xs font-mono text-gray-800 font-semibold">{tx.id}</td>
                          <td className="px-4 py-3.5 text-xs">{getTransactionBadge(tx.type)}</td>
                          <td className={`px-4 py-3.5 text-xs font-semibold font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPositive ? "+" : "-"} ₹{Math.abs(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-700 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-gray-500">
                            {tx.referenceId ? (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] border border-gray-200">
                                {tx.referenceId}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <Badge variant={tx.status === "COMPLETED" ? "success" : tx.status === "FAILED" ? "danger" : "warning"}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Activity Logs */}
      {activeTab === "activity" && (
        <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                User Activity & Audit Trail
              </h3>
              <p className="text-xs text-gray-500">
                All audit events for this user (including logins). Same data as{" "}
                <code className="bg-gray-100 px-1 rounded text-[11px]">GET /audit-logs?userId=…</code>
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={fetchActivity} isLoading={activityLoading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {activityError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {activityError}
            </div>
          )}

          {activityLoading ? (
            <div className="py-12 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-2 text-xs text-gray-500">Loading activity logs...</p>
            </div>
          ) : activities.length === 0 && !activityError ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No recent audit activity logged for this user.
            </div>
          ) : activities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {activities.map((act) => {
                    const desc =
                      act.description ||
                      (typeof act.metadata?.description === "string"
                        ? act.metadata.description
                        : null);
                    return (
                      <tr key={act.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-medium text-gray-900 whitespace-nowrap">
                          {act.action}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600 max-w-md">
                          {desc || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600">
                          <div className="flex flex-col gap-0.5">
                            {act.entityType ? <Badge variant="info">{act.entityType}</Badge> : null}
                            {act.entityId ? (
                              <span className="font-mono text-[11px] text-gray-500 truncate max-w-[140px]">
                                {act.entityId}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(act.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
