export function DashboardMockup() {
  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center text-white text-xs font-bold">P</div>
          <span className="text-white font-semibold text-sm">Preop Cloud - Dashboard</span>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-slate-300 text-xs">En línea</span>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-12 gap-3 p-4">
        {/* Sidebar */}
        <div className="col-span-3 space-y-1">
          <div className="px-3 py-2 bg-emerald-500 text-white rounded text-xs font-semibold">Dashboard</div>
          <div className="px-3 py-2 hover:bg-slate-200 rounded text-xs text-slate-600 cursor-pointer">Preoperacionales</div>
          <div className="px-3 py-2 hover:bg-slate-200 rounded text-xs text-slate-600 cursor-pointer">Flota</div>
          <div className="px-3 py-2 hover:bg-slate-200 rounded text-xs text-slate-600 cursor-pointer">Reportes</div>
          <div className="px-3 py-2 hover:bg-slate-200 rounded text-xs text-slate-600 cursor-pointer">Configuración</div>
        </div>

        {/* Main panel */}
        <div className="col-span-9 space-y-3">
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-3 rounded border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Inspecciones Hoy</div>
              <div className="text-lg font-bold text-slate-800">47</div>
              <div className="text-xs text-emerald-600 mt-1">+8 vs ayer</div>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Aprobadas</div>
              <div className="text-lg font-bold text-slate-800">45</div>
              <div className="text-xs text-emerald-600 mt-1">95.7%</div>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Pendientes</div>
              <div className="text-lg font-bold text-slate-800">2</div>
              <div className="text-xs text-amber-600 mt-1">Revisar</div>
            </div>
          </div>

          {/* Inspections list */}
          <div className="bg-white rounded border border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-700 mb-2">Últimas inspecciones</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 font-bold text-xs">✓</div>
                  <div>
                    <div className="font-semibold text-slate-800">ABC-1234</div>
                    <div className="text-slate-500">Camión Volqueta</div>
                  </div>
                </div>
                <div className="text-emerald-600 font-semibold">Aprobado</div>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 font-bold text-xs">✓</div>
                  <div>
                    <div className="font-semibold text-slate-800">XYZ-5678</div>
                    <div className="text-slate-500">Furgoneta Reparto</div>
                  </div>
                </div>
                <div className="text-emerald-600 font-semibold">Aprobado</div>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-amber-600 font-bold text-xs">!</div>
                  <div>
                    <div className="font-semibold text-slate-800">MNO-9012</div>
                    <div className="text-slate-500">Auto Corporativo</div>
                  </div>
                </div>
                <div className="text-amber-600 font-semibold">Pendiente</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
