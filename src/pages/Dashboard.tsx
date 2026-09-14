import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats } from "../api/videoRequests.api";
import { getUsers } from "../api/users.api";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Video,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  BarChart3,
  ArrowRight,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../components/common/Badge";

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "metrics">("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, usersResponse] = await Promise.all([
          getStats(),
          getUsers({ limit: 1 }),
        ]);

        setStats(statsResponse.data);
        setUserStats({ total: usersResponse.meta.total });
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 border border-red-200">
        <h3 className="text-sm font-semibold text-red-800">Error loading dashboard</h3>
        <p className="mt-1 text-xs sm:text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Users",
      value: userStats?.total || 0,
      icon: UsersIcon,
      color: "text-primary-700",
      bg: "bg-primary-100 border-primary-300/40",
      link: "/users",
      badge: "Accounts",
    },
    {
      name: "Pending Requests",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-yellow-900",
      bg: "bg-yellow-50 border-yellow-500/30",
      link: "/video-requests",
      badge: "Needs Review",
    },
    {
      name: "Open Requests",
      value: stats?.open || 0,
      icon: Video,
      color: "text-primary-600",
      bg: "bg-primary-100 border-primary-300/40",
      link: "/video-requests",
      badge: "Active Feed",
    },
    {
      name: "In Progress",
      value: stats?.inProgress || 0,
      icon: Activity,
      color: "text-primary-800",
      bg: "bg-primary-200 border-primary-300/50",
      link: "/video-requests",
      badge: "Ongoing",
    },
    {
      name: "Completed",
      value: stats?.completed || 0,
      icon: CheckCircle,
      color: "text-green-900",
      bg: "bg-green-50 border-green-500/30",
      link: "/video-requests",
      badge: "Fulfilled",
    },
    {
      name: "Rejected",
      value: stats?.rejected || 0,
      icon: AlertCircle,
      color: "text-red-900",
      bg: "bg-red-50 border-red-500/30",
      link: "/video-requests",
      badge: "Declined",
    },
  ];

  const totalRequests =
    (stats?.pending || 0) +
    (stats?.open || 0) +
    (stats?.inProgress || 0) +
    (stats?.completed || 0) +
    (stats?.rejected || 0);

  const additionalMetrics = stats
    ? Object.entries(stats).filter(
        ([k]) => !["pending", "open", "completed", "rejected", "inProgress"].includes(k)
      )
    : [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary-500 flex-shrink-0" />
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Platform overview, video request metrics, and system analytics.
          </p>
        </div>
      </div>

      {/* Responsive Tab Navigation Bar */}
      <div className="border-b border-neutral-200 pb-1">
        <nav className="flex space-x-1.5 sm:space-x-3 overflow-x-auto scrollbar-none py-1 min-w-max" aria-label="Dashboard View Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-primary-500 text-white shadow-xs"
                : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-primary-500 text-white shadow-xs"
                : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200"
            }`}
          >
            <Video className="h-4 w-4" />
            Video Requests ({totalRequests})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("metrics")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeTab === "metrics"
                ? "bg-primary-500 text-white shadow-xs"
                : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            System Metrics ({additionalMetrics.length})
          </button>
        </nav>
      </div>

      {/* Tab Content 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {statCards.map((card) => (
              <Link
                key={card.name}
                to={card.link}
                className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-2xs border border-neutral-200/90 hover:border-primary-300 hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${card.bg}`}
                    >
                      <card.icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                      {card.value}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 truncate mt-0.5">
                      {card.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Request Distribution Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-500" />
                <h3 className="text-sm font-bold text-neutral-900">Request Distribution</h3>
              </div>
              <Link
                to="/video-requests"
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
              >
                Manage Requests &rarr;
              </Link>
            </div>

            {totalRequests > 0 ? (
              <>
                <div className="h-2.5 w-full rounded-full bg-neutral-100 flex overflow-hidden">
                  <div
                    style={{ width: `${((stats?.pending || 0) / totalRequests) * 100}%` }}
                    className="bg-yellow-500 transition-all duration-300"
                    title={`Pending: ${stats?.pending || 0}`}
                  />
                  <div
                    style={{ width: `${((stats?.open || 0) / totalRequests) * 100}%` }}
                    className="bg-primary-500 transition-all duration-300"
                    title={`Open: ${stats?.open || 0}`}
                  />
                  <div
                    style={{ width: `${((stats?.inProgress || 0) / totalRequests) * 100}%` }}
                    className="bg-primary-700 transition-all duration-300"
                    title={`In Progress: ${stats?.inProgress || 0}`}
                  />
                  <div
                    style={{ width: `${((stats?.completed || 0) / totalRequests) * 100}%` }}
                    className="bg-green-500 transition-all duration-300"
                    title={`Completed: ${stats?.completed || 0}`}
                  />
                  <div
                    style={{ width: `${((stats?.rejected || 0) / totalRequests) * 100}%` }}
                    className="bg-red-500 transition-all duration-300"
                    title={`Rejected: ${stats?.rejected || 0}`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                    <span>Pending: <strong>{stats?.pending || 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
                    <span>Open: <strong>{stats?.open || 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="h-2 w-2 rounded-full bg-primary-700 shrink-0" />
                    <span>Ongoing: <strong>{stats?.inProgress || 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span>Completed: <strong>{stats?.completed || 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <span>Rejected: <strong>{stats?.rejected || 0}</strong></span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500 italic">No video request data recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Video Request Metrics */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/90 shadow-2xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-primary-500" />
              Video Request Lifecycle Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50/60 flex items-start justify-between">
                <div>
                  <Badge variant="warning">PENDING</Badge>
                  <p className="text-2xl font-bold text-yellow-900 mt-2">{stats?.pending || 0}</p>
                  <p className="text-xs text-yellow-800 mt-1">Awaiting admin review</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>

              <div className="p-4 rounded-lg border border-primary-200 bg-primary-50/60 flex items-start justify-between">
                <div>
                  <Badge variant="info">OPEN</Badge>
                  <p className="text-2xl font-bold text-primary-900 mt-2">{stats?.open || 0}</p>
                  <p className="text-xs text-primary-700 mt-1">Available for creators</p>
                </div>
                <Video className="h-6 w-6 text-primary-600" />
              </div>

              <div className="p-4 rounded-lg border border-primary-300 bg-primary-100/60 flex items-start justify-between">
                <div>
                  <Badge variant="ongoing">ONGOING</Badge>
                  <p className="text-2xl font-bold text-primary-900 mt-2">{stats?.inProgress || 0}</p>
                  <p className="text-xs text-primary-800 mt-1">Fulfiller currently recording</p>
                </div>
                <Activity className="h-6 w-6 text-primary-700" />
              </div>

              <div className="p-4 rounded-lg border border-green-200 bg-green-50/60 flex items-start justify-between">
                <div>
                  <Badge variant="success">COMPLETED</Badge>
                  <p className="text-2xl font-bold text-green-900 mt-2">{stats?.completed || 0}</p>
                  <p className="text-xs text-green-800 mt-1">Approved & paid out</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>

              <div className="p-4 rounded-lg border border-red-200 bg-red-50/60 flex items-start justify-between">
                <div>
                  <Badge variant="danger">REJECTED</Badge>
                  <p className="text-2xl font-bold text-red-900 mt-2">{stats?.rejected || 0}</p>
                  <p className="text-xs text-red-800 mt-1">Declined or expired</p>
                </div>
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: System & Additional Metrics */}
      {activeTab === "metrics" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/90 shadow-2xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary-500" />
              System Metrics & Custom Counters
            </h3>
            {additionalMetrics.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {additionalMetrics.map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-neutral-50 px-4 py-3 rounded-lg border border-neutral-200 flex flex-col justify-between"
                  >
                    <dt className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </dt>
                    <dd className="mt-2 text-xl font-bold text-neutral-900">{String(value)}</dd>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-neutral-500 text-xs italic">
                No additional custom system metrics reported by backend.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
