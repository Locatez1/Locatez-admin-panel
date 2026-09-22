import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X, Bell, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, title }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  // Global event listener so non-React components (e.g. Firebase SW, Axios interceptors) can trigger toasts
  useEffect(() => {
    const handleGlobalToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string; title?: string; body?: string; type?: ToastType }>;
      if (customEvent.detail) {
        const { message, title, body, type } = customEvent.detail;
        const msg = message || body || "";
        if (msg || title) {
          showToast(msg, type || "info", title);
        }
      }
    };

    window.addEventListener("app-toast", handleGlobalToast);
    return () => window.removeEventListener("app-toast", handleGlobalToast);
  }, [showToast]);

  const toast = {
    success: (msg: string, title?: string) => showToast(msg, "success", title),
    error: (msg: string, title?: string) => showToast(msg, "error", title),
    warning: (msg: string, title?: string) => showToast(msg, "warning", title),
    info: (msg: string, title?: string) => showToast(msg, "info", title),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      {/* Floating Toasts Container */}
      <div className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto flex items-start justify-between p-4 rounded-xl shadow-xl border text-sm transition-all duration-300 transform translate-y-0 backdrop-blur-md",
              t.type === "success" && "bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/5",
              t.type === "error" && "bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/5",
              t.type === "warning" && "bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/5",
              t.type === "info" && "bg-slate-900/95 border-slate-700 text-white shadow-black/20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-600" />}
                {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                {t.type === "info" && (t.title ? <Bell className="h-5 w-5 text-primary-400" /> : <Info className="h-5 w-5 text-sky-400" />)}
              </div>
              <div className="flex flex-col gap-0.5 pr-2">
                {t.title && <h5 className="font-bold text-xs uppercase tracking-wider opacity-90">{t.title}</h5>}
                <p className="text-xs sm:text-sm font-medium leading-relaxed">{t.message}</p>
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className={clsx(
                "shrink-0 ml-2 p-1 rounded-md transition-colors cursor-pointer",
                t.type === "info" ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-400 hover:text-gray-700 hover:bg-black/5"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
