import type { Loan, Student, Copy, CopyCondition, LoanStatus, CopyStatus } from '../types/database';
import { getStoredCopies, getStoredWorks, getStoredBranches, supabase, isSupabaseConfigured } from './supabaseClient';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const INITIAL_STUDENTS: Student[] = [];

import { getStoredPatrons, savePatron } from './patrons';

export function getStoredStudents(): Student[] {
  return getStoredPatrons();
}

export function saveStudent(student: Omit<Student, 'id'> & { id?: string }): Student {
  return savePatron(student);
}

export function getStoredLoans(): Loan[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_loans');
  if (!saved) {
    localStorage.setItem('manglar_loans', JSON.stringify([]));
    return [];
  }
  try {
    const parsed: Loan[] = JSON.parse(saved);
    return parsed.map((l) => {
      // Auto-compute overdue status if active, NOT indefinite, and past due date
      if (l.status === 'active' && !l.is_indefinite && l.due_date && new Date(l.due_date).getTime() < Date.now()) {
        return { ...l, status: 'overdue' as LoanStatus };
      }
      return l;
    });
  } catch {
    return [];
  }
}

export function saveLoans(loans: Loan[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_loans', JSON.stringify(loans));
  }
}

/**
 * Consulta en tiempo real los préstamos de Supabase si está configurado
 */
