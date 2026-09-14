import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "danger" | "warning" | "info" | "blue" | "purple" | "ongoing" | "cancelled" | "inactive" | "default";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className }) => {
  const variants = {
    success: "bg-green-50 text-green-900 border border-green-500/30 font-semibold shadow-2xs",
    danger: "bg-red-50 text-red-900 border border-red-500/30 font-semibold shadow-2xs",
    warning: "bg-yellow-50 text-yellow-900 border border-yellow-500/30 font-semibold shadow-2xs",
    info: "bg-primary-100 text-primary-900 border border-primary-500/30 font-semibold shadow-2xs",
    blue: "bg-sky-50 text-sky-900 border border-sky-300 font-semibold shadow-2xs",
    purple: "bg-purple-50 text-purple-900 border border-purple-300 font-semibold shadow-2xs",
    ongoing: "bg-cyan-50 text-cyan-900 border border-cyan-300 font-semibold shadow-2xs",
    cancelled: "bg-rose-50 text-rose-800 border border-rose-200 font-semibold shadow-2xs",
    inactive: "bg-slate-100 text-slate-700 border border-slate-300 font-semibold shadow-2xs",
    default: "bg-neutral-100 text-neutral-800 border border-neutral-300 font-semibold",
  };

  return (
    <span
      className={twMerge(
        clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)
      )}
    >
      {children}
    </span>
  );
};


