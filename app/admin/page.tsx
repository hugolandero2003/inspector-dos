"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
// jsPDF, jspdf-autotable y xlsx se cargan de forma diferida (dynamic import)
// para evitar que sus grandes bundles (~2 MB) se carguen en el arranque.
import {
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PencilSquareIcon,
  SunIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type InspectionRecord = {
  id: string;
  vehiculo: {
    placa: string;
    interno: string;
    marca: string;
    modelo: string;
    linea: string;
    tipo: string;
    kilometraje: string;
    ruta: string;
    conductor: string;
    licenciaConduccion: string;
    inspector: string;
    fechaInspeccion: string;
    horaInspeccion: string;
  };
  inspeccion: {
    conceptoFinal: string;
    observaciones: string;
    fechaRegistro: string;
    fecha: string;
    checklist: Array<{
      id: string;
      item: string;
      estado: string;
      criticidad: string;
      seccion?: string;
      vencimiento?: string;
    }>;
  };
};

type ApiInspection = {
  id: string;
  vehiculo: {
    placa: string;
    interno?: string | null;
    tipo: string;
    marca: string;
    linea?: string | null;
    modelo?: string | null;
  };
  conductor: string;
  licencia: string;
  ruta?: string | null;
  kilometraje?: string | null;
  inspector: string;
  fecha: string;
  concepto: string;
  observaciones?: string | null;
  checklist: string;
  createdAt: string;
};

type VehicleGroup = {
  placa: string;
  records: InspectionRecord[];
  latest: InspectionRecord;
};

type EditInspectionForm = {
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
  conceptoFinal: string;
  observaciones: string;
  checklist: InspectionRecord["inspeccion"]["checklist"];
};

type DocumentExpirations = {
  soat: string;
  tecnomecanica: string;
  licencia: string;
};

type PendingNotifStatus = "pendiente" | "notificado" | "atendido";

type PendingPlateEntry = {
  placa: string;
  conductor: string;
  interno: string;
  tipo: string;
  marca: string;
  modelo: string;
  ruta: string;
  inspector: string;
  status: PendingNotifStatus;
};

const initialDocumentExpirations: DocumentExpirations = {
  soat: "-",
  tecnomecanica: "-",
  licencia: "-",
};

const ITEMS_PER_PAGE = 8;

function normalizePlate(plate: string | null | undefined) {
  return (plate ?? "").trim().toUpperCase();
}

function parseInspectionDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      isoDate: value.split("T")[0] ?? value,
      time: value.split("T")[1]?.slice(0, 5) ?? "",
      displayDate: value,
    };
  }

  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const time = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  const displayDate = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return { isoDate, time, displayDate };
}

function mapConceptToLabel(concept: string) {
  if (concept === "rechazado") return "No apto";
  if (concept === "aprobado_con_novedad") return "Apto con observaciones";
  return "Apto";
}

function getRecordTimestamp(record: InspectionRecord) {
  const timestamp = new Date(record.inspeccion.fecha).getTime();
  if (!Number.isNaN(timestamp)) return timestamp;
  return new Date(record.inspeccion.fechaRegistro).getTime() || 0;
}

function isSameDay(dateValue: string, referenceDate: Date) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
}

function extractDocumentExpirationsFromChecklist(checklist: InspectionRecord["inspeccion"]["checklist"]) {
  if (!Array.isArray(checklist)) {
    return initialDocumentExpirations;
  }

  const soat = checklist.find((item) => item.id === "doc_soat")?.vencimiento ?? "-";
  const tecnomecanica = checklist.find((item) => item.id === "doc_tecno")?.vencimiento ?? "-";
  const licencia = checklist.find((item) => item.id === "doc_licencia")?.vencimiento ?? "-";

  return { soat, tecnomecanica, licencia };
}

function buildEditForm(record: InspectionRecord): EditInspectionForm {
  return {
    placa: record.vehiculo.placa,
    interno: record.vehiculo.interno,
    tipo: record.vehiculo.tipo,
    marca: record.vehiculo.marca,
    linea: record.vehiculo.linea,
    modelo: record.vehiculo.modelo,
    kilometraje: record.vehiculo.kilometraje,
    ruta: record.vehiculo.ruta,
    conductor: record.vehiculo.conductor,
    licenciaConduccion: record.vehiculo.licenciaConduccion,
    inspector: record.vehiculo.inspector,
    fechaInspeccion: record.vehiculo.fechaInspeccion,
    horaInspeccion: record.vehiculo.horaInspeccion,
    conceptoFinal: record.inspeccion.conceptoFinal,
    observaciones: record.inspeccion.observaciones,
    checklist: record.inspeccion.checklist,
  };
}

