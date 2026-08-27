/**
 * Google Books & Open Library Cascade Search Service for Bibliographic Metadata
 * 
 * Implements a resilient concurrent waterfall/cascade architecture (Promise.all) that merges
 * metadata from Google Books with Dewey Decimal Classification (CDD) from Open Library,
 * with automatic retries for transient 503/429/500 errors, ISBN 10/13 dual lookup,
 * and graceful fallbacks.
 */

// Helper to safely read Google Books API key from Vite or Node environments
function getGoogleBooksApiKey(): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (metaEnv) {
      if (metaEnv.VITE_GOOGLE_BOOKS_API_KEY) return metaEnv.VITE_GOOGLE_BOOKS_API_KEY;
      if (metaEnv.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY) return metaEnv.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      if (metaEnv.GOOGLE_BOOKS_API_KEY) return metaEnv.GOOGLE_BOOKS_API_KEY;
    }
  } catch {
    // Ignore in non-meta environments
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_GOOGLE_BOOKS_API_KEY) return process.env.VITE_GOOGLE_BOOKS_API_KEY;
      if (process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY) return process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      if (process.env.GOOGLE_BOOKS_API_KEY) return process.env.GOOGLE_BOOKS_API_KEY;
    }
  } catch {
    // Ignore in browser environments without process
  }

  return '';
}

export const GOOGLE_BOOKS_API_KEY = getGoogleBooksApiKey();
export const isGoogleBooksApiKeyConfigured = Boolean(GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY.trim() !== '');

/**
 * Custom Error for Google Books HTTP 429 Too Many Requests
 */
export class GoogleBooksRateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly isRateLimit = true;

  constructor(
    message: string = 'Límite de solicitudes alcanzado en Google Books API (HTTP 429). Por favor espera unos momentos antes de reintentar o ingresa los datos manualmente.'
  ) {
    super(message);
    this.name = 'GoogleBooksRateLimitError';
    Object.setPrototypeOf(this, GoogleBooksRateLimitError.prototype);
  }
}

/**
 * Custom Error for Google Books HTTP 503 Service Unavailable / Backend Error
 */
export class GoogleBooksServiceUnavailableError extends Error {
  public readonly statusCode = 503;
  public readonly isServiceUnavailable = true;

  constructor(
    message: string = 'El servicio de Google Books API se encuentra temporalmente no disponible o sobrecargado (HTTP 503). Por favor reintenta en unos segundos o ingresa los datos manualmente.'
  ) {
    super(message);
    this.name = 'GoogleBooksServiceUnavailableError';
    Object.setPrototypeOf(this, GoogleBooksServiceUnavailableError.prototype);
  }
}

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

export interface OpenLibraryBookData {
  title?: string;
  authors?: Array<{ name: string; url?: string }>;
  publishers?: Array<{ name: string }>;
  publish_date?: string;
  number_of_pages?: number;
  classifications?: {
    dewey_decimal_class?: string[] | string;
    lc_classifications?: string[];
  };
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  notes?: string;
  excerpts?: Array<{ text: string; comment?: string }>;
  subjects?: Array<{ name: string; url?: string }>;
}

export interface OpenLibrarySearchDoc {
  title?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  ddc?: string[];
  subject?: string[];
  language?: string[];
}

/**
 * Unified BookData structure returned by cascade search
 */
export interface BookData {
  isbn: string;
  title: string;
  creator: string; // authors as a formatted string (e.g. "Gabriel García Márquez")
  authors: string[];
  publisher: string;
  publishYear: number;
  coverUrl: string;
  description: string; // Sinopsis / summary cleaned of HTML
  cddCategory: string; // Dewey Decimal Classification from Open Library, or ""
  subjects: string[];
  language: string;
  pageCount?: number;
  suggestedDeweyClass: string;
  suggestedDeweyCode: string;
  source: 'cascade' | 'google_books' | 'open_library' | 'manual';
  warningMessage?: string;
}

// Backwards-compatible type alias
export type NormalizedBookMetadata = BookData & {
  author: string; // alias for creator
};

/**
 * Convert 13-digit ISBN to 10-digit ISBN if possible
 */
export function convertIsbn13To10(isbn13: string): string | null {
  const clean = isbn13.replace(/[^0-9X]/gi, '').trim();
  if (clean.length !== 13 || !clean.startsWith('978')) return null;
  const core = clean.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(core[i], 10) * (10 - i);
  }
  const rem = 11 - (sum % 11);
  const check = rem === 10 ? 'X' : rem === 11 ? '0' : String(rem);
  return core + check;
}

