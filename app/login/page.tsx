"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await auth.login(username.trim(), password);
      if (!result.ok) {
        setError(result.error ?? "Usuario o contraseña incorrectos");
        return;
      }

      router.push("/admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-blue-600 to-blue-800 p-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Panel Admin PESV</h1>
          <p className="mt-2 text-sm text-slate-600">Acceso a registros de inspecciones vehiculares</p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Username */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              disabled={loading}
              className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              disabled={loading}
              className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 text-sm font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500"
          >
            {loading ? "Validando..." : "Ingresar al Panel Admin"}
          </button>
        </form>

        {/* Back to Form */}
        <div className="mt-4">
          <button
            onClick={() => router.push("/")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al formulario de inspección
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-center text-xs text-slate-600">
            desarrollado por HALM ©
          </p>
        </div>
      </div>
    </div>
  );
}
