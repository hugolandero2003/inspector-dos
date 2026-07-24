"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type Empresa = { id: string; nombre: string };

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();

  const [empresas,        setEmpresas]        = useState<Empresa[]>([]);
  const [empresaId,       setEmpresaId]       = useState("");
  const [empresaQuery,    setEmpresaQuery]     = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const empresaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/empresas/lista")
      .then((r) => r.json())
      .then((data: Empresa[]) => setEmpresas(data))
      .catch(() => setEmpresas([]))
      .finally(() => setLoadingEmpresas(false));
  }, []);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (empresaRef.current && !empresaRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sugerencias = empresaQuery.trim().length === 0
    ? empresas
    : empresas.filter((e) =>
        e.nombre.toLowerCase().includes(empresaQuery.trim().toLowerCase())
      );

  const seleccionarEmpresa = (emp: Empresa) => {
    setEmpresaId(emp.id);
    setEmpresaQuery(emp.nombre);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!empresaId) {
      setError("Selecciona tu empresa de la lista.");
      return;
    }

    setLoading(true);
    try {
      const result = await auth.login(email, password, { empresaId });
      if (!result.ok) {
        setError(result.error ?? "Credenciales incorrectas.");
        return;
      }

      let targetRoute = result.redirectTo ?? "/admin";
      if (targetRoute.startsWith("/app")) {
        targetRoute = targetRoute.replace("/app", "");
      }

      router.push(targetRoute);
      router.refresh();
    } catch {
      setError("Error de red. Intenta de nuevo.");
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
          <h1 className="text-3xl font-bold text-slate-900">Inspector PESV</h1>
          <p className="mt-2 text-sm text-slate-600">Acceso al panel de administración</p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>

          {/* Empresa — autocomplete */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Empresa
            </label>
            <div className="relative" ref={empresaRef}>
              <input
                type="text"
                value={empresaQuery}
                onChange={(e) => {
                  setEmpresaQuery(e.target.value);
                  setEmpresaId("");          // limpiar selección al editar
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={loadingEmpresas ? "Cargando empresas..." : "Escribe el nombre de tu empresa…"}
                disabled={loading || loadingEmpresas}
                autoComplete="off"
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
              />

              {/* Ícono de check cuando hay empresa seleccionada */}
              {empresaId && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}

              {/* Lista de sugerencias */}
              {showSuggestions && sugerencias.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-blue-200 bg-white shadow-xl">
                  {sugerencias.map((emp) => (
                    <li
                      key={emp.id}
                      onMouseDown={() => seleccionarEmpresa(emp)}
                      className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-blue-50 ${
                        emp.id === empresaId ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-800"
                      }`}
                    >
                      {emp.nombre}
                    </li>
                  ))}
                </ul>
              )}

              {/* Sin resultados */}
              {showSuggestions && empresaQuery.trim().length > 0 && sugerencias.length === 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-xl">
                  No se encontró ninguna empresa con ese nombre
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              disabled={loading}
              required
              className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
              className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 text-sm font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500"
          >
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Regresar */}
        <div className="mt-4">
          <button
            onClick={() => router.push("/")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Regresar
          </button>
        </div>

        {/* ¿No tienes cuenta? */}
        <div className="mt-4 border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-500">
            ¿Tu empresa aún no está registrada?{" "}
            <a href="/registro" className="font-semibold text-blue-600 hover:underline">
              Regístrate gratis
            </a>
          </p>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">desarrollado por HALM ©</p>
      </div>
    </div>
  );
}