export async function fetchLiveLoans(): Promise<Loan[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('loan_date', { ascending: false });

      if (!error && data) {
        const mapped = (data as Loan[]).map((l) => {
          if (l.status === 'active' && !l.is_indefinite && l.due_date && new Date(l.due_date).getTime() < Date.now()) {
            return { ...l, status: 'overdue' as LoanStatus };
          }
          return l;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('manglar_loans', JSON.stringify(mapped));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('Error al consultar préstamos de Supabase:', err);
    }
  }
  return getStoredLoans();
}

/**
 * Normalizes a spine label/marbete code for fuzzy comparisons
 * e.g. "mos-863-ote-1", "MOS-863-OTE-1", "MOS-863-OTE-001", "MOS - 863 - OTE - 1"
 */
export function normalizeMarbeteCode(code?: string): string {
  if (!code) return '';
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Checks if two marbete codes match (handling padding differences like -1 vs -001)
 */
export function areMarbeteCodesMatching(codeA?: string, codeB?: string): boolean {
  if (!codeA || !codeB) return false;
  const normA = normalizeMarbeteCode(codeA);
  const normB = normalizeMarbeteCode(codeB);
  if (normA === normB) return true;

  // Split by hyphen and compare parts (e.g. MOS-863-OTE-1 vs MOS-863-OTE-001)
  const partsA = normA.split('-');
  const partsB = normB.split('-');
  if (partsA.length === partsB.length && partsA.length >= 3) {
    const lastA = parseInt(partsA[partsA.length - 1], 10);
    const lastB = parseInt(partsB[partsB.length - 1], 10);
    if (!isNaN(lastA) && !isNaN(lastB) && lastA === lastB) {
      const restA = partsA.slice(0, -1).join('-');
      const restB = partsB.slice(0, -1).join('-');
      if (restA === restB) return true;
    }
  }

  return false;
}

/**
 * Finds a physical copy by its marbete code
 */
export function findCopyByCode(code: string): Copy | null {
  if (!code || !code.trim()) return null;
  const copies = getStoredCopies();
  const works = getStoredWorks();
  const branches = getStoredBranches();

  const found = copies.find((c) => areMarbeteCodesMatching(c.internal_code, code));
  if (!found) return null;

  const work = works.find((w) => w.id === found.work_id);
  const branch = branches.find((b) => b.id === found.branch_id);

  return {
    ...found,
    work,
    branch,
  };
}

/**
 * Finds an active (or overdue) loan for a given copy code
 */
export function findActiveLoanByCopyCode(code: string): Loan | null {
  if (!code || !code.trim()) return null;
  const loans = getStoredLoans();
  return (
    loans.find(
      (l) => (l.status === 'active' || l.status === 'overdue') && areMarbeteCodesMatching(l.copy_internal_code, code)
    ) || null
  );
}

/**
 * Registers a new checkout loan (persisted to Supabase and mirrored locally)
 */
export async function registerLoan(params: {
  copy: Copy;
  student: Student | { name: string; first_name?: string; last_name?: string; grade_section?: string; identifier?: string; role?: any; custom_role?: string };
  dueDays?: number | null;
  isIndefinite?: boolean;
  customDueDate?: string | null;
  loanReason?: string;
  checkoutNotes?: string;
}): Promise<{ success: boolean; loan?: Loan; error?: string }> {
  const { copy, student, dueDays = 7, isIndefinite = false, customDueDate, loanReason, checkoutNotes = '' } = params;

  // 1. Verify availability
  const existingActive = findActiveLoanByCopyCode(copy.internal_code);
  if (existingActive) {
    return {
      success: false,
      error: `El ejemplar "${copy.internal_code}" ya se encuentra en préstamo activo con ${existingActive.student_name} desde el ${new Date(existingActive.loan_date).toLocaleDateString('es-VE')}.`,
    };
  }

  const works = getStoredWorks();
  const branches = getStoredBranches();
  const work = copy.work || works.find((w) => w.id === copy.work_id);
  const branch = copy.branch || branches.find((b) => b.id === copy.branch_id);

  const now = new Date();
  let dueDateString: string | null = null;

  if (!isIndefinite) {
    if (customDueDate) {
      dueDateString = new Date(customDueDate).toISOString();
    } else if (typeof dueDays === 'number' && dueDays > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);
      dueDateString = dueDate.toISOString();
    }
  }

  const newLoanId = generateUUID();
  const newLoan: Loan = {
    id: newLoanId,
    copy_id: copy.id,
    copy_internal_code: copy.internal_code,
    work_id: work?.id || copy.work_id,
    work_title: work?.title || 'Obra Bibliográfica',
    work_author: work?.author || 'Autor General',
    work_cover_url: work?.cover_url,
    work_dewey_code: work?.dewey_code,
    branch_id: branch?.id || copy.branch_id,
    branch_name: branch?.name || 'Biblioteca Central',
    student_id: 'id' in student && student.id ? student.id : undefined,
    student_name: student.name.trim(),
    student_grade: student.grade_section?.trim(),
    student_identifier: student.identifier?.trim(),
    student_role: 'role' in student ? student.role : undefined,
    student_custom_role: 'custom_role' in student ? student.custom_role : undefined,
    loan_date: now.toISOString(),
    due_date: dueDateString,
    is_indefinite: isIndefinite,
    return_date: null,
    status: 'active',
    loan_reason: loanReason?.trim() || undefined,
    checkout_notes: checkoutNotes.trim() || undefined,
    created_at: now.toISOString(),
  };

  // 1. Sincronizar en Supabase si está disponible
  if (isSupabaseConfigured && supabase) {
    try {
      const { error: loanErr } = await (supabase as any).from('loans').insert({
        id: newLoanId,
        copy_id: copy.id,
        copy_internal_code: copy.internal_code,
        work_id: work?.id || copy.work_id,
        work_title: work?.title || 'Obra Bibliográfica',
        work_author: work?.author || 'Autor General',
        work_cover_url: work?.cover_url || null,
        work_dewey_code: work?.dewey_code || null,
        branch_id: branch?.id || copy.branch_id,
        branch_name: branch?.name || 'Biblioteca Central',
        student_id: 'id' in student && student.id && student.id.includes('-') ? student.id : null,
        student_name: student.name.trim(),
        student_grade: student.grade_section?.trim() || null,
        student_identifier: student.identifier?.trim() || null,
        loan_date: now.toISOString(),
        due_date: dueDateString,
        is_indefinite: isIndefinite,
        return_date: null,
        status: 'active',
        checkout_notes: [loanReason?.trim(), checkoutNotes.trim()].filter(Boolean).join(' | ') || null,
      });

      if (loanErr) {
        console.error('Error insertando préstamo en Supabase:', loanErr);
      }

      await (supabase as any)
        .from('copies')
        .update({ status: 'prestado' })
        .eq('id', copy.id);
    } catch (err) {
      console.warn('Error al guardar préstamo en Supabase:', err);
    }
  }

  // 2. Update local storage
  const loans = getStoredLoans();
  saveLoans([newLoan, ...loans]);

  // Update copy status to 'prestado' locally
  const copies = getStoredCopies();
  const updatedCopies = copies.map((c) => {
    if (c.id === copy.id || areMarbeteCodesMatching(c.internal_code, copy.internal_code)) {
      return {
        ...c,
        status: 'prestado' as const,
      };
    }
    return c;
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));
  }

  // Ensure student is saved in patron directory
  if (student.name.trim()) {
    saveStudent({
      name: student.name.trim(),
      first_name: 'first_name' in student ? student.first_name : undefined,
      last_name: 'last_name' in student ? student.last_name : undefined,
      grade_section: student.grade_section?.trim() || 'Comunidad Colegio El Manglar',
      identifier: student.identifier?.trim() || `MOS-COM-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'role' in student ? student.role : 'student',
      custom_role: 'custom_role' in student ? student.custom_role : undefined,
    });
  }

  return {
    success: true,
    loan: newLoan,
  };
}

/**
 * Returns a borrowed book (Check-in) and updates Supabase + localStorage
 */
export async function returnLoan(params: {
  copyCode: string;
  returnNotes?: string;
  returnCondition?: CopyCondition;
}): Promise<{ success: boolean; loan?: Loan; error?: string }> {
  const { copyCode, returnNotes = '', returnCondition } = params;

  const activeLoan = findActiveLoanByCopyCode(copyCode);
  if (!activeLoan) {
    return {
      success: false,
      error: `No se encontró un préstamo activo registrado con el código de marbete "${copyCode}". Es posible que el libro ya esté disponible en estantería o que el código esté mal escrito.`,
    };
  }

  const now = new Date();

  // 1. Sincronizar en Supabase si está activo
  if (isSupabaseConfigured && supabase) {
    try {
      await (supabase as any)
        .from('loans')
        .update({
          status: 'returned',
          return_date: now.toISOString(),
          return_notes: returnNotes.trim() || 'Devuelto sin novedades',
          return_condition: returnCondition || null,
        })
        .eq('id', activeLoan.id);

      await (supabase as any)
        .from('copies')
        .update({
          status: 'disponible',
          ...(returnCondition ? { condition: returnCondition } : {}),
        })
        .eq('id', activeLoan.copy_id);
    } catch (err) {
      console.warn('Error al actualizar devolución en Supabase:', err);
    }
  }

  // 2. Update loan record locally
  const loans = getStoredLoans();
  const updatedLoans = loans.map((l) => {
    if (l.id === activeLoan.id) {
      return {
        ...l,
        status: 'returned' as LoanStatus,
        return_date: now.toISOString(),
        return_notes: returnNotes.trim() || 'Devuelto sin novedades',
        return_condition: returnCondition || l.return_condition,
      };
    }
    return l;
  });
  saveLoans(updatedLoans);

  // 3. Set copy status back to 'disponible' (and update condition if specified)
  const copies = getStoredCopies();
  const updatedCopies = copies.map((c) => {
    if (c.id === activeLoan.copy_id || areMarbeteCodesMatching(c.internal_code, activeLoan.copy_internal_code)) {
      return {
        ...c,
        status: 'disponible' as const,
        condition: returnCondition || c.condition,
      };
    }
    return c;
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));
  }

  const updatedLoanRecord = updatedLoans.find((l) => l.id === activeLoan.id);

  return {
    success: true,
    loan: updatedLoanRecord,
  };
}

/**
 * Elimina un registro de préstamo definitivamente (tanto en Supabase como en localStorage)
 * y restaura el estado del ejemplar a 'disponible' si el préstamo estaba activo.
 */
export async function deleteLoan(loanId: string, restoreCopyStatus: boolean = true): Promise<boolean> {
  const loans = getStoredLoans();
  const targetLoan = loans.find((l) => l.id === loanId);

  // 1. Eliminar de Supabase si está conectado
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await (supabase as any).from('loans').delete().eq('id', loanId);
      if (error) {
        console.error('Error eliminando préstamo de Supabase:', error);
      }

      if (restoreCopyStatus && targetLoan && (targetLoan.status === 'active' || targetLoan.status === 'overdue')) {
        await (supabase as any)
          .from('copies')
          .update({ status: 'disponible' })
          .eq('id', targetLoan.copy_id);
      }
    } catch (err) {
      console.warn('Error al eliminar préstamo en Supabase:', err);
    }
  }

  // 2. Eliminar de localStorage
  if (typeof window !== 'undefined') {
    const updatedLoans = loans.filter((l) => l.id !== loanId);
    saveLoans(updatedLoans);

    if (restoreCopyStatus && targetLoan && (targetLoan.status === 'active' || targetLoan.status === 'overdue')) {
      const copies = getStoredCopies();
      const updatedCopies = copies.map((c) => {
        if (c.id === targetLoan.copy_id || areMarbeteCodesMatching(c.internal_code, targetLoan.copy_internal_code)) {
          return { ...c, status: 'disponible' as const };
        }
        return c;
      });
      localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));
    }
  }

  return true;
}

/**
 * Traceability metadata for a copy or work
 */
export interface CopyTraceability {
  copyCode: string;
  copyId: string;
  workTitle: string;
  workAuthor: string;
  workCoverUrl?: string;
  deweyCode?: string;
  branchName: string;
  totalLoansCount: number;
  uniqueHandsCount: number; // Por cuántas manos/alumnos distintos ha pasado
  currentStatus: CopyStatus;
  activeLoan: Loan | null;
  history: Loan[];
}

export function getCopyTraceability(copyInternalCodeOrId: string): CopyTraceability | null {
  const copies = getStoredCopies();
  const works = getStoredWorks();
  const branches = getStoredBranches();
  const loans = getStoredLoans();

  const copy = copies.find(
    (c) => c.id === copyInternalCodeOrId || areMarbeteCodesMatching(c.internal_code, copyInternalCodeOrId)
  );

  if (!copy) return null;

  const work = works.find((w) => w.id === copy.work_id);
  const branch = branches.find((b) => b.id === copy.branch_id);

  const copyLoans = loans.filter(
    (l) => l.copy_id === copy.id || areMarbeteCodesMatching(l.copy_internal_code, copy.internal_code)
  );

  const uniqueStudents = new Set(copyLoans.map((l) => l.student_name.toLowerCase().trim()));
  const activeLoan = copyLoans.find((l) => l.status === 'active' || l.status === 'overdue') || null;

  return {
    copyCode: copy.internal_code,
    copyId: copy.id,
    workTitle: work?.title || 'Obra Desconocida',
    workAuthor: work?.author || 'Autor Desconocido',
    workCoverUrl: work?.cover_url,
    deweyCode: work?.dewey_code,
    branchName: branch?.name || 'Biblioteca',
    totalLoansCount: copyLoans.length,
    uniqueHandsCount: uniqueStudents.size,
    currentStatus: copy.status || (activeLoan ? 'prestado' : 'disponible'),
    activeLoan,
    history: copyLoans,
  };
}

export function getOverallLoanStats(): {
  totalLoans: number;
  activeLoans: number;
  returnedLoans: number;
  overdueLoans: number;
  uniqueReaders: number;
} {
  const loans = getStoredLoans();
  const active = loans.filter((l) => l.status === 'active');
  const overdue = loans.filter((l) => l.status === 'overdue');
  const returned = loans.filter((l) => l.status === 'returned');
  const uniqueReaders = new Set(loans.map((l) => l.student_name.toLowerCase().trim())).size;

  return {
    totalLoans: loans.length,
    activeLoans: active.length,
    returnedLoans: returned.length,
    overdueLoans: overdue.length,
    uniqueReaders,
  };
}
