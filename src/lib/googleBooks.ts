/**
 * Google Books API Service for fetching bibliographic metadata
 */

// Initialize Google Books API credentials from environment variables
const metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};
export const GOOGLE_BOOKS_API_KEY =
  metaEnv.VITE_GOOGLE_BOOKS_API_KEY ||
  metaEnv.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ||
  metaEnv.GOOGLE_BOOKS_API_KEY ||
  '';

export const isGoogleBooksApiKeyConfigured = Boolean(GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY.trim() !== '');

export interface GoogleBookVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  pageCount?: number;
  categories?: string[];
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  language?: string;
  previewLink?: string;
  infoLink?: string;
}

export interface GoogleBookItem {
  id: string;
  volumeInfo: GoogleBookVolumeInfo;
}

export interface NormalizedBookMetadata {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: number;
  description: string;
  subjects: string[];
  coverUrl: string;
  language: string;
  pageCount?: number;
  suggestedDeweyClass: string;
  suggestedDeweyCode: string;
  source: 'google_books' | 'manual';
}

export function inferDeweyFromGoogleBook(
  categories: string[] = [],
  title: string = '',
  language: string = 'spa'
): { deweyClass: string; deweyCode: string } {
  const combined = `${categories.join(' ')} ${title}`.toLowerCase();

  if (
    combined.includes('fiction') ||
    combined.includes('novel') ||
    combined.includes('ficción') ||
    combined.includes('novela') ||
    combined.includes('poesía') ||
    combined.includes('poetry') ||
    combined.includes('literatura') ||
    combined.includes('literature') ||
    combined.includes('drama') ||
    combined.includes('teatro') ||
    combined.includes('cuentos')
  ) {
    if (language === 'spa' || combined.includes('venez') || combined.includes('hispano')) {
      return { deweyClass: '800', deweyCode: '860' };
    }
    return { deweyClass: '800', deweyCode: '810' };
  }

  if (
    combined.includes('history') ||
    combined.includes('historia') ||
    combined.includes('geography') ||
    combined.includes('geografía') ||
    combined.includes('biography') ||
    combined.includes('biografía') ||
    combined.includes('américa')
  ) {
    return { deweyClass: '900', deweyCode: '980' };
  }

  if (
    combined.includes('science') ||
    combined.includes('ciencia') ||
    combined.includes('math') ||
    combined.includes('matemát') ||
    combined.includes('biology') ||
    combined.includes('biología') ||
    combined.includes('physics') ||
    combined.includes('física') ||
    combined.includes('chemistry') ||
    combined.includes('química') ||
    combined.includes('astronomy') ||
    combined.includes('astronomía') ||
    combined.includes('ecology') ||
    combined.includes('ecología')
  ) {
    if (combined.includes('math') || combined.includes('matemát')) return { deweyClass: '500', deweyCode: '510' };
    if (combined.includes('astron')) return { deweyClass: '500', deweyCode: '520' };
    if (combined.includes('physic') || combined.includes('física')) return { deweyClass: '500', deweyCode: '530' };
    if (combined.includes('chem') || combined.includes('química')) return { deweyClass: '500', deweyCode: '540' };
    if (combined.includes('bio') || combined.includes('biolog')) return { deweyClass: '500', deweyCode: '570' };
    return { deweyClass: '500', deweyCode: '500' };
  }

  if (
    combined.includes('technology') ||
    combined.includes('tecnología') ||
    combined.includes('medicine') ||
    combined.includes('medicina') ||
    combined.includes('engineering') ||
    combined.includes('ingeniería') ||
    combined.includes('agriculture') ||
    combined.includes('agricultura') ||
    combined.includes('health') ||
    combined.includes('salud')
  ) {
    if (combined.includes('medicin') || combined.includes('salud') || combined.includes('health')) {
      return { deweyClass: '600', deweyCode: '610' };
    }
    if (combined.includes('ingenier') || combined.includes('engineer')) {
      return { deweyClass: '600', deweyCode: '620' };
    }
    return { deweyClass: '600', deweyCode: '600' };
  }

  if (
    combined.includes('social') ||
    combined.includes('education') ||
    combined.includes('educación') ||
    combined.includes('pedagog') ||
    combined.includes('sociol') ||
    combined.includes('politics') ||
    combined.includes('política') ||
    combined.includes('derecho') ||
    combined.includes('law') ||
    combined.includes('economy') ||
    combined.includes('economía')
  ) {
    if (combined.includes('educa') || combined.includes('pedagog')) return { deweyClass: '300', deweyCode: '370' };
    if (combined.includes('econom')) return { deweyClass: '300', deweyCode: '330' };
    if (combined.includes('derecho') || combined.includes('law')) return { deweyClass: '300', deweyCode: '340' };
    if (combined.includes('polit')) return { deweyClass: '300', deweyCode: '320' };
    return { deweyClass: '300', deweyCode: '300' };
  }

  if (
    combined.includes('philosophy') ||
    combined.includes('filosofía') ||
    combined.includes('psychology') ||
    combined.includes('psicología') ||
    combined.includes('ethics') ||
    combined.includes('ética')
  ) {
    if (combined.includes('psico') || combined.includes('psych')) return { deweyClass: '100', deweyCode: '150' };
    if (combined.includes('ética') || combined.includes('moral')) return { deweyClass: '100', deweyCode: '170' };
    return { deweyClass: '100', deweyCode: '100' };
  }

  if (
    combined.includes('religion') ||
    combined.includes('religión') ||
    combined.includes('mythology') ||
    combined.includes('mitología') ||
    combined.includes('bible') ||
    combined.includes('biblia')
  ) {
    if (combined.includes('bible') || combined.includes('biblia')) return { deweyClass: '200', deweyCode: '220' };
    return { deweyClass: '200', deweyCode: '200' };
  }

  if (
    combined.includes('art') ||
    combined.includes('arte') ||
    combined.includes('music') ||
    combined.includes('música') ||
    combined.includes('painting') ||
    combined.includes('pintura') ||
    combined.includes('sports') ||
    combined.includes('deporte')
  ) {
    if (combined.includes('music') || combined.includes('música')) return { deweyClass: '700', deweyCode: '780' };
    if (combined.includes('pintura') || combined.includes('paint')) return { deweyClass: '700', deweyCode: '750' };
    if (combined.includes('deport') || combined.includes('sport') || combined.includes('juego')) return { deweyClass: '700', deweyCode: '790' };
    return { deweyClass: '700', deweyCode: '700' };
  }

  if (
    combined.includes('language') ||
    combined.includes('lengua') ||
    combined.includes('linguistics') ||
    combined.includes('lingüística') ||
    combined.includes('grammar') ||
    combined.includes('gramática') ||
    combined.includes('dictionary') ||
    combined.includes('diccionario')
  ) {
    if (combined.includes('inglés') || combined.includes('english')) return { deweyClass: '400', deweyCode: '420' };
    return { deweyClass: '400', deweyCode: '460' };
  }

  if (
    combined.includes('computer') ||
    combined.includes('computación') ||
    combined.includes('informatics') ||
    combined.includes('informática') ||
    combined.includes('encyclopedia') ||
    combined.includes('enciclopedia') ||
    combined.includes('library') ||
    combined.includes('biblioteca')
  ) {
    if (combined.includes('encyclop') || combined.includes('enciclo')) return { deweyClass: '000', deweyCode: '030' };
    if (combined.includes('library') || combined.includes('biblio')) return { deweyClass: '000', deweyCode: '020' };
    return { deweyClass: '000', deweyCode: '000' };
  }

  return { deweyClass: '800', deweyCode: '800' };
}

