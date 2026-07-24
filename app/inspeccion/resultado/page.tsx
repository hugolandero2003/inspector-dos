"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./resultado.module.css";

function ResultadoContent() {
  const searchParams = useSearchParams();
  const concepto = searchParams.get("concepto") ?? "aprobado";
  const id = searchParams.get("id") ?? "";

  const aprobado = concepto === "aprobado";

  return (
    <div className={styles.card}>
      <div className={`${styles.iconWrap} ${aprobado ? styles.iconOk : styles.iconFail}`}>
        {aprobado ? "✓" : "✗"}
      </div>
      <h1 className={`${styles.title} ${aprobado ? styles.titleOk : styles.titleFail}`}>
        Vehículo {aprobado ? "APROBADO" : "RECHAZADO"}
      </h1>
      <p className={styles.desc}>
        {aprobado
          ? "La inspección preoperacional no registró fallas. El vehículo puede salir a operación."
          : "La inspección registró una o más fallas. El vehículo no debe salir a operación hasta corregirlas."}
      </p>
      {id && <p className={styles.ref}>Referencia: <code>{id.slice(-8).toUpperCase()}</code></p>}

      <div className={styles.actions}>
        <Link href="/inspeccion" className={styles.btnPrimary}>Nueva inspección</Link>
        <Link href="/admin" className={styles.btnSecondary}>Panel de administración</Link>
      </div>
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>Inspector PESV</span>
        <Link href="/api/auth/logout" className={styles.logoutLink}>Salir</Link>
      </header>
      <main className={styles.main}>
        <Suspense fallback={<div />}>
          <ResultadoContent />
        </Suspense>
      </main>
    </div>
  );
}
