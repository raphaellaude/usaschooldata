import {useState, useEffect} from 'react';
import {duckDBService} from '../services/duckdb';

export interface SchoolDirectoryInfo {
  ncessch: string;
  sch_name: string;
  lea_name: string;
  city: string;
  state_name: string;
  school_year: string;
  [key: string]: string | number | null; // Allow additional fields from directory
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
        const results = duckDBService.tableToArray(table);

        if (results.length > 0) {
          setDirectoryInfo(results[0] as SchoolDirectoryInfo);
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
