export type BranchType = 'internal' | 'external_donation';
export type CopyCondition = 'bueno' | 'regular' | 'malo';
export type CopyStatus = 'disponible' | 'prestado' | 'en_donacion' | 'baja' | 'en_traslado' | 'en_reparacion';
export type LoanStatus = 'active' | 'returned' | 'overdue';
export type PatronRole = 'student' | 'teacher' | 'staff' | 'community';

export interface PatronCategory {
  id: string;
  name: string;
  role: PatronRole;
  maxLoans: number;
  loanDays: number;
  allowIndefinite: boolean;
  color: string;
}

export interface Student {
  id: string;
  name: string;
  grade_section?: string;
  identifier?: string; // e.g. "MOS-EST-042"
  role?: PatronRole;
  email?: string;
  phone?: string;
  avatar_url?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
}

export type Patron = Student;

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
  renewal_count?: number;

  // Status & Observations
  status: LoanStatus;
  checkout_notes?: string;
  return_notes?: string; // Observaciones al devolver
  return_condition?: CopyCondition;

  created_at?: string;
}

// Koha-inspired Holds / Reservations
export type HoldStatus = 'waiting' | 'ready_for_pickup' | 'fulfilled' | 'cancelled' | 'expired';

export interface HoldReservation {
  id: string;
  work_id: string;
  work_title: string;
  work_author: string;
  work_cover_url?: string;
  patron_id?: string;
  patron_name: string;
  patron_identifier?: string;
  patron_grade?: string;
  patron_role?: PatronRole;
  branch_id?: string;
  branch_name?: string;
  reserved_date: string; // ISO string
  expiration_date?: string; // ISO string
  priority: number; // 1, 2, 3...
  status: HoldStatus;
  notes?: string;
  fulfilled_loan_id?: string;
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
  // MARC21 & Dublin Core extensions
  edition?: string;
  physical_description?: string; // e.g. "245 p. : il. ; 21 cm."
  series?: string;
  target_audience?: string; // e.g. "Juvenil", "Primaria", "Docente"
  call_number?: string; // Signatura topográfica completa
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
  barcode?: string;
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

// MARC 21 Data Structures (Koha::SimpleMARC & Koha::Biblio)
export interface MarcSubfield {
  code: string; // e.g. 'a', 'b', 'c', 'd'
  value: string;
}

export interface MarcField {
  tag: string; // e.g. '020', '082', '100', '245', '260', '650'
  ind1?: string; // Indicator 1
  ind2?: string; // Indicator 2
  subfields: MarcSubfield[];
}

export interface MarcRecord {
  leader: string; // 24-char MARC leader
  controlFields: Record<string, string>; // e.g. '001', '005', '008'
  dataFields: MarcField[];
}

// Koha-inspired Virtual Shelves (Listas y Colecciones Curadas)
export interface VirtualShelfItem {
  id: string;
  shelf_id: string;
  work_id: string;
  work?: Work;
  added_at: string;
  notes?: string;
}

export interface VirtualShelf {
  id: string;
  name: string;
  description: string;
  category: 'plan_lector' | 'recomendados' | 'efemerides' | 'comunidad' | 'tematica';
  is_public: boolean;
  color?: string;
  icon?: string;
  items_count?: number;
  created_by?: string;
  created_at: string;
  items?: VirtualShelfItem[];
}

// Koha-inspired Book Purchase Suggestions (Buzón de Desideratas)
export type SuggestionStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cataloged';

export interface BookSuggestion {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  reason?: string; // Por qué se solicita (ej. Proyecto de ciencias, Plan Lector de 3er año)
  suggested_by_name: string;
  suggested_by_role?: PatronRole;
  suggested_by_grade?: string;
  suggested_by_email?: string;
  status: SuggestionStatus;
  reviewer_notes?: string;
  votes: number; // Cantidad de estudiantes/docentes que apoyan la compra
  voted_by?: string[];
  created_at: string;
  updated_at?: string;
}

// Koha-inspired Stocktaking & Inventory Audits
export type AuditItemStatus = 'found_in_place' | 'found_misplaced' | 'missing' | 'unexpected';

export interface StockAuditItem {
  copy_code: string;
  scanned_at: string;
  status: AuditItemStatus;
  work_title?: string;
  work_author?: string;
  dewey_code?: string;
  expected_branch_name?: string;
  scanned_branch_name?: string;
  shelf_section?: string;
}

export interface StockAuditSession {
  id: string;
  branch_id: string;
  branch_name: string;
  shelf_range: string; // e.g. "Estantes 800 - 899 (Literatura)"
  started_at: string;
  ended_at?: string;
  scanned_count: number;
  missing_count: number;
  misplaced_count: number;
  items: StockAuditItem[];
}

// Preservation & Workshop (Taller de Encuadernación y Restauración)
export type PreservationStatus = 'en_espera' | 'en_tratamiento' | 'restaurado' | 'baja_definitiva';
export type DamageType = 'hojas_sueltas' | 'lomo_danado' | 'humedad_hongos' | 'rayones' | 'cubierta_rota' | 'otro';

export interface PreservationItem {
  id: string;
  copy_id: string;
  copy_code: string;
  work_title: string;
  work_author: string;
  damage_type: DamageType;
  status: PreservationStatus;
  diagnosis: string;
  treatment_applied?: string;
  entered_at: string;
  completed_at?: string;
  technician_name?: string;
  notes?: string;
}

// Offline Transaction Queue
export interface OfflineTransaction {
  id: string;
  type: 'checkout' | 'checkin' | 'hold';
  payload: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  error?: string;
}

export interface Database {
  public: {\n    Tables: {
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
      students: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Student>;
      };
      loans: {
        Row: Loan;
        Insert: Omit<Loan, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Loan>;
      };
      holds: {
        Row: HoldReservation;
        Insert: Omit<HoldReservation, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<HoldReservation>;
      };
      virtual_shelves: {
        Row: VirtualShelf;
        Insert: Omit<VirtualShelf, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<VirtualShelf>;
      };
      suggestions: {
        Row: BookSuggestion;
        Insert: Omit<BookSuggestion, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<BookSuggestion>;
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
