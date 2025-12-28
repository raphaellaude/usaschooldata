import {useState, useEffect} from 'react';
import {apiService} from '../services/apiService';
import {dataService} from '../services/dataService';
import {useDuckDB} from './useDuckDB';

export interface BlendedHistoricalEnrollmentData {
  byYear: {school_year: string; total_enrollment: number}[];
  byRaceEthnicity: {
    school_year: string;
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    native_american: number;
    pacific_islander: number;
    multiracial: number;
  }[];
  bySex: {school_year: string; male: number; female: number}[];
  isLoading: boolean;
  error: string | null;
  isTableReady: boolean; // For compatibility with HistoricalEnrollmentChart
  dataSource: 'api' | 'duckdb' | null;
}

/**
 * Blended hook that uses API first, then falls back to DuckDB
 */
export function useBlendedHistoricalEnrollment(
  schoolCode: string,
  enabled: boolean = true
): BlendedHistoricalEnrollmentData {
  const [byYear, setByYear] = useState<{school_year: string; total_enrollment: number}[]>([]);
  const [byRaceEthnicity, setByRaceEthnicity] = useState<
    {
      school_year: string;
      white: number;
      black: number;
      hispanic: number;
      asian: number;
      native_american: number;
      pacific_islander: number;
      multiracial: number;
    }[]
  >([]);
  const [bySex, setBySex] = useState<{school_year: string; male: number; female: number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'duckdb' | null>(null);
  const {isInitialized, error: dbError} = useDuckDB();

  useEffect(() => {
    if (!schoolCode || !enabled) {
      setIsLoading(false);
      return;
    }

    loadHistoricalData();
  }, [schoolCode, enabled]);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        const [byYearData, byRaceEthnicityData, bySexData] = await Promise.all([
          apiService.getHistoricalEnrollmentByYear(schoolCode),
          apiService.getHistoricalEnrollmentByRaceEthnicity(schoolCode),
          apiService.getHistoricalEnrollmentBySex(schoolCode),
        ]);

        setByYear(byYearData);
        setByRaceEthnicity(byRaceEthnicityData);
        setBySex(bySexData);
        setDataSource('api');
      } catch (apiError) {
        console.warn('API fetch failed for historical data, falling back to DuckDB:', apiError);

        // Fall back to DuckDB if API fails
        if (isInitialized && !dbError) {
          const [byYearData, byRaceEthnicityData, bySexData] = await Promise.all([
            dataService.getHistoricalEnrollmentByYear(schoolCode),
            dataService.getHistoricalEnrollmentByRaceEthnicity(schoolCode),
            dataService.getHistoricalEnrollmentBySex(schoolCode),
          ]);

          setByYear(byYearData);
          setByRaceEthnicity(byRaceEthnicityData);
          setBySex(bySexData);
          setDataSource('duckdb');
        } else {
          throw apiError;
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load historical enrollment data';
      setError(errorMessage);
      console.error('Historical enrollment loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    byYear,
    byRaceEthnicity,
    bySex,
    isLoading,
    error,
    isTableReady: !isLoading && !error && byYear.length > 0,
    dataSource,
  };
}
