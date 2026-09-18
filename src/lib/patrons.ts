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

export const INITIAL_PATRONS: Patron[] = [];

import { isSupabaseConfigured, supabase } from './supabaseClient';

export function getStoredPatrons(): Patron[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_patrons_v2');
  if (!saved) {
    localStorage.setItem('manglar_patrons_v2', JSON.stringify([]));
    localStorage.setItem('manglar_students', JSON.stringify([]));
    return [];
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
  // 1. Eliminar inmediatamente de localStorage para asegurar respuesta instantánea en UI
  if (typeof window !== 'undefined') {
    const patrons = getStoredPatrons();
    const updated = patrons.filter((p) => String(p.id).trim() !== String(id).trim());
    localStorage.setItem('manglar_patrons_v2', JSON.stringify(updated));
    localStorage.setItem('manglar_students', JSON.stringify(updated));
  }

  // 2. Si Supabase está conectado, eliminar de forma segura
  if (isSupabaseConfigured && supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await (supabase as any).from('loans').delete().eq('student_id', id);
        await (supabase as any).from('holds').delete().eq('patron_id', id);
        await (supabase as any).from('students').delete().eq('id', id);
      } else {
        await (supabase as any).from('students').delete().eq('identifier', id);
      }
    } catch (err: any) {
      console.warn('Advertencia al eliminar lector en Supabase:', err);
    }
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
