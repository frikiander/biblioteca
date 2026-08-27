# 📚 Biblioteca Miguel Otero Silva — Colegio Integral El Manglar

Sistema integral de gestión bibliotecaria multisede, catalogación universal bajo estándar Dublin Core simplificado, MARC21, Clasificación Decimal Dewey (CDD), autocompletado automatizado con **Google Books API**, generación/impresión de marbetes normalizados (Cutter-Sanborn) y módulo de circulación y préstamos.

---

## 🚀 Tecnologías Principales

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS v4
- **Iconografía e Interfaz**: Lucide React + Motion + jsPDF
- **Base de Datos & Backend**: Supabase (PostgreSQL 15+ con Row Level Security - RLS)
- **Servicios Externos**: Google Books API + Open Library (metadatos bibliográficos e ISBN)
- **Despliegue Recomendado**: Vercel + Supabase Cloud

---

## 🔑 Variables de Entorno y Credenciales

El proyecto utiliza un archivo `.env` para almacenar las credenciales de desarrollo local. Copia la plantilla base:

```bash
cp .env.example .env
```

### Variables requeridas:

| Variable | Descripción | Obligatorio |
| :--- | :--- | :--- |
| `VITE_GOOGLE_BOOKS_API_KEY` | API Key de Google Cloud Books API para autocompletar libros por ISBN sin límites de cuota | Opcional (funciona en modo público) |
| `VITE_SUPABASE_URL` | URL de tu proyecto en Supabase (ej: `https://xyz.supabase.co`) | Para modo BD en la nube |
| `VITE_SUPABASE_ANON_KEY` | Llave anónima pública de Supabase | Para modo BD en la nube |
| `NEXT_PUBLIC_SUPABASE_URL` | Alias compatible para Next.js / Vercel | Opcional |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Alias compatible para Next.js / Vercel | Opcional |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave de rol de servicio (Solo backend/migraciones, **nunca** exponer al cliente) | Opcional |

> 💡 **Nota de Seguridad**: El archivo `.env` ya está protegido en `.gitignore` para evitar que tus credenciales se suban a GitHub.

---

## 🛠️ Ejecución Local

1. **Instalar dependencias**:
   ```bash
   npm install
   # o bien
   bun install
   ```

2. **Configurar `.env`** con tus credenciales.

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

---

## 🌐 Guía de Despliegue: Supabase, Git y Vercel

### Paso 1: Configurar Base de Datos en Supabase
1. Ingresa a [supabase.com](https://supabase.com) e inicia sesión.
2. Crea un nuevo proyecto (ejemplo: `biblioteca-manglar`).
3. Ve a la sección **SQL Editor** en el panel izquierdo.
4. Pega el script SQL del archivo [`supabase_schema.sql`](supabase_schema.sql) y haz clic en **Run**.
5. Ve a **Project Settings > API** y copia:
   - **Project URL**
   - **Project API Key (`anon public`)**

### Paso 2: Obtener Google Books API Key
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y ve a **APIs y Servicios > Biblioteca**.
3. Busca **"Books API"** y haz clic en **Habilitar**.
4. Ve a **APIs y Servicios > Credenciales > Crear Credenciales > Clave de API**.
5. Copia la clave y pégala en `VITE_GOOGLE_BOOKS_API_KEY`.

### Paso 3: Subir a GitHub
```bash
git init
git add .
git commit -m "feat: Sistema de Gestión Biblioteca Miguel Otero Silva"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 4: Desplegar en Vercel
1. Ingresa a [vercel.com](https://vercel.com) y haz clic en **"Add New Project"**.
2. Importa tu repositorio de GitHub.
3. En **Framework Preset**, selecciona **Vite**.
4. En la sección **Environment Variables**, añade:
   - `VITE_SUPABASE_URL` = (Tu URL de Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (Tu clave anon de Supabase)
   - `VITE_GOOGLE_BOOKS_API_KEY` = (Tu API Key de Google Books)
5. Haz clic en **Deploy**.
