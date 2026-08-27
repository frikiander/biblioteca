import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  CreditCard, 
  UserCheck, 
  GraduationCap, 
  BookOpen, 
  Phone, 
  Mail, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Printer, 
  Edit3, 
  Trash2,
  Filter,
  UserPlus
} from 'lucide-react';
import type { Patron, PatronRole } from '../../types/database';
import { 
  getStoredPatrons, 
  savePatron, 
  deletePatron, 
  getPatronCategory, 
  getPatronActivityStats, 
  PATRON_CATEGORIES 
} from '../../lib/patrons';
import { PrintPatronCardsModal } from './PrintPatronCardsModal';

interface PatronManagerProps {
  onOpenLoanForPatron?: (patron: Patron) => void;
}

export function PatronManager({ onOpenLoanForPatron }: PatronManagerProps) {
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isNewPatronModalOpen, setIsNewPatronModalOpen] = useState<boolean>(false);
  const [editingPatron, setEditingPatron] = useState<Patron | null>(null);
  const [selectedPatronsForPrint, setSelectedPatronsForPrint] = useState<Patron[] | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formGrade, setFormGrade] = useState<string>('');
  const [formIdentifier, setFormIdentifier] = useState<string>('');
  const [formRole, setFormRole] = useState<PatronRole>('student');
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
        (p.identifier && p.identifier.toLowerCase().includes(q)) ||
        (p.grade_section && p.grade_section.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q));

      const matchesRole = selectedRole === 'all' || p.role === selectedRole;

      return matchesQuery && matchesRole;
    });
  }, [patrons, searchQuery, selectedRole]);

  const handleOpenCreateModal = () => {
    setEditingPatron(null);
    setFormName('');
    setFormGrade('4to Grado "A" — Primaria');
    setFormIdentifier(`MOS-EST-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
    setFormRole('student');
    setFormEmail('');
    setFormPhone('');
    setIsNewPatronModalOpen(true);
  };

  const handleOpenEditModal = (patron: Patron) => {
    setEditingPatron(patron);
    setFormName(patron.name);
    setFormGrade(patron.grade_section || '');
    setFormIdentifier(patron.identifier || '');
    setFormRole(patron.role || 'student');
    setFormEmail(patron.email || '');
    setFormPhone(patron.phone || '');
    setIsNewPatronModalOpen(true);
  };

  const handleSavePatron = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    savePatron({
      id: editingPatron ? editingPatron.id : undefined,
      name: formName.trim(),
      grade_section: formGrade.trim(),
      identifier: formIdentifier.trim(),
      role: formRole,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      is_active: true,
    });

    setIsNewPatronModalOpen(false);
    refreshPatrons();
  };

  const handleDeletePatron = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${name} del directorio de lectores?`)) {
      deletePatron(id);
      refreshPatrons();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Koha Patrons & Categories
              </span>
              <span className="text-xs text-slate-500">• {patrons.length} lectores registrados</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Directorio de Lectores y Carnetización
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1">
              Gestión de estudiantes, docentes y miembros comunitarios con políticas de préstamo por categoría y generación instantánea de credenciales con código de barras.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setSelectedPatronsForPrint(filteredPatrons)}
            disabled={filteredPatrons.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Imprimir Carnets ({filteredPatrons.length})
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Lector
          </button>
        </div>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {PATRON_CATEGORIES.slice(0, 4).map((cat) => {
          const count = patrons.filter((p) => {
            const pCat = getPatronCategory(p);
            return pCat.id === cat.id;
          }).length;

          return (
            <div
              key={cat.id}
              onClick={() => setSelectedRole(cat.role)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                selectedRole === cat.role
                  ? 'bg-emerald-900 text-white border-emerald-700 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-semibold opacity-80">{cat.name}</div>
              <div className="text-2xl font-black mt-1">{count}</div>
              <div className="text-[11px] opacity-70 mt-1">
                Límite: {cat.maxLoans} libros • {cat.loanDays} días
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, código de carnet, cédula/identificador o grado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Todas las Categorías</option>
          <option value="student">Estudiantes</option>
          <option value="teacher">Docentes</option>
          <option value="staff">Personal Administrativo</option>
          <option value="community">Comunidad Rural</option>
        </select>
      </div>

      {/* Patrons Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatrons.map((patron) => {
          const stats = getPatronActivityStats(patron.id);
          const cat = stats?.category || getPatronCategory(patron);

          return (
            <div
              key={patron.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200">
                      {patron.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {patron.name}
                      </h3>
                      <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                        {patron.identifier || 'Sin Carnet'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {cat.name.split(' ')[0]}
                  </span>
                </div>

                {/* Grade & Contact */}
                <div className="mt-3.5 space-y-1 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {patron.grade_section || 'Sin grado asignado'}
                  </div>
                  {patron.email && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {patron.email}
                    </div>
                  )}
                </div>

                {/* Activity Stats */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Activos</div>
                    <div className={`font-black text-sm ${stats && stats.activeLoansCount > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
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
                <button
                  onClick={() => setSelectedPatronsForPrint([patron])}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Imprimir Carnet"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Carnet
                </button>

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
                    title="Eliminar lector"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: New / Edit Patron */}
      {isNewPatronModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingPatron ? 'Editar Datos del Lector' : 'Registrar Nuevo Lector'}
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
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Valentina Mendoza"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoría / Rol</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as PatronRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="staff">Personal Administrativo</option>
                    <option value="community">Comunidad Rural</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cód. Carnet / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="MOS-EST-2026-001"
                    value={formIdentifier}
                    onChange={(e) => setFormIdentifier(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Grado / Sección o Cargo</label>
                <input
                  type="text"
                  placeholder="ej. 4to Grado 'A' — Primaria"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Institucional</label>
                  <input
                    type="email"
                    placeholder="alumno@manglar.edu.ve"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+58 414..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPatronModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {editingPatron ? 'Guardar Cambios' : 'Registrar Lector'}
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
