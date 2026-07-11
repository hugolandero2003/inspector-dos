"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./registro.module.css";

type Paso = 1 | 2;

function RegistroForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const errorParam   = searchParams.get("error");

  const [paso, setPaso] = useState<Paso>(1);

  const [empresa,  setEmpresa]  = useState("");
  const [nit,      setNit]      = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(
    errorParam === "cuenta_inactiva" ? "Tu cuenta está suspendida. Contacta a soporte." : null
  );
  const [loading, setLoading] = useState(false);

  const handlePaso1 = (e: FormEvent) => {
    e.preventDefault();
    if (!empresa.trim()) { setError("El nombre de la empresa es obligatorio."); return; }
    setError(null);
    setPaso(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/registro", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ empresa, nit, telefono, nombre, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "No fue posible crear la cuenta."); return; }
      router.push(data.redirectTo ?? "/app/admin");
      router.refresh();
    } catch { setError("Error de red. Intenta de nuevo."); }
    finally  { setLoading(false); }
  };

  return (
    <div className={styles.card}>
      <div className={styles.logo}>
        <span className={styles.logoText}>Inspector PESV</span>
        <span className={styles.logoTag}>Registro de empresa — Prueba gratuita 8 días</span>
      </div>

      <div className={styles.steps}>
        <div className={`${styles.step} ${paso >= 1 ? styles.stepActive : ""}`}>
          <span className={styles.stepNum}>1</span>
          <span className={styles.stepLabel}>Tu empresa</span>
        </div>
        <div className={styles.stepLine} />
        <div className={`${styles.step} ${paso >= 2 ? styles.stepActive : ""}`}>
          <span className={styles.stepNum}>2</span>
          <span className={styles.stepLabel}>Tu cuenta</span>
        </div>
      </div>

      {paso === 1 && (
        <form className={styles.form} onSubmit={handlePaso1}>
          <h2 className={styles.formTitle}>Datos de la empresa</h2>
          <label className={styles.field}>
            <span>Nombre de la empresa *</span>
            <input className={styles.input} value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej: Transportes Rápidos S.A.S." required autoFocus />
          </label>
          <label className={styles.field}>
            <span>NIT / Documento tributario</span>
            <input className={styles.input} value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="Ej: 900123456-1  (opcional)" />
          </label>
          <label className={styles.field}>
            <span>Teléfono de contacto</span>
            <input className={styles.input} value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: +57 310 555 1234  (opcional)" />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn}>Continuar →</button>
          <p className={styles.footer}>
            ¿Ya tienes cuenta?{" "}
            <a href="/login" className={styles.link}>Inicia sesión</a>
          </p>
        </form>
      )}

      {paso === 2 && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Crea tu cuenta de administrador</h2>
          <p className={styles.formSubtitle}>
            Esta será la cuenta con la que gestionarás la flota de <strong>{empresa}</strong>.
          </p>
          <label className={styles.field}>
            <span>Tu nombre completo *</span>
            <input className={styles.input} value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Carlos Ramírez" required autoFocus />
          </label>
          <label className={styles.field}>
            <span>Correo electrónico *</span>
            <input className={styles.input} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com" required />
          </label>
          <label className={styles.field}>
            <span>Contraseña *</span>
            <input className={styles.input} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" required minLength={8} />
          </label>
          <label className={styles.field}>
            <span>Confirmar contraseña *</span>
            <input className={styles.input} type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña" required />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta y entrar →"}
          </button>
          <button type="button" className={styles.btnBack}
            onClick={() => { setError(null); setPaso(1); }}>
            ← Volver al paso anterior
          </button>
        </form>
      )}
    </div>
  );
}

export default function RegistroPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={
        <div className={styles.card}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Inspector PESV</span>
          </div>
        </div>
      }>
        <RegistroForm />
      </Suspense>

      <div className={styles.benefits}>
        {/* Precio */}
        <div className={styles.priceCard}>
          <p className={styles.priceLabel}>Después de los 8 días gratis</p>
          <div className={styles.priceRow}>
            <span className={styles.priceCurrency}>$</span>
            <span className={styles.priceAmount}>50.000</span>
            <span className={styles.pricePeriod}>COP / mes</span>
          </div>
          <p className={styles.priceSub}>Por empresa · Usuarios e inspecciones ilimitadas</p>
        </div>

        <h3 className={styles.benefitsTitle}>Lo que incluye tu prueba gratis</h3>
        <ul className={styles.benefitsList}>
          <li>✓ 8 días de acceso completo</li>
          <li>✓ Inspecciones ilimitadas</li>
          <li>✓ Múltiples operadores</li>
          <li>✓ Checklist PESV (Res. 40595)</li>
          <li>✓ Historial de inspecciones</li>
          <li>✓ Sin tarjeta de crédito</li>
        </ul>
        <p className={styles.benefitsNote}>
          Al terminar la prueba, un asesor te contactará para activar tu plan mensual.
        </p>
      </div>
    </div>
  );
}
