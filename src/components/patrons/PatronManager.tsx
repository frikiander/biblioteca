import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  CreditCard, 
  GraduationCap, 
  BookOpen, 
  Phone, 
  Mail, 
  Printer, 
  Edit3, 
  Trash2,
  UserPlus,
  Building2,
  HeartHandshake,
  Check
} from 'lucide-react';
import type { Patron, PatronRole } from '../../types/database';
import { 
  getStoredPatrons, 
  savePatron, 
  deletePatron, 
  getPatronCategory, 
  getPatronActivityStats, 
  getRoleDisplay,
  PATRON_CATEGORIES 
} from '../../lib/patrons';
import { PrintPatronCardsModal } from './PrintPatronCardsModal';

interface PatronManagerProps {
  onOpenLoanForPatron?: (patron: Patron) => void;
}

const ROLE_FILTER_OPTIONS: { role: string; label: string; desc: string }[] = [
  { role: 'all', label: 'Todos', desc: 'Comunidad total' },
  { role: 'student', label: 'Alumnos', desc: 'Primaria y Bachillerato' },
  { role: 'teacher', label: 'Docentes', desc: 'Cuerpo de profesores' },
  { role: 'administrative', label: 'Administrativo', desc: 'Gestión y coordinación' },
  { role: 'maintenance', label: 'Mantenimiento', desc: 'Servicios de apoyo' },
  { role: 'parent', label: 'Padres / Familias', desc: 'Representantes' },
  { role: 'other', label: 'Otros', desc: 'Roles externos / especiales' },
];

