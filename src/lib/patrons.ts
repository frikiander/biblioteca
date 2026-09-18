import type { Patron, PatronCategory, PatronRole } from '../types/database';
import { getStoredLoans } from './loans';

export const PATRON_CATEGORIES: PatronCategory[] = [
  {
    id: 'cat_student_pri',
    name: 'Alumnos (Primaria)',
    role: 'student',
    maxLoans: 2,
    loanDays: 7,
    allowIndefinite: false,
    color: 'emerald',
  },
  {
    id: 'cat_student_bac',
    name: 'Alumnos (Bachillerato)',
    role: 'student',
    maxLoans: 3,
    loanDays: 14,
    allowIndefinite: false,
    color: 'blue',
  },
  {
    id: 'cat_teacher',
    name: 'Docentes & Profesores',
    role: 'teacher',
    maxLoans: 15,
    loanDays: 30,
    allowIndefinite: true,
    color: 'purple',
  },
  {
    id: 'cat_administrative',
    name: 'Personal Administrativo',
    role: 'administrative',
    maxLoans: 5,
    loanDays: 21,
    allowIndefinite: false,
    color: 'blue',
  },
  {
    id: 'cat_maintenance',
    name: 'Personal de Mantenimiento',
    role: 'maintenance',
    maxLoans: 3,
    loanDays: 14,
    allowIndefinite: false,
    color: 'amber',
  },
  {
    id: 'cat_parent',
    name: 'Padres / Representantes',
    role: 'parent',
    maxLoans: 2,
    loanDays: 14,
    allowIndefinite: false,
    color: 'rose',
  },
  {
    id: 'cat_other',
    name: 'Otros Miembros de la Comunidad',
    role: 'other',
    maxLoans: 2,
    loanDays: 14,
    allowIndefinite: false,
    color: 'neutral',
  },
];

export const INITIAL_PATRONS: Patron[] = [
  // Alumnos
  {
    id: 'est_01',
    name: 'Valentina Mendoza',
    first_name: 'Valentina',
    last_name: 'Mendoza',
    grade_section: '4to Grado "A" — Primaria',
    identifier: 'MOS-ALU-2024-012',
    role: 'student',
    email: 'valentina.mendoza@manglar.edu.ve',
    phone: '+58 414 1234567',
    is_active: true,
    created_at: '2024-09-15T10:00:00Z',
  },
  {
    id: 'est_02',
    name: 'Santiago Rivas Castillo',
    first_name: 'Santiago',
    last_name: 'Rivas Castillo',
    grade_section: '5to Grado "B" — Primaria',
    identifier: 'MOS-ALU-2024-034',
    role: 'student',
    email: 'santiago.rivas@manglar.edu.ve',
    is_active: true,
    created_at: '2024-09-15T10:00:00Z',
  },
  {
    id: 'est_03',
    name: 'Camila Sofía Hernández',
    first_name: 'Camila Sofía',
    last_name: 'Hernández',
    grade_section: '1er Año "A" — Bachillerato',
    identifier: 'MOS-ALU-2023-008',
    role: 'student',
    email: 'camila.hernandez@manglar.edu.ve',
    is_active: true,
    created_at: '2023-10-01T10:00:00Z',
  },
  // Docentes
  {
    id: 'doc_01',
    name: 'Prof. María Elena Morales',
    first_name: 'María Elena',
    last_name: 'Morales',
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
    first_name: 'Carlos Eduardo',
    last_name: 'Benítez',
    grade_section: 'Docente de Ciencias y Biología',
    identifier: 'MOS-DOC-009',
    role: 'teacher',
    email: 'carlos.benitez@manglar.edu.ve',
    is_active: true,
    created_at: '2020-01-15T10:00:00Z',
  },
  // Administrativos
  {
    id: 'adm_01',
    name: 'Lic. Andrés Bello Silva',
    first_name: 'Andrés',
    last_name: 'Bello Silva',
    grade_section: 'Coordinación de Control de Estudios',
    identifier: 'MOS-ADM-001',
    role: 'administrative',
    email: 'andres.bello@manglar.edu.ve',
    phone: '+58 414 5551234',
    is_active: true,
    created_at: '2021-02-10T10:00:00Z',
  },
  // Mantenimiento
  {
    id: 'man_01',
    name: 'José Manuel Pérez',
    first_name: 'José Manuel',
    last_name: 'Pérez',
    grade_section: 'Mantenimiento General e Instalaciones',
    identifier: 'MOS-MAN-001',
    role: 'maintenance',
    phone: '+58 416 3334455',
    is_active: true,
    created_at: '2021-05-18T10:00:00Z',
  },
  // Padre / Representante
  {
    id: 'rep_01',
    name: 'Roberto Mendoza',
    first_name: 'Roberto',
    last_name: 'Mendoza',
    grade_section: 'Representante de Valentina Mendoza (4to Grado A)',
    identifier: 'MOS-PAD-001',
    role: 'parent',
    phone: '+58 412 1112233',
    email: 'roberto.mendoza@gmail.com',
    is_active: true,
    created_at: '2024-09-18T10:00:00Z',
  },
  // Otro (Comunidad)
  {
    id: 'otr_01',
    name: 'Elena Carrasquel',
    first_name: 'Elena',
    last_name: 'Carrasquel',
    grade_section: 'Comunidad Externa',
    custom_role: 'Pasante de Bibliotecología UCV',
    identifier: 'MOS-OTR-001',
    role: 'other',
    phone: '+58 424 9998877',
    is_active: true,
    created_at: '2025-02-01T10:00:00Z',
  },
];

