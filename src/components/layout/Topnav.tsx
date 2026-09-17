import React from "react";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

interface TopnavProps {
  onToggleSidebar?: () => void;
}

export const Topnav: React.FC<TopnavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getFirstName = (u: any) => {
    if (!u) return "User";
    if (u.firstName) return u.firstName;
    const name = u.fullName || u.profile?.fullName || u.displayName || u.name || u.username || "";
    if (name) {
      const first = name.split(/[\s_]+/)[0];
      if (first) return first.charAt(0).toUpperCase() + first.slice(1);
    }
    if (u.email) {
      const emailPrefix = u.email.split("@")[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return "User";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <span className="font-bold text-primary-500 text-lg md:hidden">Locatez</span>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <Link
          to="/profile"
          className="flex flex-col items-end rounded-md px-2 py-1 hover:bg-neutral-50 transition"
          title="My profile"
        >
          <span className="text-sm font-semibold text-neutral-900">{getFirstName(user)}</span>
          <span className="text-[11px] text-neutral-400">View profile</span>
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-full bg-white p-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition"
          title="Log out"
        >
          <span className="sr-only">Log out</span>
          <LogOut className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
