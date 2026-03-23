import {useState, useEffect, useRef, useCallback} from 'react';
import {roomStore, useRoomStore} from '../store';

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

const DATA_DIR = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';

// Module-level singleton: ensures the search table is created exactly once.
let searchTablePromise: Promise<void> | null = null;

function ensureSearchTable(): Promise<void> {
  if (!searchTablePromise) {
    searchTablePromise = (async () => {
      const db = roomStore.getState().db;
      await db.createTableFromQuery(
        'school_directory',
        `SELECT ncessch, sch_name, state_code, sch_type, sch_level, charter, school_year
         FROM read_parquet('${DATA_DIR}/directory.parquet')
         WHERE school_year_no = 1`,
        {replace: true}
      );
    })();
  }
  return searchTablePromise;
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
  const initialized = useRoomStore(state => state.room.initialized);

  const sanitizeQuery = useCallback((query: string): string => {
    return query.replace(/'/g, "''");
  }, []);

  const performSearch = useCallback(
    async (query: string, searchFilters: SearchFilters): Promise<SchoolSearchResult[]> => {
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

      const connector = roomStore.getState().db.connector;
      const table = await connector.query(`
        SELECT ncessch, sch_name, state_code, sch_type, sch_level, charter, school_year
        FROM school_directory
        ${whereClause}
        ORDER BY sch_name
        LIMIT 50
      `);

      // Columnar access to avoid Arrow proxy issues
      const fields = table.schema.fields;
      const rows: SchoolSearchResult[] = [];
      for (let i = 0; i < table.numRows; i++) {
        const row: any = {};
        for (const field of fields) {
          const col = table.getChild(field.name);
          if (col) {
            const val = col.get(i);
            row[field.name] = typeof val === 'bigint' ? Number(val) : val;
          }
        }
        rows.push(row);
      }
      return rows;
    },
    [sanitizeQuery]
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const hasFilters =
      filters.stateCode || filters.schoolType || filters.schoolLevel || filters.charter;
    if (searchQuery.length < 3 && !hasFilters) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (!initialized) return;

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setError(null);
        await ensureSearchTable();
        const searchResults = await performSearch(searchQuery, filters);
        setResults(searchResults);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filters, debounceMs, initialized, performSearch]);

  return {results, isSearching, error};
}