/**
 * Convert 10-digit ISBN to 13-digit ISBN
 */
export function convertIsbn10To13(isbn10: string): string | null {
  const clean = isbn10.replace(/[^0-9X]/gi, '').trim();
  if (clean.length !== 10) return null;
  const core = '978' + clean.substring(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const rem = (10 - (sum % 10)) % 10;
  return core + String(rem);
}

/**
 * Infer Dewey class and notation based on book categories, title, and language
 */
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
      return { deweyClass: '800', deweyCode: '860' }; // Literaturas española y portuguesa
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
    return { deweyClass: '900', deweyCode: '980' }; // Historia de América del Sur
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

/**
 * Strips HTML tags and unescapes common HTML entities from descriptions/synopsis
 */
export function cleanDescription(rawText?: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans and extracts high resolution image link from Google Books or Open Library
 */
export function getBestCoverImage(imageLinks?: GoogleBookVolumeInfo['imageLinks']): string {
  if (!imageLinks) return '';
  const url =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    '';

  if (!url) return '';
  // Convert http to https and remove edge curl if present
  return url.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
}

/**
 * Normalizes ISO language code to 3-letter standard (spa, eng, fre, etc.)
 */
export function normalizeLanguage(lang?: string): string {
  if (!lang) return 'spa';
  const clean = lang.toLowerCase().trim();
  if (clean === 'es' || clean === 'es-es' || clean === 'es-419' || clean === 'spa') return 'spa';
  if (clean === 'en' || clean === 'en-us' || clean === 'en-gb' || clean === 'eng') return 'eng';
  if (clean === 'fr' || clean === 'fre' || clean === 'fra') return 'fre';
  if (clean === 'pt' || clean === 'pt-br' || clean === 'por') return 'por';
  return clean.slice(0, 3);
}

/**
 * Helper to execute a single fetch with a timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 7000): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, { signal: controller?.signal });
    return res;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Sleep helper for retry backoff
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resilient helper to query Google Books API with automatic retries on 503/429/500
 * and fallback without API key.
 */
async function fetchGoogleBooksByISBN(cleanIsbn: string): Promise<{ data: Partial<BookData> | null; errorStatus?: number }> {
  const apiKey = getGoogleBooksApiKey();
  const alternateIsbn = cleanIsbn.length === 13 ? convertIsbn13To10(cleanIsbn) : convertIsbn10To13(cleanIsbn);
  const isbnsToTry = [cleanIsbn, ...(alternateIsbn ? [alternateIsbn] : [])];

  let lastStatus: number | undefined = undefined;

  for (const targetIsbn of isbnsToTry) {
    // Attempt sequence:
    // 1. With API key (if configured)
    // 2. Fallback: without API key (in case key has transient 503/quota issues)
    const urlCandidates: string[] = [];
    if (apiKey) {
      urlCandidates.push(`https://www.googleapis.com/books/v1/volumes?q=isbn:${targetIsbn}&key=${encodeURIComponent(apiKey.trim())}`);
    }
    urlCandidates.push(`https://www.googleapis.com/books/v1/volumes?q=isbn:${targetIsbn}`);

    for (const url of urlCandidates) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await fetchWithTimeout(url, 6000);

          if (!response.ok) {
            lastStatus = response.status;
            if (response.status === 429) {
              // Rate limit: wait briefly before retrying or next candidate
              if (attempts < maxAttempts) {
                await sleep(500);
                continue;
              }
              break;
            }
            if (response.status === 503 || response.status === 500 || response.status === 502) {
              // Service unavailable / transient backend error: retry once
              if (attempts < maxAttempts) {
                await sleep(600);
                continue;
              }
              break;
            }
            // 403 Forbidden or 400 Bad request -> try candidate without key
            break;
          }

          const json = await response.json();
          if (json.items && json.items.length > 0) {
            const item: GoogleBookItem = json.items[0];
            const info = item.volumeInfo || {};

            // Extract resolved ISBN from identifiers if present
            let resolvedIsbn = targetIsbn;
            if (info.industryIdentifiers && info.industryIdentifiers.length > 0) {
              const isbn13 = info.industryIdentifiers.find((id) => id.type === 'ISBN_13');
              const isbn10 = info.industryIdentifiers.find((id) => id.type === 'ISBN_10');
              resolvedIsbn = isbn13?.identifier || isbn10?.identifier || targetIsbn;
            }

            // Parse publication year
            let publicationYear = new Date().getFullYear();
            if (info.publishedDate) {
              const yearMatch = info.publishedDate.match(/\b\d{4}\b/);
              if (yearMatch) {
                publicationYear = parseInt(yearMatch[0], 10);
              }
            }

            // Parse subjects & categories
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
            const authorList = info.authors && info.authors.length > 0 ? info.authors : ['Autor Desconocido'];
            const creator = authorList.join(', ');
            const normLang = normalizeLanguage(info.language);
            const { deweyClass, deweyCode } = inferDeweyFromGoogleBook(info.categories, fullTitle, normLang);

            return {
              data: {
                isbn: resolvedIsbn,
                title: fullTitle,
                creator,
                authors: authorList,
                publisher: info.publisher || 'Editorial no especificada',
                publishYear,
                coverUrl: getBestCoverImage(info.imageLinks),
                description: cleanDescription(info.description),
                subjects: subjects.slice(0, 6),
                language: normLang,
                pageCount: info.pageCount,
                suggestedDeweyClass: deweyClass,
                suggestedDeweyCode: deweyCode,
                source: 'google_books',
              },
            };
          }
          // Zero items in this candidate, try next candidate
          break;
        } catch {
          // Network error or timeout: retry once if attempts left
          if (attempts < maxAttempts) {
            await sleep(400);
          }
        }
      }
    }
  }

  return { data: null, errorStatus: lastStatus };
}

