"use client";

import { FormEvent, useState } from "react";
import styles from "./landing.module.css";

type LeadPayload = {
  nombre: string;
  empresa: string;
  cargo: string;
  email: string;
  telefono: string;
  tamanoFlota: string;
  interes: "demo-8-dias" | "suscripcion" | "ambas";
  mensaje: string;
};

const initialState: LeadPayload = {
  nombre: "",
  empresa: "",
  cargo: "",
  email: "",
  telefono: "",
  tamanoFlota: "",
  interes: "demo-8-dias",
  mensaje: "",
};

export function LeadForm() {
  const [form, setForm] = useState<LeadPayload>(initialState);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!response.ok) {
        setFeedback({ ok: false, message: payload.error ?? "No fue posible enviar tus datos." });
        return;
      }

      setFeedback({ ok: true, message: payload.message ?? "Gracias, pronto te contactaremos." });
      setForm(initialState);
    } catch {
      setFeedback({ ok: false, message: "No fue posible enviar tus datos." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.leadForm} onSubmit={onSubmit}>
      <div className={styles.formRow}>
        <label className={styles.formLabel}>
          <span>Nombre completo *</span>
          <input
            className={styles.formInput}
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            required
            placeholder="Ej: Juan Pérez"
          />
        </label>

        <label className={styles.formLabel}>
          <span>Empresa *</span>
          <input
            className={styles.formInput}
            value={form.empresa}
            onChange={(e) => setForm((prev) => ({ ...prev, empresa: e.target.value }))}
            required
            placeholder="Ej: Transportes S.A."
          />
        </label>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>
          <span>Cargo en la empresa</span>
          <input
            className={styles.formInput}
            value={form.cargo}
            onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
            placeholder="Ej: Gerente de Operaciones"
          />
        </label>

        <label className={styles.formLabel}>
          <span>Correo corporativo *</span>
          <input
            className={styles.formInput}
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
            placeholder="Ej: jperez@empresa.com"
          />
        </label>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>
          <span>Teléfono de contacto *</span>
          <input
            className={styles.formInput}
            value={form.telefono}
            onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            required
            placeholder="Ej: +57 321 4567890"
          />
        </label>

        <label className={styles.formLabel}>
          <span>Tamaño de flota (Vehículos) *</span>
          <input
            className={styles.formInput}
            value={form.tamanoFlota}
            onChange={(e) => setForm((prev) => ({ ...prev, tamanoFlota: e.target.value }))}
            required
            placeholder="Ej: 25 vehículos"
          />
        </label>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabelFull}>
          <span>Tipo de solicitud *</span>
          <select
            className={styles.formSelect}
            value={form.interes}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                interes: e.target.value as LeadPayload["interes"],
              }))
            }
          >
            <option value="demo-8-dias">Quiero solicitar el Acceso de Prueba (8 días gratis)</option>
            <option value="suscripcion">Quiero cotizar una suscripción para mi flota</option>
            <option value="ambas">Ambas opciones (Prueba gratis y cotización)</option>
            <option value="soporte">Necesito soporte</option>
          </select>
        </label>
      </div>

      <label className={styles.formLabelFull}>
        <span>¿Tienes requerimientos especiales o dudas sobre el PESV?</span>
        <textarea
          className={styles.formTextarea}
          rows={3}
          value={form.mensaje}
          onChange={(e) => setForm((prev) => ({ ...prev, mensaje: e.target.value }))}
          placeholder="Escribe aquí tus comentarios, tipo de vehículos o dudas sobre la Resolución 40595..."
        />
      </label>

      <button className={styles.formSubmitButton} type="submit" disabled={loading}>
        {loading ? "Enviando solicitud..." : "Solicitar acceso de prueba gratis"}
      </button>

      {feedback && (
        <p className={feedback.ok ? styles.okFeedback : styles.errorFeedback}>{feedback.message}</p>
      )}
    </form>
  );
}
