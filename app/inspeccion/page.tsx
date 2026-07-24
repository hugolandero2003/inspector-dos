"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./inspeccion.module.css";

type VehiculoInfo = {
  id: string;
  placa: string;
  interno: string | null;
  tipo: string;
  marca: string;
  linea: string | null;
  modelo: string | null;
  color: string | null;
};

export default function InspeccionPage() {
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  const buscarVehiculo = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setVehiculo(null);
    setNoEncontrado(false);
    setLoading(true);

    try {
      const res = await fetch(`/api/vehiculos/buscar?placa=${encodeURIComponent(placa.trim().toUpperCase())}`);
      const data = await res.json();

      if (res.status === 404) {
        setNoEncontrado(true);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "No fue posible buscar el vehículo.");
        return;
      }
      setVehiculo(data);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setPlaca("");
    setVehiculo(null);
    setNoEncontrado(false);
    setError(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>Inspector PESV</span>
        <Link href="/api/auth/logout" className={styles.logoutLink}>Salir</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Inspección preoperacional</h1>
        <p className={styles.subtitle}>Ingresa la placa del vehículo para iniciar</p>

        {/* Buscador de placa */}
        {!vehiculo && !noEncontrado && (
          <form className={styles.searchForm} onSubmit={buscarVehiculo}>
            <input
              className={styles.placaInput}
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123"
              maxLength={8}
              required
              autoFocus
            />
            <button type="submit" className={styles.searchBtn} disabled={loading || placa.trim().length < 3}>
              {loading ? "Buscando..." : "Buscar vehículo"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </form>
        )}

        {/* Vehículo encontrado */}
        {vehiculo && (
          <div className={styles.vehiculoCard}>
            <div className={styles.vehiculoHeader}>
              <span className={styles.vehiculoPlaca}>{vehiculo.placa}</span>
              {vehiculo.interno && (
                <span className={styles.vehiculoInterno}>Interno #{vehiculo.interno}</span>
              )}
            </div>
            <div className={styles.vehiculoInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tipo</span>
                <span className={styles.infoValue}>{vehiculo.tipo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Marca / Línea</span>
                <span className={styles.infoValue}>{vehiculo.marca} {vehiculo.linea}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Modelo</span>
                <span className={styles.infoValue}>{vehiculo.modelo ?? "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Color</span>
                <span className={styles.infoValue}>{vehiculo.color ?? "—"}</span>
              </div>
            </div>
            <div className={styles.vehiculoActions}>
              {/* 🛡️ CORREGIDO: Redirección limpia a la ruta sin /app */}
              <a
                href={`/inspeccion/checklist?vehiculoId=${vehiculo.id}`}
                className={styles.btnPrimary}
              >
                Iniciar inspección
              </a>
              <button className={styles.btnSecondary} onClick={limpiar}>
                Cambiar vehículo
              </button>
            </div>
          </div>
        )}

        {/* Vehículo no encontrado */}
        {noEncontrado && (
          <div className={styles.noEncontrado}>
            <span className={styles.noEncontradoIcon}>🔍</span>
            <p className={styles.noEncontradoTitle}>Vehículo no registrado</p>
            <p className={styles.noEncontradoDesc}>
              La placa <strong>{placa}</strong> no está en tu flota.
            </p>
            <div className={styles.noEncontradoActions}>
              {/* 🛡️ CORREGIDO: Redirección limpia a la ruta sin /app */}
              <a href={`/inspeccion/nuevo-vehiculo?placa=${placa}`} className={styles.btnPrimary}>
                Registrar vehículo nuevo
              </a>
              <button className={styles.btnSecondary} onClick={limpiar}>
                Buscar otra placa
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
