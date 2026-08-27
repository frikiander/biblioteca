import type { OfflineTransaction } from '../types/database';
import { registerLoan, returnLoan } from './loans';
import { placeHold } from './holds';
import { findCopyByCode } from './loans';
import { getStoredWorks } from './supabaseClient';

export function getOfflineQueue(): OfflineTransaction[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_offline_queue');
  if (!saved) return [];
  try {
    return JSON.parse(saved) || [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineTransaction[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_offline_queue', JSON.stringify(queue));
  }
}

export function queueOfflineTransaction(
  type: 'checkout' | 'checkin' | 'hold',
  payload: Record<string, unknown>
): OfflineTransaction {
  const item: OfflineTransaction = {
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    payload,
    timestamp: Date.now(),
    synced: false,
  };

  const queue = getOfflineQueue();
  const updated = [...queue, item];
  saveOfflineQueue(updated);
  return item;
}

export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: OfflineTransaction[];
}> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: [] };

  const remaining: OfflineTransaction[] = [];
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.type === 'checkout') {
        const copyCode = String(item.payload.copyCode || '');
        const copy = findCopyByCode(copyCode);
        if (copy) {
          const res = registerLoan({
            copy,
            student: item.payload.student as any,
            dueDays: item.payload.dueDays as number,
            isIndefinite: Boolean(item.payload.isIndefinite),
            checkoutNotes: `[Offline Sync] ${String(item.payload.checkoutNotes || '')}`.trim(),
          });
          if (res.success) {
            processed++;
          } else {
            failed++;
            remaining.push({ ...item, error: res.error });
          }
        } else {
          failed++;
          remaining.push({ ...item, error: 'Ejemplar no encontrado' });
        }
      } else if (item.type === 'checkin') {
        const copyCode = String(item.payload.copyCode || '');
        const res = returnLoan({
          copyCode,
          returnNotes: `[Offline Sync] ${String(item.payload.returnNotes || '')}`.trim(),
          returnCondition: item.payload.returnCondition as any,
        });
        if (res.success) {
          processed++;
        } else {
          failed++;
          remaining.push({ ...item, error: res.error });
        }
      } else if (item.type === 'hold') {
        const workId = String(item.payload.workId || '');
        const works = getStoredWorks();
        const work = works.find((w) => w.id === workId);
        if (work) {
          const res = placeHold({
            work,
            patron: item.payload.patron as any,
            notes: `[Offline Sync] ${String(item.payload.notes || '')}`.trim(),
          });
          if (res.success) {
            processed++;
          } else {
            failed++;
            remaining.push({ ...item, error: res.error });
          }
        }
      }
    } catch (err: any) {
      failed++;
      remaining.push({ ...item, error: err.message || 'Error desconocido al sincronizar' });
    }
  }

  saveOfflineQueue(remaining);
  return { processed, failed, remaining };
}
