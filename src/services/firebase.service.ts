import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { registerDeviceToken, unregisterDeviceToken } from "../api/notifications.api";

// Read configuration from Vite environment variables with developer fallback values
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_YOUR_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
};

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

let messagingInstance: Messaging | null = null;
let currentFcmToken: string | null = null;
let lastRegisteredKey: string | null = null;
let registrationPromise: Promise<boolean> | null = null;

export const getCurrentFcmToken = (): string | null => currentFcmToken;

/**
 * Ensures Firebase Messaging is initialized, notification permissions are checked,
 * and the FCM registration token is obtained.
 */
export const ensureFcmToken = async (): Promise<string | null> => {
  if (currentFcmToken) {
    return currentFcmToken;
  }

  const isConfigured = Boolean(
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("YOUR_PROJECT_ID")
  );

  if (!isConfigured) {
    console.warn("[FCM] Firebase environment variables not configured on this host. Skipping FCM initialization.");
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Firebase Messaging is not supported in this browser environment.");
      return null;
    }

    // Initialize Firebase App
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    messagingInstance = getMessaging(app);

    // Check notification permissions
    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;
      if (permission === "default") {
        console.log("[FCM] Requesting notification permission...");
        permission = await Notification.requestPermission();
      }
      console.log(`[FCM] Notification permission status: ${permission}`);

      if (permission !== "granted") {
        console.warn("[FCM] Notification permission is not granted. Cannot retrieve FCM token.");
        return null;
      }
    }

    // Register service worker if available
    let swRegistration: ServiceWorkerRegistration | undefined = undefined;
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("[FCM] Service Worker registered successfully with scope:", swRegistration.scope);
      } catch (swErr) {
        console.warn("[FCM] Service Worker registration failed:", swErr);
      }
    }

    // Retrieve FCM Registration Token
    console.log("[FCM] Fetching FCM Registration Token...");
    const token = await getToken(messagingInstance, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      currentFcmToken = token;
      console.log("==================================================");
      console.log("FCM REGISTRATION TOKEN:");
      console.log(token);
      console.log("==================================================");

      // Listen for foreground notifications
      onMessage(messagingInstance, (payload) => {
        console.log("[FCM] Foreground notification received:", payload);

        const title = payload.notification?.title || payload.data?.title || "New Notification";
        const body = payload.notification?.body || payload.data?.body || payload.data?.message || payload.data?.content || "";
        const icon = payload.notification?.icon || payload.data?.icon || "/favicon.svg";
        const path = payload.data?.path || "";
        const link = payload.data?.link || "";

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(title, {
              body,
              icon,
              data: { ...(payload.data || {}), path, link },
            });
            n.onclick = () => {
              window.focus();
              const target = link || path;
              if (target) {
                if (target.startsWith("http")) {
                  window.location.href = target;
                } else {
                  window.location.assign(target.startsWith("/") ? target : `/${target}`);
                }
              }
              n.close();
            };
          } catch (e) {
            console.warn("[FCM] Error displaying native foreground notification:", e);
          }
        }
      });

      return token;
    } else {
      console.warn("[FCM] No registration token available. Request permission or check configuration.");
      return null;
    }
  } catch (error: any) {
    console.error("[FCM] Error initializing Firebase Messaging or getting token:", error);
    return null;
  }
};

/**
 * Registers the current FCM token with backend POST /api/v1/notifications/devices
 * Uses in-flight promise deduplication & session key locking to prevent duplicate API requests.
 */
export const registerCurrentFcmToken = async (): Promise<boolean> => {
  const authToken = localStorage.getItem("token");
  if (!authToken) {
    console.log("[FCM] User is not authenticated yet. FCM token registration will defer until login.");
    return false;
  }

  // Ensure FCM token is retrieved
  const token = await ensureFcmToken();
  if (!token) {
    console.warn("[FCM] Unable to register device token: FCM token is null.");
    return false;
  }

  let userId = "user";
  try {
    const storedUserStr = localStorage.getItem("user");
    if (storedUserStr) {
      const parsed = JSON.parse(storedUserStr);
      userId = String(parsed?.id || parsed?._id || parsed?.userId || "user");
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  const registrationKey = `${userId}:${token}`;

  // 1. Skip duplicate call if already registered for this session key
  if (lastRegisteredKey === registrationKey) {
    console.log("[FCM] FCM token already registered for current session.");
    return true;
  }

  // 2. Return in-flight promise if a registration request is already active
  if (registrationPromise) {
    console.log("[FCM] Registration request already in-flight, reusing active request.");
    return registrationPromise;
  }

  // 3. Initiate single registration request with promise lock
  registrationPromise = (async () => {
    try {
      console.log("[FCM] Registering FCM token with backend...");
      await registerDeviceToken(token);
      lastRegisteredKey = registrationKey;
      console.log("[FCM] FCM token registered successfully with backend.");
      return true;
    } catch (err: any) {
      lastRegisteredKey = null;
      console.error("[FCM] Failed to register FCM token with backend:", err?.response?.data?.message || err?.message || err);
      return false;
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
};

/**
 * Unregisters the current FCM token from backend DELETE /api/v1/notifications/devices/:token
 */
export const unregisterCurrentFcmToken = async (): Promise<boolean> => {
  if (!currentFcmToken) {
    return false;
  }

  const authToken = localStorage.getItem("token");
  if (!authToken) {
    return false;
  }

  try {
    console.log("[FCM] Unregistering FCM token from backend...");
    await unregisterDeviceToken(currentFcmToken);
    console.log("[FCM] FCM token unregistered successfully from backend.");
    lastRegisteredKey = null;
    return true;
  } catch (err: any) {
    console.error("[FCM] Failed to unregister FCM token from backend:", err?.response?.data?.message || err?.message || err);
    return false;
  }
};

/**
 * Startup initialization for Firebase Messaging
 */
export const initFirebaseMessaging = async (): Promise<string | null> => {
  console.log("[FCM] Initializing Firebase Messaging...");
  const token = await ensureFcmToken();
  if (token) {
    await registerCurrentFcmToken();
  }
  return token;
};

export const getMessagingInstance = (): Messaging | null => messagingInstance;
