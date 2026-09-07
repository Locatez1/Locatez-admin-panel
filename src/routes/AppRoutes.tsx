import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { Login } from "../pages/Login";
import { Dashboard } from "../pages/Dashboard";
import { Users } from "../pages/Users";
import { UserDetails } from "../pages/UserDetails";
import { VideoRequests } from "../pages/VideoRequests";
import { VideoRequestDetails } from "../pages/VideoRequestDetails";
import { Categories } from "../pages/Categories";
import { Ideas } from "../pages/Ideas";
import { PopularPlacesFeed } from "../pages/PopularPlacesFeed";
import { AdminPopularPlaces } from "../pages/AdminPopularPlaces";
import { AuditLogs } from "../pages/AuditLogs";
import { Settings } from "../pages/Settings";
import { LocationRestrictions } from "../pages/LocationRestrictions";
import { Marketplace } from "../pages/Marketplace";
import { Unauthorized } from "../pages/Unauthorized";
import { LiveKitChatDemo } from "../pages/LiveKitChatDemo";
import { useAuth } from "../context/AuthContext";

const HomeRedirect: React.FC = () => {
  const { role } = useAuth();
  if (role === "USER") {
    return <Navigate to="/popular-places" replace />;
  }
  return <Dashboard />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Routes accessible to ALL roles including USER */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MODERATOR", "SUPERADMIN", "USER"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/popular-places" element={<PopularPlacesFeed />} />
          <Route path="/chat-demo" element={<LiveKitChatDemo />} />
        </Route>
      </Route>

      {/* Admin/Moderator-only routes */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MODERATOR", "SUPERADMIN"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<UserDetails />} />
          <Route path="/video-requests" element={<VideoRequests />} />
          <Route path="/video-requests/:id" element={<VideoRequestDetails />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/admin/ideas" element={<Ideas />} />
          <Route path="/popular-places-admin" element={<Navigate to="/admin/popular-places" replace />} />
          <Route path="/admin/popular-places" element={<AdminPopularPlaces />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/location-restrictions" element={<LocationRestrictions />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
