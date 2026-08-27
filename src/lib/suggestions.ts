import type { BookSuggestion, SuggestionStatus, PatronRole } from '../types/database';

export const INITIAL_SUGGESTIONS: BookSuggestion[] = [
  {
    id: 'sug_01',
    title: 'Fiebre',
    author: 'Miguel Otero Silva',
    publisher: 'Seix Barral',
    publication_year: 1939,
    reason: 'Completar la trilogía novelística de Miguel Otero Silva para el curso de 5to año de Bachillerato.',
    suggested_by_name: 'Prof. María Elena Morales',
    suggested_by_role: 'teacher',
    suggested_by_grade: 'Docente de Castellano',
    suggested_by_email: 'maria.morales@manglar.edu.ve',
    status: 'approved',
    reviewer_notes: 'Aprobado para la compra institucional en la próxima feria del libro.',
    votes: 8,
    voted_by: ['Prof. María Elena Morales', 'Camila Sofía Hernández', 'Mateo Alejandro Gómez'],
    created_at: '2026-02-01T14:30:00Z',
  },
  {
    id: 'sug_02',
    title: 'Cosmos',
    author: 'Carl Sagan',
    publisher: 'Planeta',
    publication_year: 1980,
    reason: 'Material de consulta fundamental para el Club de Astronomía y el laboratorio de Ciencias.',
    suggested_by_name: 'Diego Andrés Carvallo',
    suggested_by_role: 'student',
    suggested_by_grade: '4to Año "Ciencias"',
    status: 'under_review',
    reviewer_notes: 'En revisión de presupuesto para fondo de ciencias.',
    votes: 5,
    voted_by: ['Diego Andrés Carvallo', 'Santiago Rivas Castillo'],
    created_at: '2026-02-10T11:15:00Z',
  },
  {
    id: 'sug_03',
    title: 'El Principito (Edición Bilingüe)',
    author: 'Antoine de Saint-Exupéry',
    reason: 'Apoyo para las clases de idiomas y comprensión lectora en 6to grado de Primaria.',
    suggested_by_name: 'Mariana Victoria Ramos',
    suggested_by_role: 'student',
    suggested_by_grade: '6to Grado "A"',
    status: 'pending',
    votes: 3,
    created_at: '2026-02-18T09:40:00Z',
  },
];

export function getStoredSuggestions(): BookSuggestion[] {
  if (typeof window === 'undefined') return INITIAL_SUGGESTIONS;
  const saved = localStorage.getItem('manglar_suggestions');
  if (!saved) {
    localStorage.setItem('manglar_suggestions', JSON.stringify(INITIAL_SUGGESTIONS));
    return INITIAL_SUGGESTIONS;
  }
  try {
    const parsed: BookSuggestion[] = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SUGGESTIONS;
  } catch {
    return INITIAL_SUGGESTIONS;
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
