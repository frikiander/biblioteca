import type { BookSuggestion, SuggestionStatus, PatronRole } from '../types/database';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const INITIAL_SUGGESTIONS: BookSuggestion[] = [];

export function getStoredSuggestions(): BookSuggestion[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('manglar_suggestions');
  if (!saved) {
    localStorage.setItem('manglar_suggestions', JSON.stringify([]));
    return [];
  }
  try {
    const parsed: BookSuggestion[] = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSuggestions(suggestions: BookSuggestion[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('manglar_suggestions', JSON.stringify(suggestions));
  }
}

export function submitSuggestion(params: {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  reason?: string;
  suggestedByName: string;
  suggestedByRole?: PatronRole;
  suggestedByGrade?: string;
  suggestedByEmail?: string;
}): BookSuggestion {
  const suggestions = getStoredSuggestions();
  const newSuggestion: BookSuggestion = {
    id: `sug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: params.title.trim(),
    author: params.author.trim(),
    isbn: params.isbn?.trim() || undefined,
    publisher: params.publisher?.trim() || undefined,
    publication_year: params.publicationYear || undefined,
    reason: params.reason?.trim() || undefined,
    suggested_by_name: params.suggestedByName.trim(),
    suggested_by_role: params.suggestedByRole || 'student',
    suggested_by_grade: params.suggestedByGrade?.trim() || undefined,
    suggested_by_email: params.suggestedByEmail?.trim() || undefined,
    status: 'pending',
    votes: 1,
    voted_by: [params.suggestedByName.trim()],
    created_at: new Date().toISOString(),
  };

  const updated = [newSuggestion, ...suggestions];
  saveSuggestions(updated);
  return newSuggestion;
}

export function voteSuggestion(suggestionId: string, voterName: string): boolean {
  const suggestions = getStoredSuggestions();
  const updated = suggestions.map((s) => {
    if (s.id === suggestionId) {
      const voters = s.voted_by || [];
      if (!voters.includes(voterName)) {
        return {
          ...s,
          votes: s.votes + 1,
          voted_by: [...voters, voterName],
        };
      }
    }
    return s;
  });
  saveSuggestions(updated);
  return true;
}

export function updateSuggestionStatus(
  suggestionId: string,
  status: SuggestionStatus,
  reviewerNotes?: string
): boolean {
  const suggestions = getStoredSuggestions();
  const updated = suggestions.map((s) => {
    if (s.id === suggestionId) {
      return {
        ...s,
        status,
        reviewer_notes: reviewerNotes !== undefined ? reviewerNotes : s.reviewer_notes,
        updated_at: new Date().toISOString(),
      };
    }
    return s;
  });
  saveSuggestions(updated);
  return true;
}

export async function deleteSuggestion(suggestionId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const suggestions = getStoredSuggestions();
    const updated = suggestions.filter((s) => s.id !== suggestionId);
    saveSuggestions(updated);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suggestionId);
      if (isUuid) {
        await (supabase as any).from('suggestions').delete().eq('id', suggestionId);
      }
    } catch (err) {
      console.warn('Error al eliminar sugerencia en Supabase:', err);
    }
  }

  return true;
}