import { isSupabaseConfigured, supabase } from './supabaseClient';

export function getStoredPatrons(): Patron[] {
  if (typeof window === 'undefined') return INITIAL_PATRONS;
  const saved = localStorage.getItem('manglar_patrons_v2');
  if (saved === null) {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify(INITIAL_PATRONS));
    localStorage.setItem('manglar_students', JSON.stringify(INITIAL_PATRONS));
    return INITIAL_PATRONS;
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function fetchLivePatrons(): Promise<Patron[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await (supabase as any)
        .from('students')
        .select('*')
        .order('name', { ascending: true });
      if (!error && Array.isArray(data)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('manglar_patrons_v2', JSON.stringify(data));
          localStorage.setItem('manglar_students', JSON.stringify(data));
        }
        return data;
      }
    } catch (err) {
      console.error('Error fetching live patrons from Supabase:', err);
    }
  }
  return getStoredPatrons();
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

  // If Supabase is configured, sync in background
  if (isSupabaseConfigured && supabase) {
    (async () => {
      try {
        const payload = {
          name: newPatron.name,
          grade_section: newPatron.grade_section || null,
          identifier: newPatron.identifier || null,
          role: newPatron.role || 'student',
          email: newPatron.email || null,
          phone: newPatron.phone || null,
          is_active: newPatron.is_active,
        };
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newPatron.id);
        if (isUuid) {
          await (supabase as any).from('students').upsert({ id: newPatron.id, ...payload });
        } else {
          const { data } = await (supabase as any).from('students').insert(payload).select('id').single();
          if (data?.id) {
            newPatron.id = data.id;
            const synced = [newPatron, ...patrons.filter((p) => p.id !== patron.id && p.id !== newPatron.id)];
            if (typeof window !== 'undefined') {
              localStorage.setItem('manglar_patrons_v2', JSON.stringify(synced));
              localStorage.setItem('manglar_students', JSON.stringify(synced));
            }
          }
        }
      } catch (err) {
        console.error('Error syncing patron to Supabase:', err);
      }
    })();
  }

  return newPatron;
}

export async function deletePatron(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await (supabase as any).from('loans').delete().eq('student_id', id);
      await (supabase as any).from('holds').delete().eq('patron_id', id);
      const { error } = await (supabase as any).from('students').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando lector de Supabase:', error);
        throw new Error(`Error en Supabase al eliminar lector: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Error en deletePatron Supabase:', err);
      throw err;
    }
  }

  const patrons = getStoredPatrons();
  const updated = patrons.filter((p) => String(p.id).trim() !== String(id).trim());
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify(updated));
    localStorage.setItem('manglar_students', JSON.stringify(updated));
  }
  return true;
}


export function getRoleDisplay(role?: PatronRole | string, customRole?: string): {
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
} {
  switch (role) {
    case 'student':
      return {
        label: 'Alumno',
        shortLabel: 'Alumno',
        bg: 'bg-[#83B141]/10',
        text: 'text-[#3b5e14]',
        border: 'border-[#83B141]/30',
        badgeClass: 'bg-[#83B141]/10 text-[#3b5e14] border-[#83B141]/30',
      };
    case 'teacher':
      return {
        label: 'Docente',
        shortLabel: 'Docente',
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    case 'administrative':
    case 'staff':
      return {
        label: 'Administrativo',
        shortLabel: 'Admin',
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    case 'maintenance':
      return {
        label: 'Mantenimiento',
        shortLabel: 'Mantenimiento',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'parent':
      return {
        label: 'Padre / Representante',
        shortLabel: 'Representante',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      };
    case 'other':
      return {
        label: customRole ? `Otro: ${customRole}` : 'Otro (Comunidad)',
        shortLabel: customRole || 'Otro',
        bg: 'bg-neutral-100',
        text: 'text-neutral-800',
        border: 'border-neutral-300',
        badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-300',
      };
    default:
      return {
        label: 'Comunidad',
        shortLabel: 'Comunidad',
        bg: 'bg-neutral-100',
        text: 'text-neutral-800',
        border: 'border-neutral-200',
        badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      };
  }
}


export function getPatronCategory(patron: Patron): PatronCategory {
  if (patron.role === 'teacher') return PATRON_CATEGORIES[2];
  if (patron.role === 'administrative' || patron.role === 'staff') return PATRON_CATEGORIES[3];
  if (patron.role === 'maintenance') return PATRON_CATEGORIES[4];
  if (patron.role === 'parent') return PATRON_CATEGORIES[5];
  if (patron.role === 'other' || patron.role === 'community') return PATRON_CATEGORIES[6];
  
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
