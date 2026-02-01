import {useState, useEffect, useRef, useCallback} from 'react';
import {duckDBService} from '../services/duckdb';

export interface SchoolSearchResult {
  ncessch: string;
  sch_name: string;
  lea_name: string;
  city: string;
  state_name: string;
  state_code: string;
  sch_type: number;
  sch_level: string;
  charter: string;
  school_year: string;
}

export interface SearchFilters {
  stateCode?: string;
  schoolType?: number;
  schoolLevel?: string;
  charter?: string;
}

export function useSchoolSearch(
  searchQuery: string,
  filters: SearchFilters = {},
  debounceMs: number = 500
) {
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
    // Create a local table with the most recent school data including filterable fields
    const createTableQuery = `
      CREATE OR REPLACE TABLE school_directory AS
      SELECT
        ncessch,
        sch_name,
        state_code,
        sch_type,
        sch_level,
        charter,
        school_year
      FROM read_parquet('${dataDirectory}/directory.parquet')
      WHERE school_year_no = 1
    `;

    await duckDBService.query(createTableQuery);
  }, [dataDirectory]);

  const performSearch = useCallback(
    async (query: string, searchFilters: SearchFilters): Promise<SchoolSearchResult[]> => {
      // Build filter conditions
      const filterConditions: string[] = [];

      if (query.length >= 3) {
        filterConditions.push(`LOWER(sch_name) LIKE LOWER('%${sanitizeQuery(query)}%')`);
      }

      if (searchFilters.stateCode) {
        filterConditions.push(`state_code = '${sanitizeQuery(searchFilters.stateCode)}'`);
      }

      if (searchFilters.schoolType) {
        filterConditions.push(`sch_type = ${searchFilters.schoolType}`);
      }

      if (searchFilters.schoolLevel) {
        filterConditions.push(`sch_level = '${sanitizeQuery(searchFilters.schoolLevel)}'`);
      }

      if (searchFilters.charter) {
        filterConditions.push(`charter = '${sanitizeQuery(searchFilters.charter)}'`);
      }

      const whereClause =
        filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : '';

      const searchQuerySQL = `
      SELECT
        ncessch,
        sch_name,
        state_code,
        sch_type,
        sch_level,
        charter,
        school_year
      FROM school_directory
      ${whereClause}
      ORDER BY sch_name
      LIMIT 50
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

    // If query is less than 3 characters and no filters, clear results
    const hasFilters =
      filters.stateCode || filters.schoolType || filters.schoolLevel || filters.charter;
    if (searchQuery.length < 3 && !hasFilters) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce the search
    setIsSearching(true);
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
        const searchResults = await performSearch(searchQuery, filters);
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
  }, [searchQuery, filters, debounceMs, createSearchTable, performSearch]);

  return {
    results,
    isSearching,
    error,
  };
}
