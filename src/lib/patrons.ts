import type { Patron, PatronCategory, PatronRole } from '../types/database';
import { getStoredLoans } from './loans';

export const PATRON_CATEGORIES: PatronCategory[] = [
  {
    id: 'cat_student_pri',
    name: 'Estudiantes de Primaria',
    role: 'student',
    maxLoans: 2,
    loanDays: 7,
    allowIndefinite: false,
    color: 'emerald',
  },
  {
    id: 'cat_student_bac',
    name: 'Estudiantes de Bachillerato',
    role: 'student',
    maxLoans: 3,
    loanDays: 14,
    allowIndefinite: false,
    color: 'blue',
  },
  {
    id: 'cat_teacher',
    name: 'Personal Docente & Coordinación',
    role: 'teacher',
    maxLoans: 15,
    loanDays: 30,
    allowIndefinite: true,
    color: 'purple',
  },
  {
    id: 'cat_staff',
    name: 'Personal Administrativo & Obrero',
    role: 'staff',
    maxLoans: 5,
    loanDays: 21,
    allowIndefinite: false,
    color: 'amber',
  },
  {
    id: 'cat_community',
    name: 'Comunidad Rural / Semilla Manglareña',
    role: 'community',
    maxLoans: 2,
    loanDays: 14,
    allowIndefinite: false,
    color: 'teal',
  },
];

export const INITIAL_PATRONS: Patron[] = [
  {
    id: 'est_01',
    name: 'Valentina Mendoza',
    grade_section: '4to Grado "A" — Primaria',
    identifier: 'MOS-EST-2024-012',
    role: 'student',
    email: 'valentina.mendoza@manglar.edu.ve',
    phone: '+58 414 1234567',
    is_active: true,
    created_at: '2024-09-15T10:00:00Z',
  },
  {
    id: 'est_02',
    name: 'Santiago Rivas Castillo',
    grade_section: '5to Grado "B" — Primaria',
    identifier: 'MOS-EST-2024-034',
    role: 'student',
    email: 'santiago.rivas@manglar.edu.ve',
    is_active: true,
    created_at: '2024-09-15T10:00:00Z',
  },
  {
    id: 'est_03',
    name: 'Camila Sofía Hernández',
    grade_section: '1er Año "A" — Bachillerato',
    identifier: 'MOS-BAC-2023-008',
    role: 'student',
    email: 'camila.hernandez@manglar.edu.ve',
    is_active: true,
    created_at: '2023-10-01T10:00:00Z',
  },
  {
    id: 'est_04',
    name: 'Mateo Alejandro Gómez',
    grade_section: '3er Año "B" — Bachillerato',
    identifier: 'MOS-BAC-2022-045',
    role: 'student',
    email: 'mateo.gomez@manglar.edu.ve',
    is_active: true,
    created_at: '2022-09-20T10:00:00Z',
  },
  {
    id: 'est_05',
    name: 'Lucía Isabella Farías',
    grade_section: '2do Grado "A" — Primaria',
    identifier: 'MOS-PRI-2025-003',
    role: 'student',
    email: 'lucia.farias@manglar.edu.ve',
    is_active: true,
    created_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 'est_06',
    name: 'Diego Andrés Carvallo',
    grade_section: '4to Año "Ciencias" — Bachillerato',
    identifier: 'MOS-BAC-2021-019',
    role: 'student',
    email: 'diego.carvallo@manglar.edu.ve',
    is_active: true,
    created_at: '2021-09-15T10:00:00Z',
  },
  {
    id: 'doc_01',
    name: 'Prof. María Elena Morales',
    grade_section: 'Docente de Castellano y Literatura',
    identifier: 'MOS-DOC-004',
    role: 'teacher',
    email: 'maria.morales@manglar.edu.ve',
    phone: '+58 412 9876543',
    is_active: true,
    created_at: '2020-01-15T10:00:00Z',
  },
  {
    id: 'doc_02',
    name: 'Prof. Carlos Eduardo Benítez',
    grade_section: 'Docente de Ciencias y Biología',
    identifier: 'MOS-DOC-009',
    role: 'teacher',
    email: 'carlos.benitez@manglar.edu.ve',
    is_active: true,
    created_at: '2020-01-15T10:00:00Z',
  },
  {
    id: 'doc_03',
    name: 'Prof. Ana Teresa Valera',
    grade_section: 'Maestra de 3er Grado — Primaria',
    identifier: 'MOS-DOC-015',
    role: 'teacher',
    email: 'ana.valera@manglar.edu.ve',
    is_active: true,
    created_at: '2021-09-01T10:00:00Z',
  },
];

export function getStoredPatrons(): Patron[] {
  if (typeof window === 'undefined') return INITIAL_PATRONS;
  const saved = localStorage.getItem('manglar_patrons_v2');
  if (!saved) {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify(INITIAL_PATRONS));
    return INITIAL_PATRONS;
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PATRONS;
  } catch {
    return INITIAL_PATRONS;
  }
}

export function savePatron(patron: Omit<Patron, 'id'> & { id?: string }): Patron {
  const patrons = getStoredPatrons();
  const newPatron: Patron = {
    ...patron,
    id: patron.id || `patron_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    is_active: patron.is_active ?? true,
    created_at: patron.created_at || new Date().toISOString(),
  };

  const updated = [newPatron, ...patrons.filter((p) => p.id !== newPatron.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify(updated));
    // Also sync to legacy students key for backward compatibility
    localStorage.setItem('manglar_students', JSON.stringify(updated));
  }
  return newPatron;
}

export function deletePatron(id: string): boolean {
  const patrons = getStoredPatrons();
  const updated = patrons.filter((p) => p.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify(updated));
    localStorage.setItem('manglar_students', JSON.stringify(updated));
  }
  return true;
}

export function getPatronCategory(patron: Patron): PatronCategory {
  if (patron.role === 'teacher') return PATRON_CATEGORIES[2];
  if (patron.role === 'staff') return PATRON_CATEGORIES[3];
  if (patron.role === 'community') return PATRON_CATEGORIES[4];
  
  // Student: distinguish primary and highschool by grade
  const grade = (patron.grade_section || '').toLowerCase();
  if (grade.includes('año') || grade.includes('bachillerato') || grade.includes('media')) {
    return PATRON_CATEGORIES[1];
  }
  return PATRON_CATEGORIES[0];
}

export interface PatronActivityStats {
  patron: Patron;
  category: PatronCategory;
  activeLoansCount: number;
  totalLoansHistoryCount: number;
  overdueLoansCount: number;
  canBorrowMore: boolean;
  maxLoansAllowed: number;
}

export function getPatronActivityStats(patronId: string): PatronActivityStats | null {
  const patrons = getStoredPatrons();
  const patron = patrons.find((p) => p.id === patronId);
  if (!patron) return null;

  const loans = getStoredLoans();
  const patronLoans = loans.filter((l) => l.student_id === patron.id || l.student_name.toLowerCase().trim() === patron.name.toLowerCase().trim());

  const active = patronLoans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const overdue = patronLoans.filter((l) => l.status === 'overdue');
  const cat = getPatronCategory(patron);

  return {
    patron,
    category: cat,
    activeLoansCount: active.length,
    totalLoansHistoryCount: patronLoans.length,
    overdueLoansCount: overdue.length,
    canBorrowMore: active.length < cat.maxLoans,
    maxLoansAllowed: cat.maxLoans,
  };
}
