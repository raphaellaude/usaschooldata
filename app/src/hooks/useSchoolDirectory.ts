import {useState, useEffect} from 'react';
import {roomStore} from '../store';
import {useDuckDB} from './useDuckDB';

const SY_STATUS_VALUES = [
  'Open', // 1
  'Closed', // 2
  'New', // 3
  'Added', // 4
  'Changed Boundary/Agency', // 5
  'Inactive', // 6
  'Future', // 7
  'Reopened', // 8
];

const SCH_TYPE_VALUES = [
  'Regular School', // 1
  'Special Education School', // 2
  'Career and Technical School', // 3
  'Alternative Education School', // 4
];

export interface SchoolDirectoryInfo {
  ncessch: string;
  sch_name: string;
  school_year: string;
  sch_level: string;
  sch_type: string;
  sy_status: string;
  sy_status_updated: string;
  charter: string;
  state_code: string;
  state_leaid: string;
  grade_pk?: string | number | null;
  grade_kg?: string | number | null;
  grade_01?: string | number | null;
  grade_02?: string | number | null;
  grade_03?: string | number | null;
  grade_04?: string | number | null;
  grade_05?: string | number | null;
  grade_06?: string | number | null;
  grade_07?: string | number | null;
  grade_08?: string | number | null;
  grade_09?: string | number | null;
  grade_10?: string | number | null;
  grade_11?: string | number | null;
  grade_12?: string | number | null;
  grade_13?: string | number | null;
  grade_ug?: string | number | null;
  grade_ae?: string | number | null;
  [key: string]: string | number | null | undefined;
}

/** Coerce Arrow cell values (DecimalBigNum, bigint) to plain JS values */
function coerceArrowValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'bigint') return Number(value);
  if (ArrayBuffer.isView(value)) return Number(String(value));
  return value;
}

/**
 * Extract a scalar value from an Arrow table using columnar access.
 */
function getScalar(table: any, rowIndex: number, columnName: string): any {
  const col = table.getChild(columnName);
  if (!col) return null;
  return coerceArrowValue(col.get(rowIndex));
}

export function useSchoolDirectory(ncessch: string | undefined, schoolYear: string | undefined) {
  const [directoryInfo, setDirectoryInfo] = useState<SchoolDirectoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataDirectory = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';
  const {isInitialized} = useDuckDB();

  useEffect(() => {
    setDirectoryInfo(null);
    setError(null);

    if (!ncessch || !schoolYear || !isInitialized) {
      return;
    }

    async function fetchDirectoryInfo() {
      if (!ncessch || !schoolYear) return;

      setIsLoading(true);
      try {
        const connector = roomStore.getState().db.connector;
        const table = await connector.query(`
          SELECT *
          FROM read_parquet('${dataDirectory}/directory.parquet')
          WHERE ncessch = '${ncessch.replace(/'/g, "''")}'
            AND school_year = '${schoolYear.replace(/'/g, "''")}'
          LIMIT 1
        `);

        if (table.numRows === 0) {
          setDirectoryInfo(null);
          return;
        }

        const results = {
          sch_name: getScalar(table, 0, 'sch_name'),
          ncessch: getScalar(table, 0, 'ncessch'),
          school_year: getScalar(table, 0, 'school_year'),
          sch_level: getScalar(table, 0, 'sch_level'),
          sch_type: SCH_TYPE_VALUES[getScalar(table, 0, 'sch_type') - 1],
          sy_status: SY_STATUS_VALUES[getScalar(table, 0, 'sy_status') - 1],
          sy_status_updated: SY_STATUS_VALUES[getScalar(table, 0, 'sy_status_updated') - 1],
          charter: getScalar(table, 0, 'charter'),
          state_code: getScalar(table, 0, 'state_code'),
          state_leaid: getScalar(table, 0, 'state_leaid'),
          grade_pk: getScalar(table, 0, 'grade_pk'),
          grade_kg: getScalar(table, 0, 'grade_kg'),
          grade_01: getScalar(table, 0, 'grade_01'),
          grade_02: getScalar(table, 0, 'grade_02'),
          grade_03: getScalar(table, 0, 'grade_03'),
          grade_04: getScalar(table, 0, 'grade_04'),
          grade_05: getScalar(table, 0, 'grade_05'),
          grade_06: getScalar(table, 0, 'grade_06'),
          grade_07: getScalar(table, 0, 'grade_07'),
          grade_08: getScalar(table, 0, 'grade_08'),
          grade_09: getScalar(table, 0, 'grade_09'),
          grade_10: getScalar(table, 0, 'grade_10'),
          grade_11: getScalar(table, 0, 'grade_11'),
          grade_12: getScalar(table, 0, 'grade_12'),
          grade_13: getScalar(table, 0, 'grade_13'),
          grade_ug: getScalar(table, 0, 'grade_ug'),
          grade_ae: getScalar(table, 0, 'grade_ae'),
        } as SchoolDirectoryInfo;

        setDirectoryInfo(results);
      } catch (err) {
        console.error('Error fetching directory info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch directory information');
        setDirectoryInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDirectoryInfo();
  }, [ncessch, schoolYear, dataDirectory, isInitialized]);

  return {
    directoryInfo,
    isLoading,
    error,
  };
}