export function PatronManager({ onOpenLoanForPatron }: PatronManagerProps) {
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isNewPatronModalOpen, setIsNewPatronModalOpen] = useState<boolean>(false);
  const [editingPatron, setEditingPatron] = useState<Patron | null>(null);
  const [selectedPatronsForPrint, setSelectedPatronsForPrint] = useState<Patron[] | null>(null);

  // Form State
  const [formFirstName, setFormFirstName] = useState<string>('');
  const [formLastName, setFormLastName] = useState<string>('');
  const [formGrade, setFormGrade] = useState<string>('');
  const [formIdentifier, setFormIdentifier] = useState<string>('');
  const [formRole, setFormRole] = useState<PatronRole>('student');
  const [formCustomRole, setFormCustomRole] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');

  useEffect(() => {
    setPatrons(getStoredPatrons());
  }, []);

  const refreshPatrons = () => {
    setPatrons(getStoredPatrons());
  };

  const filteredPatrons = useMemo(() => {
    return patrons.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.first_name && p.first_name.toLowerCase().includes(q)) ||
        (p.last_name && p.last_name.toLowerCase().includes(q)) ||
        (p.identifier && p.identifier.toLowerCase().includes(q)) ||
        (p.grade_section && p.grade_section.toLowerCase().includes(q)) ||
        (p.custom_role && p.custom_role.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q));

      const matchesRole = 
        selectedRole === 'all' || 
        p.role === selectedRole ||
        (selectedRole === 'administrative' && p.role === 'staff') ||
        (selectedRole === 'other' && p.role === 'community');

      return matchesQuery && matchesRole;
    });
  }, [patrons, searchQuery, selectedRole]);

  const generateIdentifier = (role: PatronRole) => {
    const prefix = 
      role === 'student' ? 'EST' :
      role === 'teacher' ? 'DOC' :
      role === 'administrative' ? 'ADM' :
      role === 'maintenance' ? 'MNT' :
      role === 'parent' ? 'REP' : 'COM';
    return `MOS-${prefix}-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
  };

  const handleOpenCreateModal = () => {
    setEditingPatron(null);
    setFormFirstName('');
    setFormLastName('');
    setFormGrade('4to Grado "A" — Primaria');
    setFormRole('student');
    setFormCustomRole('');
    setFormIdentifier(generateIdentifier('student'));
    setFormEmail('');
    setFormPhone('');
    setIsNewPatronModalOpen(true);
  };

  const handleOpenEditModal = (patron: Patron) => {
    setEditingPatron(patron);
    if (patron.first_name || patron.last_name) {
      setFormFirstName(patron.first_name || '');
      setFormLastName(patron.last_name || '');
    } else {
      const parts = patron.name.split(' ');
      setFormFirstName(parts[0] || '');
      setFormLastName(parts.slice(1).join(' ') || '');
    }
    setFormGrade(patron.grade_section || '');
    setFormIdentifier(patron.identifier || '');
    setFormRole(patron.role || 'student');
    setFormCustomRole(patron.custom_role || '');
    setFormEmail(patron.email || '');
    setFormPhone(patron.phone || '');
    setIsNewPatronModalOpen(true);
  };

  const handleRoleChangeInForm = (newRole: PatronRole) => {
    setFormRole(newRole);
    if (!editingPatron) {
      setFormIdentifier(generateIdentifier(newRole));
    }
  };

  const handleSavePatron = (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = formFirstName.trim();
    const lastName = formLastName.trim();
    if (!firstName && !lastName) return;

    const fullName = `${firstName} ${lastName}`.trim();

    savePatron({
      id: editingPatron ? editingPatron.id : undefined,
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      grade_section: formRole === 'student' ? (formGrade.trim() || undefined) : undefined,
      identifier: formIdentifier.trim(),
      role: formRole,
      custom_role: formRole === 'other' ? (formCustomRole.trim() || 'Comunidad') : undefined,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      is_active: true,
    });

    setIsNewPatronModalOpen(false);
    refreshPatrons();
  };

  const handleDeletePatron = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${name} del directorio de la comunidad?`)) {
      try {
        await deletePatron(id);
      } catch (err) {
        console.error('Error al eliminar lector:', err);
      }
      setPatrons((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-[#D3D2D3] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#83B141]/10 border border-[#83B141]/30 text-[#83B141] flex items-center justify-center shadow-xs shrink-0">
            <Users className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#83B141] bg-[#83B141]/10 px-2.5 py-0.5 rounded-full border border-[#83B141]/30">
                Comunidad Educativa & Lectores
              </span>
              <span className="text-xs text-neutral-500">• {patrons.length} miembros registrados</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-1">
              Directorio de la Comunidad Educativa
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl mt-1">
              Registro y control de Alumnos, Docentes, Personal Administrativo, Mantenimiento, Padres/Representantes y miembros externos para préstamos y carnetización.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setSelectedPatronsForPrint(filteredPatrons)}
            disabled={filteredPatrons.length === 0}
            className="px-4 py-2.5 bg-white hover:bg-neutral-50 disabled:opacity-50 text-neutral-800 border border-[#D3D2D3] font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#83B141]" strokeWidth={1.75} />
            Imprimir Carnets ({filteredPatrons.length})
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-[#83B141] hover:bg-[#719b35] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.75} />
            + Nuevo Miembro
          </button>
        </div>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ROLE_FILTER_OPTIONS.map((item) => {
          const count = item.role === 'all'
            ? patrons.length
            : patrons.filter((p) => {
                if (item.role === 'administrative') return p.role === 'administrative' || p.role === 'staff';
                if (item.role === 'other') return p.role === 'other' || p.role === 'community';
                return p.role === item.role;
              }).length;

          const isSelected = selectedRole === item.role;

          return (
            <div
              key={item.role}
              onClick={() => setSelectedRole(item.role)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#83B141] text-white border-[#83B141] shadow-xs'
                  : 'bg-white text-neutral-800 border-[#D3D2D3] hover:border-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs font-bold leading-tight">{item.label}</div>
                <div className="text-2xl font-black mt-1">{count}</div>
              </div>
              <div className={`text-[10px] mt-1 truncate ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#D3D2D3] shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, rol, código de carnet, grado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F9F8] border border-[#D3D2D3] rounded-xl text-xs font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141]"
        >
          <option value="all">Todos los Roles</option>
          <option value="student">Alumnos</option>
          <option value="teacher">Docentes</option>
          <option value="administrative">Personal Administrativo</option>
          <option value="maintenance">Personal de Mantenimiento</option>
          <option value="parent">Padres / Representantes</option>
          <option value="other">Otros Roles</option>
        </select>
      </div>

      {/* Patrons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatrons.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dashed border-[#D3D2D3] space-y-3">
            <Users className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="font-bold text-neutral-700 text-sm">No se encontraron miembros de la comunidad</p>
            <p className="text-xs text-neutral-500">Prueba con otro término de búsqueda o registra un nuevo miembro.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#83B141] hover:bg-[#719b35] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registrar Miembro
            </button>
          </div>
        ) : (
          filteredPatrons.map((patron) => {
            const stats = getPatronActivityStats(patron.id);
            const cat = stats?.category || getPatronCategory(patron);
            const roleDisplay = getRoleDisplay(patron.role, patron.custom_role);

            return (
              <div
                key={patron.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200 shrink-0">
                        {patron.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {patron.name}
                        </h3>
                        <div className="text-[11px] font-mono text-[#83B141] font-semibold mt-0.5">
                          {patron.identifier || 'Sin Carnet'}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${roleDisplay.badgeClass}`}>
                      {roleDisplay.label}
                    </span>
                  </div>

                  {/* Subtitle Info (Grade or Custom Role) */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {patron.role === 'student' ? (
                        <>
                          <GraduationCap className="w-3.5 h-3.5 text-[#83B141]" />
                          <span>{patron.grade_section || 'Sin grado asignado'}</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-[#83B141]" />
                          <span>{patron.custom_role || roleDisplay.label}</span>
                        </>
                      )}
                    </div>
                    {patron.email && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{patron.email}</span>
                      </div>
                    )}
                    {patron.phone && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{patron.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Activity Stats */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Activos</div>
                      <div className={`font-black text-sm ${stats && stats.activeLoansCount > 0 ? 'text-[#83B141]' : 'text-slate-700'}`}>
                        {stats?.activeLoansCount || 0} / {cat.maxLoans}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Histórico</div>
                      <div className="font-black text-sm text-slate-700">
                        {stats?.totalLoansHistoryCount || 0}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Vencidos</div>
                      <div className={`font-black text-sm ${stats && stats.overdueLoansCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {stats?.overdueLoansCount || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPatronsForPrint([patron])}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Imprimir Carnet"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#83B141]" />
                      Carnet
                    </button>

                    {onOpenLoanForPatron && (
                      <button
                        onClick={() => onOpenLoanForPatron(patron)}
                        className="px-2.5 py-1.5 bg-[#83B141]/10 hover:bg-[#83B141]/20 text-[#83B141] rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Prestar un libro a este miembro"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Prestar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(patron)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer"
                      title="Editar datos"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeletePatron(patron.id, patron.name)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Eliminar miembro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New / Edit Patron */}
      {isNewPatronModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#83B141]/10 text-[#83B141] flex items-center justify-center border border-[#83B141]/20">
                  <UserPlus className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingPatron ? 'Editar Miembro de la Comunidad' : 'Registrar Miembro de la Comunidad'}
                </h3>
              </div>
              <button
                onClick={() => setIsNewPatronModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePatron} className="mt-4 space-y-3.5 text-xs">
              {/* Role Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rol en la Comunidad *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { role: 'student', label: 'Alumno' },
                    { role: 'teacher', label: 'Docente' },
                    { role: 'administrative', label: 'Administrativo' },
                    { role: 'maintenance', label: 'Mantenimiento' },
                    { role: 'parent', label: 'Padre / Rep.' },
                    { role: 'other', label: 'Otro' },
                  ].map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleRoleChangeInForm(r.role as PatronRole)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border cursor-pointer text-center ${
                        formRole === r.role
                          ? 'bg-[#83B141] text-white border-[#83B141] shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Role is 'Otro', specify what role in the community */}
              {formRole === 'other' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Menciona qué rol tiene en la comunidad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Pasante, Tallerista, Investigador externo, Voluntario..."
                    value={formCustomRole}
                    onChange={(e) => setFormCustomRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                  />
                </div>
              )}

              {/* Nombre y Apellido as requested */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Primer nombre"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Apellido *</label>
                  <input
                    type="text"
                    required
                    placeholder="Primer apellido"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                  />
                </div>
              </div>

              {/* If Alumno, Grade / Section */}
              {formRole === 'student' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Grado / Sección *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 5to Grado 'A' — Primaria"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                  />
                </div>
              )}

              {/* ID / Carnet Code */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cód. Carnet / ID / Cédula *</label>
                <input
                  type="text"
                  required
                  placeholder="MOS-EST-2026-001"
                  value={formIdentifier}
                  onChange={(e) => setFormIdentifier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                />
              </div>

              {/* Contact Info (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono / WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    placeholder="+58 414..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#83B141]/30 focus:border-[#83B141] focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPatronModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#83B141] hover:bg-[#719b35] text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {editingPatron ? 'Guardar Cambios' : 'Registrar Miembro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patron Cards Modal */}
      {selectedPatronsForPrint && (
        <PrintPatronCardsModal
          patrons={selectedPatronsForPrint}
          onClose={() => setSelectedPatronsForPrint(null)}
        />
      )}
    </div>
  );
}

