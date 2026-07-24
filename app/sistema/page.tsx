"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useRef, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toBlob } from "html-to-image";

type VehicleRegistration = {
  placa: string;
  interno: string;
  tipo: string;
  marca: string;
  linea: string;
  modelo: string;
  kilometraje: string;
  ruta: string;
  conductor: string;
  licenciaConduccion: string;
  inspector: string;
  fechaInspeccion: string;
  horaInspeccion: string;
};

type Compliance = "Cumple" | "No cumple" | "No aplica";
type Concepto = "Apto" | "Apto con observaciones" | "No apto";

type ChecklistItem = {
  id: string;
  section: string;
  label: string;
  critical: boolean;
};

type DocumentExpirations = {
  soat: string;
  tecnomecanica: string;
  licencia: string;
};

const DUPLICATE_DAILY_PLATE_MESSAGE = "Esta placa ya tiene inspección registrada.";

function buildInspectionSuccessShareMessage(payload: {
  placa: string;
  fecha: string;
  hora: string;
  concepto: Concepto;
  noCumpleCriticos: string[];
  inspector: string;
  formUrl: string;
}) {
  const criticalFindings =
    payload.noCumpleCriticos.length > 0
      ? payload.noCumpleCriticos.join(", ")
      : "Sin hallazgos críticos";

  return [
    "✅ Registro diario creado con éxito",
    "",
    `Placa: ${payload.placa}`,
    `Fecha: ${payload.fecha}`,
    `Hora: ${payload.hora}`,
    `Concepto: ${payload.concepto}`,
    `Hallazgos críticos: ${criticalFindings}`,
    `Inspector: ${payload.inspector}`,
    "",
    "Completa el formulario aquí:",
    payload.formUrl,
  ].join("\n");
}

async function shareInspectionSuccessCardAsImage(cardElement: HTMLDivElement, fallbackMessage: string) {
  const imageBlob = await toBlob(cardElement, {
    pixelRatio: 1,
    canvasWidth: 1080,
    canvasHeight: 1920,
    cacheBust: true,
  });

  if (!imageBlob) {
    throw new Error("No fue posible generar la imagen del registro.");
  }

  const shareFile = new File([imageBlob], "registro-exitoso-inspeccion.png", {
    type: "image/png",
  });

  const canShareFile =
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    "canShare" in navigator &&
    navigator.canShare({ files: [shareFile] });

  if (canShareFile) {
    await navigator.share({
      title: "Registro diario creado con éxito",
      text: fallbackMessage,
      files: [shareFile],
    });
    return "shared" as const;
  }

  const imageUrl = URL.createObjectURL(imageBlob);
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = "registro-exitoso-inspeccion.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(imageUrl);

  window.open(`https://wa.me/?text=${encodeURIComponent(fallbackMessage)}`, "_blank", "noopener,noreferrer");
  return "downloaded" as const;
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function getBogotaTodayString(baseDate = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(baseDate);
}

function resolveInspectionValidationDate(rawDate: string) {
  return rawDate.trim() || getBogotaTodayString();
}

function isDocumentExpired(dateValue: string, referenceDate: string) {
  if (!dateValue) return false;
  return dateValue <= referenceDate;
}

function isDocumentationChecklistItem(itemId: string) {
  return itemId === "doc_soat" || itemId === "doc_tecno" || itemId === "doc_licencia";
}

const TIPOS_VEHICULO: string[] = [
  "Turbo furgon seco", "Turbo furgon refrigerado", "Turbo estacado", "Turbo cisterna", "Turbo tanque", "Turbo volqueta",
  "Camion sencillo seco", "Camion sencillo refrigerado", "Camion sencillo estacado", "Camion sencillo cisterna", "Camion sencillo tanque", "Camion sencillo volqueta",
  "Doble troque seco", "Doble troque refrigerado", "Doble troque estacado", "Doble troque cisterna", "Doble troque volqueta",
  "Tractocamion (tracto)", "Mula seca", "Mula refrigerada", "Mula estacada", "Mula cisterna", "Mula tanque", "Minimula seca", "Minimula refrigerada", "Minimula estacada",
  "Trailer seco", "Trailer refrigerado", "Trailer estacado", "Camioneta furgon seco", "Camioneta furgon refrigerado", "Camioneta estacada", "Camioneta pick-up",
  "Automovil", "Microbus", "Bus", "Buseta",
];

const MARCAS_VEHICULO: string[] = [
  "International", "Freightliner", "Kenworth", "Peterbilt", "Volvo", "Scania", "Mercedes-Benz", "MAN", "DAF", "Mack", "Western Star",
  "Hino", "Isuzu", "Mitsubishi Fuso", "Foton", "Dongfeng", "Sinotruk", "FAW", "JAC", "DFSK", "Chevrolet", "Ford", "Renault", "Volkswagen",
  "Toyota", "Hyundai", "Kia", "Nissan", "Mazda", "Ram",
];

const LINEAS_POR_MARCA: Record<string, string[]> = {
  international: ["LT", "LoneStar", "RH", "MV", "CV"],
  freightliner: ["Cascadia", "Columbia", "Century", "M2", "FL"],
  kenworth: ["T680", "T660", "T800", "T370", "W900"],
  peterbilt: ["389", "579", "567", "348"],
  volvo: ["FH", "FM", "FMX", "VM", "VNL"],
  scania: ["R Series", "S Series", "G Series", "P Series"],
  "mercedes-benz": ["Actros", "Axor", "Atego", "Accelo"],
  man: ["TGX", "TGS", "TGM"],
  daf: ["XF", "CF", "LF"],
  mack: ["Anthem", "Granite", "Pinnacle"],
  "western star": ["4700", "4900"],
  hino: ["300", "500", "700"],
  isuzu: ["ELF", "FVR", "FRR"],
  "mitsubishi fuso": ["Canter", "Fighter"],
  foton: ["Auman", "Aumark", "Forland"],
  dongfeng: ["DFL", "KL"],
  sinotruk: ["Howo", "Sitrak"],
  faw: ["J6P", "Tiger V"],
  jac: ["N Series", "Sunray"],
  dfsk: ["C31", "C35", "K01S"],
  chevrolet: ["NHR", "NQR", "NPR", "Silverado", "S10"],
  ford: ["Cargo", "F-4000", "F-350", "Ranger"],
  renault: ["D", "C", "T", "Kangoo"],
  volkswagen: ["Delivery", "Constellation", "Meteor", "Amarok"],
  toyota: ["Hilux", "Land Cruiser"],
  hyundai: ["HD65", "HD78", "Mighty"],
  kia: ["K2700", "K3000"],
  nissan: ["Frontier", "NP300"],
  mazda: ["BT-50"],
  ram: ["700", "1200", "1500"],
};

function normalizeBrand(brand: string) {
  return brand.trim().toLowerCase();
}

function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/\s+/g, "").trim();
}

