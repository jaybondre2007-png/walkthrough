import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type AuthUser, type LoginResult } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (pendingToken: string, code: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth
      .me()
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        setStatus("unauthenticated");
      });
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus("unauthenticated");
      queryClient.clear();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    if (!("requires2FA" in result)) {
      setUser(result);
      setStatus("authenticated");
      queryClient.clear();
    }
    return result;
  }, [queryClient]);

  const completeTwoFactorLogin = useCallback(
    async (pendingToken: string, code: string) => {
      const u = await api.auth.verify2faLogin(pendingToken, code);
      setUser(u);
      setStatus("authenticated");
      queryClient.clear();
    },
    [queryClient]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const u = await api.auth.register(email, password, name);
      setUser(u);
      setStatus("authenticated");
      queryClient.clear();
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const u = await api.auth.me();
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, status, login, completeTwoFactorLogin, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
