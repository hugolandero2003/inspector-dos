'use client';

import { useState, useEffect } from 'react';

// Interfaz para definir la estructura de los datos de las empresas
interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  emailAdmin: string;
  telefono: string;
  plan: 'prueba' | 'produccion';
  fechaRegistro: string; // Formato ISO 'YYYY-MM-DD'
  estado: 'activo' | 'inactivo';
  vehiculosRegistrados: number;
  inspeccionesRealizadas: number;
}

// Datos de simulación basados en tu modelo de negocio
const empresasIniciales: Empresa[] = [
  {
    id: '1',
    nombre: 'Transportes del Caribe S.A.S.',
    nit: '900.123.456-1',
    emailAdmin: 'gerencia@transcaribe.com',
    telefono: '3001234567',
    plan: 'prueba',
    fechaRegistro: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 5 días
    estado: 'activo',
    vehiculosRegistrados: 14,
    inspeccionesRealizadas: 42
  },
  {
    id: '2',
    nombre: 'Logística Express Colombia',
    nit: '890.321.654-2',
    emailAdmin: 'operaciones@logiexpress.com',
    telefono: '3159876543',
    plan: 'prueba',
    fechaRegistro: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 8 días (Culminando)
    estado: 'activo',
    vehiculosRegistrados: 8,
    inspeccionesRealizadas: 24
  },
  {
    id: '3',
    nombre: 'Distribuciones Atlántico',
    nit: '901.555.777-3',
    emailAdmin: 'sistemas@disatlantico.co',
    telefono: '3104445555',
    plan: 'produccion',
    fechaRegistro: '2026-02-15',
    estado: 'activo',
    vehiculosRegistrados: 45,
    inspeccionesRealizadas: 612
  },
  {
    id: '4',
    nombre: 'Flota de Carga del Norte',
    nit: '800.888.999-0',
    emailAdmin: 'mantenimiento@carganorte.com',
    telefono: '3052223333',
    plan: 'prueba',
    fechaRegistro: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 9 días (Vencida)
    estado: 'inactivo',
    vehiculosRegistrados: 3,
    inspeccionesRealizadas: 2
  }
];

export default function SuperAdminPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasIniciales);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null);

  // Función para calcular los días restantes de la prueba de 8 días
  const calcularDiasPrueba = (fechaRegistroStr: string) => {
    const fechaRegistro = new Date(fechaRegistroStr);
    const fechaActual = new Date();
    const diferenciaTiempo = fechaActual.getTime() - fechaRegistro.getTime();
    const diasTranscurridos = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));
    const diasRestantes = 8 - diasTranscurridos;
    return diasRestantes;
  };

  // Alternar el estado Activo/Inactivo de una empresa de forma inmediata
  const toggleEstado = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir el modal de detalles al presionar el switch
    setEmpresas(prev =>
      prev.map(emp =>
        emp.id === id ? { ...emp, estado: emp.estado === 'activo' ? 'inactivo' : 'activo' } : emp
      )
    );
  };

  const empresasFiltradas = empresas.filter(emp => {
    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'activo') return emp.estado === 'activo';
    if (filtroEstado === 'inactivo') return emp.estado === 'inactivo';
    if (filtroEstado === 'prueba') return emp.plan === 'prueba';
    if (filtroEstado === 'produccion') return emp.plan === 'produccion';
    return true;
  });

  return (
    <div style={{ backgroundColor: '#070b19', color: '#f3f4f6', minHeight: '100vh', padding: '2.5rem' }}>
      
      {/* HEADER PANEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>Control Global de Empresas</h1>
          <p style={{ color: '#9ca3af', marginTop: '0.25rem', fontSize: '0.875rem' }}>Monitoreo en tiempo real de uso, licencias y estados del software.</p>
        </div>
        
        {/* FILTROS */}
        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ backgroundColor: '#111827', color: '#ffffff', border: '1px solid #374151', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', outline: 'none' }}
        >
          <option value="todos">Todas las empresas</option>
          <option value="activo">Estado: Activas</option>
          <option value="inactivo">Estado: Inactivas</option>
          <option value="prueba">Plan: Período de Prueba</option>
          <option value="produccion">Plan: En Producción</option>
        </select>
      </div>

      {/* TABLA PRINCIPAL DE CONTROL */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem 1.5rem' }}>Empresa / NIT</th>
              <th style={{ padding: '1rem 1.5rem' }}>Plan Actual</th>
              <th style={{ padding: '1rem 1.5rem' }}>Tiempo de Uso / Prueba</th>
              <th style={{ padding: '1rem 1.5rem' }}>Estado</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.9rem' }}>
            {empresasFiltradas.map((emp) => {
              const diasRestantes = calcularDiasPrueba(emp.fechaRegistro);
              
              return (
                <tr 
                  key={emp.id} 
                  onClick={() => setEmpresaSeleccionada(emp)}
                  style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Nombre y Documento */}
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '600', color: '#ffffff' }}>{emp.nombre}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>NIT: {emp.nit}</div>
                  </td>
                  
                  {/* Modalidad de Plan */}
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                      backgroundColor: emp.plan === 'produccion' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: emp.plan === 'produccion' ? '#10b981' : '#f59e0b'
                    }}>
                      {emp.plan === 'produccion' ? 'PRODUCCIÓN' : 'PRUEBA (8D)'}
                    </span>
                  </td>
                  
                  {/* Métrica de Tiempo Real */}
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {emp.plan === 'produccion' ? (
                      <span style={{ color: '#9ca3af' }}>Suscripción Activa</span>
                    ) : diasRestantes > 0 ? (
                      <span style={{ color: diasRestantes <= 2 ? '#f87171' : '#f59e0b', fontWeight: diasRestantes <= 2 ? 'bold' : 'normal' }}>
                        {diasRestantes} {diasRestantes === 1 ? 'día restante' : 'días restantes'}
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Prueba Culminada</span>
                    )}
                  </td>
                  
                  {/* Estado Lógico Activo/Inactivo */}
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: emp.estado === 'activo' ? '#10b981' : '#ef4444'
                      }} />
                      <span style={{ textTransform: 'capitalize', color: emp.estado === 'activo' ? '#10b981' : '#ef4444' }}>
                        {emp.estado}
                      </span>
                    </div>
                  </td>
                  
                  {/* Interruptor de Encendido/Apagado */}
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                    <button
                      onClick={(e) => toggleEstado(emp.id, e)}
                      style={{
                        padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        backgroundColor: emp.estado === 'activo' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: emp.estado === 'activo' ? '#ef4444' : '#10b981'
                      }}
                    >
                      {emp.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL LATERAL/CENTRAL: DETALLES DE CADA EMPRESA */}
      {empresaSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{empresaSeleccionada.nombre}</h2>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>NIT: {empresaSeleccionada.nit}</p>
              </div>
              <button 
                onClick={() => setEmpresaSeleccionada(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.8rem' }}>Correo Administrador</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>{empresaSeleccionada.emailAdmin}</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.8rem' }}>Teléfono de Contacto</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>{empresaSeleccionada.telefono}</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.8rem' }}>Fecha de Registro</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>{empresaSeleccionada.fechaRegistro}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.75rem' }}>Vehículos en Flota</span>
                  <span style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 'bold' }}>{empresaSeleccionada.vehiculosRegistrados}</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.75rem' }}>Preoperacionales Realizados</span>
                  <span style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 'bold' }}>{empresaSeleccionada.inspeccionesRealizadas}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setEmpresaSeleccionada(null)}
              style={{ width: '100%', marginTop: '1.5rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.6rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              Cerrar Detalles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}