function extractDocumentExpirationsFromChecklist(rawChecklist: string): DocumentExpirations {
  try {
    const parsed = JSON.parse(rawChecklist) as Array<{ id?: string; vencimiento?: string }>;
    if (!Array.isArray(parsed)) return initialDocumentExpirations;

    const soat = parsed.find((item) => item.id === "doc_soat")?.vencimiento ?? "";
    const tecnomecanica = parsed.find((item) => item.id === "doc_tecno")?.vencimiento ?? "";
    const licencia = parsed.find((item) => item.id === "doc_licencia")?.vencimiento ?? "";

    return { soat, tecnomecanica, licencia };
  } catch {
    return initialDocumentExpirations;
  }
}

const checklistItems: ChecklistItem[] = [
  { id: "doc_soat", section: "Documentacion", label: "SOAT vigente y legible", critical: true },
  { id: "doc_tecno", section: "Documentacion", label: "Revision tecnomecanica vigente", critical: true },
  { id: "doc_licencia", section: "Documentacion", label: "Licencia de conduccion vigente", critical: true },
  { id: "seg_extintor", section: "Seguridad activa y pasiva", label: "Extintor vigente y con manometro en rango", critical: true },
  { id: "seg_botiquin", section: "Seguridad activa y pasiva", label: "Botiquin completo", critical: false },
  { id: "seg_cinturones", section: "Seguridad activa y pasiva", label: "Cinturones de seguridad funcionales", critical: true },
  { id: "mec_frenos", section: "Condiciones tecnico-mecanicas", label: "Sistema de frenos sin novedad", critical: true },
  { id: "mec_direccion", section: "Condiciones tecnico-mecanicas", label: "Direccion estable y sin holguras", critical: true },
  { id: "mec_llantas", section: "Condiciones tecnico-mecanicas", label: "Llantas en buen estado y labrado suficiente", critical: true },
  { id: "mec_luces", section: "Condiciones tecnico-mecanicas", label: "Luces delanteras, traseras y direccionales operativas", critical: true },
  { id: "mec_espejos", section: "Condiciones tecnico-mecanicas", label: "Espejos y parabrisas en buen estado", critical: false },
  { id: "mec_fluidos", section: "Condiciones tecnico-mecanicas", label: "Sin fugas de aceite, combustible o refrigerante", critical: true },
  { id: "eq_herramienta", section: "Equipo de carretera", label: "Gato, cruceta y llanta de repuesto disponibles", critical: false },
  { id: "eq_senales", section: "Equipo de carretera", label: "Dos senales de carretera (conos o triangulos)", critical: false },
  { id: "eq_linterna", section: "Equipo de carretera", label: "Linterna y chaleco reflectivo", critical: false },
];

const groupedChecklist = checklistItems.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
  if (!acc[item.section]) { acc[item.section] = []; }
  acc[item.section].push(item);
  return acc;
}, {});

const sectionMeta: Record<string, { icon: string; gradient: string; border: string; light: string; textLight: string }> = {
  Documentacion: { icon: "📋", gradient: "from-blue-700 to-blue-900", border: "border-blue-500/50", light: "bg-blue-950/50", textLight: "text-blue-300" },
  "Seguridad activa y pasiva": { icon: "🛡️", gradient: "from-rose-700 to-rose-900", border: "border-rose-500/50", light: "bg-rose-950/50", textLight: "text-rose-300" },
  "Condiciones tecnico-mecanicas": { icon: "⚙️", gradient: "from-violet-700 to-violet-900", border: "border-violet-500/50", light: "bg-violet-950/50", textLight: "text-violet-300" },
  "Equipo de carretera": { icon: "🧰", gradient: "from-teal-700 to-teal-900", border: "border-teal-500/50", light: "bg-teal-950/50", textLight: "text-teal-300" },
};

const initialVehicle: VehicleRegistration = {
  placa: "", interno: "", tipo: "", marca: "", linea: "", modelo: "", kilometraje: "", ruta: "", conductor: "", licenciaConduccion: "", inspector: "", fechaInspeccion: "", horaInspeccion: "",
};

const initialDocumentExpirations: DocumentExpirations = { soat: "", tecnomecanica: "", licencia: "" };

const requiredVehicleFields: Array<keyof VehicleRegistration> = [
  "placa", "tipo", "marca", "modelo", "kilometraje", "conductor", "licenciaConduccion", "inspector", "fechaInspeccion", "horaInspeccion",
];

const initialChecklistState: Record<string, Compliance> = checklistItems.reduce((acc, item) => {
  acc[item.id] = "Cumple";
  return acc;
}, {} as Record<string, Compliance>);

