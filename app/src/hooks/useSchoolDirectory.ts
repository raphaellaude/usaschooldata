import {useMemo} from 'react';
import {useSql} from '@sqlrooms/duckdb';

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
  city?: string;
  state_name?: string;
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

interface DirectoryRow {
  ncessch: string;
  sch_name: string;
  school_year: string;
  sch_level: string;
  sch_type: number;
  sy_status: number;
  sy_status_updated: number;
  charter: string;
  state_code: string;
  state_leaid: string;
  city?: string;
  state_name?: string;
  [key: string]: unknown;
}

const DATA_DIR = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';

export function useSchoolDirectory(ncessch: string | undefined, schoolYear: string | undefined) {
  const escapedNcessch = ncessch?.replace(/'/g, "''") || '';
  const escapedYear = schoolYear?.replace(/'/g, "''") || '';

  const {data, isLoading, error} = useSql<DirectoryRow>({
    query: `
      SELECT * REPLACE (
        sch_type::INTEGER as sch_type,
        sy_status::INTEGER as sy_status,
        sy_status_updated::INTEGER as sy_status_updated
      )
      FROM read_parquet('${DATA_DIR}/directory.parquet')
      WHERE ncessch = '${escapedNcessch}'
        AND school_year = '${escapedYear}'
      LIMIT 1
    `,
    enabled: !!ncessch && !!schoolYear,
  });

  const directoryInfo = useMemo<SchoolDirectoryInfo | null>(() => {
    if (!data || data.length === 0) return null;
    const row = data.toArray()[0];
    if (!row) return null;

    return {
      ...row,
      sch_type: SCH_TYPE_VALUES[(row.sch_type as number) - 1] || 'Unknown',
      sy_status: SY_STATUS_VALUES[(row.sy_status as number) - 1] || 'Unknown',
      sy_status_updated: SY_STATUS_VALUES[(row.sy_status_updated as number) - 1] || 'Unknown',
    } as SchoolDirectoryInfo;
  }, [data]);

  return {
    directoryInfo,
    isLoading,
    error: error?.message || null,
  };
}