export default function AdminPage() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [filterPlaca, setFilterPlaca] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileListMode, setMobileListMode] = useState<"compact" | "detailed">("compact");
  const [editingRecord, setEditingRecord] = useState<InspectionRecord | null>(null);
  const [editForm, setEditForm] = useState<EditInspectionForm | null>(null);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);
  const [listSortOrder, setListSortOrder] = useState<"newest" | "oldest">("newest");
  const [now, setNow] = useState(() => new Date());
  const [showPdfDateModal, setShowPdfDateModal] = useState(false);
  const [selectedExportDate, setSelectedExportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingNotifStatuses, setPendingNotifStatuses] = useState<Record<string, PendingNotifStatus>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const shareBaseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/sistema${auth.user?.empresaId ? `?empresaId=${encodeURIComponent(auth.user.empresaId)}` : ""}`
    : "/sistema";

  const mapApiToRecord = (entry: ApiInspection): InspectionRecord => {
    let checklistParsed: InspectionRecord["inspeccion"]["checklist"] = [];
    try {
      const parsed = JSON.parse(entry.checklist);
      checklistParsed = Array.isArray(parsed) ? parsed : [];
    } catch {
      checklistParsed = [];
    }

    const parsedDate = parseInspectionDateTime(entry.fecha);

    return {
      id: entry.id,
      vehiculo: {
        placa: entry.vehiculo.placa,
        interno: entry.vehiculo.interno ?? "",
        marca: entry.vehiculo.marca,
        modelo: entry.vehiculo.modelo ?? "",
        linea: entry.vehiculo.linea ?? "",
        tipo: entry.vehiculo.tipo,
        kilometraje: entry.kilometraje ?? "",
        ruta: entry.ruta ?? "",
        conductor: entry.conductor,
        licenciaConduccion: entry.licencia,
        inspector: entry.inspector,
        fechaInspeccion: parsedDate.isoDate,
        horaInspeccion: parsedDate.time,
      },
      inspeccion: {
        conceptoFinal: mapConceptToLabel(entry.concepto),
        observaciones: entry.observaciones ?? "",
        fechaRegistro: entry.createdAt,
        fecha: entry.fecha,
        checklist: checklistParsed,
      },
    };
  };

  const groupedVehicles = useMemo<VehicleGroup[]>(() => {
    const groups = new Map<string, InspectionRecord[]>();

    records.forEach((record) => {
      const plate = normalizePlate(record.vehiculo.placa);
      const current = groups.get(plate) ?? [];
      current.push(record);
      groups.set(plate, current);
    });

    return Array.from(groups.entries())
      .map(([placa, plateRecords]) => {
        const sortedRecords = [...plateRecords].sort(
          (a, b) => getRecordTimestamp(b) - getRecordTimestamp(a),
        );

        return {
          placa,
          records: sortedRecords,
          latest: sortedRecords[0],
        };
      })
      .sort((a, b) => {
        const newestDiff = getRecordTimestamp(b.latest) - getRecordTimestamp(a.latest);
        return listSortOrder === "newest" ? newestDiff : -newestDiff;
      });
  }, [records, listSortOrder]);

  const filteredGroups = useMemo(() => {
    const query = filterPlaca.trim().toLowerCase();
    if (!query) return groupedVehicles;
    return groupedVehicles.filter((group) => group.placa.toLowerCase().includes(query));
  }, [filterPlaca, groupedVehicles]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / ITEMS_PER_PAGE));

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGroups.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredGroups]);

  const selectedPlateHistory = useMemo(() => {
    if (!selectedPlate) return [];
    return records
      .filter((record) => normalizePlate(record.vehiculo.placa) === normalizePlate(selectedPlate))
      .sort((a, b) => {
        // Primero por fecha de inspección (más reciente arriba)
        const dateDiff = b.vehiculo.fechaInspeccion.localeCompare(a.vehiculo.fechaInspeccion);
        if (dateDiff !== 0) return dateDiff;
        // Desempate por hora de inspección
        const horaDiff = b.vehiculo.horaInspeccion.localeCompare(a.vehiculo.horaInspeccion);
        if (horaDiff !== 0) return horaDiff;
        // Último desempate por createdAt
        return new Date(b.inspeccion.fechaRegistro).getTime() - new Date(a.inspeccion.fechaRegistro).getTime();
      });
  }, [records, selectedPlate]);

  const selectedPlateGroup = useMemo(() => {
    if (!selectedPlate) return null;
    return groupedVehicles.find((group) => group.placa === normalizePlate(selectedPlate)) ?? null;
  }, [groupedVehicles, selectedPlate]);

  const selectedRecordDocumentExpirations = useMemo(
    () => extractDocumentExpirationsFromChecklist(selectedRecord?.inspeccion.checklist ?? []),
    [selectedRecord],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPlaca, listSortOrder]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedPlate || selectedPlateHistory.length === 0) {
      setSelectedRecord(null);
      return;
    }

    if (!selectedRecord || !selectedPlateHistory.some((record) => record.id === selectedRecord.id)) {
      setSelectedRecord(selectedPlateHistory[0]);
    }
  }, [selectedPlateHistory, selectedPlate, selectedRecord]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTheme = window.localStorage.getItem("admin-theme");
    setTheme(storedTheme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("admin-theme", theme);
  }, [theme]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const recordsCreatedToday = useMemo(() => {
    const todayBogota = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return records.filter((record) => record.vehiculo.fechaInspeccion === todayBogota);
  }, [records, now]);

  const getBogotaToday = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  const platesWithoutTodayInspection = useMemo<PendingPlateEntry[]>(() => {
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const inspectedTodayPlates = new Set(
      records
        .filter((r) => r.vehiculo.fechaInspeccion === todayStr)
        .map((r) => normalizePlate(r.vehiculo.placa)),
    );

    const allPlates = Array.from(
      new Map(
        records.map((r) => [normalizePlate(r.vehiculo.placa), r]),
      ).values(),
    );

    return allPlates
      .filter((r) => !inspectedTodayPlates.has(normalizePlate(r.vehiculo.placa)))
      .map((r) => ({
        placa: normalizePlate(r.vehiculo.placa),
        conductor: r.vehiculo.conductor,
        interno: r.vehiculo.interno,
        tipo: r.vehiculo.tipo,
        marca: r.vehiculo.marca,
        modelo: r.vehiculo.modelo,
        ruta: r.vehiculo.ruta,
        inspector: r.vehiculo.inspector,
        status: (pendingNotifStatuses[normalizePlate(r.vehiculo.placa)] ?? "pendiente") as PendingNotifStatus,
      }))
      .sort((a, b) => a.placa.localeCompare(b.placa));
  }, [records, pendingNotifStatuses, now]);

  const recordsForSelectedExportDate = useMemo(() => {
    if (!selectedExportDate) return [];
    return records.filter((record) => record.vehiculo.fechaInspeccion === selectedExportDate);
  }, [records, selectedExportDate]);

  const loadRecords = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/inspecciones", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          router.push("/login");
          return;
        }
        throw new Error("No se pudieron cargar los registros");
      }

      const data = (await response.json()) as ApiInspection[];
      setRecords(data.map(mapApiToRecord));
    } catch (error) {
      console.error("Error loading records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || !auth.token) {
      setAuthenticated(false);
      setCurrentUser(null);
      setLoading(false);
      router.push("/login");
      return;
    }

    setAuthenticated(true);
    setCurrentUser(auth.user);
    void loadRecords(auth.token);
  }, [auth.isAuthenticated, auth.user, auth.token, router]);

  const handleLogout = () => {
    auth.logout();
    router.push("/login");
  };

  const handleDeletePlate = async (plate: string) => {
    if (!auth.token) {
      router.push("/login");
      return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar la placa ${plate} y todos sus registros?`)) {
      try {
const response = await fetch(`/api/inspecciones/plate/${encodeURIComponent(plate)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        if (!response.ok) {
          throw new Error("No fue posible eliminar la placa");
        }

        const normalizedPlate = normalizePlate(plate);
        setRecords((prev) => prev.filter((item) => normalizePlate(item.vehiculo.placa) !== normalizedPlate));

        if (selectedPlate && normalizePlate(selectedPlate) === normalizedPlate) {
          setSelectedPlate(null);
          setSelectedRecord(null);
        }

        if (editingRecord && normalizePlate(editingRecord.vehiculo.placa) === normalizedPlate) {
          handleCloseEdit();
        }

        setFilterPlaca((current) => {
          if (current.trim() && normalizedPlate.includes(current.trim().toUpperCase())) {
            return "";
          }
          return current;
        });
      } catch (error) {
        console.error("Error deleting record:", error);
      }
    }
  };

  const handleOpenEdit = (record: InspectionRecord) => {
    setSelectedPlate(record.vehiculo.placa);
    setSelectedRecord(record);
    setEditingRecord(record);
    setEditForm(buildEditForm(record));
    setEditError("");
  };

  const handleCloseEdit = () => {
    setEditingRecord(null);
    setEditForm(null);
    setEditError("");
    setEditSaving(false);
    setEditDeleting(false);
    setSelectedPlate(null);
    setSelectedRecord(null);
  };

  const handleDeleteDailyChecklist = async () => {
    if (!editingRecord || !auth.token) {
      return;
    }

    if (!confirm("¿Seguro que quieres eliminar el checklist de este día? Esta acción habilita un nuevo registro para la placa hoy y no elimina el carro ni el usuario.")) {
      return;
    }

    setEditDeleting(true);
    setEditError("");

    try {
      const response = await fetch(`/api/inspecciones/${editingRecord.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!response.ok) {
        throw new Error("No fue posible eliminar el checklist del día");
      }

      await loadRecords(auth.token);
      handleCloseEdit();
    } catch (error) {
      console.error("Error deleting daily checklist:", error);
      setEditError("No fue posible eliminar el checklist del día. Intenta nuevamente.");
      setEditDeleting(false);
    }
  };

  const handleDeleteDailyChecklistFromHistory = async (record: InspectionRecord) => {
    if (!auth.token) {
      router.push("/login");
      return;
    }

    if (!confirm(`¿Seguro que quieres eliminar el checklist del día ${record.vehiculo.fechaInspeccion}? Esta acción no elimina el carro ni el usuario.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/inspecciones/${record.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!response.ok) {
        throw new Error("No fue posible eliminar el checklist del día");
      }

      await loadRecords(auth.token);
      setSelectedRecord(null);
    } catch (error) {
      console.error("Error deleting daily checklist from history:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !editForm || !auth.token) {
      return;
    }

    const normalizedPlate = normalizePlate(editForm.placa);
    const requiredFields = [
      editForm.placa,
      editForm.interno,
      editForm.tipo,
      editForm.marca,
      editForm.linea,
      editForm.modelo,
      editForm.kilometraje,
      editForm.ruta,
      editForm.conductor,
      editForm.licenciaConduccion,
      editForm.inspector,
      editForm.fechaInspeccion,
      editForm.horaInspeccion,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setEditError("Completa todos los campos del encabezado antes de guardar.");
      return;
    }

    if (editForm.conceptoFinal === "No apto" && !editForm.observaciones.trim()) {
      setEditError("Agrega observaciones si el concepto es No apto.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      const response = await fetch(`/api/inspecciones/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          placa: normalizedPlate,
          interno: editForm.interno.trim(),
          tipo: editForm.tipo.trim(),
          marca: editForm.marca.trim(),
          linea: editForm.linea.trim(),
          modelo: editForm.modelo.trim(),
          kilometraje: editForm.kilometraje.trim(),
          ruta: editForm.ruta.trim(),
          conductor: editForm.conductor.trim(),
          licencia: editForm.licenciaConduccion.trim(),
          inspector: editForm.inspector.trim(),
          fecha: editForm.fechaInspeccion.trim(),
          hora: editForm.horaInspeccion.trim(),
          concepto: editForm.conceptoFinal,
          observaciones: editForm.observaciones,
          checklist: editForm.checklist,
        }),
      });

      if (!response.ok) {
        throw new Error("No fue posible actualizar el registro");
      }

      await loadRecords(auth.token);
      handleCloseEdit();
    } catch (error) {
      console.error("Error saving edit:", error);
      setEditError("No fue posible guardar los cambios. Intenta nuevamente.");
    } finally {
      setEditSaving(false);
    }
  };

  const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const fileName = `Inspecciones_PESV_${new Date().toISOString().split("T")[0]}`;

  const exportPendingPdf = async (items: PendingPlateEntry[], dateLabel: string) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    if (items.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("VEHÍCULOS SIN INSPECCIÓN DIARIA", pageW / 2, 10, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${dateLabel}   |   Pendientes: ${items.length}   |   Reporte generado: ${today}`, pageW / 2, 17, { align: "center" });

    autoTable(doc, {
      startY: 28,
      head: [["Placa", "Interno", "Tipo", "Marca / Modelo", "Conductor", "Ruta", "Inspector asignado", "Estado notificación"]],
      body: items.map((p) => [
        p.placa,
        p.interno || "-",
        p.tipo || "-",
        `${p.marca} ${p.modelo}`.trim() || "-",
        p.conductor || "-",
        p.ruta || "-",
        p.inspector || "-",
        p.status === "notificado" ? "Notificado" : p.status === "atendido" ? "Atendido" : "Pendiente",
      ]),
      headStyles: { fillColor: [180, 90, 20], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 18 },
        7: { fontStyle: "bold", cellWidth: 32, halign: "center" },
      },
      didParseCell(data) {
        if (data.column.index === 7 && data.section === "body") {
          const val = String(data.cell.raw);
          data.cell.styles.textColor =
            val === "Atendido" ? [5, 150, 105] : val === "Notificado" ? [30, 64, 175] : [180, 30, 30];
        }
      },
      margin: { left: 8, right: 8 },
    });

    const totalPagesDoc = doc.getNumberOfPages();
    for (let p = 1; p <= totalPagesDoc; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Sistema PESV — Página ${p} de ${totalPagesDoc}`, pageW / 2, doc.internal.pageSize.getHeight() - 4, { align: "center" });
    }

    doc.save(`Pendientes_Inspeccion_${getBogotaToday()}.pdf`);
  };

  const exportPdf = async (items: InspectionRecord[], title: string, suffix: string, includeDetails = true) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    if (items.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Cabecera
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageW / 2, 10, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Reporte generado: ${today}   |   Total registros: ${items.length}`, pageW / 2, 17, { align: "center" });

    // Tabla resumen
    autoTable(doc, {
      startY: 28,
      head: [["Placa", "Tipo", "Marca / Modelo", "Conductor", "Lic. Conducción", "Inspector", "Fecha", "Hora", "Concepto", "Observaciones"]],
      body: items.map((r) => [
        r.vehiculo.placa,
        r.vehiculo.tipo ?? "-",
        `${r.vehiculo.marca} ${r.vehiculo.modelo}`,
        r.vehiculo.conductor,
        r.vehiculo.licenciaConduccion ?? "-",
        r.vehiculo.inspector,
        r.vehiculo.fechaInspeccion,
        r.vehiculo.horaInspeccion,
        r.inspeccion.conceptoFinal,
        r.inspeccion.observaciones || "-",
      ]),
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 18 },
        8: { fontStyle: "bold", cellWidth: 26 },
        9: { cellWidth: 45 },
      },
      didParseCell(data) {
        if (data.column.index === 8 && data.section === "body") {
          const val = String(data.cell.raw);
          data.cell.styles.textColor =
            val === "Apto" ? [5, 150, 105] : val === "No apto" ? [220, 38, 38] : [180, 120, 0];
        }
      },
      margin: { left: 8, right: 8 },
    });

    if (includeDetails) {
      // Detalle del checklist por registro
      items.forEach((r, idx) => {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`INSPECCIÓN DETALLADA — Placa: ${r.vehiculo.placa}  (${idx + 1}/${items.length})`, pageW / 2, 8, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Conductor: ${r.vehiculo.conductor}   Inspector: ${r.vehiculo.inspector}   Fecha: ${r.vehiculo.fechaInspeccion} ${r.vehiculo.horaInspeccion}   Concepto: ${r.inspeccion.conceptoFinal}`, pageW / 2, 14, { align: "center" });

        autoTable(doc, {
          startY: 22,
          head: [["#", "Sección", "Ítem", "Criticidad", "Estado"]],
          body: r.inspeccion.checklist.map((item, i) => [
            i + 1,
            item.seccion ?? "-",
            item.item,
            item.criticidad,
            item.estado,
          ]),
          headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
          alternateRowStyles: { fillColor: [241, 245, 249] },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 38 },
            3: { cellWidth: 22, halign: "center" },
            4: { cellWidth: 24, halign: "center", fontStyle: "bold" },
          },
          didParseCell(data) {
            if (data.column.index === 4 && data.section === "body") {
              const val = String(data.cell.raw);
              data.cell.styles.textColor =
                val === "Cumple" ? [5, 150, 105] : val === "No cumple" ? [220, 38, 38] : [100, 116, 139];
            }
          },
          margin: { left: 8, right: 8 },
        });

        if (r.inspeccion.observaciones) {
          const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text("Observaciones:", 8, finalY);
          doc.setFont("helvetica", "normal");
          doc.text(r.inspeccion.observaciones, 8, finalY + 5, { maxWidth: pageW - 16 });
        }
      });
    }

    // Pie de página en todas las páginas
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Sistema PESV — Página ${p} de ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 4, { align: "center" });
    }

    doc.save(`${suffix}.pdf`);
  };

  const exportExcel = async (items: InspectionRecord[], suffix: string) => {
    if (items.length === 0) return;

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // --- Hoja 1: Resumen ---
    const resumenData = [
      ["SISTEMA DE INSPECCIÓN PREOPERACIONAL PESV"],
      [`Reporte generado: ${today}`],
      [],
      ["Placa", "Tipo", "Marca", "Modelo", "Conductor", "Lic. Conducción", "Inspector", "Fecha", "Hora", "Concepto", "Observaciones"],
      ...items.map((r) => [
        r.vehiculo.placa,
        r.vehiculo.tipo ?? "-",
        r.vehiculo.marca,
        r.vehiculo.modelo,
        r.vehiculo.conductor,
        r.vehiculo.licenciaConduccion ?? "-",
        r.vehiculo.inspector,
        r.vehiculo.fechaInspeccion,
        r.vehiculo.horaInspeccion,
        r.inspeccion.conceptoFinal,
        r.inspeccion.observaciones || "-",
      ]),
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [14, 20, 14, 14, 22, 18, 22, 14, 10, 22, 40].map((w) => ({ wch: w }));
    wsResumen["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // --- Hojas por registro (checklist) ---
    items.forEach((r) => {
      const sheetName = r.vehiculo.placa.slice(0, 28); // max 31 chars
      const headerRows = [
        [`INSPECCIÓN PREOPERACIONAL — ${r.vehiculo.placa}`],
        [],
        ["Placa", r.vehiculo.placa, "", "Inspector", r.vehiculo.inspector],
        ["Tipo", r.vehiculo.tipo ?? "-", "", "Conductor", r.vehiculo.conductor],
        ["Marca", r.vehiculo.marca, "", "Lic. Conducción", r.vehiculo.licenciaConduccion ?? "-"],
        ["Modelo", r.vehiculo.modelo, "", "Fecha", r.vehiculo.fechaInspeccion],
        ["Concepto", r.inspeccion.conceptoFinal, "", "Hora", r.vehiculo.horaInspeccion],
        [],
        ["#", "Sección", "Ítem", "Criticidad", "Estado"],
        ...r.inspeccion.checklist.map((item, i) => [
          i + 1,
          item.seccion ?? "-",
          item.item,
          item.criticidad,
          item.estado,
        ]),
        [],
        ["Observaciones", r.inspeccion.observaciones || "-"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(headerRows);
      ws["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 52 }, { wch: 14 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const workbookData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([workbookData], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${suffix}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSelectedPlatePDF = () => {
    if (selectedPlateHistory.length === 0) return;
    void exportPdf(
      selectedPlateHistory,
      `Historial de placa ${selectedPlate}`,
      `Historial_${selectedPlate}_${new Date().toISOString().split("T")[0]}`,
    );
  };

  const handleExportSelectedPlateExcel = () => {
    if (selectedPlateHistory.length === 0) return;
    void exportExcel(
      selectedPlateHistory,
      `Historial_${selectedPlate}_${new Date().toISOString().split("T")[0]}`,
    );
  };

  const handleExportPDF = () => {
    void exportPdf(records, "SISTEMA DE INSPECCIÓN PREOPERACIONAL PESV", fileName);
  };

  const handleOpenExportDateModal = () => {
    setSelectedExportDate(new Date().toISOString().split("T")[0]);
    setShowPdfDateModal(true);
  };

  const handleExportPDFBySelectedDate = async (includeDetails: boolean) => {
    if (recordsForSelectedExportDate.length === 0) return;

    const [year, month, day] = selectedExportDate.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day, 12, 0, 0);
    const readableDate = selectedDate.toLocaleDateString("es-CO");

    await exportPdf(
      recordsForSelectedExportDate,
      `SISTEMA DE INSPECCIÓN PREOPERACIONAL PESV - REGISTROS DEL DÍA (${readableDate})`,
      includeDetails
        ? `${fileName}_Registros_${selectedExportDate}_Detallado`
        : `${fileName}_Registros_${selectedExportDate}_Resumen`,
      includeDetails,
    );

    setShowPdfDateModal(false);
  };

  const handleExportExcel = () => {
    void exportExcel(records, fileName);
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_35%),linear-gradient(180deg,var(--background),var(--background))] px-4 py-6 text-[var(--foreground)] sm:px-6 sm:py-8">
      <main className="mx-auto w-full max-w-7xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[var(--muted)] shadow-[var(--shadow)] backdrop-blur">
              CONTROL DE FLOTA
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">Panel Administrativo</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Bienvenido, <strong>{currentUser?.username}</strong>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow)] backdrop-blur transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)]"
            >
              <span className="inline-flex items-center gap-2">
                {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </span>
            </button>
            <button
              onClick={() => router.push("/sistema")}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow)] backdrop-blur transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)]"
            >
              <span className="inline-flex items-center gap-2">
                <EyeIcon className="h-4 w-4" />
                Nueva inspección
              </span>
            </button>
            <button
              onClick={() => { setShareCopied(false); setShowShareModal(true); }}
              className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-400 shadow-[var(--shadow)] backdrop-blur transition hover:bg-blue-500/20 hover:border-blue-400"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir checklist
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-sm">
            <p className="text-sm font-semibold text-[var(--muted)]">Total de registros</p>
            <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{records.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-sm">
            <p className="text-sm font-semibold text-[var(--muted)]">Aptos</p>
            <p className="mt-2 text-3xl font-bold text-[var(--success)]">
              {records.filter((r) => r.inspeccion.conceptoFinal === "Apto").length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-sm">
            <p className="text-sm font-semibold text-[var(--muted)]">No aptos</p>
            <p className="mt-2 text-3xl font-bold text-[var(--danger)]">
              {records.filter((r) => r.inspeccion.conceptoFinal === "No apto").length}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenExportDateModal}
            className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 shadow-[var(--shadow)] backdrop-blur-sm text-left transition hover:brightness-95"
          >
            <p className="text-sm font-semibold text-[var(--muted)]">Registros creados en el día</p>
            <p className="mt-2 text-3xl font-bold text-[var(--accent)]">{recordsCreatedToday.length}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{now.toLocaleDateString("es-CO")} · Toca para ver PDF</p>
          </button>
          <button
            type="button"
            onClick={() => setShowPendingModal(true)}
            className="rounded-2xl border border-orange-300/40 bg-orange-50 p-4 shadow-[var(--shadow)] text-left transition hover:brightness-95 dark:bg-orange-950/30 dark:border-orange-500/25"
          >
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Sin inspección hoy</p>
            <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">{platesWithoutTodayInspection.length}</p>
            <p className="mt-1 text-xs text-orange-500 dark:text-orange-500">Toca para ver placas pendientes</p>
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 sm:gap-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Buscar por placa..."
                value={filterPlaca}
                onChange={(e) => setFilterPlaca(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none shadow-[var(--shadow)] backdrop-blur transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportPDF}
                disabled={records.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF general
              </button>
              <button
                onClick={handleOpenExportDateModal}
                disabled={records.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF del día
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Organizar lista por fecha y hora de creación</p>
            <div className="inline-flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)] sm:w-auto">
              <button
                type="button"
                onClick={() => setListSortOrder("newest")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  listSortOrder === "newest"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                Registros recientes
              </button>
              <button
                type="button"
                onClick={() => setListSortOrder("oldest")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  listSortOrder === "oldest"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                Registros anteriores
              </button>
            </div>
          </div>
        </div>

        {showPendingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Vehículos sin inspección hoy</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {platesWithoutTodayInspection.length} placa{platesWithoutTodayInspection.length !== 1 ? "s" : ""} pendiente{platesWithoutTodayInspection.length !== 1 ? "s" : ""} · {getBogotaToday()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void exportPendingPdf(platesWithoutTodayInspection, getBogotaToday())}
                    disabled={platesWithoutTodayInspection.length === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-orange-300/40 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-950/30 dark:text-orange-400"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    PDF pendientes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPendingModal(false)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {platesWithoutTodayInspection.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                  <div>
                    <p className="text-2xl">✅</p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">Todos los vehículos registrados han hecho su inspección hoy.</p>
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Placa</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hidden sm:table-cell">Interno</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hidden md:table-cell">Conductor</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hidden lg:table-cell">Tipo / Marca</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hidden lg:table-cell">Ruta</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Estado</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {platesWithoutTodayInspection.map((entry) => {
                        const status = pendingNotifStatuses[entry.placa] ?? "pendiente";
                        return (
                          <tr key={entry.placa} className="transition hover:bg-[var(--surface-muted)]">
                            <td className="px-3 py-2.5">
                              <span className="inline-flex rounded-full border border-orange-300/40 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                                {entry.placa}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-[var(--foreground)] hidden sm:table-cell">{entry.interno || "-"}</td>
                            <td className="px-3 py-2.5 text-[var(--foreground)] hidden md:table-cell">{entry.conductor || "-"}</td>
                            <td className="px-3 py-2.5 text-[var(--muted)] hidden lg:table-cell">{entry.tipo} · {entry.marca} {entry.modelo}</td>
                            <td className="px-3 py-2.5 text-[var(--muted)] hidden lg:table-cell">{entry.ruta || "-"}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                                  status === "atendido"
                                    ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
                                    : status === "notificado"
                                      ? "border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent)]"
                                      : "border-orange-300/40 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                                }`}
                              >
                                {status === "atendido" ? "Atendido" : status === "notificado" ? "Notificado" : "Pendiente"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <select
                                value={status}
                                onChange={(e) =>
                                  setPendingNotifStatuses((prev) => ({
                                    ...prev,
                                    [entry.placa]: e.target.value as PendingNotifStatus,
                                  }))
                                }
                                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)]"
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="notificado">Notificado</option>
                                <option value="atendido">Atendido</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showPdfDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Descargar PDF por fecha</h2>
                  <p className="text-sm text-[var(--muted)]">Selecciona el día del que quieres descargar reportes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPdfDateModal(false)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Fecha</span>
                  <input
                    type="date"
                    value={selectedExportDate}
                    onChange={(event) => setSelectedExportDate(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  />
                </label>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--muted)]">
                  Registros encontrados para la fecha: <strong className="text-[var(--foreground)]">{recordsForSelectedExportDate.length}</strong>
                </div>

                <p className="text-xs text-[var(--muted)]">
                  Recomendado para compartir: usa PDF resumen (sin checklist ni observaciones). PDF detallado incluye toda la información del reporte.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleExportPDFBySelectedDate(false)}
                    disabled={recordsForSelectedExportDate.length === 0}
                    className="flex-1 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    PDF resumen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPDFBySelectedDate(true)}
                    disabled={recordsForSelectedExportDate.length === 0}
                    className="flex-1 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--warning)] transition hover:bg-[var(--warning)]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    PDF detallado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPdfDateModal(false)}
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Cargando vehículos...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow)] backdrop-blur-sm">
            <p className="text-[var(--muted)]">
              {records.length === 0 ? "No hay registros guardados aún" : "No se encontraron vehículos para esa placa"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-end md:hidden">
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]">
                <button
                  type="button"
                  onClick={() => setMobileListMode("compact")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mobileListMode === "compact"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  Compacta
                </button>
                <button
                  type="button"
                  onClick={() => setMobileListMode("detailed")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mobileListMode === "detailed"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  Detallada
                </button>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {paginatedGroups.map((group) => (
                <article
                  key={group.placa}
                  className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur-sm ${
                    mobileListMode === "compact" ? "p-3" : "p-4"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPlate(group.placa);
                      setSelectedRecord(group.latest);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlate(group.placa);
                        setSelectedRecord(group.latest);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1 text-sm font-bold text-[var(--accent)]">
                        {group.placa}
                      </span>
                      <span className="text-xs font-semibold text-[var(--muted)]">{group.latest.vehiculo.fechaInspeccion} {group.latest.vehiculo.horaInspeccion}</span>
                    </div>

                    {mobileListMode === "detailed" ? (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-[var(--muted)]">Conductor</p>
                          <p className="font-semibold text-[var(--foreground)]">{group.latest.vehiculo.conductor}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">Registro creado</p>
                          <p className="font-semibold text-[var(--foreground)]">{group.latest.vehiculo.fechaInspeccion} {group.latest.vehiculo.horaInspeccion}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--muted)]">{group.latest.vehiculo.conductor} · {group.latest.vehiculo.fechaInspeccion} {group.latest.vehiculo.horaInspeccion}</p>
                    )}

                    <div className={mobileListMode === "compact" ? "mt-2" : "mt-3"}>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          group.latest.inspeccion.conceptoFinal === "Apto"
                            ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
                            : group.latest.inspeccion.conceptoFinal === "No apto"
                              ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
                              : "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]"
                        }`}
                      >
                        {group.latest.inspeccion.conceptoFinal}
                      </span>
                    </div>
                  </div>

                  <div className={`grid gap-2 sm:grid-cols-3 ${mobileListMode === "compact" ? "mt-3" : "mt-4"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlate(group.placa);
                        setSelectedRecord(group.latest);
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15 ${
                        mobileListMode === "compact" ? "px-2.5 py-1.5" : "px-3 py-2"
                      }`}
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                      Historial
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group.latest)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] text-xs font-semibold text-[var(--warning)] transition hover:bg-[var(--warning)]/15 ${
                        mobileListMode === "compact" ? "px-2.5 py-1.5" : "px-3 py-2"
                      }`}
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlate(group.latest.vehiculo.placa)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15 ${
                        mobileListMode === "compact" ? "px-2.5 py-1.5" : "px-3 py-2"
                      }`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Eliminar carro
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur-sm md:block">
              <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Fecha inspección</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Último conductor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Concepto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paginatedGroups.map((group) => (
                  <tr
                    key={group.placa}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPlate(group.placa);
                      setSelectedRecord(group.latest);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlate(group.placa);
                        setSelectedRecord(group.latest);
                      }
                    }}
                    className="cursor-pointer transition hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)] focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlate(group.placa);
                          setSelectedRecord(group.latest);
                        }}
                        className="inline-flex rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/15"
                      >
                        {group.placa}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{group.latest.vehiculo.fechaInspeccion}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{group.latest.vehiculo.conductor}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{group.latest.vehiculo.horaInspeccion}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          group.latest.inspeccion.conceptoFinal === "Apto"
                            ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
                            : group.latest.inspeccion.conceptoFinal === "No apto"
                              ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
                              : "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]"
                        }`}
                      >
                        {group.latest.inspeccion.conceptoFinal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlate(group.placa);
                          setSelectedRecord(group.latest);
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        Historial
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenEdit(group.latest);
                        }}
                        className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)] transition hover:bg-[var(--warning)]/15"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeletePlate(group.latest.vehiculo.placa);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Eliminar carro
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredGroups.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              Registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm font-semibold text-[var(--foreground)]">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* History Modal */}
        {selectedPlate && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Historial de la placa {selectedPlate}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {selectedPlateHistory.length} inspecciones registradas
                    {selectedPlateGroup ? ` · ${selectedPlateGroup.latest.vehiculo.marca} ${selectedPlateGroup.latest.vehiculo.modelo}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlate(null);
                    setSelectedRecord(null);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.2fr]">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Inspecciones</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportSelectedPlatePDF}
                        className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15"
                      >
                        PDF
                      </button>
                      <button
                        onClick={handleExportSelectedPlateExcel}
                        className="rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)] transition hover:bg-[var(--success)]/15"
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedPlateHistory.map((record) => (
                      <div
                        key={record.id}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selectedRecord.id === record.id
                            ? "border-[var(--accent)]/35 bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--accent-soft)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--foreground)]">
                                {record.vehiculo.fechaInspeccion} {record.vehiculo.horaInspeccion}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                Conductor: {record.vehiculo.conductor} · Inspector: {record.vehiculo.inspector}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                                record.inspeccion.conceptoFinal === "Apto"
                                  ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
                                  : record.inspeccion.conceptoFinal === "No apto"
                                    ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
                                    : "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]"
                              }`}
                            >
                              {record.inspeccion.conceptoFinal}
                            </span>
                          </div>
                        </button>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteDailyChecklistFromHistory(record)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Eliminar checklist del día
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {editingRecord && editForm && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow)] sm:p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-bold text-[var(--foreground)]">Editar inspección</h2>
                          <p className="text-sm text-[var(--muted)]">
                            Placa {editingRecord.vehiculo.placa} · {editingRecord.vehiculo.marca} {editingRecord.vehiculo.modelo}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCloseEdit}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {editError && (
                        <div className="mb-4 rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                          {editError}
                        </div>
                      )}

                      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Encabezado</h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              ["placa", "Placa"],
                              ["interno", "Interno"],
                              ["tipo", "Tipo"],
                              ["marca", "Marca"],
                              ["linea", "Línea"],
                              ["modelo", "Modelo"],
                              ["kilometraje", "Kilometraje"],
                              ["ruta", "Ruta"],
                              ["conductor", "Conductor"],
                              ["licenciaConduccion", "Licencia"],
                              ["inspector", "Inspector"],
                              ["fechaInspeccion", "Fecha"],
                              ["horaInspeccion", "Hora"],
                            ].map(([key, label]) => (
                              <label key={key} className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
                                <input
                                  value={editForm[key as keyof Omit<EditInspectionForm, "conceptoFinal" | "observaciones" | "checklist">] as string}
                                  onChange={(event) => setEditForm((current) => current ? { ...current, [key]: event.target.value } : current)}
                                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                                />
                              </label>
                            ))}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Concepto</span>
                              <select
                                value={editForm.conceptoFinal}
                                onChange={(event) => setEditForm((current) => current ? { ...current, conceptoFinal: event.target.value } : current)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                              >
                                <option value="Apto">Apto</option>
                                <option value="Apto con observaciones">Apto con observaciones</option>
                                <option value="No apto">No apto</option>
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Observaciones</span>
                              <textarea
                                rows={4}
                                value={editForm.observaciones}
                                onChange={(event) => setEditForm((current) => current ? { ...current, observaciones: event.target.value } : current)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Checklist</h3>
                            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                              {editForm.checklist.length} items
                            </span>
                          </div>

                          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                            {editForm.checklist.map((item, index) => (
                              <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--foreground)]">{item.item}</p>
                                    <p className="text-xs text-[var(--muted)]">{item.seccion}</p>
                                  </div>
                                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                    {item.criticidad}
                                  </span>
                                </div>
                                <select
                                  value={item.estado}
                                  onChange={(event) => {
                                    const estado = event.target.value;
                                    setEditForm((current) => {
                                      if (!current) return current;
                                      const nextChecklist = [...current.checklist];
                                      nextChecklist[index] = { ...nextChecklist[index], estado };
                                      return { ...current, checklist: nextChecklist };
                                    });
                                  }}
                                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                                >
                                  <option value="Cumple">Cumple</option>
                                  <option value="No cumple">No cumple</option>
                                  <option value="No aplica">No aplica</option>
                                </select>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={handleDeleteDailyChecklist}
                              disabled={editSaving || editDeleting}
                              className="flex-1 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {editDeleting ? "Eliminando..." : "Eliminar checklist del día"}
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={editSaving || editDeleting}
                              className="flex-1 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {editSaving ? "Guardando..." : "Guardar cambios"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseEdit}
                              disabled={editSaving || editDeleting}
                              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Detalle seleccionado</h3>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(selectedRecord)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)] transition hover:bg-[var(--warning)]/15"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-[var(--muted)]">Placa</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.placa}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Interno</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.interno}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Tipo</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.tipo}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Línea</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.linea}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Marca</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.marca}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Modelo</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.modelo}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Kilometraje</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.kilometraje}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Ruta</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.ruta}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Conductor</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.conductor}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Inspector</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.inspector}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Fecha</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.fechaInspeccion}</p></div>
                      <div><p className="text-xs text-[var(--muted)]">Hora</p><p className="text-sm font-semibold text-[var(--foreground)]">{selectedRecord.vehiculo.horaInspeccion}</p></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Documentación y vencimientos</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                        <p className="text-xs text-[var(--muted)]">SOAT</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{selectedRecordDocumentExpirations.soat}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                        <p className="text-xs text-[var(--muted)]">Tecnomecánica</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{selectedRecordDocumentExpirations.tecnomecanica}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                        <p className="text-xs text-[var(--muted)]">Licencia de conducción</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{selectedRecordDocumentExpirations.licencia}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Concepto</h3>
                    <p
                      className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${
                        selectedRecord.inspeccion.conceptoFinal === "Apto"
                          ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
                          : selectedRecord.inspeccion.conceptoFinal === "No apto"
                            ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
                            : "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]"
                      }`}
                    >
                      {selectedRecord.inspeccion.conceptoFinal}
                    </p>
                  </div>

                  {selectedRecord.inspeccion.observaciones && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Observaciones</h3>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{selectedRecord.inspeccion.observaciones}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Checklist</h3>
                    <div className="space-y-2">
                      {selectedRecord.inspeccion.checklist.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
                          <div>
                            <p className="text-[var(--foreground)]">{item.item}</p>
                            <p className="text-xs text-[var(--muted)]">{item.seccion}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.estado === "Cumple" ? "bg-[var(--success-soft)] text-[var(--success)]" : item.estado === "No cumple" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>
                            {item.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => handleDeletePlate(selectedRecord.vehiculo.placa)}
                      className="flex-1 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/15"
                    >
                      Eliminar carro
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlate(null);
                        setSelectedRecord(null);
                      }}
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Compartir checklist ── */}
        {showShareModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowShareModal(false)}
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl flex flex-col gap-5">
              {/* Título */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Compartir formulario de inspección</h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Comparte este enlace con tus conductores para que puedan registrar el formulario de inspección preoperacional desde cualquier dispositivo.
              </p>

              {/* Link box */}
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                <span className="flex-1 truncate text-sm font-mono text-blue-400">
                  {shareBaseUrl}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareBaseUrl).then(() => {
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2500);
                    });
                  }}
                  className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                >
                  {shareCopied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>

              {/* Opciones de compartir */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Compartir vía</p>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hola 👋 Por favor registra tu inspección preoperacional diaria usando este enlace:\n${shareBaseUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-500/20"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enviar por WhatsApp
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent("Formulario de inspección preoperacional")}&body=${encodeURIComponent(`Hola,\n\nPor favor registra tu inspección preoperacional diaria usando el siguiente enlace:\n\n${shareBaseUrl}\n\nGracias.`)}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Enviar por correo
                </a>

                {/* Abrir formulario */}
                <a
                  href="/sistema"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir formulario (nueva pestaña)
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
