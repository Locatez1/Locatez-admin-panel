import React, { useEffect, useState } from "react";
import { getStats } from "../api/videoRequests.api";
import { getUsers } from "../api/users.api";
import { Activity, Users as UsersIcon, Video, CheckCircle, Clock, AlertCircle } from "lucide-react";

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, usersResponse] = await Promise.all([
          getStats(),
          getUsers({ limit: 1 }) // Just to get total users, if backend provides total
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const statCards = [
    { name: "Total Users", value: userStats?.total || 0, icon: UsersIcon, color: "text-primary-700", bg: "bg-primary-100 border-primary-300/40" },
    { name: "Pending Requests", value: stats?.pending || 0, icon: Clock, color: "text-yellow-900", bg: "bg-yellow-50 border-yellow-500/30" },
    { name: "Open Requests", value: stats?.open || 0, icon: Video, color: "text-primary-600", bg: "bg-primary-100 border-primary-300/40" },
    { name: "Completed", value: stats?.completed || 0, icon: CheckCircle, color: "text-green-900", bg: "bg-green-50 border-green-500/30" },
    { name: "Rejected", value: stats?.rejected || 0, icon: AlertCircle, color: "text-red-900", bg: "bg-red-50 border-red-500/30" },
    { name: "In Progress", value: stats?.inProgress || 0, icon: Activity, color: "text-primary-800", bg: "bg-primary-200 border-primary-300/50" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview, video request metrics, and user analytics.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.name} className="overflow-hidden rounded-xl bg-white shadow-xs border border-gray-200 hover:shadow-md transition duration-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${card.bg}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-xs font-semibold uppercase tracking-wider text-gray-500">{card.name}</dt>
                    <dd>
                      <div className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Other stats section */}
      {stats && Object.entries(stats).filter(([k]) => !['pending', 'open', 'completed', 'rejected', 'inProgress'].includes(k)).length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-xs border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Additional Metrics</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(stats)
                .filter(([k]) => !['pending', 'open', 'completed', 'rejected', 'inProgress'].includes(k))
                .map(([key, value]) => (
                  <div key={key} className="bg-neutral-50 px-4 py-3 rounded-lg border border-neutral-200">
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{key}</dt>
                    <dd className="mt-1 text-xl font-bold text-gray-900">{String(value)}</dd>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
