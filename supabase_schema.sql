-- =========================================================================
-- PLATAFORMA DE GESTIÓN BIBLIOTECARIA "BIBLIOTECA MIGUEL OTERO SILVA"
-- COLEGIO INTEGRAL EL MANGLAR - NÚCLEO MULTISEDE Y DONACIONES RURALES
-- PostgreSQL + Supabase DDL & Row Level Security (RLS)
-- =========================================================================

-- 1. Habilitar extensión para UUIDs criptográficos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Limpieza de tablas previas (en caso de reinicio de entorno)
-- DROP TABLE IF EXISTS public.copies CASCADE;
-- DROP TABLE IF EXISTS public.works CASCADE;
-- DROP TABLE IF EXISTS public.branches CASCADE;

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
-- TABLA: works (Catálogo universal de obras bajo estándar Dublin Core simplificado)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.works IS 'Registro bibliográfico maestro con metadatos Dublin Core y clasificación Dewey Decimal.';
COMMENT ON COLUMN public.works.dewey_code IS 'Notación de Clasificación Decimal Dewey (CDD/DDC), e.g. 863 para narrativa hispanoamericana.';

-- -------------------------------------------------------------------------
-- TABLA: copies (Ejemplares físicos inventariados)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    condition TEXT NOT NULL CHECK (condition IN ('bueno', 'regular', 'malo')),
    internal_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'prestado', 'en_donacion', 'baja', 'en_traslado')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.copies IS 'Unidades físicas tangibles ubicadas en una sede o transferidas a dotación.';
COMMENT ON COLUMN public.copies.internal_code IS 'Código de barras / marbete interno único del ejemplar (e.g. CIM-863-001 / SM-2024-042).';

