import {useState, useEffect, useRef} from 'react';
import {directoryClient} from '../services/apiClient';

export interface SchoolSearchResult {
  ncessch: string;
  sch_name: string;
  school_year: string;
}

export function useSchoolSearch(searchQuery: string, debounceMs: number = 500) {
  const [results, setResults] = useState<SchoolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousQueryRef = useRef<string>('');
  const previousResultsRef = useRef<SchoolSearchResult[]>([]);

  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If query is less than 3 characters, clear results
    if (searchQuery.length < 3) {
      setResults([]);
      setIsSearching(false);
      previousQueryRef.current = '';
      previousResultsRef.current = [];
      return;
    }

    // Debounce the search
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setError(null);

        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();

        // Call the API
        const response = await directoryClient.getMatchingSchools(
          {searchTerm: searchQuery},
          {signal: abortControllerRef.current.signal}
        );

        // Transform the response to match our interface
        const searchResults: SchoolSearchResult[] = response.results.map(result => ({
          ncessch: result.ncessch,
          sch_name: result.schName,
          school_year: result.schoolYear,
        }));

        setResults(searchResults);
        previousQueryRef.current = searchQuery;
        previousResultsRef.current = searchResults;
      } catch (err) {
        // Don't set error if the request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');

        // If this is a "not found" error and the current query extends the previous query,
        // keep showing the previous results
        const isNotFoundError = err instanceof Error && err.message.includes('[not_found]');
        const currentQueryExtendsPrevious =
          previousQueryRef.current &&
          searchQuery.toLowerCase().startsWith(previousQueryRef.current.toLowerCase());

        if (
          isNotFoundError &&
          currentQueryExtendsPrevious &&
          previousResultsRef.current.length > 0
        ) {
          // Keep the previous results
          setResults(previousResultsRef.current);
        } else {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, debounceMs]);

  return {
    results,
    isSearching,
    error,
  };
}
