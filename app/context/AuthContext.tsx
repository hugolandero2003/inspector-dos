"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  user: { username: string; empresaId?: string | null } | null;
  token: string | null;
  login: (
    email: string,
    password: string,
    options?: { empresaId?: string }
  ) => Promise<{ ok: boolean; error?: string; redirectTo?: string; username?: string; token?: string; empresaId?: string | null }>;
  completeLogin: (session: { token: string; username: string; redirectTo?: string; empresaId?: string | null }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string; empresaId?: string | null } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const persistSession = (session: { token: string; username: string; empresaId?: string | null }) => {
    const userData = { username: session.username, empresaId: session.empresaId ?? null };
    setUser(userData);
    setToken(session.token);
    setIsAuthenticated(true);
    localStorage.setItem("pesv_user", JSON.stringify(userData));
    localStorage.setItem("pesv_token", session.token);

    const isSecure = window.location.protocol === "https:" || process.env.NODE_ENV === "production";
    document.cookie = `pesv_session=${session.token}; path=/; max-age=28800; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem("pesv_user");
    localStorage.removeItem("pesv_token");
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("pesv_user");
    const storedToken = localStorage.getItem("pesv_token");

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
        setIsAuthenticated(true);
      } catch {
        clearSession();
      }
    } else {
      clearSession();
    }
  }, []);

  const login = async (
    email: string,
    password: string,
    options?: { empresaId?: string }
  ): Promise<{ ok: boolean; error?: string; redirectTo?: string; username?: string; token?: string; empresaId?: string | null }> => {
    try {
      const response = await fetch("/api/auth/legacy-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(options?.empresaId ? { empresaId: options.empresaId } : {}) }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false, error: data?.error ?? "No se pudo iniciar sesión" };
      }

      const username = data.username ?? email;
      const empresaId = data.empresaId ?? null;
      if (data.token) {
        persistSession({ token: data.token, username, empresaId });
      }

      return {
        ok: true,
        redirectTo: data.redirectTo,
        username,
        token: data.token,
        empresaId,
      };
    } catch {
      return { ok: false, error: "No fue posible conectar con el servidor" };
    }
  };

  const completeLogin = (session: { token: string; username: string; redirectTo?: string; empresaId?: string | null }) => {
    persistSession({ token: session.token, username: session.username, empresaId: session.empresaId ?? null });
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, completeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
