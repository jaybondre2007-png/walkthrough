import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type AuthUser, type LoginResult } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (
    pendingToken: string,
    codeOrRecovery: { code: string } | { recoveryCode: string }
  ) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Resets local auth state without calling the API — used after account
   * deletion, where the server has already invalidated the session. */
  forgetSession: () => void;
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
    async (pendingToken: string, codeOrRecovery: { code: string } | { recoveryCode: string }) => {
      const u = await api.auth.verify2faLogin(pendingToken, codeOrRecovery);
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

  const forgetSession = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{ user, status, login, completeTwoFactorLogin, register, logout, refreshUser, forgetSession }}
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
