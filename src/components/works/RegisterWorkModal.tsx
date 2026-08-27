'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookPlus, 
  Sparkles, 
  Layers, 
  Building2, 
  Barcode, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Tag,
  Calendar,
  Compass,
  FileText,
  BookmarkCheck,
  Hash,
  Plus,
  Trash2,
  Copy as CopyIcon,
  RotateCcw,
  Check,
  School,
  MapPin,
  Search,
  Loader2,
  ArrowRight,
  Edit3,
  Globe,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import type { Work, Branch, Copy, CopyCondition } from '../../types/database';
import { 
  supabase, 
  isSupabaseConfigured, 
  INITIAL_BRANCHES, 
  INITIAL_WORKS, 
  INITIAL_COPIES, 
  getStoredBranches, 
  getBranchCodePrefix, 
  generateMarbeteCode,
  getStoredCopies 
} from '../../lib/supabaseClient';
import { DEWEY_GROUPS, getDeweyInfo } from '../../lib/dewey';
import { 
  fetchBookDataCascade, 
  BookData, 
  GoogleBooksRateLimitError, 
  GoogleBooksServiceUnavailableError,
  isGoogleBooksApiKeyConfigured 
} from '../../lib/googleBooks';

interface RegisterWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkCreated: (newWork: Work, newCopiesCount: number) => void;
}

export interface InitialCopyDraft {
  id: string; // Unique local draft ID
  branch_id: string;
  condition: CopyCondition;
  internal_code: string;
  notes: string;
}

