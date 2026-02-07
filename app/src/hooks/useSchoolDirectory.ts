import {useState, useEffect} from 'react';
import {duckDBService} from '../services/duckdb';

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
  latitude?: number | null;
  longitude?: number | null;
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

export function useSchoolDirectory(ncessch: string | undefined, schoolYear: string | undefined) {
  const [directoryInfo, setDirectoryInfo] = useState<SchoolDirectoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataDirectory = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';

  useEffect(() => {
    // Reset state when inputs change
    setDirectoryInfo(null);
    setError(null);

    // Don't fetch if we don't have required parameters
    if (!ncessch || !schoolYear) {
      return;
    }

    async function fetchDirectoryInfo() {
      // Double-check parameters inside async function
      if (!ncessch || !schoolYear) {
        return;
      }

      setIsLoading(true);
      try {
        // Query the directory parquet file directly for this school and year
        // Don't assume the local table exists
        const query = `
          SELECT *
          FROM read_parquet('${dataDirectory}/directory.parquet')
          WHERE ncessch = '${ncessch.replace(/'/g, "''")}'
            AND school_year = '${schoolYear.replace(/'/g, "''")}'
          LIMIT 1
        `;

        const table = await duckDBService.query(query);

        const results = {
          sch_name: duckDBService.getScalarValue(table, 0, 'sch_name'),
          ncessch: duckDBService.getScalarValue(table, 0, 'ncessch'),
          school_year: duckDBService.getScalarValue(table, 0, 'school_year'),
          sch_level: duckDBService.getScalarValue(table, 0, 'sch_level'),
          sch_type: SCH_TYPE_VALUES[duckDBService.getScalarValue(table, 0, 'sch_type') - 1],
          sy_status: SY_STATUS_VALUES[duckDBService.getScalarValue(table, 0, 'sy_status') - 1],
          sy_status_updated:
            SY_STATUS_VALUES[duckDBService.getScalarValue(table, 0, 'sy_status_updated') - 1],
          charter: duckDBService.getScalarValue(table, 0, 'charter'),
          state_code: duckDBService.getScalarValue(table, 0, 'state_code'),
          state_leaid: duckDBService.getScalarValue(table, 0, 'state_leaid'),
          latitude: duckDBService.getScalarValue(table, 0, 'latitude'),
          longitude: duckDBService.getScalarValue(table, 0, 'longitude'),
          grade_pk: duckDBService.getScalarValue(table, 0, 'grade_pk'),
          grade_kg: duckDBService.getScalarValue(table, 0, 'grade_kg'),
          grade_01: duckDBService.getScalarValue(table, 0, 'grade_01'),
          grade_02: duckDBService.getScalarValue(table, 0, 'grade_02'),
          grade_03: duckDBService.getScalarValue(table, 0, 'grade_03'),
          grade_04: duckDBService.getScalarValue(table, 0, 'grade_04'),
          grade_05: duckDBService.getScalarValue(table, 0, 'grade_05'),
          grade_06: duckDBService.getScalarValue(table, 0, 'grade_06'),
          grade_07: duckDBService.getScalarValue(table, 0, 'grade_07'),
          grade_08: duckDBService.getScalarValue(table, 0, 'grade_08'),
          grade_09: duckDBService.getScalarValue(table, 0, 'grade_09'),
          grade_10: duckDBService.getScalarValue(table, 0, 'grade_10'),
          grade_11: duckDBService.getScalarValue(table, 0, 'grade_11'),
          grade_12: duckDBService.getScalarValue(table, 0, 'grade_12'),
          grade_13: duckDBService.getScalarValue(table, 0, 'grade_13'),
          grade_ug: duckDBService.getScalarValue(table, 0, 'grade_ug'),
          grade_ae: duckDBService.getScalarValue(table, 0, 'grade_ae'),
        } as SchoolDirectoryInfo;

        if (results) {
          setDirectoryInfo(results);
        } else {
          setDirectoryInfo(null);
        }
      } catch (err) {
        console.error('Error fetching directory info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch directory information');
        setDirectoryInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDirectoryInfo();
  }, [ncessch, schoolYear, dataDirectory]);

  return {
    directoryInfo,
    isLoading,
    error,
  };
}
