export type BranchType = 'internal' | 'external_donation';
export type CopyCondition = 'bueno' | 'regular' | 'malo';
export type CopyStatus = 'disponible' | 'prestado' | 'en_donacion' | 'baja' | 'en_traslado';
export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface Student {
  id: string;
  name: string;
  grade_section?: string;
  identifier?: string; // e.g. "MOS-EST-042"
  role?: 'student' | 'teacher' | 'staff';
  email?: string;
}

export interface Loan {
  id: string;
  copy_id: string;
  copy_internal_code: string;
  work_id: string;
  work_title: string;
  student_id: string;
  student_name: string;
  student_grade?: string;
  student_identifier?: string;
  loan_date: string; // ISO string
  due_date: string | null; // ISO string or null if indefinite
  is_indefinite: boolean;
  return_date?: string | null;
  status: LoanStatus;
  checkout_notes?: string;
  return_notes?: string;
  return_condition?: CopyCondition;
  created_at?: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  dewey_code: string;
  cover_url?: string;
  publisher?: string;
  publication_year?: number;
  subjects?: string[];
  description?: string;
  language?: string;
  created_at?: string;
}

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  location?: string;
  description?: string;
  created_at?: string;
}

export interface Copy {
  id: string;
  work_id: string;
  branch_id: string;
  condition: CopyCondition;
  internal_code: string;
  status?: CopyStatus;
  notes?: string;
  created_at?: string;
  work?: Work;
  branch?: Branch;
}

export interface BranchStockSummary {
  branch_id: string;
  branch_name: string;
  branch_type: BranchType;
  count: number;
  conditions: {
    bueno: number;
    regular: number;
    malo: number;
  };
}

export interface WorkWithCopiesCount extends Work {
  total_copies: number;
  copies_by_branch: BranchStockSummary[];
}

export interface DeweyGroup {
  code: string;
  name: string;
  description: string;
  classCode: string;
  color: string;
}

export interface DeweyClass {
  code: string;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  description: string;
  examples: string[];
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
