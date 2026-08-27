import { useState, useCallback } from 'react';
import { 
  fetchBookDataCascade, 
  BookData, 
  GoogleBooksRateLimitError,
  GoogleBooksServiceUnavailableError 
} from './googleBooks';

export interface UseBookDataCascadeResult {
  isLoading: boolean;
  data: BookData | null;
  error: string | null;
  isRateLimited: boolean;
  isServiceUnavailable: boolean;
  search: (isbn: string) => Promise<BookData | null>;
  reset: () => void;
}

/**
 * Custom React Hook to execute waterfall/cascade ISBN book metadata lookup
 * 
 * Manages loading, rate-limit detection, service availability, errors, and merged book data state.
 */
export function useBookDataCascade(): UseBookDataCascadeResult {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<BookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState(false);

  const reset = useCallback(() => {
    setIsLoading(false);
    setData(null);
    setError(null);
    setIsRateLimited(false);
    setIsServiceUnavailable(false);
  }, []);

  const search = useCallback(async (rawIsbn: string): Promise<BookData | null> => {
    setIsLoading(true);
    setError(null);
    setIsRateLimited(false);
    setIsServiceUnavailable(false);

    try {
      const result = await fetchBookDataCascade(rawIsbn);
      setData(result);
      if (!result) {
        setError(`No se encontraron registros para el ISBN "${rawIsbn}" en los catálogos en línea (Google Books ni Open Library).`);
      }
      return result;
    } catch (err: unknown) {
      if (err instanceof GoogleBooksRateLimitError) {
        setIsRateLimited(true);
        setError(err.message);
      } else if (err instanceof GoogleBooksServiceUnavailableError) {
        setIsServiceUnavailable(true);
        setError(err.message);
      } else {
        const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado al consultar los servicios bibliográficos.';
        setError(message);
      }
      setData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    data,
    error,
    isRateLimited,
    isServiceUnavailable,
    search,
    reset,
  };
}
export default useBookDataCascade;
