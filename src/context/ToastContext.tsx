import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X, Bell, AlertTriangle, Layers } from "lucide-react";
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
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      // Prepend so newest is at index 0
      setToasts((prev) => [{ id, message, type, title }, ...prev]);

      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  // Global event listener for app-wide toasts (Firebase SW, Axios, etc.)
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

  const isStacked = !isHovered && toasts.length > 1;

  return (
    <ToastContext.Provider value={{ showToast, toast, clearAllToasts }}>
      {children}
      {/* Floating Stacked Toasts Container */}
      {toasts.length > 0 && (
        <div
          className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[9999] max-w-sm w-full px-4 sm:px-0 pointer-events-auto flex flex-col items-end group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Header controls when hovered with multiple toasts */}
          {isHovered && toasts.length > 1 && (
            <div className="flex items-center justify-between w-full mb-2 px-1 text-xs font-semibold text-slate-500 animate-fadeIn">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary-500" />
                {toasts.length} notifications
              </span>
              <button
                onClick={clearAllToasts}
                className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Toast items grid container */}
          <div className={clsx("w-full transition-all duration-300", isStacked ? "grid grid-cols-1" : "flex flex-col gap-2.5")}>
            {toasts.map((t, index) => {
              const isVisibleInStack = index < 3;

              // Stack transformations when collapsed
              const translateY = isStacked ? `${index * 10}px` : "0px";
              const scale = isStacked ? 1 - index * 0.05 : 1;
              const opacity = isStacked ? (index === 0 ? 1 : index === 1 ? 0.85 : index === 2 ? 0.65 : 0) : 1;
              const zIndex = 50 - index;

              if (isStacked && !isVisibleInStack) {
                return null;
              }

              return (
                <div
                  key={t.id}
                  style={
                    isStacked
                      ? {
                          gridColumnStart: 1,
                          gridRowStart: 1,
                          transform: `translateY(${translateY}) scale(${scale})`,
                          zIndex: zIndex,
                          opacity: opacity,
                        }
                      : undefined
                  }
                  className={clsx(
                    "w-full flex items-start justify-between p-4 rounded-xl shadow-xl border text-sm transition-all duration-300 backdrop-blur-md origin-top-right",
                    t.type === "success" && "bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10",
                    t.type === "error" && "bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10",
                    t.type === "warning" && "bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10",
                    t.type === "info" && "bg-slate-900/95 border-slate-700 text-white shadow-black/20"
                  )}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                      {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-600" />}
                      {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                      {t.type === "info" && (t.title ? <Bell className="h-5 w-5 text-primary-400" /> : <Info className="h-5 w-5 text-sky-400" />)}
                    </div>
                    <div className="flex flex-col gap-0.5 pr-2 min-w-0 flex-1">
                      {t.title && <h5 className="font-bold text-xs uppercase tracking-wider opacity-90 truncate">{t.title}</h5>}
                      <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">{t.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeToast(t.id);
                    }}
                    className={clsx(
                      "shrink-0 ml-2 p-1 rounded-md transition-colors cursor-pointer",
                      t.type === "info" ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-400 hover:text-gray-700 hover:bg-black/5"
                    )}
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Stack indicator pill when collapsed */}
          {isStacked && toasts.length > 1 && (
            <div className="mt-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-medium shadow-md border border-slate-700/60 animate-fadeIn cursor-pointer select-none">
              <Layers className="h-3 w-3 text-primary-400" />
              <span>+{toasts.length - 1} more notifications</span>
              <span className="text-slate-400 text-[10px] ml-1 border-l border-slate-700 pl-1.5">Hover to expand</span>
            </div>
          )}
        </div>
      )}
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
