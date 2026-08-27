import React, { useState, useEffect, useRef } from 'react';
import { Search, User, UserPlus, Check, GraduationCap, School } from 'lucide-react';
import type { Student } from '../../types/database';
import { getStoredStudents, saveStudent } from '../../lib/loans';

interface StudentSearchDropdownProps {
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  disabled?: boolean;
}

export const StudentSearchDropdown: React.FC<StudentSearchDropdownProps> = ({
  selectedStudent,
  onSelectStudent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGrade, setCustomGrade] = useState('5to Grado "A" — Primaria');
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
      (s.grade_section && s.grade_section.toLowerCase().includes(term)) ||
      (s.identifier && s.identifier.toLowerCase().includes(term))
    );
  });

  const handleSelect = (student: Student) => {
    onSelectStudent(student);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newStudent = saveStudent({
      name: customName.trim(),
      grade_section: customGrade.trim() || 'Estudiante Colegio El Manglar',
      role: 'student',
      identifier: `CIM-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setStudents(getStoredStudents());
    onSelectStudent(newStudent);
    setCustomName('');
    setIsAddingCustom(false);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {selectedStudent && !isOpen ? (
        <div
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between cursor-pointer transition hover:bg-emerald-100/60 ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {selectedStudent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{selectedStudent.name}</span>
                {selectedStudent.role === 'teacher' && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                    Docente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                <span>{selectedStudent.grade_section || 'Estudiante'}</span>
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
            className="text-xs text-emerald-800 font-bold hover:underline px-2 py-1 rounded-md hover:bg-emerald-200/50"
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
              placeholder="Buscar alumno por nombre, grado o carnet..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-80 flex flex-col">
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">Lista de Lectores & Estudiantes</span>
            <button
              type="button"
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingCustom ? 'Ver lista' : '+ Registrar nuevo alumno'}</span>
            </button>
          </div>

          {isAddingCustom ? (
            <form onSubmit={handleCreateCustom} className="p-4 bg-emerald-50/50 border-b border-emerald-100 space-y-3">
              <p className="text-xs font-bold text-emerald-950">Ingresar Nuevo Alumno o Docente</p>
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nombre y Apellido del alumno..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customGrade}
                  onChange={(e) => setCustomGrade(e.target.value)}
                  placeholder="Grado / Sección (ej. 4to Grado B)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          ) : null}

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                <p>No se encontraron alumnos con "{searchTerm}"</p>
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(searchTerm);
                    setIsAddingCustom(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Registrar "{searchTerm}" como nuevo alumno
                </button>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          student.role === 'teacher'
                            ? 'bg-purple-100 text-purple-800'
                            : isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {student.role === 'teacher' && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-medium">
                              Docente
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>{student.grade_section || 'Estudiante'}</span>
                          {student.identifier && (
                            <span className="text-slate-400 font-mono text-[10px]">
                              • {student.identifier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
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
