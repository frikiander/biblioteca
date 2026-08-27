import type { HoldReservation, HoldStatus, Work, Patron } from '../types/database';
import { getStoredCopies, getStoredWorks } from './supabaseClient';
import { getStoredLoans } from './loans';

export function getStoredHolds(): HoldReservation[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_holds');
  if (!saved) {
    localStorage.setItem('manglar_holds', JSON.stringify([]));
    return [];
  }
  try {
    const parsed: HoldReservation[] = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHolds(holds: HoldReservation[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_holds', JSON.stringify(holds));
  }
}

/**
 * Registra una nueva reserva (Hold) para un lector sobre una obra.
 */
export function placeHold(params: {
  work: Work;
  patron: Patron | { name: string; grade_section?: string; identifier?: string; role?: string };
  branchId?: string;
  branchName?: string;
  notes?: string;
}): { success: boolean; hold?: HoldReservation; error?: string } {
  const { work, patron, branchId, branchName, notes } = params;

  const holds = getStoredHolds();

  // Verificar si ya tiene una reserva activa para la misma obra
  const existingActive = holds.find(
    (h) =>
      h.work_id === work.id &&
      (h.status === 'waiting' || h.status === 'ready_for_pickup') &&
      h.patron_name.toLowerCase().trim() === patron.name.toLowerCase().trim()
  );

  if (existingActive) {
    return {
      success: false,
      error: `El lector ${patron.name} ya tiene una reserva activa para "${work.title}".`,
    };
  }

  // Calcular la prioridad en la cola
  const workHolds = holds.filter((h) => h.work_id === work.id && (h.status === 'waiting' || h.status === 'ready_for_pickup'));
  const nextPriority = workHolds.length + 1;

  const now = new Date();
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + 30); // 30 días de vigencia de la reserva

  const newHold: HoldReservation = {
    id: `hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    work_id: work.id,
    work_title: work.title,
    work_author: work.author,
    work_cover_url: work.cover_url,
    patron_id: 'id' in patron ? patron.id : undefined,
    patron_name: patron.name.trim(),
    patron_grade: patron.grade_section?.trim(),
    patron_identifier: patron.identifier?.trim(),
    patron_role: ('role' in patron ? patron.role : 'student') as any,
    branch_id: branchId,
    branch_name: branchName || 'Biblioteca Central',
    reserved_date: now.toISOString(),
    expiration_date: expDate.toISOString(),
    priority: nextPriority,
    status: 'waiting',
    notes: notes?.trim() || undefined,
    created_at: now.toISOString(),
  };

  const updatedHolds = [newHold, ...holds];
  saveHolds(updatedHolds);

  return {
    success: true,
    hold: newHold,
  };
}

/**
 * Obtiene las reservas pendientes para una obra ordenada por prioridad.
 */
export function getWaitingHoldsForWork(workId: string): HoldReservation[] {
  const holds = getStoredHolds();
  return holds
    .filter((h) => h.work_id === workId && (h.status === 'waiting' || h.status === 'ready_for_pickup'))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Verifica si la devolución de un ejemplar despierta una reserva en espera.
 */
export function checkAndNotifyWaitingHold(workId: string): HoldReservation | null {
  const waiting = getWaitingHoldsForWork(workId);
  if (waiting.length === 0) return null;

  // La primera en la cola
  const nextInLine = waiting[0];
  const holds = getStoredHolds();
  const updated = holds.map((h) => {
    if (h.id === nextInLine.id) {
      return { ...h, status: 'ready_for_pickup' as HoldStatus };
    }
    return h;
  });
  saveHolds(updated);

  return { ...nextInLine, status: 'ready_for_pickup' };
}

/**
 * Cancela una reserva existente.
 */
export function cancelHold(holdId: string): boolean {
  const holds = getStoredHolds();
  const target = holds.find((h) => h.id === holdId);
  if (!target) return false;

  const updated = holds.map((h) => {
    if (h.id === holdId) {
      return { ...h, status: 'cancelled' as HoldStatus };
    }
    return h;
  });

  // Re-ordenar prioridades de los demás
  const workHolds = updated
    .filter((h) => h.work_id === target.work_id && (h.status === 'waiting' || h.status === 'ready_for_pickup'))
    .sort((a, b) => a.priority - b.priority);

  workHolds.forEach((h, idx) => {
    h.priority = idx + 1;
  });

  saveHolds(updated);
  return true;
}

/**
 * Marca una reserva como completada tras ejecutarse el préstamo.
 */
export function fulfillHold(holdId: string, loanId: string): boolean {
  const holds = getStoredHolds();
  const updated = holds.map((h) => {
    if (h.id === holdId) {
      return { ...h, status: 'fulfilled' as HoldStatus, fulfilled_loan_id: loanId };
    }
    return h;
  });
  saveHolds(updated);
  return true;
}