const SAMPLE_COVERS = [
  { label: 'Literatura Clásica', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600' },
  { label: 'Historia & Ensayo', url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600' },
  { label: 'Ciencias & Naturaleza', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600' },
  { label: 'Infantil / Juvenil', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600' },
  { label: 'Educación & Arte', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600' },
];

const QUICK_TEST_ISBNS = [
  { label: 'Cien Años de Soledad', isbn: '9788437604947' },
  { label: 'Don Quijote', isbn: '9788424115104' },
  { label: 'El Principito', isbn: '9780156013987' },
  { label: 'Doña Bárbara', isbn: '9788437608242' },
  { label: 'Rayuela', isbn: '9788437604572' },
];

export const RegisterWorkModal: React.FC<RegisterWorkModalProps> = ({
  isOpen,
  onClose,
  onWorkCreated,
}) => {
  // Modal Step: 'isbn_lookup' (initial entry) | 'form' (autofilled or manual entry)
  const [currentStep, setCurrentStep] = useState<'isbn_lookup' | 'form'>('isbn_lookup');

  // ISBN search query state
  const [searchIsbnInput, setSearchIsbnInput] = useState('');
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [searchLookupError, setSearchLookupError] = useState<string | null>(null);
  const [dataOrigin, setDataOrigin] = useState<'cascade' | 'google_books' | 'open_library' | 'manual'>('manual');
  const [cddCategory, setCddCategory] = useState<string>('');

  // Form State for Work (Dublin Core + CDD)
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [deweyCode, setDeweyCode] = useState('860');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState<number>(new Date().getFullYear());
  const [language, setLanguage] = useState('spa');
  const [description, setDescription] = useState('');
  const [subjectTag, setSubjectTag] = useState('');
  const [subjects, setSubjects] = useState<string[]>(['Literatura Venezolana', 'Biblioteca Escolar']);
  const [coverUrl, setCoverUrl] = useState(SAMPLE_COVERS[0].url);

  // Available Branches
  const [branches, setBranches] = useState<Branch[]>(() => {
    return getStoredBranches();
  });

  // Initial Copies Provisioning (Individual Configuration)
  const [createInitialCopies, setCreateInitialCopies] = useState<boolean>(true);

  // Helper to generate smart internal codes based on branch, dewey, author cutter and sequence
  const generateSuggestedCode = (branchId: string, customDewey: string, indexOffset: number = 1) => {
    const branch = branches.find((b) => b.id === branchId || b.name === branchId) || branches[0];
    return generateMarbeteCode(branch?.name || branch?.id, customDewey, author, indexOffset, title);
  };

  const [initialCopies, setInitialCopies] = useState<InitialCopyDraft[]>([
    {
      id: 'draft_1',
      branch_id: INITIAL_BRANCHES[0]?.id || '00000000-0000-4000-a000-000000000001',
      condition: 'bueno',
      internal_code: generateMarbeteCode(INITIAL_BRANCHES[0]?.name || 'Primaria', '860', 'OTE', 1, 'Casas Muertas'),
      notes: 'Ejemplar #1 - Biblioteca Miguel Otero Silva (Primaria)',
    },
    {
      id: 'draft_2',
      branch_id: INITIAL_BRANCHES[1]?.id || '00000000-0000-4000-a000-000000000002',
      condition: 'bueno',
      internal_code: generateMarbeteCode(INITIAL_BRANCHES[1]?.name || 'Bachillerato', '860', 'OTE', 2, 'Casas Muertas'),
      notes: 'Ejemplar #2 - Biblioteca Miguel Otero Silva (Bachillerato)',
    },
  ]);

  // Loading & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('isbn_lookup');
      setSearchIsbnInput('');
      setSearchLookupError(null);
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Load branches from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('branches')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setBranches(data);
            setInitialCopies((prev) =>
              prev.map((c, idx) => {
                const matchedBranch = data[idx % data.length];
                return {
                  ...c,
                  branch_id: matchedBranch.id,
                };
              })
            );
          }
        });
    }
  }, []);

  if (!isOpen) return null;

  const currentDewey = getDeweyInfo(deweyCode);

  // Apply autofilled metadata from Google Books + Open Library Cascade
  const applyAutofilledMetadata = (meta: BookData) => {
    setTitle(meta.title);
    setAuthor(meta.creator || (meta.authors && meta.authors.join(', ')) || 'Autor Desconocido');
    setIsbn(meta.isbn);
    setPublisher(meta.publisher);
    setPublicationYear(typeof meta.publishYear === 'number' ? meta.publishYear : parseInt(String(meta.publishYear), 10) || new Date().getFullYear());
    setDescription(meta.description);
    setSubjects(meta.subjects && meta.subjects.length > 0 ? meta.subjects : ['Literatura General']);
    setCoverUrl(meta.coverUrl || SAMPLE_COVERS[0].url);
    setLanguage(meta.language || 'spa');
    setCddCategory(meta.cddCategory || '');
    const assignedDewey = meta.suggestedDeweyCode || '860';
    setDeweyCode(assignedDewey);
    setDataOrigin(meta.source || 'cascade');

    // Update suggested marbetes for the copies with the new Dewey code and author/title
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, assignedDewey, meta.creator, idx + 1, meta.title),
        };
      })
    );

    setCurrentStep('form');
  };

  // Cascade API Search handler (Google Books + Open Library concurrent)
  const handlePerformGoogleSearch = async (isbnToSearch?: string) => {
    const rawTarget = isbnToSearch || searchIsbnInput;
    const clean = rawTarget.replace(/[^0-9X]/gi, '').trim();

    if (!clean) {
      setSearchLookupError('Por favor ingresa un código ISBN (10 o 13 dígitos).');
      return;
    }

    if (clean.length !== 10 && clean.length !== 13) {
      setSearchLookupError('El ISBN debe contener 10 o 13 dígitos (ej: 9788437604947).');
      return;
    }

    setIsSearchingGoogle(true);
    setSearchLookupError(null);

    try {
      const bookData = await fetchBookDataCascade(clean);

      if (!bookData) {
        setSearchLookupError(
          `No se encontró información para el ISBN "${rawTarget}" en los catálogos en línea (Google Books ni Open Library). Puedes verificar el código o continuar con la carga manual.`
        );
        return;
      }

      applyAutofilledMetadata(bookData);
    } catch (err: unknown) {
      if (err instanceof GoogleBooksRateLimitError) {
        setSearchLookupError(
          '⚠️ Límite de solicitudes alcanzado en Google Books API (HTTP 429). Por favor espera un momento antes de consultar nuevamente o procede con la carga manual.'
        );
      } else if (err instanceof GoogleBooksServiceUnavailableError) {
        setSearchLookupError(
          '⚠️ El servidor de Google Books API reportó sobrecarga o indisponibilidad temporal (HTTP 503). Puedes reintentar en unos momentos o proceder directamente con la carga manual.'
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Error al consultar los servicios bibliográficos.';
        setSearchLookupError(msg);
      }
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  // Skip to manual entry
  const handleProceedToManual = () => {
    setDataOrigin('manual');
    setIsbn(searchIsbnInput.trim());
    setCurrentStep('form');
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, deweyCode, author, idx + 1, newTitle),
        };
      })
    );
  };

  const handleAuthorChange = (newAuthor: string) => {
    setAuthor(newAuthor);
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, deweyCode, newAuthor, idx + 1, title),
        };
      })
    );
  };

  const handleDeweyCodeChange = (newCode: string) => {
    setDeweyCode(newCode);
    // Update marbete codes for draft copies dynamically
    setInitialCopies((prev) =>
      prev.map((c, idx) => {
        const branch = branches.find((b) => b.id === c.branch_id);
        return {
          ...c,
          internal_code: generateMarbeteCode(branch?.name || branch?.id, newCode, author, idx + 1, title),
        };
      })
    );
  };

  const handleAddSubject = () => {
    const trimmed = subjectTag.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setSubjectTag('');
    }
  };

  const handleRemoveSubject = (tag: string) => {
    setSubjects(subjects.filter((s) => s !== tag));
  };

  // --- Copy Management Handlers ---

  const handleAddCopy = (targetBranchId?: string) => {
    const targetBranch = targetBranchId
      ? branches.find((b) => b.id === targetBranchId) || branches[0]
      : branches[0];

    const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newCode = generateSuggestedCode(targetBranch.id, deweyCode, initialCopies.length + 1);

    const isExternal = targetBranch.type === 'external_donation';
    const defaultNotes = isExternal
      ? `Ejemplar #${initialCopies.length + 1} - Dotación social para ${targetBranch.name}`
      : `Ejemplar #${initialCopies.length + 1} - Colección General`;

    setInitialCopies([
      ...initialCopies,
      {
        id: newDraftId,
        branch_id: targetBranch.id,
        condition: 'bueno',
        internal_code: newCode,
        notes: defaultNotes,
      },
    ]);
  };

  const handleDuplicateCopy = (copyToClone: InitialCopyDraft) => {
    const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const branch = branches.find((b) => b.id === copyToClone.branch_id) || branches[0];
    const newSeq = initialCopies.length + 1;
    const newCode = generateMarbeteCode(branch.name || branch.id, deweyCode, author, newSeq, title);

    setInitialCopies([
      ...initialCopies,
      {
        ...copyToClone,
        id: newDraftId,
        internal_code: newCode,
        notes: `${copyToClone.notes} (Copia #${newSeq})`,
      },
    ]);
  };

  const handleRemoveCopy = (draftId: string) => {
    setInitialCopies(initialCopies.filter((c) => c.id !== draftId));
  };

  const handleUpdateCopy = (draftId: string, field: keyof InitialCopyDraft, value: string) => {
    setInitialCopies(
      initialCopies.map((copy, idx) => {
        if (copy.id !== draftId) return copy;

        if (field === 'branch_id') {
          const branch = branches.find((b) => b.id === value);
          const updatedCode = generateMarbeteCode(branch?.name || branch?.id || value, deweyCode, author, idx + 1, title);
          return {
            ...copy,
            branch_id: value,
            internal_code: updatedCode,
          };
        }

        return {
          ...copy,
          [field]: value,
        };
      })
    );
  };

  const handleRegenerateCode = (draftId: string) => {
    setInitialCopies(
      initialCopies.map((copy, idx) => {
        if (copy.id !== draftId) return copy;
        const branch = branches.find((b) => b.id === copy.branch_id) || branches[0];
        return {
          ...copy,
          internal_code: generateMarbeteCode(branch.name || branch.id, deweyCode, author, idx + 1, title),
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validate Basic Work Info
    if (!title.trim()) {
      setFormError('El título de la obra es obligatorio.');
      return;
    }
    if (!author.trim()) {
      setFormError('El autor o creador de la obra es obligatorio.');
      return;
    }
    if (!deweyCode.trim()) {
      setFormError('La clasificación Decimal Dewey (CDD) es obligatoria.');
      return;
    }

    // Validate Individual Copies if enabled
    if (createInitialCopies && initialCopies.length > 0) {
      const codeSet = new Set<string>();
      for (let i = 0; i < initialCopies.length; i++) {
        const c = initialCopies[i];
        const trimmedCode = c.internal_code.trim();
        if (!trimmedCode) {
          setFormError(`El ejemplar #${i + 1} no tiene un código marbete asignado.`);
          return;
        }
        if (codeSet.has(trimmedCode)) {
          setFormError(`El código marbete "${trimmedCode}" está duplicado en la lista de ejemplares.`);
          return;
        }
        codeSet.add(trimmedCode);
      }
    }

    setIsSubmitting(true);

    try {
      const newWorkId = 'w_' + Date.now();
      const cleanedIsbn = isbn.trim() || 'Sin ISBN';

      const workPayload: Work = {
        id: newWorkId,
        title: title.trim(),
        author: author.trim(),
        isbn: cleanedIsbn,
        dewey_code: deweyCode.trim(),
        cover_url: coverUrl.trim() || SAMPLE_COVERS[0].url,
        publisher: publisher.trim() || 'Editorial Colegio Integral El Manglar',
        publication_year: Number(publicationYear) || new Date().getFullYear(),
        subjects: subjects.length > 0 ? subjects : ['General'],
        description: description.trim() || 'Ficha catalogada bajo el estándar Dublin Core simplificado y CDD.',
        language: language || 'spa',
        created_at: new Date().toISOString(),
      };

      let generatedCopiesCount = 0;

      if (isSupabaseConfigured && supabase) {
        // 1. Insert Work in Supabase
        const { data: insertedWork, error: workInsertError } = await (supabase as any)
          .from('works')
          .insert({
            title: workPayload.title,
            author: workPayload.author,
            isbn: workPayload.isbn,
            dewey_code: workPayload.dewey_code,
            cover_url: workPayload.cover_url,
            publisher: workPayload.publisher,
            publication_year: workPayload.publication_year,
            subjects: workPayload.subjects,
            description: workPayload.description,
            language: workPayload.language,
          })
          .select()
          .single();

        if (workInsertError) {
          throw new Error(`Error en Supabase al registrar obra: ${workInsertError.message}`);
        }

        const realWorkId = insertedWork.id;
        workPayload.id = realWorkId;

        // 2. Insert individual copies if configured
        if (createInitialCopies && initialCopies.length > 0) {
          const copiesToInsert = initialCopies.map((draft) => {
            const branch = branches.find((b) => b.id === draft.branch_id || b.name === draft.branch_id) || branches[0];
            const isExternal = branch?.type === 'external_donation';
            return {
              work_id: realWorkId,
              branch_id: branch?.id || draft.branch_id,
              condition: draft.condition,
              internal_code: draft.internal_code.trim(),
              status: isExternal ? 'en_donacion' : 'disponible',
              notes: draft.notes.trim() || `Ejemplar registrado durante catalogación universal. Sede: ${branch?.name || 'Central'}.`,
            };
          });

          const { error: copiesError } = await (supabase as any)
            .from('copies')
            .insert(copiesToInsert);

          if (copiesError) {
            console.error('Error insertando ejemplares en Supabase:', copiesError);
            throw new Error(`Obra creada pero ocurrió un error al registrar los ejemplares: ${copiesError.message}`);
          } else {
            generatedCopiesCount = copiesToInsert.length;
          }
        }
      } else {
        // Local persistence fallback
        const savedWorks = localStorage.getItem('manglar_works');
        const currentWorks: Work[] = savedWorks ? JSON.parse(savedWorks) : INITIAL_WORKS;
        const updatedWorks = [workPayload, ...currentWorks];
        localStorage.setItem('manglar_works', JSON.stringify(updatedWorks));

        if (createInitialCopies && initialCopies.length > 0) {
          const savedCopies = localStorage.getItem('manglar_copies');
          const currentCopies: Copy[] = savedCopies ? JSON.parse(savedCopies) : INITIAL_COPIES;

          const newCopies: Copy[] = initialCopies.map((draft, idx) => {
            const branch = branches.find((b) => b.id === draft.branch_id) || branches[0];
            const isExternal = branch.type === 'external_donation';
            return {
              id: `c_${Date.now()}_${idx + 1}`,
              work_id: workPayload.id,
              branch_id: draft.branch_id,
              condition: draft.condition,
              internal_code: draft.internal_code.trim(),
              status: isExternal ? 'en_donacion' : 'disponible',
              notes: draft.notes.trim() || `Ejemplar catalogado individualmente. Ubicación: ${branch.name}.`,
              created_at: new Date().toISOString(),
              work: workPayload,
              branch: branch,
            };
          });

          localStorage.setItem('manglar_copies', JSON.stringify([...newCopies, ...currentCopies]));
          generatedCopiesCount = newCopies.length;
        }
      }

      setSuccessMessage(
        `¡Obra "${workPayload.title}" catalogada exitosamente con ${generatedCopiesCount} ${
          generatedCopiesCount === 1 ? 'ejemplar individual' : 'ejemplares individuales'
        }!`
      );

      setTimeout(() => {
        onWorkCreated(workPayload, generatedCopiesCount);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al guardar la obra.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metric summaries for the individual copies
  const centralDraftCount = initialCopies.filter((c) => {
    const b = branches.find((br) => br.id === c.branch_id);
    return b?.type === 'internal';
  }).length;

  const donationDraftCount = initialCopies.filter((c) => {
    const b = branches.find((br) => br.id === c.branch_id);
    return b?.type === 'external_donation';
  }).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        id="register-work-modal"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-4 sm:my-6"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <BookPlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Colegio Integral El Manglar
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {currentStep === 'isbn_lookup' ? 'Paso 1: Consulta ISBN' : 'Paso 2: Ficha y Ejemplares'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {currentStep === 'isbn_lookup'
                  ? 'Ingreso de Nueva Obra — Búsqueda por ISBN'
                  : 'Catalogar Nueva Obra y Ejemplares Físicos'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: ISBN LOOKUP STEP */}
        {currentStep === 'isbn_lookup' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 mx-auto flex items-center justify-center shadow-sm">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Ingresa el ISBN del libro
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Consultaremos concurrentemente <strong>Google Books API</strong> y <strong>Open Library</strong> para extraer título, autor, editorial, sinopsis y clasificación Dewey (CDD).
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {isGoogleBooksApiKeyConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 shadow-xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Google Books + Open Library Conectados
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                    <Globe className="w-3 h-3 text-slate-500" />
                    Búsqueda Dual Pública (Google Books + Open Library)
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {searchLookupError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-semibold">{searchLookupError}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleProceedToManual}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Proceder con Carga Manual ahora
                    </button>
                    {searchIsbnInput.trim() && (
                      <a
                        href={`https://www.todostuslibros.com/busquedas?keyword=${encodeURIComponent(searchIsbnInput.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-amber-300 rounded-lg font-medium text-xs transition"
                      >
                        <span>Buscar en TodosTusLibros</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Search Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformGoogleSearch();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Código ISBN (10 o 13 dígitos)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <input
                    id="search-isbn-input"
                    type="text"
                    autoFocus
                    value={searchIsbnInput}
                    onChange={(e) => setSearchIsbnInput(e.target.value)}
                    placeholder="Ej: 9788437604947 o 978-980-01-0189-6"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-base font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  id="search-google-books-btn"
                  type="submit"
                  disabled={isSearchingGoogle || !searchIsbnInput.trim()}
                  className="w-full sm:flex-1 py-3.5 px-5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isSearchingGoogle ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                      <span>Consultando catálogos en cascada...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-emerald-300" />
                      <span>Buscar en Cascada (Google + Open Library)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleProceedToManual}
                  disabled={isSearchingGoogle}
                  className="w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <Edit3 className="w-4 h-4 text-slate-500" />
                  <span>Carga Manual (Sin ISBN)</span>
                </button>
              </div>
            </form>

            {/* Quick Test ISBN Presets */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center sm:text-left">
                Ejemplos rápidos para prueba:
              </span>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {QUICK_TEST_ISBNS.map((item) => (
                  <button
                    key={item.isbn}
                    type="button"
                    onClick={() => {
                      setSearchIsbnInput(item.isbn);
                      handlePerformGoogleSearch(item.isbn);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] text-slate-400">({item.isbn.slice(-4)})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FULL METADATA & INDIVIDUAL COPIES FORM */}
        {currentStep === 'form' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Origin Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              dataOrigin === 'cascade' || dataOrigin === 'google_books' || dataOrigin === 'open_library'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2.5">
                {dataOrigin === 'cascade' || dataOrigin === 'google_books' || dataOrigin === 'open_library' ? (
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Edit3 className="w-5 h-5 text-slate-500 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {dataOrigin === 'cascade'
                      ? '✨ Datos combinados en cascada (Google Books + Open Library CDD)'
                      : dataOrigin === 'google_books'
                      ? '✨ Datos autocompletados desde Google Books API'
                      : dataOrigin === 'open_library'
                      ? '✨ Datos autocompletados desde Open Library'
                      : '📝 Modo de Carga Manual'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {cddCategory
                      ? `Clasificación CDD detectada en Open Library: "${cddCategory}". Puedes ajustar cualquier campo abajo.`
                      : 'Puedes ajustar cualquier campo y configurar las copias físicas individuales abajo.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('isbn_lookup')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-800 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Buscar otro ISBN</span>
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error en la catalogación:</span> {formError}
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in zoom-in-95">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            {/* Section 1: Basic Bibliographic Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                1. Identificación Bibliográfica Principal
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Título de la Obra <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="work-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ej: Casas Muertas, Doña Bárbara, Biología General..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>

                {/* Author / Creator */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Autor o Creador <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="work-author-input"
                    type="text"
                    required
                    value={author}
                    onChange={(e) => handleAuthorChange(e.target.value)}
                    placeholder="Ej: Miguel Otero Silva, Teresa de la Parra..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>

                {/* ISBN with quick Google Search trigger */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    ISBN / Código de Identificación
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="work-isbn-input"
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="978-84-376-0494-7"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                    />
                    <button
                      type="button"
                      onClick={() => handlePerformGoogleSearch(isbn)}
                      disabled={isSearchingGoogle || !isbn.trim()}
                      title="Reconsultar Google Books con este ISBN"
                      className="px-3 py-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSearchingGoogle ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      ) : (
                        <Search className="w-4 h-4 text-emerald-700" />
                      )}
                      <span className="hidden sm:inline">Consultar API</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Dewey Decimal Classification (CDD) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-emerald-700" />
                  2. Clasificación Decimal Dewey (CDD)
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${currentDewey.badgeBg} ${currentDewey.badgeText}`}>
                  CDD {deweyCode} • {currentDewey.name}
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Categoría y División Dewey (000 - 990) <span className="text-rose-500">*</span>
                </label>
                <select
                  id="dewey-class-selector"
                  value={deweyCode}
                  onChange={(e) => handleDeweyCodeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                >
                  {DEWEY_GROUPS.map((group) => (
                    <optgroup key={group.code} label={`${group.name}`}>
                      {group.divisions.map((div) => (
                        <option key={div.code} value={div.code}>
                          {div.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 mt-1.5">
                  <p className="flex-1">
                    <span className="font-semibold text-slate-700">Guía de sección:</span> {currentDewey.description}
                  </p>
                  <a
                    id="worldcat-dewey-lookup-btn"
                    href={`https://www.worldcat.org/search?q=ti:${encodeURIComponent(title.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={title.trim() ? `Buscar "${title}" en el catálogo público de WorldCat` : 'Buscar en WorldCat'}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700 transition-colors shrink-0 group cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                    <span>Consultar en WorldCat</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                  </a>
                </div>
              </div>
            </div>

            {/* Section 3: Publishing & Catalog Metadata */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                <BookmarkCheck className="w-4 h-4 text-emerald-700" />
                3. Metadatos de Publicación y Descriptores
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Publisher */}
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Editorial
                  </label>
                  <input
                    id="work-publisher-input"
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Biblioteca Ayacucho, Losada..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>

                {/* Year */}
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Año de Publicación
                  </label>
                  <input
                    id="work-year-input"
                    type="number"
                    min="1500"
                    max={new Date().getFullYear() + 1}
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>

                {/* Language */}
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Idioma
                  </label>
                  <select
                    id="work-language-input"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  >
                    <option value="spa">Español (spa)</option>
                    <option value="eng">Inglés (eng)</option>
                    <option value="fre">Francés (fre)</option>
                    <option value="por">Portugués (por)</option>
                    <option value="wyo">Warao / Lengua Indígena</option>
                  </select>
                </div>
              </div>

              {/* Subject Keywords */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Materias y Palabras Clave
                </label>
                <div className="flex gap-2">
                  <input
                    id="work-subject-tag-input"
                    type="text"
                    value={subjectTag}
                    onChange={(e) => setSubjectTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                    placeholder="Escribe una materia y presiona Enter o Añadir..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subjects.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium"
                    >
                      <Tag className="w-3 h-3 text-emerald-600" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(tag)}
                        className="hover:text-rose-600 ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Description / Summary */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Sinopsis / Resumen Bibliográfico
                </label>
                <textarea
                  id="work-description-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve reseña literaria o resumen del contenido de la obra..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition resize-none"
                />
              </div>

              {/* Book Cover Image selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Portada de la Obra (URL o Galería Predefinida)
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={coverUrl || SAMPLE_COVERS[0].url}
                    alt="Vista previa"
                    className="w-14 h-20 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = SAMPLE_COVERS[0].url;
                    }}
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                    />
                    {/* Preset quick cover selectors */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                      <span className="text-slate-400 shrink-0">Preajustes:</span>
                      {SAMPLE_COVERS.map((sc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCoverUrl(sc.url)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition shrink-0 cursor-pointer ${
                            coverUrl === sc.url
                              ? 'bg-emerald-800 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Physical Copies Generation - INDIVIDUAL CONFIGURATION PER COPY */}
            <div className="space-y-4 pt-3 p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      4. Generación Individual de Ejemplares Físicos
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configura de forma independiente el código marbete, sede y estado físico para cada ejemplar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={createInitialCopies}
                      onChange={(e) => setCreateInitialCopies(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Registrar ejemplares ahora</span>
                  </label>
                </div>
              </div>

              {createInitialCopies && (
                <div className="space-y-4">
                  {/* Metrics Pill & Add Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800">
                        Total: {initialCopies.length} {initialCopies.length === 1 ? 'ejemplar' : 'ejemplares'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                        Sede Central: {centralDraftCount}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                        Donación / Semilla: {donationDraftCount}
                      </span>
                    </div>

                    {/* Add Copy Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddCopy(branches[0]?.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        + Ejemplar Central
                      </button>
                      {branches.find((b) => b.type === 'external_donation') && (
                        <button
                          type="button"
                          onClick={() => {
                            const extBranch = branches.find((b) => b.type === 'external_donation');
                            if (extBranch) handleAddCopy(extBranch.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Ejemplar Semilla
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Copies List: Individual Cards */}
                  {initialCopies.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                      No has agregado ejemplares iniciales para esta obra. Haz clic en <strong>+ Ejemplar Central</strong> o <strong>+ Ejemplar Semilla</strong> para añadir uno.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {initialCopies.map((copy, index) => {
                        const selectedBranch = branches.find((b) => b.id === copy.branch_id) || branches[0];
                        const isDonation = selectedBranch?.type === 'external_donation';

                        return (
                          <div
                            key={copy.id}
                            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5 hover:border-slate-300 transition"
                          >
                            {/* Copy Header / Action bar */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  Ejemplar #{index + 1}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isDonation ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                }`}>
                                  {isDonation ? 'Dotación Rural' : 'Sede Central'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateCopy(copy)}
                                  title="Duplicar configuración de este ejemplar"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer text-xs flex items-center gap-1"
                                >
                                  <CopyIcon className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline text-[11px]">Duplicar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCopy(copy.id)}
                                  title="Eliminar este ejemplar"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Copy Fields Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                              {/* Branch Selector */}
                              <div className="sm:col-span-4 space-y-1">
                                <label className="block font-bold text-slate-700 flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  Sede de Asignación
                                </label>
                                <select
                                  value={copy.branch_id}
                                  onChange={(e) => handleUpdateCopy(copy.id, 'branch_id', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                                >
                                  <optgroup label="Sedes Centrales (Campus Principal)">
                                    {branches.filter(b => b.type === 'internal').map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name} [{getBranchCodePrefix(b.name)}-]
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Semilla Manglareña (Dotaciones Rurales)">
                                    {branches.filter(b => b.type === 'external_donation').map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name} [{getBranchCodePrefix(b.name)}-]
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              </div>

                              {/* Individual Physical Condition (Individual buttons per copy) */}
                              <div className="sm:col-span-4 space-y-1">
                                <label className="block font-bold text-slate-700">
                                  Estado Físico Individual
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {(
                                    [
                                      { key: 'bueno', label: 'Bueno', color: 'emerald' },
                                      { key: 'regular', label: 'Regular', color: 'amber' },
                                      { key: 'malo', label: 'Malo', color: 'rose' },
                                    ] as const
                                  ).map((cond) => {
                                    const isSelected = copy.condition === cond.key;
                                    return (
                                      <button
                                        key={cond.key}
                                        type="button"
                                        onClick={() => handleUpdateCopy(copy.id, 'condition', cond.key)}
                                        className={`py-1.5 px-2 rounded-xl font-bold text-[11px] capitalize transition border cursor-pointer ${
                                          isSelected
                                            ? cond.key === 'bueno'
                                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                              : cond.key === 'regular'
                                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                              : 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {cond.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Individual Marbete Code Input with Regenerate Action */}
                              <div className="sm:col-span-4 space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block font-bold text-slate-700 flex items-center gap-1">
                                    <Barcode className="w-3 h-3 text-slate-400" />
                                    Código Marbete / Código
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateCode(copy.id)}
                                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer"
                                  >
                                    Regenerar
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={copy.internal_code}
                                  onChange={(e) => handleUpdateCopy(copy.id, 'internal_code', e.target.value)}
                                  placeholder="MOS-PRI-863-XXXX"
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                                />
                              </div>

                              {/* Individual Shelf / Location Notes */}
                              <div className="sm:col-span-12 space-y-1">
                                <label className="block font-medium text-slate-600 text-[11px]">
                                  Ubicación en Estantería / Observaciones del Ejemplar
                                </label>
                                <input
                                  type="text"
                                  value={copy.notes}
                                  onChange={(e) => handleUpdateCopy(copy.id, 'notes', e.target.value)}
                                  placeholder="Ej: Estante A-2, Donación Familia Mendoza, Sala de lectura..."
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        )}

        {/* Modal Footer Actions (only shown in 'form' step) */}
        {currentStep === 'form' && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              {createInitialCopies ? (
                <span>
                  Se registrará la obra junto con <strong>{initialCopies.length} ejemplares físicos individuales</strong>.
                </span>
              ) : (
                <span>Se registrará únicamente la ficha de la obra en el Catálogo Universal.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep('isbn_lookup')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Atrás
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Guardando en Catálogo...
                  </>
                ) : (
                  <>
                    <BookPlus className="w-4 h-4" />
                    Registrar Obra y Ejemplares
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