/**
 * Open Library result interface
 */
interface OpenLibraryResult {
  found: boolean;
  cddCategory: string;
  data?: Partial<BookData>;
  raw?: OpenLibraryBookData;
}

/**
 * Multi-tier Open Library lookup (jscmd=data + search.json fallback)
 */
async function fetchOpenLibraryByISBN(cleanIsbn: string, timeoutMs: number = 7000): Promise<OpenLibraryResult> {
  const alternateIsbn = cleanIsbn.length === 13 ? convertIsbn13To10(cleanIsbn) : convertIsbn10To13(cleanIsbn);
  const isbnsToTry = [cleanIsbn, ...(alternateIsbn ? [alternateIsbn] : [])];

  for (const targetIsbn of isbnsToTry) {
    // 1. Try Open Library jscmd=data endpoint
    try {
      const endpoint = `https://openlibrary.org/api/books?bibkeys=ISBN:${targetIsbn}&format=json&jscmd=data`;
      const response = await fetchWithTimeout(endpoint, timeoutMs);

      if (response.ok) {
        const json = await response.json();
        const key = `ISBN:${targetIsbn}`;
        const book: OpenLibraryBookData | undefined = json[key];

        if (book) {
          // Extract Dewey Decimal Classification (cddCategory)
          let cddCategory = '';
          const deweyField = book.classifications?.dewey_decimal_class;

          if (Array.isArray(deweyField) && deweyField.length > 0) {
            cddCategory = String(deweyField[0]).trim();
          } else if (typeof deweyField === 'string' && deweyField.trim() !== '') {
            cddCategory = deweyField.trim();
          }

          return {
            found: true,
            cddCategory,
            raw: book,
          };
        }
      }
    } catch {
      // Fall through to search.json
    }

    // 2. Try Open Library search.json endpoint fallback
    try {
      const searchEndpoint = `https://openlibrary.org/search.json?isbn=${targetIsbn}`;
      const searchResponse = await fetchWithTimeout(searchEndpoint, timeoutMs);

      if (searchResponse.ok) {
        const searchJson = await searchResponse.json();
        if (searchJson.docs && searchJson.docs.length > 0) {
          const doc: OpenLibrarySearchDoc = searchJson.docs[0];
          let cddCategory = '';
          if (doc.ddc && doc.ddc.length > 0) {
            cddCategory = String(doc.ddc[0]).trim();
          }

          const authorNames = doc.author_name && doc.author_name.length > 0 ? doc.author_name : ['Autor Desconocido'];
          const creator = authorNames.join(', ');
          const publisherName = doc.publisher && doc.publisher.length > 0 ? doc.publisher[0] : 'Editorial no especificada';
          const publishYear = doc.first_publish_year || new Date().getFullYear();
          const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '';

          let deweyCode = '860';
          let deweyClass = '800';
          if (cddCategory) {
            const cleanDewey = cddCategory.split('.')[0].replace(/[^0-9]/g, '');
            if (cleanDewey) {
              deweyCode = cleanDewey.padEnd(3, '0').slice(0, 3);
              deweyClass = deweyCode.charAt(0) + '00';
            }
          } else {
            const inferred = inferDeweyFromGoogleBook(doc.subject || [], doc.title || '', 'spa');
            deweyCode = inferred.deweyCode;
            deweyClass = inferred.deweyClass;
          }

          const partialData: Partial<BookData> = {
            isbn: targetIsbn,
            title: doc.title || 'Sin Título',
            creator,
            authors: authorNames,
            publisher: publisherName,
            publishYear,
            coverUrl,
            description: `Obra catalogada vía Open Library: ${doc.title || targetIsbn}.`,
            cddCategory,
            subjects: doc.subject && doc.subject.length > 0 ? doc.subject.slice(0, 6) : ['Literatura General', 'Biblioteca Escolar'],
            language: 'spa',
            pageCount: doc.number_of_pages_median,
            suggestedDeweyClass: deweyClass,
            suggestedDeweyCode: deweyCode,
            source: 'open_library',
          };

          return {
            found: true,
            cddCategory,
            data: partialData,
          };
        }
      }
    } catch {
      // Ignore
    }
  }

  return { found: false, cddCategory: '' };
}

