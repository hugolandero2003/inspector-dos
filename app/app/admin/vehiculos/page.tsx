"use client";

import { useEffect, useState } from "react";
import s from "../shared.module.css";

type Vehiculo = {
  id: string; placa: string; interno: string | null; tipo: string;
  marca: string; linea: string | null; modelo: string | null;
  color: string | null; estado: boolean;
  _count: { inspecciones: number };
};

const TIPOS = ["camion", "buseta", "microbus", "carro", "van", "moto", "otro"];

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  // Form nuevo vehículo
  const [placa,  setPlaca]  = useState("");
  const [interno,setInterno]= useState("");
  const [tipo,   setTipo]   = useState("camion");
  const [marca,  setMarca]  = useState("");
  const [linea,  setLinea]  = useState("");
  const [modelo, setModelo] = useState("");
  const [color,  setColor]  = useState("");

  const cargar = () => {
    setLoading(true);
    fetch("/api/admin/vehiculos")
      .then((r) => r.json())
      .then(setVehiculos)
      .finally(() => setLoading(false));
  };

  useEffect(cargar, []);

  const abrirModal = () => {
    setPlaca(""); setInterno(""); setTipo("camion"); setMarca("");
    setLinea(""); setModelo(""); setColor(""); setError(null);
    setModal(true);
  };

  const guardar = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa, interno, tipo, marca, linea, modelo, color }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setModal(false);
      cargar();
    } finally { setSaving(false); }
  };

  const toggleEstado = async (v: Vehiculo) => {
    await fetch(`/api/admin/vehiculos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: !v.estado }),
    });
    cargar();
  };

  const activos = vehiculos.filter((v) => v.estado).length;

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <a href="/app/admin" className={s.brand}>Inspector PESV</a>
          <span className={s.sep}>/</span>
          <span className={s.headerTitle}>Vehículos</span>
        </div>
        <div className={s.headerRight}>
          <a href="/app/admin" className={s.backLink}>← Panel</a>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.topBar}>
          <h1 className={s.pageTitle}>
            Flota de vehículos
            <span style={{ fontSize: 14, fontWeight: 400, color: "#6b7280", marginLeft: 12 }}>
              {activos} activo{activos !== 1 ? "s" : ""} de {vehiculos.length}
            </span>
          </h1>
          <button className={s.btn} onClick={abrirModal}>+ Agregar vehículo</button>
        </div>

        {loading ? (
          <div className={s.empty}><span className={s.emptyIcon}>⏳</span>Cargando...</div>
        ) : vehiculos.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>🚗</span>
            <p>No hay vehículos registrados.</p>
            <button className={s.btn} onClick={abrirModal} style={{ marginTop: 12 }}>Agregar el primero</button>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Placa</th><th>Interno</th><th>Tipo</th>
                  <th>Marca / Línea</th><th>Modelo</th>
                  <th>Inspecciones</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700, letterSpacing: 1 }}>{v.placa}</td>
                    <td>{v.interno ?? "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{v.tipo}</td>
                    <td>{v.marca} {v.linea ?? ""}</td>
                    <td>{v.modelo ?? "—"}</td>
                    <td style={{ color: "#60a5fa" }}>{v._count.inspecciones}</td>
                    <td>
                      <span className={`${s.badge} ${v.estado ? s.badgeOk : s.badgeOff}`}>
                        {v.estado ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${s.btnSm} ${v.estado ? s.btnDanger : ""}`}
                        onClick={() => toggleEstado(v)}
                      >
                        {v.estado ? "Dar de baja" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal && (
        <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>Agregar vehículo</h2>

            <div className={s.formRow}>
              <label className={s.field}>
                <span>Placa *</span>
                <input className={s.input} value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123" maxLength={8} autoFocus />
              </label>
              <label className={s.field}>
                <span>Número interno</span>
                <input className={s.input} value={interno}
                  onChange={(e) => setInterno(e.target.value)}
                  placeholder="Ej: 01" />
              </label>
            </div>

            <div className={s.formRow}>
              <label className={s.field}>
                <span>Tipo *</span>
                <select className={s.select} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </label>
              <label className={s.field}>
                <span>Marca *</span>
                <input className={s.input} value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ej: Chevrolet" />
              </label>
            </div>

            <div className={s.formRow}>
              <label className={s.field}>
                <span>Línea / Referencia</span>
                <input className={s.input} value={linea}
                  onChange={(e) => setLinea(e.target.value)}
                  placeholder="Ej: NHR" />
              </label>
              <label className={s.field}>
                <span>Año modelo</span>
                <input className={s.input} value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ej: 2022" maxLength={4} />
              </label>
            </div>

            <label className={s.field}>
              <span>Color</span>
              <input className={s.input} value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ej: Blanco" />
            </label>

            {error && <p className={s.errorMsg}>{error}</p>}

            <div className={s.modalActions}>
              <button className={s.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button className={s.btn} onClick={guardar} disabled={saving || !placa || !marca}>
                {saving ? "Guardando..." : "Guardar vehículo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
