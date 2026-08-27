export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- PLATAFORMA DE GESTIÓN BIBLIOTECARIA "BIBLIOTECA MIGUEL OTERO SILVA"
-- COLEGIO INTEGRAL EL MANGLAR - NÚCLEO MULTISEDE Y DONACIONES RURALES
-- PostgreSQL + Supabase DDL & Row Level Security (RLS) - KOHA REMIX EDITION
-- =========================================================================

-- 1. Habilitar extensión para UUIDs criptográficos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- TABLA: branches (Sedes centrales y escuelas rurales de dotación)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('internal', 'external_donation')),
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.branches IS 'Sedes del Colegio Integral El Manglar y destinos de donación rural (e.g. Semilla Manglareña).';
COMMENT ON COLUMN public.branches.type IS 'Clasificación de sede: internal (biblioteca central) o external_donation (escuelas rurales).';

-- -------------------------------------------------------------------------
-- TABLA: works (Catálogo universal de obras bajo estándar Dublin Core + MARC21)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    dewey_code VARCHAR(32) NOT NULL,
    cover_url TEXT,
    publisher TEXT,
    publication_year INTEGER CHECK (publication_year > 1000 AND publication_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    subjects TEXT[] DEFAULT '{}',
    description TEXT,
    language VARCHAR(10) DEFAULT 'spa',
    edition TEXT,
    physical_description TEXT,
    series TEXT,
    target_audience TEXT,
    call_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.works IS 'Registro bibliográfico maestro con metadatos Dublin Core, MARC21 y clasificación Dewey Decimal.';

-- -------------------------------------------------------------------------
-- TABLA: copies (Ejemplares físicos inventariados)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    condition TEXT NOT NULL CHECK (condition IN ('bueno', 'regular', 'malo')),
    internal_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'prestado', 'en_donacion', 'baja', 'en_traslado', 'en_reparacion')),
    notes TEXT,
    barcode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLA: students / patrons (Directorio de lectores, docentes y comunidad)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade_section TEXT,
    identifier TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'staff', 'community')),
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLA: loans (Módulo de Préstamos y Devoluciones Circulantes)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID NOT NULL REFERENCES public.copies(id) ON DELETE CASCADE,
    copy_internal_code TEXT NOT NULL,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    work_title TEXT NOT NULL,
    work_author TEXT NOT NULL,
    work_cover_url TEXT,
    work_dewey_code VARCHAR(32),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    branch_name TEXT NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_grade TEXT,
    student_identifier TEXT,
    loan_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    due_date TIMESTAMPTZ,
    is_indefinite BOOLEAN NOT NULL DEFAULT false,
    return_date TIMESTAMPTZ,
    renewal_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
    checkout_notes TEXT,
    return_notes TEXT,
    return_condition TEXT CHECK (return_condition IN ('bueno', 'regular', 'malo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLA: holds (Koha-grade Reservas y Colas de Espera)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    work_title TEXT NOT NULL,
    work_author TEXT NOT NULL,
    work_cover_url TEXT,
    patron_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    patron_name TEXT NOT NULL,
    patron_identifier TEXT,
    patron_grade TEXT,
    patron_role TEXT DEFAULT 'student',
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT DEFAULT 'Biblioteca Central',
    reserved_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expiration_date TIMESTAMPTZ,
    priority INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready_for_pickup', 'fulfilled', 'cancelled', 'expired')),
    notes TEXT,
    fulfilled_loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLA: virtual_shelves (Estantes Virtuales y Listas Curadas)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.virtual_shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'plan_lector' CHECK (category IN ('plan_lector', 'recomendados', 'efemerides', 'comunidad', 'tematica')),
    is_public BOOLEAN NOT NULL DEFAULT true,
    color TEXT DEFAULT 'emerald',
    icon TEXT DEFAULT 'BookOpen',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.virtual_shelf_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID NOT NULL REFERENCES public.virtual_shelves(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    UNIQUE(shelf_id, work_id)
);

-- -------------------------------------------------------------------------
-- TABLA: suggestions (Buzón de Desideratas / Sugerencias de Adquisición)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    publisher TEXT,
    publication_year INTEGER,
    reason TEXT,
    suggested_by_name TEXT NOT NULL,
    suggested_by_role TEXT DEFAULT 'student',
    suggested_by_grade TEXT,
    suggested_by_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cataloged')),
    reviewer_notes TEXT,
    votes INTEGER NOT NULL DEFAULT 1,
    voted_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ
);

-- -------------------------------------------------------------------------
-- TABLA: preservation_items (Taller de Encuadernación y Restauración)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preservation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID REFERENCES public.copies(id) ON DELETE SET NULL,
    copy_code TEXT NOT NULL,
    work_title TEXT NOT NULL,
    work_author TEXT NOT NULL,
    damage_type TEXT NOT NULL CHECK (damage_type IN ('hojas_sueltas', 'lomo_danado', 'humedad_hongos', 'rayones', 'cubierta_rota', 'otro')),
    status TEXT NOT NULL DEFAULT 'en_espera' CHECK (status IN ('en_espera', 'en_tratamiento', 'restaurado', 'baja_definitiva')),
    diagnosis TEXT NOT NULL,
    treatment_applied TEXT,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    technician_name TEXT,
    notes TEXT
);

