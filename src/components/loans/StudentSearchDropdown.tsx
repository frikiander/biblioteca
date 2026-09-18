import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, GraduationCap, Users } from 'lucide-react';
import type { Student, PatronRole } from '../../types/database';
import { getStoredStudents, saveStudent } from '../../lib/loans';
import { getRoleDisplay } from '../../lib/patrons';

interface StudentSearchDropdownProps {
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS: { role: PatronRole; label: string; placeholderGrade?: string }[] = [
  { role: 'student', label: 'Alumno', placeholderGrade: 'Grado / Sección (ej. 5to Grado "A")' },
  { role: 'teacher', label: 'Docente' },
  { role: 'administrative', label: 'Administrativo' },
  { role: 'maintenance', label: 'Mantenimiento' },
  { role: 'parent', label: 'Padre / Representante' },
  { role: 'other', label: 'Otro' },
];

export const StudentSearchDropdown: React.FC<StudentSearchDropdownProps> = ({
  selectedStudent,
  onSelectStudent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  
  // Inline add state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [formRole, setFormRole] = useState<PatronRole>('student');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formGrade, setFormGrade] = useState('5to Grado "A" — Primaria');
  const [formCustomRole, setFormCustomRole] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStudents(getStoredStudents());
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingCustom(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      (s.first_name && s.first_name.toLowerCase().includes(term)) ||
      (s.last_name && s.last_name.toLowerCase().includes(term)) ||
      (s.grade_section && s.grade_section.toLowerCase().includes(term)) ||
      (s.identifier && s.identifier.toLowerCase().includes(term)) ||
      (s.custom_role && s.custom_role.toLowerCase().includes(term))
    );
  });

  const handleSelect = (student: Student) => {
    onSelectStudent(student);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleStartAdding = (prefillName = '') => {
    setIsAddingCustom(true);
    if (prefillName.trim()) {
      const parts = prefillName.trim().split(' ');
      if (parts.length > 1) {
        setFormFirstName(parts[0]);
        setFormLastName(parts.slice(1).join(' '));
      } else {
        setFormFirstName(prefillName.trim());
        setFormLastName('');
      }
    } else {
      setFormFirstName('');
      setFormLastName('');
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = formFirstName.trim();
    const lastName = formLastName.trim();
    if (!firstName && !lastName) return;

    const fullName = `${firstName} ${lastName}`.trim();
    const prefix = formRole === 'student' ? 'EST' : formRole === 'teacher' ? 'DOC' : formRole === 'parent' ? 'REP' : 'COM';

    const newStudent = saveStudent({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      role: formRole,
      custom_role: formRole === 'other' ? (formCustomRole.trim() || 'Comunidad') : undefined,
      grade_section: formRole === 'student' ? (formGrade.trim() || 'Estudiante Colegio El Manglar') : undefined,
      identifier: `MOS-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setStudents(getStoredStudents());
    onSelectStudent(newStudent);
    setFormFirstName('');
    setFormLastName('');
    setFormCustomRole('');
    setIsAddingCustom(false);
    setIsOpen(false);
  };

  const selectedRoleDisplay = selectedStudent ? getRoleDisplay(selectedStudent.role, selectedStudent.custom_role) : null;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Active Trigger / Input Display */}
      {selectedStudent && !isOpen ? (
        <div
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full p-3 bg-[#83B141]/10 border border-[#83B141]/30 rounded-xl flex items-center justify-between cursor-pointer transition hover:bg-[#83B141]/15 ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#83B141] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {selectedStudent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900">{selectedStudent.name}</span>
                {selectedRoleDisplay && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedRoleDisplay.badgeClass}`}>
                    {selectedRoleDisplay.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                {selectedStudent.role === 'student' ? (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-[#83B141]" />
                    <span>{selectedStudent.grade_section || 'Estudiante'}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 text-[#83B141]" />
                    <span>{selectedStudent.custom_role || selectedRoleDisplay?.label || 'Comunidad'}</span>
                  </>
                )}
                {selectedStudent.identifier && (
                  <span className="text-slate-400 font-mono text-[11px]">({selectedStudent.identifier})</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="text-xs text-[#83B141] font-bold hover:underline px-2 py-1 rounded-md hover:bg-[#83B141]/10 cursor-pointer"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              disabled={disabled}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar por nombre, apellido, rol, grado o carnet..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 focus:border-[#83B141] transition"
            />
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-96 flex flex-col">
          {/* Header with Search and Quick Action */}
          <div className="p-2.5 bg-slate-50 border-b border-[#D3D2D3] flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#83B141]" />
              Comunidad & Estudiantes
            </span>
            <button
              type="button"
              onClick={() => {
                if (isAddingCustom) {
                  setIsAddingCustom(false);
                } else {
                  handleStartAdding(searchTerm);
                }
              }}
              className="text-[#83B141] hover:text-[#719b35] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingCustom ? 'Ver lista' : '+ Registrar miembro'}</span>
            </button>
          </div>

          {/* Inline Add Form */}
          {isAddingCustom ? (
            <form onSubmit={handleCreateCustom} className="p-3.5 bg-[#F8F9F8] border-b border-[#D3D2D3] space-y-2.5">
              <p className="text-xs font-bold text-neutral-900">Registrar Nuevo Miembro de la Comunidad</p>
              
              {/* Role Picker */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                  Rol en la Comunidad:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.role}
                      type="button"
                      onClick={() => setFormRole(opt.role)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition text-center cursor-pointer border ${
                        formRole === opt.role
                          ? 'bg-[#83B141] text-white border-[#83B141] shadow-2xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Role is 'Otro', specify what role in the community */}
              {formRole === 'other' && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Menciona qué rol tiene en la comunidad <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomRole}
                    onChange={(e) => setFormCustomRole(e.target.value)}
                    placeholder="ej. Pasante, Tallerista, Visitante de investigación, Voluntario..."
                    className="w-full px-3 py-1.5 bg-white border border-[#D3D2D3] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 focus:border-[#83B141]"
                  />
                </div>
              )}

              {/* Nombre y Apellido as requested */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">
                    Nombre <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="Primer nombre..."
                    className="w-full px-3 py-1.5 bg-white border border-[#D3D2D3] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 focus:border-[#83B141]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">
                    Apellido <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Primer apellido..."
                    className="w-full px-3 py-1.5 bg-white border border-[#D3D2D3] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 focus:border-[#83B141]"
                  />
                </div>
              </div>

              {/* If Alumno, Grade / Section */}
              {formRole === 'student' && (
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">
                    Grado / Sección <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    placeholder="Grado / Sección (ej. 5to Grado 'A' — Primaria)"
                    className="w-full px-3 py-1.5 bg-white border border-[#D3D2D3] rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#83B141]/20 focus:border-[#83B141]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          ) : null}

          {/* Member List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                <p>No se encontraron miembros de la comunidad con "{searchTerm}"</p>
                <button
                  type="button"
                  onClick={() => handleStartAdding(searchTerm)}
                  className="px-3 py-1.5 bg-[#83B141] hover:bg-[#719b35] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Registrar "{searchTerm}" en la comunidad
                </button>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                const roleDisplay = getRoleDisplay(student.role, student.custom_role);

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#83B141]/10 text-neutral-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-[#83B141] text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{student.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${roleDisplay.badgeClass}`}>
                            {roleDisplay.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          {student.role === 'student' ? (
                            <span>{student.grade_section || 'Estudiante'}</span>
                          ) : (
                            <span>{student.custom_role || roleDisplay.label}</span>
                          )}
                          {student.identifier && (
                            <span className="text-slate-400 font-mono text-[10px]">
                              • {student.identifier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#83B141] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

