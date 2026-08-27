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
  work_author: string;
  work_cover_url?: string;
  work_dewey_code?: string;
  branch_id: string;
  branch_name: string;
  
  // Student / Borrower info
  student_id?: string;
  student_name: string;
  student_grade?: string;
  student_identifier?: string;

  // Dates
  loan_date: string; // ISO string
  due_date?: string | null; // ISO string when defined, or null for indefinite loans
  is_indefinite?: boolean; // Plazo indefinido (docentes, material de aula, etc.)
  return_date?: string | null; // ISO string when returned

  // Status & Observations
  status: LoanStatus;
  checkout_notes?: string;
  return_notes?: string; // Observaciones al devolver
  return_condition?: CopyCondition;

  created_at?: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  isbn: string;
  dewey_code: string; // e.g. "863.64" (Literatura venezolana / hispanoamericana)
  cover_url: string;
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
  description?: string;
  location?: string;
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
  // Joins
  work?: Work;
  branch?: Branch;
}

export interface WorkWithCopiesCount extends Work {
  total_copies: number;
  copies_by_branch: {
    branch_id: string;
    branch_name: string;
    branch_type: BranchType;
    count: number;
    conditions: {
      bueno: number;
      regular: number;
      malo: number;
    };
  }[];
}

export interface Database {
  public: {
    Tables: {
      works: {
        Row: Work;
        Insert: Omit<Work, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Work>;
      };
      branches: {
        Row: Branch;
        Insert: Omit<Branch, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Branch>;
      };
      copies: {
        Row: Copy;
        Insert: Omit<Copy, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Copy>;
      };
    };
  };
}

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