-- -------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_works_isbn ON public.works(isbn);
CREATE INDEX IF NOT EXISTS idx_works_dewey ON public.works(dewey_code);
CREATE INDEX IF NOT EXISTS idx_works_title ON public.works USING gin(to_tsvector('spanish', title));
CREATE INDEX IF NOT EXISTS idx_copies_internal_code ON public.copies(internal_code);
CREATE INDEX IF NOT EXISTS idx_loans_copy_id ON public.loans(copy_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_holds_work_id ON public.holds(work_id);
CREATE INDEX IF NOT EXISTS idx_holds_status ON public.holds(status);
CREATE INDEX IF NOT EXISTS idx_shelf_items_shelf ON public.virtual_shelf_items(shelf_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions(status);

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_shelf_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preservation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso a sedes" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a obras" ON public.works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a ejemplares" ON public.copies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a lectores" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a prestamos" ON public.loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a reservas" ON public.holds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a estantes" ON public.virtual_shelves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a items de estante" ON public.virtual_shelf_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a sugerencias" ON public.suggestions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso a preservacion" ON public.preservation_items FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- SEDES INSTITUCIONALES OFICIALES (Colegio Integral El Manglar)
-- -------------------------------------------------------------------------
INSERT INTO public.branches (id, name, type, location, description)
VALUES 
    ('00000000-0000-4000-a000-000000000001', 'Biblioteca Miguel Otero Silva - Primaria', 'internal', 'Campus Colegio Integral El Manglar - Edificio Primaria', 'Biblioteca central y rincón de lectura para educación primaria y preescolar'),
    ('00000000-0000-4000-a000-000000000002', 'Biblioteca Miguel Otero Silva - Bachillerato', 'internal', 'Campus Colegio Integral El Manglar - Edificio Bachillerato', 'Biblioteca central y sala de investigación de educación media general y diversificada'),
    ('00000000-0000-4000-a000-000000000003', 'Semilla Manglareña - Guárico', 'external_donation', 'Estado Guárico - Módulo Rural', 'Dotación descentralizada de fomento lector para escuelas y comunidades rurales de Guárico'),
    ('00000000-0000-4000-a000-000000000004', 'Semilla Manglareña - Caripe', 'external_donation', 'Municipio Caripe, Estado Monagas', 'Dotación de lectura comunitaria y escolar en la región de Caripe del Guácharo'),
    ('00000000-0000-4000-a000-000000000005', 'Semilla Manglareña - Mérida', 'external_donation', 'Estado Mérida - Aldeas Andinas', 'Dotación de literatura infantil y juvenil para escuelas rurales andinas'),
    ('00000000-0000-4000-a000-000000000006', 'Semilla Manglareña - Delta', 'external_donation', 'Delta Amacuro - Comunidades Fluviales', 'Dotación bibliográfica especializada para comunidades fluviales e indígenas')
ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type;
