import type { 
  StockAuditSession, 
  StockAuditItem, 
  AuditItemStatus, 
  PreservationItem, 
  PreservationStatus, 
  DamageType 
} from '../types/database';
import { getStoredCopies, getStoredWorks, getStoredBranches } from './supabaseClient';
import { areMarbeteCodesMatching, findCopyByCode } from './loans';

export function getStoredAuditSessions(): StockAuditSession[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_audit_sessions');
  if (!saved) return [];
  try {
    return JSON.parse(saved) || [];
  } catch {
    return [];
  }
}

export function saveAuditSessions(sessions: StockAuditSession[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_audit_sessions', JSON.stringify(sessions));
  }
}

export function createAuditSession(params: {
  branchId: string;
  branchName: string;
  shelfRange: string;
}): StockAuditSession {
  const sessions = getStoredAuditSessions();
  const newSession: StockAuditSession = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    branch_id: params.branchId,
    branch_name: params.branchName,
    shelf_range: params.shelfRange.trim(),
    started_at: new Date().toISOString(),
    scanned_count: 0,
    missing_count: 0,
    misplaced_count: 0,
    items: [],
  };

  const updated = [newSession, ...sessions];
  saveAuditSessions(updated);
  return newSession;
}

export function scanItemInSession(
  sessionId: string,
  scannedCode: string,
  shelfSection?: string
): { session: StockAuditSession; item: StockAuditItem; isNew: boolean } | null {
  const sessions = getStoredAuditSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;

  const copy = findCopyByCode(scannedCode);
  const now = new Date().toISOString();

  let status: AuditItemStatus = 'found_in_place';
  let workTitle = copy?.work?.title;
  let workAuthor = copy?.work?.author;
  let deweyCode = copy?.work?.dewey_code;
  let expectedBranch = copy?.branch?.name;

  if (!copy) {
    status = 'unexpected';
    workTitle = 'Código no registrado en el sistema';
  } else if (copy.branch_id !== session.branch_id) {
    status = 'found_misplaced';
  }

  // Check if already scanned in this session
  const existingIdx = session.items.findIndex((i) => areMarbeteCodesMatching(i.copy_code, scannedCode));
  const isNew = existingIdx === -1;

  const auditItem: StockAuditItem = {
    copy_code: copy?.internal_code || scannedCode.toUpperCase().trim(),
    scanned_at: now,
    status,
    work_title: workTitle,
    work_author: workAuthor,
    dewey_code: deweyCode,
    expected_branch_name: expectedBranch,
    scanned_branch_name: session.branch_name,
    shelf_section: shelfSection || session.shelf_range,
  };

  let updatedItems = [...session.items];
  if (isNew) {
    updatedItems = [auditItem, ...updatedItems];
  } else {
    updatedItems[existingIdx] = auditItem;
  }

  const misplaced = updatedItems.filter((i) => i.status === 'found_misplaced' || i.status === 'unexpected').length;

  const updatedSession: StockAuditSession = {
    ...session,
    scanned_count: updatedItems.length,
    misplaced_count: misplaced,
    items: updatedItems,
  };

  const allUpdated = sessions.map((s) => (s.id === sessionId ? updatedSession : s));
  saveAuditSessions(allUpdated);

  return { session: updatedSession, item: auditItem, isNew };
}

// ----------------- PRESERVATION & WORKSHOP -----------------

export const INITIAL_PRESERVATION_ITEMS: PreservationItem[] = [
  {
    id: 'pres_01',
    copy_id: 'copy_sample_01',
    copy_code: 'MOS-BAC-863-OTEc-001',
    work_title: 'Casas Muertas',
    work_author: 'Miguel Otero Silva',
    damage_type: 'lomo_danado',
    status: 'en_tratamiento',
    diagnosis: 'Desprendimiento de lomo por uso intensivo en aula.',
    treatment_applied: 'Encolado vinílico neutro, refuerzo de cabezadas y nuevo forro de mylar.',
    entered_at: '2026-02-15T09:00:00Z',
    technician_name: 'Prof. Ana Teresa Valera (Taller)',
  },
  {
    id: 'pres_02',
    copy_id: 'copy_sample_02',
    copy_code: 'MOS-PRI-500-SAG-001',
    work_title: 'El Mundo Vegetal y los Manglares',
    work_author: 'Equipo Pedagógico',
    damage_type: 'hojas_sueltas',
    status: 'en_espera',
    diagnosis: 'Páginas 45-48 desprendidas.',
    entered_at: '2026-02-20T14:00:00Z',
  },
];

export function getStoredPreservationItems(): PreservationItem[] {
  if (typeof window === 'undefined') return INITIAL_PRESERVATION_ITEMS;
  const saved = localStorage.getItem('manglar_preservation_items');
  if (!saved) {
    localStorage.setItem('manglar_preservation_items', JSON.stringify(INITIAL_PRESERVATION_ITEMS));
    return INITIAL_PRESERVATION_ITEMS;
  }
  try {
    const parsed: PreservationItem[] = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PRESERVATION_ITEMS;
  } catch {
    return INITIAL_PRESERVATION_ITEMS;
  }
}

export function savePreservationItems(items: PreservationItem[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_preservation_items', JSON.stringify(items));
  }
}

export function registerItemForPreservation(params: {
  copyCode: string;
  damageType: DamageType;
  diagnosis: string;
  technicianName?: string;
  notes?: string;
}): { success: boolean; item?: PreservationItem; error?: string } {
  const copy = findCopyByCode(params.copyCode);
  if (!copy) {
    return { success: false, error: `No se encontró el ejemplar con marbete "${params.copyCode}"` };
  }

  const items = getStoredPreservationItems();
  const newItem: PreservationItem = {
    id: `pres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    copy_id: copy.id,
    copy_code: copy.internal_code,
    work_title: copy.work?.title || 'Obra',
    work_author: copy.work?.author || 'Autor',
    damage_type: params.damageType,
    status: 'en_espera',
    diagnosis: params.diagnosis.trim(),
    entered_at: new Date().toISOString(),
    technician_name: params.technicianName?.trim(),
    notes: params.notes?.trim(),
  };

  const updated = [newItem, ...items];
  savePreservationItems(updated);

  // Update copy status to 'en_reparacion'
  const copies = getStoredCopies();
  const updatedCopies = copies.map((c) => {
    if (c.id === copy.id) {
      return { ...c, status: 'en_reparacion' as const };
    }
    return c;
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));
  }

  return { success: true, item: newItem };
}

export function updatePreservationStatus(
  itemId: string,
  status: PreservationStatus,
  treatmentApplied?: string
): boolean {
  const items = getStoredPreservationItems();
  const updated = items.map((item) => {
    if (item.id === itemId) {
      const now = new Date().toISOString();
      return {
        ...item,
        status,
        treatment_applied: treatmentApplied !== undefined ? treatmentApplied : item.treatment_applied,
        completed_at: status === 'restaurado' || status === 'baja_definitiva' ? now : item.completed_at,
      };
    }
    return item;
  });

  savePreservationItems(updated);

  // If restored, set copy status back to 'disponible' and condition to 'bueno' / 'regular'
  const target = items.find((i) => i.id === itemId);
  if (target && status === 'restaurado') {
    const copies = getStoredCopies();
    const updatedCopies = copies.map((c) => {
      if (c.id === target.copy_id || areMarbeteCodesMatching(c.internal_code, target.copy_code)) {
        return { ...c, status: 'disponible' as const, condition: 'regular' as const };
      }
      return c;
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('manglar_copies', JSON.stringify(updatedCopies));
    }
  }

  return true;
}
