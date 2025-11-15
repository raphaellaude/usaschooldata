import {useState, useEffect, useRef, useCallback} from 'react';
import {duckDBService} from '../services/duckdb';

export interface SchoolSearchResult {
  ncessch: string;
  sch_name: string;
  lea_name: string;
  city: string;
  state_name: string;
  school_year: string;
}

export function useSchoolSearch(searchQuery: string, isDbReady: boolean, debounceMs: number = 500) {
  const [results, setResults] = useState<SchoolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryInFlightRef = useRef(false);
  const localTableCreated = useRef(false);
  const dataDirectory = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';

  const sanitizeQuery = useCallback((query: string): string => {
    // Escape single quotes to prevent SQL injection
    return query.replace(/'/g, "''");
  }, []);

  const createSearchTable = useCallback(async () => {
    // Create a local table with the most recent school data
    const createTableQuery = `
      CREATE OR REPLACE TABLE school_directory AS
      SELECT
        ncessch,
        sch_name,
        school_year
      FROM read_parquet('${dataDirectory}/directory.parquet')
      WHERE school_year_no = 1
    `;

    await duckDBService.query(createTableQuery);
  }, [dataDirectory]);

  const performSearch = useCallback(
    async (query: string): Promise<SchoolSearchResult[]> => {
      // Use DuckDB text search with LIKE for partial matching
      // Search across school name, district name, and city
      const searchQuerySQL = `
      SELECT
        ncessch,
        sch_name,
        school_year
      FROM school_directory
      WHERE
        LOWER(sch_name) LIKE LOWER('%${sanitizeQuery(query)}%')
      ORDER BY sch_name
      LIMIT 10
    `;

      const table = await duckDBService.query(searchQuerySQL);
      return duckDBService.tableToArray(table) as SchoolSearchResult[];
    },
    [sanitizeQuery]
  );

  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel any in-flight query
    if (queryInFlightRef.current) {
      duckDBService.cancelPendingQuery().then(cancelled => {
        if (cancelled) {
          console.log('Cancelled previous search query');
        }
      });
      queryInFlightRef.current = false;
    }

    // If query is less than 3 characters, clear results
    if (searchQuery.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Show searching state if query is valid length (even if DB not ready yet)
    setIsSearching(true);

    // If DB is not ready yet, just show loading state
    if (!isDbReady) {
      return;
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setError(null);

        // Create local table on first search (or if not already created)
        if (!localTableCreated.current) {
          await createSearchTable();
          localTableCreated.current = true;
        }

        // Mark that a query is now in-flight
        queryInFlightRef.current = true;

        // Perform the search
        const searchResults = await performSearch(searchQuery);
        setResults(searchResults);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        queryInFlightRef.current = false;
        setIsSearching(false);
      }
    }, debounceMs);

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (queryInFlightRef.current) {
        duckDBService.cancelPendingQuery();
        queryInFlightRef.current = false;
      }
    };
  }, [searchQuery, debounceMs, isDbReady, createSearchTable, performSearch]);

  return {
    results,
    isSearching,
    error,
  };
}
