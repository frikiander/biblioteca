import type { Loan, Student, Copy, CopyCondition, LoanStatus } from '../types/database';
import { getStoredCopies, getStoredWorks, getStoredBranches } from './supabaseClient';

export const INITIAL_STUDENTS: Student[] = [
  { id: 'est_01', name: 'Valentina Mendoza', grade_section: '4to Grado "A" — Primaria', identifier: 'CIM-PRI-2024-012', role: 'student' },
  { id: 'est_02', name: 'Santiago Rivas Castillo', grade_section: '5to Grado "B" — Primaria', identifier: 'CIM-PRI-2024-034', role: 'student' },
  { id: 'est_03', name: 'Camila Sofía Hernández', grade_section: '1er Año "A" — Bachillerato', identifier: 'CIM-BAC-2023-008', role: 'student' },
  { id: 'est_04', name: 'Mateo Alejandro Gómez', grade_section: '3er Año "B" — Bachillerato', identifier: 'CIM-BAC-2022-045', role: 'student' },
  { id: 'est_05', name: 'Lucía Isabella Farías', grade_section: '2do Grado "A" — Primaria', identifier: 'CIM-PRI-2025-003', role: 'student' },
  { id: 'est_06', name: 'Diego Andrés Carvallo', grade_section: '4to Año "Ciencias" — Bachillerato', identifier: 'CIM-BAC-2021-019', role: 'student' },
  { id: 'est_07', name: 'Mariana Victoria Ramos', grade_section: '6to Grado "A" — Primaria', identifier: 'CIM-PRI-2024-055', role: 'student' },
  { id: 'est_08', name: 'Gabriel Ignacio Silva', grade_section: '5to Año "Promoción" — Bachillerato', identifier: 'CIM-BAC-2020-002', role: 'student' },
  { id: 'doc_01', name: 'Prof. María Elena Morales', grade_section: 'Docente de Castellano y Literatura', identifier: 'CIM-DOC-004', role: 'teacher' },
  { id: 'doc_02', name: 'Prof. Carlos Eduardo Benítez', grade_section: 'Docente de Ciencias y Biología', identifier: 'CIM-DOC-009', role: 'teacher' },
  { id: 'doc_03', name: 'Prof. Ana Teresa Valera', grade_section: 'Maestra de 3er Grado — Primaria', identifier: 'CIM-DOC-015', role: 'teacher' },
];

export function getStoredStudents(): Student[] {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  const saved = localStorage.getItem('manglar_students');
  if (!saved) {
    localStorage.setItem('manglar_students', JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STUDENTS;
  } catch {
    return INITIAL_STUDENTS;
  }
}

export function saveStudent(student: Omit<Student, 'id'> & { id?: string }): Student {
  const students = getStoredStudents();
  const newStudent: Student = {
    ...student,
    id: student.id || `est_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  const updated = [newStudent, ...students.filter((s) => s.id !== newStudent.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_students', JSON.stringify(updated));
  }
  return newStudent;
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

export function normalizeMarbeteCode(code?: string): string {
  if (!code) return '';
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function areMarbeteCodesMatching(codeA?: string, codeB?: string): boolean {
  if (!codeA || !codeB) return false;
  const normA = normalizeMarbeteCode(codeA);
  const normB = normalizeMarbeteCode(codeB);
  if (normA === normB) return true;

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

export function findActiveLoanByCopyCode(code: string): Loan | null {
  if (!code || !code.trim()) return null;
  const loans = getStoredLoans();
  return (
    loans.find(
      (l) => (l.status === 'active' || l.status === 'overdue') && areMarbeteCodesMatching(l.copy_internal_code, code)
    ) || null
  );
}

export function registerLoan(params: {
  copy: Copy;
  student: Student | { name: string; grade_section?: string; identifier?: string };
  dueDays?: number | null;
  isIndefinite?: boolean;
  customDueDate?: string | null;
  checkoutNotes?: string;
}): { success: boolean; loan?: Loan; error?: string } {
  const { copy, student, dueDays = 7, isIndefinite = false, customDueDate, checkoutNotes = '' } = params;

  const existingActive = findActiveLoanByCopyCode(copy.internal_code);
  if (existingActive) {
    return {
      success: false,
      error: `El ejemplar "${copy.internal_code}" ya se encuentra en préstamo activo con el alumno ${existingActive.student_name} desde el ${new Date(existingActive.loan_date).toLocaleDateString('es-VE')}.`,
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

  const newLoan: Loan = {
    id: `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    copy_id: copy.id,
    copy_internal_code: copy.internal_code,
    work_id: work?.id || copy.work_id,
    work_title: work?.title || 'Obra Bibliográfica',
    work_author: work?.author || 'Autor General',
    work_cover_url: work?.cover_url,
    work_dewey_code: work?.dewey_code,
    branch_id: branch?.id || copy.branch_id,
    branch_name: branch?.name || 'Biblioteca Central',
    student_id: 'id' in student ? student.id : undefined,
    student_name: student.name.trim(),
    student_grade: student.grade_section?.trim(),
    student_identifier: student.identifier?.trim(),
    loan_date: now.toISOString(),
    due_date: dueDateString,
    is_indefinite: isIndefinite,
    return_date: null,
    status: 'active',
    checkout_notes: checkoutNotes.trim() || undefined,
    created_at: now.toISOString(),
  };

  const loans = getStoredLoans();
  saveLoans([newLoan, ...loans]);

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

  if (student.name.trim()) {
    saveStudent({
      name: student.name.trim(),
      grade_section: student.grade_section?.trim() || 'Alumno Colegio Integral El Manglar',
      identifier: student.identifier?.trim() || `CIM-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'student',
    });
  }

  return {
    success: true,
    loan: newLoan,
  };
}

export function returnLoan(params: {
  copyCode: string;
  returnNotes?: string;
  returnCondition?: CopyCondition;
}): { success: boolean; loan?: Loan; error?: string } {
  const { copyCode, returnNotes = '', returnCondition } = params;

  const activeLoan = findActiveLoanByCopyCode(copyCode);
  if (!activeLoan) {
    return {
      success: false,
      error: `No se encontró un préstamo activo registrado con el código de marbete "${copyCode}". Es posible que el libro ya esté disponible en estantería o que el código esté mal escrito.`,
    };
  }

  const now = new Date();

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

export interface CopyTraceability {
  copyCode: string;
  copyId: string;
  workTitle: string;
  workAuthor: string;
  workCoverUrl?: string;
  deweyCode?: string;
  branchName: string;
  totalLoansCount: number;
  uniqueHandsCount: number;
  currentStatus: 'disponible' | 'prestado' | 'en_donacion' | 'baja' | 'en_traslado';
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