/**
 * Executes a resilient concurrent waterfall/cascade search querying both Google Books
 * and Open Library simultaneously via Promise.all, returning a unified BookData object.
 *
 * @param isbn - The 10 or 13-digit ISBN string
 * @returns Promise<BookData | null> - Merged book metadata or null if not found
 */
export async function fetchBookDataCascade(isbn: string): Promise<BookData | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').trim();
  if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
    throw new Error('El ISBN debe contener 10 o 13 dígitos válidos.');
  }

  // Execute both requests concurrently using Promise.all
  const [googleRes, openLibResult] = await Promise.all([
    fetchGoogleBooksByISBN(cleanIsbn),
    fetchOpenLibraryByISBN(cleanIsbn, 6000),
  ]);

  const googleResult = googleRes.data;
  const googleStatus = googleRes.errorStatus;

  // Case 1: Google Books found the book (Primary metadata provider)
  if (googleResult && googleResult.title) {
    const cddCategory = openLibResult.cddCategory || '';

    // If Open Library provided a Dewey classification, use its 3-digit class as suggested code
    let finalDeweyCode = googleResult.suggestedDeweyCode || '860';
    let finalDeweyClass = googleResult.suggestedDeweyClass || '800';

    if (cddCategory) {
      const cleanDewey = cddCategory.split('.')[0].replace(/[^0-9]/g, '');
      if (cleanDewey) {
        finalDeweyCode = cleanDewey.padEnd(3, '0').slice(0, 3);
        finalDeweyClass = finalDeweyCode.charAt(0) + '00';
      }
    }

    // Cover fallback from Open Library if Google Books lacked cover
    let finalCoverUrl = googleResult.coverUrl || '';
    if (!finalCoverUrl && openLibResult.raw?.cover) {
      finalCoverUrl =
        openLibResult.raw.cover.large ||
        openLibResult.raw.cover.medium ||
        openLibResult.raw.cover.small ||
        '';
    } else if (!finalCoverUrl && openLibResult.data?.coverUrl) {
      finalCoverUrl = openLibResult.data.coverUrl;
    }

    // Description / Sinopsis fallback
    let finalDescription = googleResult.description || '';
    if (!finalDescription && openLibResult.raw) {
      if (openLibResult.raw.notes) {
        finalDescription = cleanDescription(openLibResult.raw.notes);
      } else if (openLibResult.raw.excerpts && openLibResult.raw.excerpts.length > 0) {
        finalDescription = cleanDescription(openLibResult.raw.excerpts[0].text);
      }
    }
    if (!finalDescription && openLibResult.data?.description) {
      finalDescription = openLibResult.data.description;
    }
    if (!finalDescription) {
      finalDescription = `Obra catalogada vía sistema ISBN: ${googleResult.title}.`;
    }

    const unifiedBook: BookData = {
      isbn: googleResult.isbn || cleanIsbn,
      title: googleResult.title,
      creator: googleResult.creator || 'Autor Desconocido',
      authors: googleResult.authors || ['Autor Desconocido'],
      publisher: googleResult.publisher || 'Editorial no especificada',
      publishYear: googleResult.publishYear || new Date().getFullYear(),
      coverUrl: finalCoverUrl,
      description: finalDescription,
      cddCategory, // Open Library Dewey category (or "")
      subjects: googleResult.subjects && googleResult.subjects.length > 0 ? googleResult.subjects : ['Literatura General', 'Biblioteca Escolar'],
      language: googleResult.language || 'spa',
      pageCount: googleResult.pageCount || openLibResult.raw?.number_of_pages || openLibResult.data?.pageCount,
      suggestedDeweyClass: finalDeweyClass,
      suggestedDeweyCode: finalDeweyCode,
      source: cddCategory ? 'cascade' : 'google_books',
    };

    return unifiedBook;
  }

  // Case 2: Google Books failed or had 0 results, but Open Library found the book (Fallback provider)
  if (openLibResult.found) {
    if (openLibResult.data) {
      return {
        ...openLibResult.data,
        isbn: cleanIsbn,
        title: openLibResult.data.title || 'Sin Título',
        creator: openLibResult.data.creator || 'Autor Desconocido',
        authors: openLibResult.data.authors || ['Autor Desconocido'],
        publisher: openLibResult.data.publisher || 'Editorial no especificada',
        publishYear: openLibResult.data.publishYear || new Date().getFullYear(),
        coverUrl: openLibResult.data.coverUrl || '',
        description: openLibResult.data.description || `Obra catalogada vía Open Library: ${cleanIsbn}.`,
        cddCategory: openLibResult.cddCategory || '',
        subjects: openLibResult.data.subjects || ['Literatura General'],
        language: openLibResult.data.language || 'spa',
        suggestedDeweyClass: openLibResult.data.suggestedDeweyClass || '800',
        suggestedDeweyCode: openLibResult.data.suggestedDeweyCode || '860',
        source: 'open_library',
      };
    }

    if (openLibResult.raw) {
      const ol = openLibResult.raw;
      const authorNames = ol.authors && ol.authors.length > 0 ? ol.authors.map((a) => a.name) : ['Autor Desconocido'];
      const creator = authorNames.join(', ');
      const publisherName = ol.publishers && ol.publishers.length > 0 ? ol.publishers[0].name : 'Editorial no especificada';

      let publishYear = new Date().getFullYear();
      if (ol.publish_date) {
        const match = ol.publish_date.match(/\b\d{4}\b/);
        if (match) publishYear = parseInt(match[0], 10);
      }

      const coverUrl = ol.cover?.large || ol.cover?.medium || ol.cover?.small || '';
      const cddCategory = openLibResult.cddCategory || '';

      let deweyCode = '860';
      let deweyClass = '800';
      if (cddCategory) {
        const cleanDewey = cddCategory.split('.')[0].replace(/[^0-9]/g, '');
        if (cleanDewey) {
          deweyCode = cleanDewey.padEnd(3, '0').slice(0, 3);
          deweyClass = deweyCode.charAt(0) + '00';
        }
      } else {
        const inferred = inferDeweyFromGoogleBook([], ol.title || '', 'spa');
        deweyCode = inferred.deweyCode;
        deweyClass = inferred.deweyClass;
      }

      let description = '';
      if (ol.notes) {
        description = cleanDescription(ol.notes);
      } else if (ol.excerpts && ol.excerpts.length > 0) {
        description = cleanDescription(ol.excerpts[0].text);
      } else {
        description = `Obra catalogada vía Open Library: ${ol.title || cleanIsbn}.`;
      }

      const subjects = ol.subjects && ol.subjects.length > 0
        ? ol.subjects.slice(0, 6).map((s) => s.name)
        : ['Literatura General', 'Biblioteca Escolar'];

      const unifiedBook: BookData = {
        isbn: cleanIsbn,
        title: ol.title || 'Sin Título',
        creator,
        authors: authorNames,
        publisher: publisherName,
        publishYear,
        coverUrl,
        description,
        cddCategory,
        subjects,
        language: 'spa',
        pageCount: ol.number_of_pages,
        suggestedDeweyClass: deweyClass,
        suggestedDeweyCode: deweyCode,
        source: 'open_library',
      };

      return unifiedBook;
    }
  }

  // Case 3: Neither service found metadata, but Google returned 503 / 429
  if (googleStatus === 429) {
    throw new GoogleBooksRateLimitError();
  }
  if (googleStatus === 503) {
    throw new GoogleBooksServiceUnavailableError();
  }

  return null;
}

/**
 * Backwards-compatible function matching existing codebase calls
 */
export async function searchBookByISBN(rawIsbn: string): Promise<NormalizedBookMetadata | null> {
  const result = await fetchBookDataCascade(rawIsbn);
  if (!result) return null;

  return {
    ...result,
    author: result.creator,
  };
}
