import { useEffect, type FC } from 'react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { AppRoutes } from './routes/AppRoutes'
import { initFirebaseMessaging } from './services/firebase.service'

/** Handles service-worker postMessage navigation from notification clicks. */
const NotificationNavListener: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "NOTIFICATION_NAVIGATE") return;
      const path = typeof data.path === "string" ? data.path : "";
      if (path.startsWith("/")) {
        navigate(path);
        return;
      }
      if (typeof data.link === "string" && data.link) {
        try {
          const url = new URL(data.link, window.location.origin);
          if (url.origin === window.location.origin) {
            navigate(`${url.pathname}${url.search}${url.hash}`);
          } else {
            window.location.href = data.link;
          }
        } catch {
          /* ignore */
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [navigate]);

  return null;
};

function App() {
  useEffect(() => {
    initFirebaseMessaging().catch((err) => {
      console.error("[FCM] Startup initialization error:", err);
    });
  }, []);

  return (
    <BrowserRouter>
      <NotificationNavListener />
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
