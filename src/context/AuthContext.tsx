import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role } from "../types";
import { login as loginApi, logout as logoutApi } from "../api/auth.api";
import { getMe } from "../api/users.api";
import { registerCurrentFcmToken, unregisterCurrentFcmToken } from "../services/firebase.service";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    
    setIsLoading(false);

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth-unauthorized", handleUnauthorized);
  }, []);

  // Whenever user becomes authenticated, attempt FCM device token registration
  useEffect(() => {
    if (token) {
      registerCurrentFcmToken().catch((err) => {
        console.error("[FCM] Error registering FCM token on session restore:", err);
      });
    }
  }, [token]);

  const login = async (credentials: any) => {
    const response = await loginApi(credentials);
    const { user: authUser, accessToken, refreshToken } = response.data;

    localStorage.setItem("user", JSON.stringify(authUser));
    localStorage.setItem("token", accessToken);
    
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    setUser(authUser);
    setToken(accessToken);

    // Register FCM token with backend for the newly logged-in user
    registerCurrentFcmToken().catch((err) => {
      console.error("[FCM] Post-login FCM registration error:", err);
    });
  };

  const logout = async () => {
    try {
      // Deactivate FCM device token on backend before tearing down session
      await unregisterCurrentFcmToken();
    } catch (fcmErr) {
      console.error("[FCM] Failed to unregister FCM token during logout:", fcmErr);
    }

    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch (error) {
      console.error("Logout failed on backend", error);
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setToken(null);
    }
  };

  const persistUser = (next: User | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem("user", JSON.stringify(next));
    } else {
      localStorage.removeItem("user");
    }
  };

  const refreshUser = async () => {
    if (!token) return null;
    const res = await getMe();
    persistUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token,
        login,
        logout,
        setUser: persistUser,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
