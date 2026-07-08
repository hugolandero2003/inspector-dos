"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  user: { username: string } | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("pesv_user");
    const storedToken = localStorage.getItem("pesv_token");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("pesv_user");
        localStorage.removeItem("pesv_token");
      }
    } else {
      localStorage.removeItem("pesv_user");
      localStorage.removeItem("pesv_token");
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false, error: data?.error ?? "No se pudo iniciar sesión" };
      }

      const userData = { username: data.username ?? username };
      setUser(userData);
      setToken(data.token);
      setIsAuthenticated(true);
      localStorage.setItem("pesv_user", JSON.stringify(userData));
      localStorage.setItem("pesv_token", data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: "No fue posible conectar con el servidor" };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem("pesv_user");
    localStorage.removeItem("pesv_token");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
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
