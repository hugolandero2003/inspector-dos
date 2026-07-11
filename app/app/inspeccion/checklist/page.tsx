"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./checklist.module.css";

// ─── Ítems del checklist según Resolución 40595 PESV ───────────────────────
const CHECKLIST_BASE = [
  // Documentos
  { id: "doc-soat",       categoria: "Documentos",     item: "SOAT vigente" },
  { id: "doc-rtm",        categoria: "Documentos",     item: "Revisión técnico-mecánica vigente" },
  { id: "doc-tarjeta",    categoria: "Documentos",     item: "Tarjeta de operación" },
  // Motor
  { id: "mot-aceite",     categoria: "Motor",          item: "Nivel de aceite" },
  { id: "mot-agua",       categoria: "Motor",          item: "Nivel de refrigerante / agua" },
  { id: "mot-frenos",     categoria: "Motor",          item: "Nivel de líquido de frenos" },
  { id: "mot-bateria",    categoria: "Motor",          item: "Batería / carga eléctrica" },
  // Frenos
  { id: "fre-principal",  categoria: "Frenos",         item: "Frenos de servicio (pedal)" },
  { id: "fre-mano",       categoria: "Frenos",         item: "Freno de parqueo / mano" },
  // Luces
  { id: "luz-bajas",      categoria: "Luces",          item: "Luces bajas" },
  { id: "luz-altas",      categoria: "Luces",          item: "Luces altas" },
  { id: "luz-posicion",   categoria: "Luces",          item: "Luces de posición" },
  { id: "luz-direccional",categoria: "Luces",          item: "Direccionales (derechas e izquierdas)" },
  { id: "luz-reversa",    categoria: "Luces",          item: "Luces de reversa" },
  { id: "luz-freno",      categoria: "Luces",          item: "Luces de freno (stop)" },
  { id: "luz-emergencia", categoria: "Luces",          item: "Luces de emergencia / balizas" },
  // Neumáticos
  { id: "neum-delantero", categoria: "Neumáticos",     item: "Estado neumáticos delanteros" },
  { id: "neum-trasero",   categoria: "Neumáticos",     item: "Estado neumáticos traseros" },
  { id: "neum-repuesto",  categoria: "Neumáticos",     item: "Neumático de repuesto" },
  // Visibilidad
  { id: "vis-parabrisas", categoria: "Visibilidad",    item: "Parabrisas (sin fisuras ni daños)" },
  { id: "vis-limpiapar",  categoria: "Visibilidad",    item: "Limpiaparabrisas" },
  { id: "vis-retrovis",   categoria: "Visibilidad",    item: "Retrovisores (interno y externos)" },
  // Seguridad
  { id: "seg-pito",       categoria: "Seguridad",      item: "Pito / bocina" },
  { id: "seg-cinturon",   categoria: "Seguridad",      item: "Cinturones de seguridad" },
  { id: "seg-extinguidor",categoria: "Seguridad",      item: "Extintor vigente" },
  { id: "seg-botiquin",   categoria: "Seguridad",      item: "Botiquín de primeros auxilios" },
  { id: "seg-triangulos", categoria: "Seguridad",      item: "Triángulos / conos de señalización" },
  { id: "seg-chaleco",    categoria: "Seguridad",      item: "Chaleco reflectivo" },
  // Carrocería
  { id: "car-puertas",    categoria: "Carrocería",     item: "Puertas (apertura y cierre correcto)" },
  { id: "car-limpieza",   categoria: "Carrocería",     item: "Limpieza interna y externa" },
];

type ItemEstado = "ok" | "falla" | "na" | "";

type CheckItem = (typeof CHECKLIST_BASE)[0] & { estado: ItemEstado; obs: string };

type VehiculoInfo = {
  id: string; placa: string; interno: string | null;
  tipo: string; marca: string; linea: string | null; modelo: string | null;
};

function ChecklistForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehiculoId = searchParams.get("vehiculoId") ?? "";

  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [loadingVehiculo, setLoadingVehiculo] = useState(true);

  // Datos conductor
  const [conductor, setConductor] = useState("");
  const [licencia, setLicencia] = useState("");
  const [ruta, setRuta] = useState("");
  const [kilometraje, setKilometraje] = useState("");

  // Checklist
  const [items, setItems] = useState<CheckItem[]>(
    CHECKLIST_BASE.map((i) => ({ ...i, estado: "", obs: "" }))
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar info del vehículo
  useEffect(() => {
    if (!vehiculoId) { setLoadingVehiculo(false); return; }
    fetch(`/api/vehiculos/buscar?placa=__id__${vehiculoId}`)
      .catch(() => null)
      .finally(() => setLoadingVehiculo(false));

    // Buscar por ID directamente
    fetch(`/api/vehiculos/${vehiculoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setVehiculo(data); })
      .catch(() => null)
      .finally(() => setLoadingVehiculo(false));
  }, [vehiculoId]);

  const setEstado = (id: string, estado: ItemEstado) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, estado } : i))
    );
  };

  const setObs = (id: string, obs: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, obs } : i))
    );
  };

  // Categorías únicas en orden
  const categorias = [...new Set(CHECKLIST_BASE.map((i) => i.categoria))];

  // Validación
  const todosMarcados = items.every((i) => i.estado !== "");
  const tieneFallas = items.some((i) => i.estado === "falla");
  const concepto = tieneFallas ? "RECHAZADO" : "APROBADO";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!todosMarcados) {
      setError("Debes marcar todos los ítems del checklist (OK, Falla o N/A).");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/inspecciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiculoId,
          conductor,
          licencia,
          ruta,
          kilometraje,
          checklist: items.map(({ id, item, categoria, estado, obs }) => ({
            id, item, categoria, estado, obs,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No fue posible guardar la inspección.");
        return;
      }

      router.push(`/app/inspeccion/resultado?id=${data.id}&concepto=${data.concepto}`);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingVehiculo) {
    return <div className={styles.loading}>Cargando vehículo...</div>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {/* Header del vehículo */}
      <div className={styles.vehiculoBar}>
        <div className={styles.vehiculoBarLeft}>
          <span className={styles.vehiculoPlaca}>{vehiculo?.placa ?? "—"}</span>
          <span className={styles.vehiculoDesc}>
            {vehiculo ? `${vehiculo.marca} ${vehiculo.linea ?? ""} ${vehiculo.modelo ?? ""}`.trim() : "Cargando..."}
          </span>
        </div>
        <a href="/app/inspeccion" className={styles.btnBack}>← Cambiar</a>
      </div>

      {/* Datos del conductor */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Datos del conductor</h2>
        <div className={styles.conductorGrid}>
          <label className={styles.field}>
            <span>Nombre del conductor *</span>
            <input className={styles.input} value={conductor}
              onChange={(e) => setConductor(e.target.value)} required
              placeholder="Nombre completo" />
          </label>
          <label className={styles.field}>
            <span>N.° de licencia *</span>
            <input className={styles.input} value={licencia}
              onChange={(e) => setLicencia(e.target.value)} required
              placeholder="Ej: 123456789" />
          </label>
          <label className={styles.field}>
            <span>Ruta / destino</span>
            <input className={styles.input} value={ruta}
              onChange={(e) => setRuta(e.target.value)}
              placeholder="Ej: Bogotá – Medellín" />
          </label>
          <label className={styles.field}>
            <span>Kilometraje actual</span>
            <input className={styles.input} value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              placeholder="Ej: 85400" />
          </label>
        </div>
      </section>

      {/* Checklist por categoría */}
      {categorias.map((cat) => (
        <section key={cat} className={styles.section}>
          <h2 className={styles.sectionTitle}>{cat}</h2>
          <div className={styles.itemsList}>
            {items.filter((i) => i.categoria === cat).map((item) => (
              <div key={item.id} className={`${styles.itemRow} ${item.estado === "falla" ? styles.itemFalla : ""}`}>
                <span className={styles.itemName}>{item.item}</span>
                <div className={styles.itemBtns}>
                  <button type="button"
                    className={`${styles.estadoBtn} ${item.estado === "ok" ? styles.estadoBtnOk : ""}`}
                    onClick={() => setEstado(item.id, "ok")}>✓ OK</button>
                  <button type="button"
                    className={`${styles.estadoBtn} ${item.estado === "falla" ? styles.estadoBtnFalla : ""}`}
                    onClick={() => setEstado(item.id, "falla")}>✗ Falla</button>
                  <button type="button"
                    className={`${styles.estadoBtn} ${item.estado === "na" ? styles.estadoBtnNa : ""}`}
                    onClick={() => setEstado(item.id, "na")}>N/A</button>
                </div>
                {item.estado === "falla" && (
                  <input className={styles.obsInput}
                    value={item.obs}
                    onChange={(e) => setObs(item.id, e.target.value)}
                    placeholder="Descripción de la falla (opcional)" />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Resumen y envío */}
      <div className={styles.submitSection}>
        <div className={`${styles.conceptoBadge} ${tieneFallas ? styles.conceptoRechazado : styles.conceptoAprobado}`}>
          Concepto: <strong>{concepto}</strong>
          {tieneFallas && (
            <span> — {items.filter((i) => i.estado === "falla").length} falla(s)</span>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={submitting || !todosMarcados}>
          {submitting ? "Guardando..." : "Guardar inspección"}
        </button>

        {!todosMarcados && (
          <p className={styles.pendienteMsg}>
            Faltan {items.filter((i) => i.estado === "").length} ítem(s) por marcar
          </p>
        )}
      </div>
    </form>
  );
}

export default function ChecklistPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>Inspector PESV</span>
        <span className={styles.headerTitle}>Inspección preoperacional</span>
        <a href="/api/auth/logout" className={styles.logoutLink}>Salir</a>
      </header>
      <main className={styles.main}>
        <Suspense fallback={<div className={styles.loading}>Cargando...</div>}>
          <ChecklistForm />
        </Suspense>
      </main>
    </div>
  );
}