function cleanDescription(rawText?: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

function getBestCoverImage(imageLinks?: GoogleBookVolumeInfo['imageLinks']): string {
  if (!imageLinks) return '';
  const url =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    '';

  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
}

function normalizeLanguage(lang?: string): string {
  if (!lang) return 'spa';
  const clean = lang.toLowerCase().trim();
  if (clean === 'es' || clean === 'es-es' || clean === 'es-419' || clean === 'spa') return 'spa';
  if (clean === 'en' || clean === 'en-us' || clean === 'en-gb' || clean === 'eng') return 'eng';
  if (clean === 'fr' || clean === 'fre' || clean === 'fra') return 'fre';
  if (clean === 'pt' || clean === 'pt-br' || clean === 'por') return 'por';
  return clean.slice(0, 3);
}

export async function searchBookByISBN(rawIsbn: string): Promise<NormalizedBookMetadata | null> {
  const cleanedIsbn = rawIsbn.replace(/[^0-9X]/gi, '').trim();
  if (!cleanedIsbn || (cleanedIsbn.length !== 10 && cleanedIsbn.length !== 13)) {
    throw new Error('El ISBN debe contener 10 o 13 dígitos válidos.');
  }

  let endpoint = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedIsbn}`;
  if (GOOGLE_BOOKS_API_KEY) {
    endpoint += `&key=${encodeURIComponent(GOOGLE_BOOKS_API_KEY.trim())}`;
  }

  const response = await fetch(endpoint);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Error de autorización en Google Books API (HTTP 403). Verifica la validez de tu API Key o cuota en Google Cloud.');
    }
    if (response.status === 429) {
      throw new Error('Límite de solicitudes alcanzado en Google Books API (HTTP 429). Intenta nuevamente en unos momentos.');
    }
    throw new Error(`Error en la respuesta de Google Books API (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    return null;
  }

  const item: GoogleBookItem = data.items[0];
  const info = item.volumeInfo || {};

  let resolvedIsbn = cleanedIsbn;
  if (info.industryIdentifiers && info.industryIdentifiers.length > 0) {
    const isbn13 = info.industryIdentifiers.find((id) => id.type === 'ISBN_13');
    const isbn10 = info.industryIdentifiers.find((id) => id.type === 'ISBN_10');
    resolvedIsbn = isbn13?.identifier || isbn10?.identifier || cleanedIsbn;
  }

  let publicationYear = new Date().getFullYear();
  if (info.publishedDate) {
    const yearMatch = info.publishedDate.match(/\b\d{4}\b/);
    if (yearMatch) {
      publicationYear = parseInt(yearMatch[0], 10);
    }
  }

  let subjects: string[] = [];
  if (info.categories && info.categories.length > 0) {
    info.categories.forEach((cat) => {
      const parts = cat.split('/').map((p) => p.trim());
      parts.forEach((p) => {
        if (p && !subjects.includes(p)) {
          subjects.push(p);
        }
      });
    });
  }
  if (subjects.length === 0) {
    subjects = ['Literatura General', 'Biblioteca Escolar'];
  }

  const fullTitle = info.subtitle ? `${info.title}: ${info.subtitle}` : info.title || 'Sin Título';
  const authorName = info.authors && info.authors.length > 0 ? info.authors.join(', ') : 'Autor Desconocido';
  const normLang = normalizeLanguage(info.language);
  const { deweyClass, deweyCode } = inferDeweyFromGoogleBook(info.categories, fullTitle, normLang);

  return {
    title: fullTitle,
    author: authorName,
    isbn: resolvedIsbn,
    publisher: info.publisher || 'Editorial no especificada',
    publicationYear,
    description: cleanDescription(info.description) || `Obra catalogada vía Google Books API: ${fullTitle}.`,
    subjects: subjects.slice(0, 6),
    coverUrl: getBestCoverImage(info.imageLinks),
    language: normLang,
    pageCount: info.pageCount,
    suggestedDeweyClass: deweyClass,
    suggestedDeweyCode: deweyCode,
    source: 'google_books',
  };
}
