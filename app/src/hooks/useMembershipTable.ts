import {useState, useEffect, useRef} from 'react';
import {roomStore, useRoomStore} from '../store';
import {AVAILABLE_YEARS} from '../constants';

const DATA_DIR = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';

/** Module-level promise cache to prevent concurrent CREATE TABLE write-write conflicts */
const tableCreationCache = new Map<string, Promise<string>>();

function generateFilePaths(stateCode: string, years: readonly string[]): string {
  return years
    .map(
      year => `'${DATA_DIR}/membership/school_year=${year}/state_leaid=${stateCode}/data_0.parquet'`
    )
    .join(', ');
}

function isYearNotAvailableError(error: any): boolean {
  const msg = error?.message || error?.toString() || '';
  return msg.includes('No files found that match the pattern') && msg.includes('school_year=');
}

async function createTable(cacheKey: string, tableName: string, query: string): Promise<string> {
  const existing = tableCreationCache.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const db = roomStore.getState().db;
    await db.createTableFromQuery(tableName, query, {replace: true});
    return tableName;
  })();

  tableCreationCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    tableCreationCache.delete(cacheKey);
    throw error;
  }
}

/**
 * Hook that creates an in-memory membership table for a school or district.
 * Returns the table name and readiness state for use with useSql.
 */
export function useMembershipTable(
  entityType: 'school' | 'district',
  code: string,
  options: {schoolYear?: string} = {}
) {
  const [tableName, setTableName] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearNotAvailable, setYearNotAvailable] = useState(false);
  const [requestedYear, setRequestedYear] = useState<string | undefined>();
  const initialized = useRoomStore(state => state.room.initialized);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!code || !initialized) return;

    setIsReady(false);
    setError(null);
    setYearNotAvailable(false);
    setRequestedYear(undefined);

    const stateCode = code.substring(0, 2);
    const years = options.schoolYear ? [options.schoolYear] : AVAILABLE_YEARS;
    const filePaths = generateFilePaths(stateCode, years);

    const prefix = entityType === 'school' ? 'school_membership' : 'district_membership';
    const name = `${prefix}_${code}`;
    const cacheKey = `${name}_${options.schoolYear || 'all'}`;

    const filterCol = entityType === 'school' ? 'ncessch' : 'leaid';
    const yearFilter = options.schoolYear ? `AND school_year = '${options.schoolYear}'` : '';
    const query = `SELECT * FROM read_parquet([${filePaths}]) WHERE ${filterCol} = '${code}' ${yearFilter}`;

    createTable(cacheKey, name, query)
      .then(tbl => {
        if (mountedRef.current) {
          setTableName(tbl);
          setIsReady(true);
        }
      })
      .catch(err => {
        if (!mountedRef.current) return;
        if (isYearNotAvailableError(err) && options.schoolYear) {
          setYearNotAvailable(true);
          setRequestedYear(options.schoolYear);
          setError(`Year ${options.schoolYear} not available`);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to create table');
        }
      });
  }, [entityType, code, options.schoolYear, initialized]);

  return {
    tableName,
    isReady,
    error,
    yearNotAvailable,
    requestedYear,
    availableYears: [...AVAILABLE_YEARS],
  };
}

/**
 * Hook that creates a historical membership table for a school (all years).
 * Gated on `enabled` to defer loading until primary data is ready.
 */
export function useHistoricalMembershipTable(schoolCode: string, enabled: boolean = true) {
  const [tableName, setTableName] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRoomStore(state => state.room.initialized);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!schoolCode || schoolCode.length !== 12 || !enabled || !initialized) {
      return;
    }

    setIsReady(false);
    setError(null);

    const stateCode = schoolCode.substring(0, 2);
    const filePaths = generateFilePaths(stateCode, AVAILABLE_YEARS);
    const name = `school_membership_${schoolCode}_historical`;
    const cacheKey = `historical_${schoolCode}`;
    const query = `SELECT * FROM read_parquet([${filePaths}]) WHERE ncessch = '${schoolCode}' ORDER BY school_year DESC`;

    createTable(cacheKey, name, query)
      .then(tbl => {
        if (mountedRef.current) {
          setTableName(tbl);
          setIsReady(true);
        }
      })
      .catch(err => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to create historical table');
        }
      });
  }, [schoolCode, enabled, initialized]);

  return {tableName, isReady, error};
}