export default function Home() {
  const router = useRouter();
  const [sharedEmpresaId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("empresaId") ?? undefined;
  });
  const successShareCaptureRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState<VehicleRegistration>(initialVehicle);
  const [registeredVehicle, setRegisteredVehicle] = useState<VehicleRegistration | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, Compliance>>(initialChecklistState);
  const [observaciones, setObservaciones] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.keys(groupedChecklist).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
  );
  const [error, setError] = useState("");
  const [plateHint, setPlateHint] = useState("");
  const [isPrefillingPlate, setIsPrefillingPlate] = useState(false);
  const [lastPrefilledPlate, setLastPrefilledPlate] = useState("");
  const [lastPrefilledConductor, setLastPrefilledConductor] = useState("");
  const [documentExpirations, setDocumentExpirations] = useState<DocumentExpirations>(initialDocumentExpirations);
  const [requiresLicenseExpirationUpdate, setRequiresLicenseExpirationUpdate] = useState(false);
  const [dailyPlateLocked, setDailyPlateLocked] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    placa: string; concepto: Concepto; noCumpleCriticos: string[]; shareMessage: string;
  } | null>(null);
  const [isSharingSuccessImage, setIsSharingSuccessImage] = useState(false);
  const [autoExpiredChecklistItems, setAutoExpiredChecklistItems] = useState({ doc_soat: false, doc_tecno: false, doc_licencia: false });
  const [successShareStatus, setSuccessShareStatus] = useState("");

  const missingVehicleFields = useMemo(
    () => requiredVehicleFields.filter((field) => !vehicleDraft[field].trim()),
    [vehicleDraft],
  );

  const lineasDisponibles = useMemo(() => {
    const key = normalizeBrand(vehicleDraft.marca);
    return LINEAS_POR_MARCA[key] ?? [];
  }, [vehicleDraft.marca]);

  const expiredDocuments = useMemo(() => {
    const today = getBogotaTodayString();
    return {
      soat: isDocumentExpired(documentExpirations.soat, today),
      tecnomecanica: isDocumentExpired(documentExpirations.tecnomecanica, today),
      licencia: isDocumentExpired(documentExpirations.licencia, today),
    };
  }, [documentExpirations.soat, documentExpirations.tecnomecanica, documentExpirations.licencia]);

  const expiredDocumentLabels = useMemo(() => {
    const labels: string[] = [];
    if (expiredDocuments.soat) labels.push("SOAT");
    if (expiredDocuments.tecnomecanica) labels.push("Tecnomecánica");
    if (expiredDocuments.licencia) labels.push("Licencia");
    return labels;
  }, [expiredDocuments.soat, expiredDocuments.tecnomecanica, expiredDocuments.licencia]);

  const findings = useMemo(() => {
    const noCumpleCriticos = checklistItems
      .filter((item) => item.critical && checklistState[item.id] === "No cumple")
      .map((item) => item.label);

    const noCumpleNoCriticos = checklistItems
      .filter((item) => !item.critical && checklistState[item.id] === "No cumple")
      .map((item) => item.label);

    return {
      noCumpleCriticos,
      noCumpleNoCriticos,
      hasAnyNoCumple: noCumpleCriticos.length > 0 || noCumpleNoCriticos.length > 0,
    };
  }, [checklistState]);

  const conceptoSugerido: Concepto = useMemo(() => {
    if (findings.noCumpleCriticos.length > 0) return "No apto";
    if (findings.noCumpleNoCriticos.length > 0) return "Apto con observaciones";
    return "Apto";
  }, [findings.noCumpleCriticos.length, findings.noCumpleNoCriticos.length]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const checkPlateLockForDate = async (rawPlate: string, rawDate: string) => {
    const normalizedPlate = normalizePlate(rawPlate);
    if (!normalizedPlate || normalizedPlate.length < 5) {
      setDailyPlateLocked(false);
      return;
    }
    const targetDate = resolveInspectionValidationDate(rawDate);

    try {
      const response = await fetch(
        `/api/inspections/plate/${encodeURIComponent(normalizedPlate)}?date=${encodeURIComponent(targetDate)}`,
        { cache: "no-store" },
      );
      if (response.status === 404) { setDailyPlateLocked(false); return; }
      if (!response.ok) return;

      const data = (await response.json()) as { alreadyRegisteredForDate?: boolean };
      setDailyPlateLocked(Boolean(data.alreadyRegisteredForDate));
    } catch (lookupError) {
      console.error("Error checking plate lock date:", lookupError);
    }
  };

  const PLATE_REGEX = /^[A-Z]{3}[0-9]{2,3}[A-Z]?$/;

  const handlePlateBlur = async () => {
    const normalizedPlate = normalizePlate(vehicleDraft.placa);
    const targetDate = resolveInspectionValidationDate(vehicleDraft.fechaInspeccion);
    setVehicleDraft((prev) => ({ ...prev, placa: normalizedPlate }));
    setDailyPlateLocked(false);

    if (!normalizedPlate || normalizedPlate.length < 5) return;

    if (!PLATE_REGEX.test(normalizedPlate)) {
      setPlateHint("Formato de placa inválido. Usa el formato ABC123 (3 letras seguidas de 2 o 3 números).");
      setIsPrefillingPlate(false);
      return;
    }

    setPlateHint("");
    setIsPrefillingPlate(true);

    try {
      const response = await fetch(`/api/inspections/plate/${encodeURIComponent(normalizedPlate)}?date=${encodeURIComponent(targetDate)}`, {
        cache: "no-store",
      });

      if (response.status === 404) {
        setPlateHint("No hay historial para esta placa. Puedes diligenciar los datos manualmente.");
        setLastPrefilledPlate("");
        return;
      }

      if (!response.ok) {
        let backendMessage = "No se pudieron autocompletar los datos por placa en este momento.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) backendMessage = payload.error;
        } catch {}
        setPlateHint(backendMessage);
        setLastPrefilledPlate("");
        return;
      }

      const data = (await response.json()) as {
        placa: string; interno: string; tipo: string; marca: string; linea: string; modelo: string; kilometraje: string; ruta: string; conductor: string; licencia: string; inspector: string; fecha: string; hora: string; checklist: string; alreadyRegisteredForDate?: boolean;
      };

      if (data.alreadyRegisteredForDate) {
        setDailyPlateLocked(true);
        setPlateHint("");
      } else {
        setDailyPlateLocked(false);
      }

      const previousDocumentExpirations = extractDocumentExpirationsFromChecklist(data.checklist);

      setVehicleDraft((prev) => ({
        ...prev,
        placa: data.placa,
        interno: data.interno,
        tipo: data.tipo,
        marca: data.marca,
        linea: data.linea,
        modelo: data.modelo,
        kilometraje: data.kilometraje,
        ruta: data.ruta,
        conductor: data.conductor,
        licenciaConduccion: data.licencia,
        inspector: data.inspector,
        fechaInspeccion: prev.fechaInspeccion || data.fecha,
        horaInspeccion: prev.horaInspeccion || data.hora,
      }));
      setDocumentExpirations(previousDocumentExpirations);
      setRequiresLicenseExpirationUpdate(false);
      setLastPrefilledConductor(data.conductor.trim().toLowerCase());
      setLastPrefilledPlate(normalizedPlate);
      if (!data.alreadyRegisteredForDate) {
        setPlateHint("Se cargaron datos previos de esta placa. Puedes actualizar kilometraje, ruta, conductor y demás campos.");
      }
    } catch (lookupError) {
      console.error("Error fetching plate data:", lookupError);
      setPlateHint("No se pudieron autocompletar los datos por placa en este momento.");
    } finally {
      setIsPrefillingPlate(false);
    }
  };

  useEffect(() => {
    const plate = normalizePlate(vehicleDraft.placa);
    const date = vehicleDraft.fechaInspeccion.trim();
    if (!plate || plate.length < 5 || !date) return;
    void checkPlateLockForDate(plate, date);
  }, [vehicleDraft.fechaInspeccion]);

  useEffect(() => {
    const currentConductor = vehicleDraft.conductor.trim().toLowerCase();
    if (!currentConductor || !lastPrefilledConductor) return;

    if (currentConductor !== lastPrefilledConductor) {
      setRequiresLicenseExpirationUpdate(true);
      setDocumentExpirations((prev) => ({ ...prev, licencia: "" }));
      return;
    }
    setRequiresLicenseExpirationUpdate(false);
  }, [vehicleDraft.conductor, lastPrefilledConductor]);

  useEffect(() => {
    setChecklistState((current) => {
      const next = { ...current };
      const nextAuto = { ...autoExpiredChecklistItems };
      let changed = false;

      if (expiredDocuments.soat) {
        if (next.doc_soat !== "No cumple") { next.doc_soat = "No cumple"; changed = true; }
        nextAuto.doc_soat = true;
      } else if (autoExpiredChecklistItems.doc_soat && next.doc_soat === "No cumple") {
        next.doc_soat = "Cumple";
        changed = true;
        nextAuto.doc_soat = false;
      }

      if (expiredDocuments.tecnomecanica) {
        if (next.doc_tecno !== "No cumple") { next.doc_tecno = "No cumple"; changed = true; }
        nextAuto.doc_tecno = true;
      } else if (autoExpiredChecklistItems.doc_tecno && next.doc_tecno === "No cumple") {
        next.doc_tecno = "Cumple";
        changed = true;
        nextAuto.doc_tecno = false;
      }

      if (expiredDocuments.licencia) {
        if (next.doc_licencia !== "No cumple") { next.doc_licencia = "No cumple"; changed = true; }
        nextAuto.doc_licencia = true;
      } else if (autoExpiredChecklistItems.doc_licencia && next.doc_licencia === "No cumple") {
        next.doc_licencia = "Cumple";
        changed = true;
        nextAuto.doc_licencia = false;
      }

      if (changed) {
        setAutoExpiredChecklistItems(nextAuto);
        return next;
      }

      if (
        nextAuto.doc_soat !== autoExpiredChecklistItems.doc_soat ||
        nextAuto.doc_tecno !== autoExpiredChecklistItems.doc_tecno ||
        nextAuto.doc_licencia !== autoExpiredChecklistItems.doc_licencia
      ) {
        setAutoExpiredChecklistItems(nextAuto);
      }

      return current;
    });
  }, [expiredDocuments.soat, expiredDocuments.tecnomecanica, expiredDocuments.licencia, autoExpiredChecklistItems]);

  const handleNuevoRegistro = () => {
    setVehicleDraft(initialVehicle); setRegisteredVehicle(null); setChecklistState(initialChecklistState); setObservaciones(""); setError(""); setPlateHint(""); setIsPrefillingPlate(false); setLastPrefilledPlate(""); setLastPrefilledConductor(""); setDocumentExpirations(initialDocumentExpirations); setRequiresLicenseExpirationUpdate(false); setDailyPlateLocked(false); setSuccessModal(null); setSuccessShareStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRegisterVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSuccessModal(null); setSuccessShareStatus("");

    if (missingVehicleFields.length > 0) {
      setError("Completa los campos obligatorios del encabezado para registrar el vehiculo.");
      return;
    }

    const plateToCheck = normalizePlate(vehicleDraft.placa);
    const PLATE_REGEX_REG = /^[A-Z]{3}[0-9]{2,3}[A-Z]?$/;
    if (!PLATE_REGEX_REG.test(plateToCheck)) {
      setError("El formato de la placa es inválido. Debe ser tipo ABC123 (3 letras seguidas de 2 o 3 números).");
      return;
    }

    if (dailyPlateLocked) {
      setError(DUPLICATE_DAILY_PLATE_MESSAGE);
      return;
    }

    setRegisteredVehicle({ ...vehicleDraft, placa: normalizePlate(vehicleDraft.placa) });
  };

  // ─── ENDPOINT SUBMIT OPTIMIZADO ───────────────────────────────────────────
  const handleSubmitInspection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!registeredVehicle) {
      setError("Primero debes registrar el vehiculo en el encabezado.");
      return;
    }

    const activeVehicle = { ...vehicleDraft, placa: normalizePlate(vehicleDraft.placa) };
    const missingActiveVehicleFields = requiredVehicleFields.filter((field) => !activeVehicle[field].trim());

    if (missingActiveVehicleFields.length > 0) {
      setError("Completa los campos obligatorios del encabezado antes de guardar la inspeccion.");
      return;
    }

    if (dailyPlateLocked) {
      setError(DUPLICATE_DAILY_PLATE_MESSAGE);
      return;
    }

    if (!documentExpirations.soat || !documentExpirations.tecnomecanica) {
      setError("Registra las fechas de vencimiento de SOAT y tecnomecánica para continuar.");
      return;
    }

    if (!documentExpirations.licencia || requiresLicenseExpirationUpdate) {
      setError("Debes registrar la fecha de vencimiento de la licencia del conductor actual.");
      return;
    }

    if (findings.hasAnyNoCumple && !observaciones.trim()) {
      setError("Debes diligenciar observaciones cuando exista al menos un item en 'No cumple'.");
      return;
    }

    try {
      const checklist = checklistItems.map((item) => {
        const stateVal = checklistState[item.id];
        const estadoNormalizado = stateVal === "Cumple" ? "ok" : stateVal === "No cumple" ? "falla" : "na";
        
        return {
          id: item.id,
          item: item.label,
          label: item.label,
          categoria: item.section,
          seccion: item.section,
          criticidad: item.critical ? "Critico" : "No critico",
          critical: item.critical,
          estado: estadoNormalizado,
          estado_original: stateVal,
          obs: stateVal === "No cumple" ? observaciones : "",
          vencimiento:
            item.id === "doc_soat"
              ? documentExpirations.soat
              : item.id === "doc_tecno"
                ? documentExpirations.tecnomecanica
                : item.id === "doc_licencia"
                  ? documentExpirations.licencia
                  : undefined,
        };
      });

      const response = await fetch("/api/inspecciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: sharedEmpresaId,
          placa: activeVehicle.placa,
          vehiculoId: activeVehicle.placa,
          interno: activeVehicle.interno,
          tipo: activeVehicle.tipo,
          marca: activeVehicle.marca,
          linea: activeVehicle.linea,
          modelo: activeVehicle.modelo,
          kilometraje: activeVehicle.kilometraje,
          ruta: activeVehicle.ruta,
          conductor: activeVehicle.conductor,
          licencia: activeVehicle.licenciaConduccion,
          inspector: activeVehicle.inspector,
          fecha: activeVehicle.fechaInspeccion,
          hora: activeVehicle.horaInspeccion,
          concepto: conceptoSugerido,
          observaciones,
          checklist,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (response.status === 409) throw new Error(DUPLICATE_DAILY_PLATE_MESSAGE);
        throw new Error(payload.error ?? "No se pudo guardar la inspección.");
      }
    } catch (error) {
      console.error("Error saving inspection:", error);
      setError(
        error instanceof Error && error.message
          ? error.message
          : "No fue posible guardar la inspección. Intenta nuevamente.",
      );
      return;
    }

    const formUrl = `${window.location.origin}/sistema${sharedEmpresaId ? `?empresaId=${encodeURIComponent(sharedEmpresaId)}` : ""}`;

    setSuccessModal({
      placa: activeVehicle.placa,
      concepto: conceptoSugerido,
      noCumpleCriticos: findings.noCumpleCriticos,
      shareMessage: buildInspectionSuccessShareMessage({
        placa: activeVehicle.placa,
        fecha: activeVehicle.fechaInspeccion,
        hora: activeVehicle.horaInspeccion,
        concepto: conceptoSugerido,
        noCumpleCriticos: findings.noCumpleCriticos,
        inspector: activeVehicle.inspector,
        formUrl,
      }),
    });
    setSuccessShareStatus("");
    setVehicleDraft(initialVehicle);
    setRegisteredVehicle(null);
    setChecklistState(initialChecklistState);
    setObservaciones("");
    setDocumentExpirations(initialDocumentExpirations);
    setRequiresLicenseExpirationUpdate(false);
    setDailyPlateLocked(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 ${isDarkMode ? "bg-[#0b0e14]" : "bg-[radial-gradient(circle_at_top_left,_#b8ccf0_0%,_#d6e3fb_45%,_#f5f9ff_100%)]"}`}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push("/login")} title="Admin" className={`group flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition sm:h-10 sm:px-4 ${isDarkMode ? "border-slate-600 bg-slate-800/60 text-slate-400 hover:border-slate-400 hover:text-slate-200" : "border-slate-300 bg-white/70 text-slate-500 hover:border-slate-500 hover:text-slate-800"}`}>
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
              <span className="tracking-wide">Admin</span>
            </button>
          </div>
          <button type="button" onClick={() => setIsDarkMode((prev) => !prev)} className={`h-9 rounded-full border px-4 text-xs font-bold uppercase tracking-wide transition sm:h-10 sm:text-sm ${isDarkMode ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20" : "border-blue-700/40 bg-blue-700 text-white hover:bg-blue-800"}`}>
            {isDarkMode ? "Modo de dia" : "Modo oscuro"}
          </button>
        </div>

        <section className={`relative overflow-visible rounded-xl border shadow-[0_16px_40px_-24px_rgba(0,0,0,0.25)] sm:rounded-2xl ${isDarkMode ? "border-zinc-700 bg-[#13161f]" : "border-blue-200 bg-white"}`}>
          <div className={`border-b px-4 py-4 sm:px-6 sm:py-5 ${isDarkMode ? "border-zinc-700 bg-gradient-to-r from-zinc-800 to-zinc-900 text-white" : "border-blue-200 bg-gradient-to-r from-blue-700 to-blue-800 text-white"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Inspeccion preoperacional PESV</p>
            <div className="mt-1 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Encabezado de registro del vehiculo</h1>
              <button type="button" onClick={handleNuevoRegistro} className="h-11 w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-300 backdrop-blur-sm transition hover:bg-cyan-500/20 sm:h-auto sm:w-auto sm:py-2">+ Nuevo registro</button>
            </div>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-zinc-400" : "text-blue-100"}`}>Este registro se diligencia antes del checklist para asociar cada inspeccion a un carro y una placa.</p>
          </div>

          <form className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 lg:grid-cols-4" onSubmit={handleRegisterVehicle}>
            <Field isDarkMode={isDarkMode} label="Placa *" value={vehicleDraft.placa} placeholder="ABC123" onChange={(value) => { setVehicleDraft((prev) => ({ ...prev, placa: value })); setDailyPlateLocked(false); }} onBlur={handlePlateBlur} />
            <Field isDarkMode={isDarkMode} label="Número de celular" value={vehicleDraft.interno} placeholder="Movil 12" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, interno: value }))} />
            <ComboField isDarkMode={isDarkMode} label="Tipo de vehiculo *" value={vehicleDraft.tipo} placeholder="Busca o escribe el tipo..." options={TIPOS_VEHICULO} onChange={(value) => setVehicleDraft((prev) => ({ ...prev, tipo: value }))} />
            <ComboField isDarkMode={isDarkMode} label="Marca *" value={vehicleDraft.marca} placeholder="Busca o escribe la marca..." options={MARCAS_VEHICULO} onChange={(value) => setVehicleDraft((prev) => ({ ...prev, marca: value }))} />
            <ComboField isDarkMode={isDarkMode} label="Linea" value={vehicleDraft.linea} placeholder={vehicleDraft.marca.trim() ? "Selecciona o escribe una linea..." : "Primero selecciona una marca"} options={lineasDisponibles} onChange={(value) => setVehicleDraft((prev) => ({ ...prev, linea: value }))} />
            <Field isDarkMode={isDarkMode} label="Modelo *" value={vehicleDraft.modelo} placeholder="2023" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, modelo: value }))} />
            <Field isDarkMode={isDarkMode} label="Kilometraje *" value={vehicleDraft.kilometraje} placeholder="63800" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, kilometraje: value }))} />
            <Field isDarkMode={isDarkMode} label="Ruta" value={vehicleDraft.ruta} placeholder="Bodega - Cliente" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, ruta: value }))} />
            <Field isDarkMode={isDarkMode} label="Conductor *" value={vehicleDraft.conductor} placeholder="Nombre completo" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, conductor: value }))} />
            <Field isDarkMode={isDarkMode} label="Licencia de conduccion *" value={vehicleDraft.licenciaConduccion} placeholder="12345678" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, licenciaConduccion: value }))} />
            <Field isDarkMode={isDarkMode} label="Inspector responsable *" value={vehicleDraft.inspector} placeholder="Nombre del inspector" onChange={(value) => setVehicleDraft((prev) => ({ ...prev, inspector: value }))} />
            <DateField isDarkMode={isDarkMode} label="Fecha de inspeccion *" value={vehicleDraft.fechaInspeccion} onChange={(value) => setVehicleDraft((prev) => ({ ...prev, fechaInspeccion: value }))} />
            <TimeField isDarkMode={isDarkMode} label="Hora de inspeccion *" value={vehicleDraft.horaInspeccion} onChange={(value) => setVehicleDraft((prev) => ({ ...prev, horaInspeccion: value }))} />

            <div className="flex flex-col gap-3 pt-2 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center lg:col-span-4">
              <button type="submit" className={`h-11 w-full rounded-lg px-5 text-sm font-semibold text-white transition sm:w-auto ${isDarkMode ? "bg-cyan-600 hover:bg-cyan-500" : "bg-blue-700 hover:bg-blue-800"}`}>Registrar encabezado</button>
              {isPrefillingPlate ? <p className={`text-sm ${isDarkMode ? "text-cyan-300" : "text-blue-700"}`}>Consultando historial de la placa...</p> : null}
              {plateHint ? <p className={`text-sm ${isDarkMode ? "text-zinc-300" : "text-slate-600"}`}>{plateHint}</p> : null}
              {dailyPlateLocked ? <p className={`rounded-lg border px-3 py-2 text-sm font-semibold ${isDarkMode ? "border-rose-700 bg-rose-950/50 text-rose-300" : "border-rose-300 bg-rose-100 text-rose-800"}`}>{DUPLICATE_DAILY_PLATE_MESSAGE}</p> : null}
              {registeredVehicle ? <p className={`rounded-lg border px-3 py-2 text-sm font-medium ${isDarkMode ? "border-emerald-700 bg-emerald-950/50 text-emerald-300" : "border-emerald-300 bg-emerald-100 text-emerald-800"}`}>Vehiculo activo: {registeredVehicle.placa} - {registeredVehicle.marca} {registeredVehicle.modelo}</p> : <p className={`text-sm ${isDarkMode ? "text-zinc-500" : "text-slate-600"}`}>Debes registrar el encabezado para habilitar la inspeccion.</p>}
            </div>
          </form>
        </section>

        <section className={`rounded-xl border p-4 shadow-sm sm:rounded-2xl sm:p-6 ${isDarkMode ? "border-zinc-700 bg-[#13161f]" : "border-blue-200 bg-white"}`}>
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <h2 className={`text-lg font-bold sm:text-xl ${isDarkMode ? "text-zinc-100" : "text-slate-900"}`}>Checklist de requisitos PESV</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${registeredVehicle ? "bg-emerald-900/60 text-emerald-300" : "bg-rose-900/60 text-rose-300"}`}>{registeredVehicle ? "Habilitado" : "Bloqueado hasta registrar encabezado"}</span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmitInspection}>
            <div className={`rounded-xl border p-4 ${isDarkMode ? "border-zinc-700 bg-zinc-800/50" : "border-blue-200 bg-blue-50/60"}`}>
              <div className="mb-3">
                <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>Documentacion - Fechas de vencimiento</h3>
                <p className={`mt-1 text-xs ${isDarkMode ? "text-zinc-500" : "text-slate-500"}`}>Estas fechas se reutilizan por placa. Solo actualiza la licencia cuando cambie el conductor.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <DateField isDarkMode={isDarkMode} label="Vencimiento SOAT *" value={documentExpirations.soat} onChange={(value) => setDocumentExpirations((prev) => ({ ...prev, soat: value }))} />
                <DateField isDarkMode={isDarkMode} label="Vencimiento tecnomecanica *" value={documentExpirations.tecnomecanica} onChange={(value) => setDocumentExpirations((prev) => ({ ...prev, tecnomecanica: value }))} />
                <DateField isDarkMode={isDarkMode} label={requiresLicenseExpirationUpdate ? "Nueva fecha licencia *" : "Vencimiento licencia *"} value={documentExpirations.licencia} onChange={(value) => { setDocumentExpirations((prev) => ({ ...prev, licencia: value })); if (value) { setRequiresLicenseExpirationUpdate(false); } }} />
              </div>
              {requiresLicenseExpirationUpdate ? <p className={`mt-2 text-xs font-semibold ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>Detectamos cambio de conductor. Debes registrar la nueva fecha de vencimiento de licencia.</p> : null}
              {expiredDocumentLabels.length > 0 ? <p className={`mt-2 text-xs font-semibold ${isDarkMode ? "text-rose-300" : "text-rose-700"}`}>Documentación vencida: {expiredDocumentLabels.join(", ")}.</p> : null}
            </div>

            {Object.entries(groupedChecklist).map(([sectionName, items]) => {
              const criticalIssues = items.filter((item) => item.critical && checklistState[item.id] === "No cumple").length;
              const minorIssues = items.filter((item) => !item.critical && checklistState[item.id] === "No cumple").length;
              const noAplicaCount = items.filter((item) => checklistState[item.id] === "No aplica").length;
              return (
                <AccordionSection key={sectionName} name={sectionName} items={items} isOpen={openSections[sectionName] ?? true} criticalIssues={criticalIssues} minorIssues={minorIssues} noAplicaCount={noAplicaCount} isDarkMode={isDarkMode} onToggle={() => toggleSection(sectionName)} checklistState={checklistState} disabled={!registeredVehicle}
                  onItemChange={(id, value) => {
                    if (isDocumentationChecklistItem(id)) {
                      setAutoExpiredChecklistItems((prev) => ({ ...prev, [id]: false }));
                    }

                    if (isDocumentationChecklistItem(id) && ((id === "doc_soat" && expiredDocuments.soat) || (id === "doc_tecno" && expiredDocuments.tecnomecanica) || (id === "doc_licencia" && expiredDocuments.licencia))) {
                      setChecklistState((prev) => ({ ...prev, [id]: "No cumple" }));
                      return;
                    }

                    setChecklistState((prev) => ({ ...prev, [id]: value }));
                  }}
                />
              );
            })}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={`mb-1 block text-sm font-semibold ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>Observaciones (obligatorio si hay No cumple)</label>
                <textarea rows={4} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} disabled={!registeredVehicle} placeholder="Registrar hallazgos, acciones correctivas y responsable." className={`w-full rounded-lg border px-3 py-2 text-base outline-none transition disabled:opacity-50 sm:text-sm ${isDarkMode ? "border-zinc-600 bg-zinc-800 text-zinc-100 placeholder-zinc-500 ring-cyan-500/30 focus:border-cyan-500 focus:ring" : "border-blue-200 bg-white text-slate-900 placeholder-slate-500 ring-blue-300 focus:border-blue-500 focus:ring"}`} />
              </div>
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-zinc-700 bg-zinc-800/50" : "border-blue-200 bg-blue-50/60"}`}>
                <p className={`text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-slate-700"}`}>Concepto sugerido por el sistema</p>
                <p className={`mt-2 text-2xl font-bold ${isDarkMode ? "text-zinc-100" : "text-slate-900"}`}>{conceptoSugerido}</p>
                <p className={`mt-3 text-xs ${isDarkMode ? "text-zinc-500" : "text-slate-600"}`}>Regla: cualquier no conformidad critica marca No apto. Si solo hay no conformidades no criticas, el concepto es Apto con observaciones.</p>
                <p className={`mt-2 text-xs ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>Si presenta alguna falla, comunicarse con su desarrollador.</p>
              </div>
            </div>

            {error ? <p className="text-sm font-semibold text-rose-400">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="submit" disabled={!registeredVehicle || dailyPlateLocked} className={`h-11 w-full rounded-lg px-6 text-sm font-semibold text-white transition sm:w-auto ${isDarkMode ? "bg-cyan-600 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500" : "bg-blue-700 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"}`}>Guardar inspeccion</button>
              <button type="button" onClick={() => { setChecklistState(initialChecklistState); setObservaciones(""); setSuccessModal(null); setError(""); }} className={`h-11 w-full rounded-lg border px-6 text-sm font-semibold transition sm:w-auto ${isDarkMode ? "border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"}`}>Restablecer checklist</button>
              <button type="button" onClick={handleNuevoRegistro} className={`h-11 w-full rounded-lg border px-6 text-sm font-semibold transition sm:w-auto ${isDarkMode ? "border-violet-500/50 bg-violet-900/30 text-violet-300 hover:bg-violet-900/50" : "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200"}`}>+ Nuevo registro</button>
            </div>
          </form>
        </section> 
        {successModal && (
          <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-2xl dark:bg-zinc-900">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-center text-xl font-bold text-slate-900">¡Registro creado con éxito!</h2>
                <p className="mt-2 text-center text-sm text-slate-500">La inspección fue guardada correctamente.</p>
                <p className="mt-1 text-center text-sm font-semibold text-slate-700">Placa: {successModal.placa}</p>
                <div className="mt-4 flex justify-center">
                  <span className={`rounded-full border px-4 py-1.5 text-sm font-bold ${successModal.concepto === "Apto" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : successModal.concepto === "No apto" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>{successModal.concepto}</span>
                </div>
                {successModal.noCumpleCriticos.length > 0 && (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">Hallazgos críticos:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-rose-600">
                      {successModal.noCumpleCriticos.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
                <button type="button" disabled={isSharingSuccessImage}
                  onClick={async () => {
                    if (!successShareCaptureRef.current) { setSuccessShareStatus("No se encontró la tarjeta para generar la imagen."); return; }
                    try {
                      setIsSharingSuccessImage(true); setSuccessShareStatus(""); await waitForNextPaint(); await waitForNextPaint();
                      const result = await shareInspectionSuccessCardAsImage(successShareCaptureRef.current, successModal.shareMessage);
                      if (result === "shared") { setSuccessShareStatus("Imagen compartida correctamente."); } else { setSuccessShareStatus("Imagen descargada. Adjunta el archivo en WhatsApp si no se abrió el selector de apps."); }
                    } catch (shareError) { console.error("Error sharing success card image:", shareError); setSuccessShareStatus("No fue posible compartir la imagen en este dispositivo."); } finally { setIsSharingSuccessImage(false); }
                  }}
                  className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                >Compartir registro</button>
                {successShareStatus ? <p className="mt-2 text-center text-xs font-medium text-slate-500">{successShareStatus}</p> : null}
                <button type="button" onClick={() => setSuccessModal(null)} className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">Aceptar</button>
              </div>
            </div>

            <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0" aria-hidden="true">
              <div ref={successShareCaptureRef} style={{ width: "1080px", height: "1920px", background: "linear-gradient(180deg, #dbeafe 0%, #eff6ff 38%, #ffffff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "96px", boxSizing: "border-box" }}>
                <div style={{ width: "760px", background: "#ffffff", borderRadius: "28px", border: "1px solid #cbd5e1", boxShadow: "0 26px 80px rgba(15, 23, 42, 0.18)", padding: "48px", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", color: "#0f172a" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                    <div style={{ height: "84px", width: "84px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a", fontSize: "42px", fontWeight: 800 }}>✓</div>
                  </div>
                  <h2 style={{ margin: 0, textAlign: "center", fontSize: "46px", lineHeight: 1.15, fontWeight: 800 }}>Registro creado con éxito</h2>
                  <p style={{ marginTop: "14px", marginBottom: 0, textAlign: "center", fontSize: "28px", color: "#475569" }}>La inspección fue guardada correctamente.</p>
                  <div style={{ marginTop: "30px", display: "flex", justifyContent: "center" }}>
                    <span style={{ borderRadius: "9999px", border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#047857", padding: "10px 22px", fontSize: "28px", fontWeight: 800 }}>{successModal.concepto}</span>
                  </div>
                  {successModal.noCumpleCriticos.length > 0 ? (
                    <div style={{ marginTop: "28px", borderRadius: "16px", border: "1px solid #fecaca", background: "#fff1f2", padding: "18px" }}>
                      <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#be123c" }}>Hallazgos críticos:</p>
                      <ul style={{ marginTop: "10px", marginBottom: 0, paddingLeft: "28px", color: "#be123c" }}>
                        {successModal.noCumpleCriticos.map((item) => <li key={item} style={{ fontSize: "22px", marginBottom: "6px" }}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        {isSharingSuccessImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-2xl dark:bg-zinc-900">
              <div className="mb-4 flex justify-center">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
              </div>
              <h2 className="text-center text-xl font-bold text-slate-900">Preparando imagen</h2>
              <p className="mt-2 text-center text-sm text-slate-500">Estamos generando tu registro para compartir.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

type ComboFieldProps = { isDarkMode: boolean; label: string; value: string; options: string[]; onChange: (value: string) => void; placeholder?: string; };

function ComboField({ isDarkMode, label, value, options, onChange, placeholder }: ComboFieldProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [value, options]);

  useEffect(() => {
    if (!open || !inputRef.current) { setDropdownPos(null); return; }
    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const handleBlur = () => { closeTimer.current = setTimeout(() => setOpen(false), 150); };
  const handleSelect = (option: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); onChange(option); setOpen(false); };

  return (
    <div className="relative flex min-w-0 flex-col gap-1">
      <label className={`text-sm font-semibold ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{label}</label>
      <div className="relative">
        <input ref={inputRef} value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={handleBlur} placeholder={placeholder} autoComplete="off" className={`h-11 w-full rounded-lg border px-3 pr-9 text-base outline-none transition sm:text-sm ${isDarkMode ? "border-zinc-600 bg-zinc-800 text-zinc-100 placeholder-zinc-500 ring-cyan-500/30 focus:border-cyan-500 focus:ring" : "border-blue-200 bg-white text-slate-900 placeholder-slate-500 ring-blue-300 focus:border-blue-500 focus:ring"}`} />
        <svg className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && filtered.length > 0 && dropdownPos && (
        <ul className={`fixed z-50 max-h-56 overflow-y-auto rounded-xl border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)] backdrop-blur-sm ${isDarkMode ? "border-zinc-600" : "border-blue-200"}`} style={{ background: isDarkMode ? "#1a1d27" : "#ffffff", top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px`, width: `${dropdownPos.width}px` }}>
          {filtered.map((option) => (
            <li key={option}>
              <button type="button" onMouseDown={() => handleSelect(option)} className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${isDarkMode ? "hover:bg-cyan-500/10 hover:text-cyan-300" : "hover:bg-blue-100 hover:text-blue-700"} ${value === option ? isDarkMode ? "bg-cyan-900/40 text-cyan-300 font-semibold" : "bg-blue-100 text-blue-800 font-semibold" : isDarkMode ? "text-zinc-200" : "text-slate-700"}`}>
                {value === option && <svg className="mr-2 h-3.5 w-3.5 shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type FieldProps = { isDarkMode: boolean; label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; placeholder?: string; };
function Field({ isDarkMode, label, value, onChange, onBlur, placeholder }: FieldProps) {
  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label className={`text-sm font-semibold ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} placeholder={placeholder} className={`h-11 rounded-lg border px-3 text-base outline-none transition sm:text-sm ${isDarkMode ? "border-zinc-600 bg-zinc-800 text-zinc-100 placeholder-zinc-500 ring-cyan-500/30 focus:border-cyan-500 focus:ring" : "border-blue-200 bg-white text-slate-900 placeholder-slate-500 ring-blue-300 focus:border-blue-500 focus:ring"}`} />
    </div>
  );
}

type DateFieldProps = { isDarkMode: boolean; label: string; value: string; onChange: (value: string) => void; };
function DateField({ isDarkMode, label, value, onChange }: DateFieldProps) {
  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label className={`text-sm font-semibold ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{label}</label>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`h-11 rounded-lg border px-3 text-base outline-none transition sm:text-sm ${isDarkMode ? "border-zinc-600 bg-zinc-800 text-zinc-100 ring-cyan-500/30 focus:border-cyan-500 focus:ring" : "border-blue-200 bg-white text-slate-900 ring-blue-300 focus:border-blue-500 focus:ring"}`} />
    </div>
  );
}

type TimeFieldProps = { isDarkMode: boolean; label: string; value: string; onChange: (value: string) => void; };
function TimeField({ isDarkMode, label, value, onChange }: TimeFieldProps) {
  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label className={`text-sm font-semibold ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{label}</label>
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} className={`h-11 rounded-lg border px-3 text-base outline-none transition sm:text-sm ${isDarkMode ? "border-zinc-600 bg-zinc-800 text-zinc-100 ring-cyan-500/30 focus:border-cyan-500 focus:ring" : "border-blue-200 bg-white text-slate-900 ring-blue-300 focus:border-blue-500 focus:ring"}`} />
    </div>
  );
}

type AccordionSectionProps = { isDarkMode: boolean; name: string; items: ChecklistItem[]; isOpen: boolean; criticalIssues: number; minorIssues: number; noAplicaCount: number; onToggle: () => void; checklistState: Record<string, Compliance>; disabled: boolean; onItemChange: (id: string, value: Compliance) => void; };

function AccordionSection({ isDarkMode, name, items, isOpen, criticalIssues, minorIssues, noAplicaCount, onToggle, checklistState, disabled, onItemChange }: AccordionSectionProps) {
  const meta = sectionMeta[name] ?? { icon: "📌", gradient: isDarkMode ? "from-zinc-600 to-zinc-700" : "from-blue-600 to-blue-700", border: isDarkMode ? "border-zinc-600" : "border-blue-300", light: isDarkMode ? "bg-zinc-800/60" : "bg-blue-50", textLight: isDarkMode ? "text-zinc-300" : "text-blue-700" };
  const statusLabel = criticalIssues > 0 ? `${criticalIssues} critico${criticalIssues > 1 ? "s" : ""}` : minorIssues > 0 ? `${minorIssues} observacion${minorIssues > 1 ? "es" : ""}` : noAplicaCount > 0 ? `${noAplicaCount} no aplica` : "OK";
  const statusStyle = criticalIssues > 0 ? isDarkMode ? "border-rose-700 bg-rose-950/60 text-rose-300" : "border-rose-300 bg-rose-100 text-rose-700" : minorIssues > 0 ? isDarkMode ? "border-amber-700 bg-amber-950/60 text-amber-300" : "border-amber-300 bg-amber-100 text-amber-700" : noAplicaCount > 0 ? isDarkMode ? "border-sky-700 bg-sky-950/60 text-sky-300" : "border-sky-300 bg-sky-100 text-sky-700" : isDarkMode ? "border-emerald-700 bg-emerald-950/60 text-emerald-300" : "border-emerald-300 bg-emerald-100 text-emerald-700";

  return (
    <div className={`overflow-hidden rounded-xl border-2 shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl ${isOpen ? `${meta.border}` : isDarkMode ? "border-zinc-700" : "border-blue-200"}`}>
      <button type="button" onClick={onToggle} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-all duration-200 sm:gap-4 sm:px-5 sm:py-4 ${isOpen ? `bg-gradient-to-r ${meta.gradient} text-white` : `${meta.light} hover:brightness-95`}`}>
        <span className="text-2xl leading-none">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold uppercase tracking-wider ${isOpen ? "text-white" : meta.textLight}`}>{name}</p>
          <p className={`text-xs ${isOpen ? "text-white/70" : isDarkMode ? "text-zinc-500" : "text-slate-500"}`}>{items.length} items</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${statusStyle}`}>{statusLabel}</span>
        <svg className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : isDarkMode ? "text-zinc-500" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className={`overflow-hidden ${isDarkMode ? "bg-zinc-900/60" : "bg-blue-50/60"}`}>
          <div className="space-y-3 p-3 sm:p-4">
            {items.map((item) => <ChecklistRow isDarkMode={isDarkMode} key={item.id} item={item} value={checklistState[item.id]} disabled={disabled} onChange={(value) => onItemChange(item.id, value)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

type ChecklistRowProps = { isDarkMode: boolean; item: ChecklistItem; value: Compliance; disabled?: boolean; onChange: (value: Compliance) => void; };

function ChecklistRow({ isDarkMode, item, value, disabled, onChange }: ChecklistRowProps) {
  const options: Compliance[] = ["Cumple", "No cumple", "No aplica"];
  const selectedOptionStyle = (option: Compliance) => {
    if (option === "No cumple") return isDarkMode ? "border-rose-500 bg-rose-900/50 text-rose-300" : "border-rose-300 bg-rose-100 text-rose-700";
    if (option === "No aplica") return isDarkMode ? "border-sky-500 bg-sky-900/50 text-sky-300" : "border-sky-300 bg-sky-100 text-sky-700";
    return isDarkMode ? "border-emerald-500 bg-emerald-900/50 text-emerald-300" : "border-emerald-300 bg-emerald-100 text-emerald-700";
  };

  return (
    <div className={`rounded-lg border p-3 ${isDarkMode ? "border-zinc-700 bg-zinc-800/60" : "border-blue-200 bg-white"}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-slate-800"}`}>{item.label}</p>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${item.critical ? isDarkMode ? "bg-rose-950/70 text-rose-400" : "bg-rose-100 text-rose-700" : isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-blue-100 text-blue-700"}`}>{item.critical ? "Critico" : "No critico"}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button key={option} type="button" disabled={disabled} onClick={() => onChange(option)} className={`w-full rounded-lg border px-3 py-2 text-center text-xs font-semibold transition ${selected ? selectedOptionStyle(option) : isDarkMode ? "border-zinc-600 bg-zinc-700 text-zinc-300 hover:bg-zinc-600" : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"} disabled:cursor-not-allowed disabled:opacity-40`}>{option}</button>
          );
        })}
      </div>
    </div>
  );
}