-- -------------------------------------------------------------------------
-- TABLA: students (Estudiantes, docentes y personal para préstamos)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade_section TEXT,
    identifier TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'staff')),
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.students IS 'Directorio de lectores: estudiantes, docentes y personal institucional.';

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
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
    checkout_notes TEXT,
    return_notes TEXT,
    return_condition TEXT CHECK (return_condition IN ('bueno', 'regular', 'malo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.loans IS 'Registro de préstamos activos, devueltos y vencidos del fondo bibliográfico.';

-- -------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO PARA BÚSQUEDA Y RELACIONES
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_works_isbn ON public.works(isbn);
CREATE INDEX IF NOT EXISTS idx_works_dewey ON public.works(dewey_code);
CREATE INDEX IF NOT EXISTS idx_works_title ON public.works USING gin(to_tsvector('spanish', title));
CREATE INDEX IF NOT EXISTS idx_works_author ON public.works USING gin(to_tsvector('spanish', author));

CREATE INDEX IF NOT EXISTS idx_copies_work_id ON public.copies(work_id);
CREATE INDEX IF NOT EXISTS idx_copies_branch_id ON public.copies(branch_id);
CREATE INDEX IF NOT EXISTS idx_copies_condition ON public.copies(condition);
CREATE INDEX IF NOT EXISTS idx_copies_internal_code ON public.copies(internal_code);

CREATE INDEX IF NOT EXISTS idx_students_identifier ON public.students(identifier);
CREATE INDEX IF NOT EXISTS idx_loans_copy_id ON public.loans(copy_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_student_id ON public.loans(student_id);

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- -------------------------------------------------------------------------

-- Activar RLS en todas las tablas del esquema
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para 'branches'
CREATE POLICY "Permitir lectura publica de sedes" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de sedes a usuarios autenticados" ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Políticas para 'works'
CREATE POLICY "Permitir lectura publica del catalogo de obras" ON public.works FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de obras a usuarios autenticados" ON public.works FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Políticas para 'copies'
CREATE POLICY "Permitir lectura publica de ejemplares" ON public.copies FOR SELECT USING (true);
CREATE POLICY "Permitir registro y modificacion de copias a autenticados" ON public.copies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Políticas para 'students'
CREATE POLICY "Permitir lectura publica de estudiantes" ON public.students FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de estudiantes a autenticados" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Políticas para 'loans'
CREATE POLICY "Permitir lectura publica de prestamos" ON public.loans FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de prestamos a autenticados" ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- DATOS SEMILLA (SEED DATA)
-- -------------------------------------------------------------------------

-- Sedes iniciales: 2 Bibliotecas del Campus y 4 Núcleos Semilla Manglareña
INSERT INTO public.branches (id, name, type, location, description)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'Biblioteca Miguel Otero Silva - Primaria', 'internal', 'Campus Colegio Integral El Manglar - Edificio Primaria', 'Biblioteca central y rincón de lectura para educación primaria y preescolar'),
    ('a2222222-2222-2222-2222-222222222222', 'Biblioteca Miguel Otero Silva - Bachillerato', 'internal', 'Campus Colegio Integral El Manglar - Edificio Bachillerato', 'Biblioteca central y sala de investigación de educación media general y diversificada'),
    ('b3333333-3333-3333-3333-333333333333', 'Semilla Manglareña - Guárico', 'external_donation', 'Estado Guárico - Módulo Rural', 'Dotación descentralizada de fomento lector para escuelas y comunidades rurales de Guárico'),
    ('b4444444-4444-4444-4444-444444444444', 'Semilla Manglareña - Caripe', 'external_donation', 'Municipio Caripe, Estado Monagas', 'Dotación de lectura comunitaria y escolar en la región de Caripe del Guácharo'),
    ('b5555555-5555-5555-5555-555555555555', 'Semilla Manglareña - Mérida', 'external_donation', 'Estado Mérida - Aldeas Andinas', 'Dotación de literatura infantil y juvenil para escuelas rurales andinas'),
    ('b6666666-6666-6666-6666-666666666666', 'Semilla Manglareña - Delta', 'external_donation', 'Delta Amacuro - Comunidades Fluviales', 'Dotación bibliográfica especializada para comunidades fluviales e indígenas')
ON CONFLICT (name) DO NOTHING;

-- Obras iniciales de referencia (Honrando a Miguel Otero Silva y literatura clave)
INSERT INTO public.works (id, title, author, isbn, dewey_code, cover_url, publisher, publication_year, subjects, description)
VALUES
    (
        'w1111111-1111-1111-1111-111111111111',
        'Casas Muertas',
        'Miguel Otero Silva',
        '978-9800101896',
        '863.64',
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
        'Editorial Losada / Biblioteca Ayacucho',
        1955,
        ARRAY['Literatura Venezolana', 'Novela Histórica', 'Ortiz', 'Realismo Social'],
        'Crónica conmovedora de la decadencia del pueblo de Ortiz tras la fiebre amarilla y el paludismo, símbolo de la Venezuela rural de principios del siglo XX.'
    ),
    (
        'w2222222-2222-2222-2222-222222222222',
        'Fiebre',
        'Miguel Otero Silva',
        '978-9802761234',
        '863.64',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
        'Editorial Tiempo Nuevo',
        1939,
        ARRAY['Generación del 28', 'Narrativa Testimonial', 'Lucha Estudiantil', 'Gomecismo'],
        'Novela sobre la huelga estudiantil universitaria contra la dictadura gomecista en 1928 y el presidio en el Castillo Libertador de Puerto Cabello.'
    ),
    (
        'w3333333-3333-3333-3333-333333333333',
        'Oficina N° 1',
        'Miguel Otero Silva',
        '978-9801234567',
        '863.64',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
        'Editorial Losada',
        1961,
        ARRAY['Petróleo', 'Urbanización', 'El Tigre', 'Transformación Social'],
        'Continuación espiritual de Casas Muertas que narra el nacimiento vertiginoso de la ciudad de El Tigre al calor del auge petrolero venezolano.'
    ),
    (
        'w4444444-4444-4444-4444-444444444444',
        'Ifigenia: Diario de una señorita que escribió porque se fastidiaba',
        'Teresa de la Parra',
        '978-9800102558',
        '863.62',
        'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600',
        'Editorial Monte Ávila',
        1924,
        ARRAY['Literatura Femenina', 'Caracas Colonial', 'Costumbrismo', 'Epistolar'],
        'Obra cumbre de la literatura hispanoamericana que examina la sociedad caraqueña y los dilemas de libertad de María Eugenia Alonso.'
    ),
    (
        'w5555555-5555-5555-5555-555555555555',
        'Doña Bárbara',
        'Rómulo Gallegos',
        '978-8420658421',
        '863.62',
        'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80&w=600',
        'Editorial Araluce / Alianza',
        1929,
        ARRAY['Llano Venezolano', 'Civilización y Barbarie', 'Santos Luzardo', 'Clásico Latinoamericano'],
        'La máxima novela épica del llano venezolano, explorando el conflicto entre la ley y la barbarie en la sabana del Arauca.'
    ),
    (
        'w6666666-6666-6666-6666-666666666666',
        'Cosmos: Un viaje personal',
        'Carl Sagan',
        '978-0345331359',
        '520.1',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600',
        'Planeta / Random House',
        1980,
        ARRAY['Astronomía', 'Divulgación Científica', 'Física', 'Evolución'],
        'Pilar indispensable de la divulgación científica que recorre quince mil millones de años de evolución cósmica.'
    )
ON CONFLICT (id) DO NOTHING;

-- Ejemplares físicos de muestra
INSERT INTO public.copies (work_id, branch_id, condition, internal_code, status, notes)
VALUES
    -- Casas Muertas
    ('w1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'bueno', 'MOS-BAC-863-7159-001', 'disponible', 'Colección General - Estante 7159 (Copia 1)'),
    ('w1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'regular', 'MOS-PRI-863-7159-002', 'prestado', 'Préstamo a sala de profesores de Primaria (Copia 2)'),
    ('w1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'bueno', 'SM-GUA-863-4210-003', 'en_donacion', 'Dotación Semilla Manglareña - Núcleo Llanero Guárico (Copia 3)'),
    
    -- Fiebre
    ('w2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'bueno', 'MOS-BAC-863-7159-001', 'disponible', 'Colección Reserva Bachillerato (Copia 1)'),
    ('w2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'bueno', 'SM-CAR-863-3180-002', 'en_donacion', 'Dotación Semilla Manglareña - Módulo Caripe (Copia 2)'),

    -- Oficina N° 1
    ('w3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'bueno', 'MOS-BAC-863-7159-001', 'disponible', 'Colección General Bachillerato (Copia 1)'),
    ('w3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'regular', 'SM-MER-863-2415-002', 'en_donacion', 'Dotación Semilla Manglareña - Núcleo Mérida (Copia 2)'),

    -- Ifigenia
    ('w4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 'bueno', 'MOS-BAC-863-7159-001', 'disponible', 'Colección Literatura Hispanoamericana (Copia 1)'),
    ('w4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'bueno', 'SM-DEL-863-6302-002', 'en_donacion', 'Dotación Semilla Manglareña - Delta Amacuro (Copia 2)'),

    -- Doña Bárbara
    ('w5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 'bueno', 'MOS-BAC-863-7159-001', 'disponible', 'Colección Clásicos Venezolanos (Copia 1)'),
    ('w5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'bueno', 'SM-GUA-863-4210-002', 'en_donacion', 'Dotación Semilla Manglareña - Sede Guárico (Copia 2)'),

    -- Cosmos
    ('w6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', 'bueno', 'MOS-BAC-520-1040-001', 'disponible', 'Área de Ciencias y Astronomía - Bachillerato (Copia 1)')
ON CONFLICT (internal_code) DO NOTHING;
