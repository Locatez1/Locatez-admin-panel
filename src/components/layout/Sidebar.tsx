import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Video, Tag, Compass, ShieldAlert, MessageSquare, Settings, Store, Lightbulb, MapPin, HelpCircle, Bell } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { role } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Popular Places Feed", path: "/popular-places", icon: Compass, roles: ["ADMIN", "MODERATOR", "SUPERADMIN", "USER"], hidden: true },
    { name: "Users", path: "/users", icon: Users, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Video Requests", path: "/video-requests", icon: Video, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Marketplace VOD", path: "/marketplace", icon: Store, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Categories", path: "/categories", icon: Tag, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Ideas", path: "/admin/ideas", icon: Lightbulb, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "FAQs", path: "/admin/faqs", icon: HelpCircle, roles: ["ADMIN", "SUPERADMIN"] },
    { name: "Broadcast", path: "/admin/broadcast", icon: Bell, roles: ["ADMIN", "SUPERADMIN"] },
    { name: "Popular Places (Admin)", path: "/admin/popular-places", icon: Compass, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Location Restrictions", path: "/location-restrictions", icon: MapPin, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Audit Logs", path: "/audit-logs", icon: ShieldAlert, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "Admin Settings", path: "/settings", icon: Settings, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"] },
    { name: "LiveKit Chat Demo", path: "/chat-demo", icon: MessageSquare, roles: ["ADMIN", "MODERATOR", "SUPERADMIN"], hidden: true },
  ];

  const filteredNav = navItems.filter((item) => !item.hidden && role && item.roles.includes(role));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={clsx(
          "flex w-64 flex-col bg-white border-r border-neutral-200 transition-transform duration-300 ease-in-out z-50",
          "fixed inset-y-0 left-0 md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          <h1 className="text-xl font-bold text-primary-500">Locatez Admin</h1>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-neutral-500 hover:text-neutral-700 focus:outline-none"
            >
              &times;
            </button>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary-100 text-primary-900 font-semibold shadow-xs"
                    : "text-neutral-600 hover:bg-primary-100/50 hover:text-primary-900"
                )}
              >
                <item.icon
                  className={clsx(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary-700" : "text-neutral-400 group-hover:text-primary-600"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

