import type { 
  StockAuditSession, 
  StockAuditItem, 
  AuditItemStatus, 
  PreservationItem, 
  PreservationStatus, 
  DamageType 
} from '../types/database';
import { getStoredCopies, getStoredWorks, getStoredBranches, supabase, isSupabaseConfigured } from './supabaseClient';
import { areMarbeteCodesMatching, findCopyByCode, normalizeMarbeteCode } from './loans';

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

export function finishAuditSession(sessionId: string): StockAuditSession | null {
  const sessions = getStoredAuditSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;

  const copies = getStoredCopies();
  const branchCopies = copies.filter((c) => c.branch_id === session.branch_id);
  const scannedCodes = new Set(session.items.map((i) => normalizeMarbeteCode(i.copy_code)));

  const missingItems: StockAuditItem[] = branchCopies
    .filter((c) => !scannedCodes.has(normalizeMarbeteCode(c.internal_code)))
    .map((c) => ({
      copy_code: c.internal_code,
      status: 'missing' as AuditItemStatus,
      work_title: c.work?.title,
      work_author: c.work?.author,
      dewey_code: c.work?.dewey_code,
      expected_branch_name: session.branch_name,
      scanned_branch_name: session.branch_name,
      shelf_section: session.shelf_range,
      scanned_at: new Date().toISOString(),
    }));

  const finalItems = [...session.items, ...missingItems];

  const updatedSession: StockAuditSession = {
    ...session,
    ended_at: new Date().toISOString(),
    items: finalItems,
    missing_count: missingItems.length,
  };

  const updatedSessions = sessions.map((s) => (s.id === sessionId ? updatedSession : s));
  saveAuditSessions(updatedSessions);

  return updatedSession;
}

// ---------------------------------------------------------------------------
// PRESERVATION & BINDERY WORKFLOW (Colegio Integral El Manglar)
// ---------------------------------------------------------------------------

export const INITIAL_PRESERVATION_ITEMS: PreservationItem[] = [];

export function getStoredPreservationItems(): PreservationItem[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_preservation_items');
  if (!saved) {
    localStorage.setItem('manglar_preservation_items', JSON.stringify([]));
    return [];
  }
  try {
    const parsed: PreservationItem[] = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

export async function deletePreservationItem(itemId: string): Promise<boolean> {
  const items = getStoredPreservationItems();
  const updated = items.filter((i) => i.id !== itemId);
  savePreservationItems(updated);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId);
  if (isUuid && isSupabaseConfigured && supabase) {
    try {
      await (supabase as any).from('preservation_items').delete().eq('id', itemId);
    } catch (err) {
      console.warn('Error eliminando item de preservación en Supabase:', err);
    }
  }

  return true;
}
